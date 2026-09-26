// Local HSC Vector Search Engine (1024-dim BGE-Large via Float16 NPY)
import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const dbPath = path.resolve(process.cwd(), 'database', 'hsc_master.db');
const npyPath = path.resolve(process.cwd(), 'database', 'vectors', 'hsc_vector_embeddings.npy');

let db = null;
let npyFd = null;
let isInitialized = false;

const DATA_OFFSET = 128;
const VEC_DIM = 1024;
const VEC_BYTES = VEC_DIM * 2; // Float16 is 2 bytes per float

function init() {
  if (isInitialized) return true;
  try {
    if (fs.existsSync(dbPath)) {
      db = new DatabaseSync(dbPath, { readOnly: true });
    }
    if (fs.existsSync(npyPath)) {
      npyFd = fs.openSync(npyPath, 'r');
    }
    isInitialized = !!(db && npyFd);
    if (isInitialized) {
      console.log('⚡ [Local Vector Engine] 299,419 HSC Vectors Loaded & Online.');
    }
    return isInitialized;
  } catch (err) {
    console.warn('⚠️ [Local Vector Engine] Failed to initialize:', err.message);
    return false;
  }
}

function float16ToFloat32(h) {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const f = h & 0x03ff;

  if (e === 0) {
    return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  } else if (e === 0x1f) {
    return f ? NaN : ((s ? -1 : 1) * Infinity);
  }
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + (f / 1024));
}

function readVectorAtRow(rowIdx) {
  if (rowIdx < 0 || !npyFd) return null;
  const buf = Buffer.alloc(VEC_BYTES);
  fs.readSync(npyFd, buf, 0, VEC_BYTES, DATA_OFFSET + (rowIdx * VEC_BYTES));
  const vec = new Float32Array(VEC_DIM);
  for (let i = 0; i < VEC_DIM; i++) {
    vec[i] = float16ToFloat32(buf.readUInt16LE(i * 2));
  }
  return vec;
}

function cosineSimilarity(v1, v2) {
  let dot = 0;
  for (let i = 0; i < VEC_DIM; i++) {
    dot += v1[i] * v2[i];
  }
  return dot;
}

export function isLocalVectorAvailable() {
  return init();
}

export function searchSimilarHscLocal({ questionId, queryText, subjectId, limit = 4 } = {}) {
  if (!init()) return null;

  const t0 = performance.now();
  let targetId = questionId ? String(questionId).trim() : null;

  // 1. If no questionId, search seed by queryText
  if (!targetId || targetId.length < 3) {
    const cleanKw = (queryText || '').replace(/'/g, "''").trim();
    if (!cleanKw) return { seed: null, similar: [], durationMs: 0 };

    // Try exact substring match first
    let seedStmt = db.prepare(`
      SELECT id FROM questions 
      WHERE question_text LIKE ? ${subjectId ? 'AND subject_id = ?' : ''}
      LIMIT 1
    `);
    let row = subjectId ? seedStmt.get(`%${cleanKw}%`, subjectId) : seedStmt.get(`%${cleanKw}%`);

    if (!row) {
      // Keyword fallback
      const stopWords = ['এই', 'প্রশ্নের', 'অনুরূপ', 'টাইপের', 'আরেকটি', 'বোর্ড', 'প্রশ্ন', 'দাও', 'করলে', 'কত', 'কোনটি', 'হলে', 'নিচের'];
      const words = cleanKw.split(/[\s,\.\?\!\:\-\(\)\[\]]+/).filter(w => w.length >= 3 && !stopWords.includes(w));
      if (words.length > 0) {
        const topKw = words[0];
        row = subjectId 
          ? db.prepare('SELECT id FROM questions WHERE question_text LIKE ? AND subject_id = ? LIMIT 1').get(`%${topKw}%`, subjectId)
          : db.prepare('SELECT id FROM questions WHERE question_text LIKE ? LIMIT 1').get(`%${topKw}%`);
      }
    }

    if (!row) return { seed: null, similar: [], durationMs: Math.round(performance.now() - t0) };
    targetId = row.id;
  }

  // 2. Fetch seed question and vector row index
  const seed = db.prepare(`
    SELECT q.id, q.subject_id, q.chapter_id, q.exam_id, q.type, q.tags, 
           q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, 
           q.answer, q.solution, q.topic, v.row_idx
    FROM questions q
    LEFT JOIN vector_index v ON q.id = v.qid
    WHERE q.id = ?
  `).get(targetId);

  if (!seed) return { seed: null, similar: [], durationMs: Math.round(performance.now() - t0) };

  // If seed has no vector row index, return seed without similar
  if (seed.row_idx === undefined || seed.row_idx === null) {
    return { seed, similar: [], durationMs: Math.round(performance.now() - t0) };
  }

  const targetVec = readVectorAtRow(seed.row_idx);
  if (!targetVec) return { seed, similar: [], durationMs: Math.round(performance.now() - t0) };

  // 3. Find candidates with vectors in same chapter or subject
  const candidateLimit = 250;
  let candidates = [];

  if (seed.chapter_id) {
    candidates = db.prepare(`
      SELECT q.id, q.subject_id, q.chapter_id, q.exam_id, q.type, q.tags,
             q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
             q.answer, q.solution, q.topic, v.row_idx
      FROM questions q
      JOIN vector_index v ON q.id = v.qid
      WHERE q.chapter_id = ? AND q.id != ?
      LIMIT ?
    `).all(seed.chapter_id, seed.id, candidateLimit);
  }

  const subj = subjectId || seed.subject_id;
  if (candidates.length < limit && subj) {
    const more = db.prepare(`
      SELECT q.id, q.subject_id, q.chapter_id, q.exam_id, q.type, q.tags,
             q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
             q.answer, q.solution, q.topic, v.row_idx
      FROM questions q
      JOIN vector_index v ON q.id = v.qid
      WHERE q.subject_id = ? AND q.id != ?
      LIMIT ?
    `).all(subj, seed.id, candidateLimit);
    candidates.push(...more);
  }

  // Deduplicate candidates
  const seenQids = new Set();
  const uniqueCandidates = [];
  for (const c of candidates) {
    if (!seenQids.has(c.id)) {
      seenQids.add(c.id);
      uniqueCandidates.push(c);
    }
  }

  // 4. Compute cosine similarity
  const scored = [];
  for (const c of uniqueCandidates) {
    const cVec = readVectorAtRow(c.row_idx);
    if (!cVec) continue;
    const sim = cosineSimilarity(targetVec, cVec);
    const scorePct = Math.max(0, Math.min(100, Math.round(sim * 100)));
    scored.push({
      id: c.id,
      subject_id: c.subject_id,
      chapter_id: c.chapter_id,
      exam_id: c.exam_id,
      type: c.type,
      tags: c.tags,
      question_text: c.question_text,
      option_a: c.option_a,
      option_b: c.option_b,
      option_c: c.option_c,
      option_d: c.option_d,
      answer: c.answer,
      solution: c.solution,
      topic: c.topic,
      similarity_score: `${scorePct}%`,
      raw_similarity: sim
    });
  }

  scored.sort((a, b) => b.raw_similarity - a.raw_similarity);
  const count = Math.min(Math.max(parseInt(limit) || 4, 1), 10);
  const topSimilar = scored.slice(0, count);

  return {
    seed,
    similar: topSimilar,
    durationMs: Math.round(performance.now() - t0)
  };
}

const CONCEPT_MAPPINGS = [
  { re: /(?:projectile|prash|pras|প্রাস|প্রক্ষেপক)/i, term: "প্রাস", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:motion|goti|গতি|বেগ|ত্বরণ|মন্দন|ভেলোসিটি)/i, term: "গতি", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:force|bol|বল|নিউটনের|ঘর্ষণ)/i, term: "বল", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:work|shokti|শক্তি|কাজ|ক্ষমতা|কাইনেটিক)/i, term: "শক্তি", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:gravity|gravitation|মহাকর্ষ|অভিকর্ষ)/i, term: "মহাকর্ষ", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:wave|torongo|তরঙ্গ|শব্দ)/i, term: "তরঙ্গ", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:thermo|tap|তাপ|তাপগতিবিদ্যা|এনট্রপি)/i, term: "তাপ", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:current|electricity|তড়িৎ|বিদ্যুৎ|রোধ|সার্কিট|কুলম্ব|ধারক)/i, term: "তড়িৎ", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:light|alor|আলো|প্রতিসরণ|প্রতিফলন|লেন্স)/i, term: "আলো", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:nucleus|nuclear|নিউক্লি|তেজস্ক্রি)/i, term: "নিউক্লি", subjectList: ["phys_1", "phys_2"] },
  { re: /(?:organic|joubo|জৈব|হাইড্রোকার্বন|অ্যালকেন|বেনজিন|পলিমার)/i, term: "জৈব", subjectList: ["chem_1", "chem_2"] },
  { re: /(?:acid|khar|এসিড|ক্ষার|পিএইচ|ph|ক্ষারক)/i, term: "এসিড", subjectList: ["chem_1", "chem_2"] },
  { re: /(?:periodic|porjay|পর্যায়|পর্যায়বৃত্ত|মৌল)/i, term: "পর্যায়", subjectList: ["chem_1", "chem_2"] },
  { re: /(?:redox|jaron|bijaron|জারণ|বিজারণ)/i, term: "জারণ", subjectList: ["chem_1", "chem_2"] },
  { re: /(?:solution|drobon|দ্রবণ|মোলারিটি)/i, term: "দ্রবণ", subjectList: ["chem_1", "chem_2"] },
  { re: /(?:matrix|matrices|ম্যাট্রিক্স)/i, term: "ম্যাট্রিক্স", subjectList: ["math_1", "math_2"] },
  { re: /(?:determinant|nirnayok|নির্ণায়ক)/i, term: "নির্ণায়ক", subjectList: ["math_1", "math_2"] },
  { re: /(?:calculus|differentiation|integration|অন্তরীকরণ|যোগজীকরণ)/i, term: "অন্তরীকরণ", subjectList: ["math_1", "math_2"] },
  { re: /(?:vector|vectors|ভেক্টর)/i, term: "ভেক্টর", subjectList: ["math_1", "math_2", "phys_1"] },
  { re: /(?:trigonometry|trikonmiti|ত্রিকোণমিতি)/i, term: "ত্রিকোণমিতি", subjectList: ["math_1", "math_2"] },
  { re: /(?:circle|britto|বৃত্ত|কণিক|সরলরেখা)/i, term: "বৃত্ত", subjectList: ["math_1", "math_2"] },
  { re: /(?:cell|kosh|কোষ|মাইটোকন্ড্রিয়া|ক্লোরোপ্লাস্ট)/i, term: "কোষ", subjectList: ["bio_1", "bio_2"] },
  { re: /(?:dna|rna|ডিএনএ|আরএনএ|জিন|ক্রোমোজোম)/i, term: "ডিএনএ", subjectList: ["bio_1", "bio_2"] },
  { re: /(?:mitosis|meiosis|মাইটোসিস|মিয়োসিস|মিয়োসিস)/i, term: "মাইটোসিস", subjectList: ["bio_1", "bio_2"] },
  { re: /(?:gate|logic\s*gate|লজিক\s*গেট|বাইনারি|হেক্সাডেসিমেল)/i, term: "গেট", subjectList: ["ict"] }
];

function resolveSubjectList(subject) {
  if (!subject) return null;
  const s = String(subject).toLowerCase();
  if (s.includes('phys') || s.includes('পদার্থ')) return ["phys_1", "phys_2"];
  if (s.includes('chem') || s.includes('রসায়ন') || s.includes('রসায়ন')) return ["chem_1", "chem_2"];
  if (s.includes('math') || s.includes('গণিত')) return ["math_1", "math_2"];
  if (s.includes('bio') || s.includes('জীব')) return ["bio_1", "bio_2"];
  if (s.includes('ict') || s.includes('তথ্য')) return ["ict"];
  return null;
}

export function fetchDeterministicQuestion({ subject, keyword, type = 'MCQ' } = {}) {
  if (!init()) return null;
  const t0 = performance.now();

  const queryText = (keyword || '').trim();
  let matchedTerm = null;
  let detectedSubjectList = null;

  // 1. Concept match
  for (const c of CONCEPT_MAPPINGS) {
    if (c.re.test(queryText)) {
      matchedTerm = c.term;
      detectedSubjectList = c.subjectList;
      break;
    }
  }

  const targetSubjects = resolveSubjectList(subject) || detectedSubjectList;

  // 2. Try querying matching concept term + indexed subject list
  if (matchedTerm && targetSubjects && targetSubjects.length > 0) {
    try {
      const placeholders = targetSubjects.map(() => '?').join(', ');
      const rows = db.prepare(`
        SELECT id, subject_id, chapter_id, exam_id, type, tags,
               question_text, option_a, option_b, option_c, option_d,
               answer, solution, topic
        FROM questions
        WHERE (type = 'MCQ' OR type = 'MCQ_5')
          AND option_a IS NOT NULL AND answer IS NOT NULL
          AND subject_id IN (${placeholders}) AND question_text LIKE ?
        LIMIT 15
      `).all(...targetSubjects, `%${matchedTerm}%`);

      if (rows.length > 0) {
        const q = rows[Math.floor(Math.random() * rows.length)];
        return {
          question: q,
          matchedTerm,
          durationMs: Math.round(performance.now() - t0)
        };
      }
    } catch (e) {
      console.warn("[Local Vector Engine] Concept query error:", e.message);
    }
  }

  // 3. Fallback: Query by Subject if known
  if (targetSubjects && targetSubjects.length > 0) {
    try {
      const placeholders = targetSubjects.map(() => '?').join(', ');
      const rows = db.prepare(`
        SELECT id, subject_id, chapter_id, exam_id, type, tags,
               question_text, option_a, option_b, option_c, option_d,
               answer, solution, topic
        FROM questions
        WHERE (type = 'MCQ' OR type = 'MCQ_5')
          AND option_a IS NOT NULL AND answer IS NOT NULL
          AND subject_id IN (${placeholders})
        LIMIT 15
      `).all(...targetSubjects);

      if (rows.length > 0) {
        const q = rows[Math.floor(Math.random() * rows.length)];
        return {
          question: q,
          durationMs: Math.round(performance.now() - t0)
        };
      }
    } catch (e) {
      console.warn("[Local Vector Engine] Subject query error:", e.message);
    }
  }

  // 4. Ultimate fallback: Any authentic question
  try {
    const rows = db.prepare(`
      SELECT id, subject_id, chapter_id, exam_id, type, tags,
             question_text, option_a, option_b, option_c, option_d,
             answer, solution, topic
      FROM questions
      WHERE (type = 'MCQ' OR type = 'MCQ_5')
        AND option_a IS NOT NULL AND answer IS NOT NULL
        AND subject_id IN ('phys_1', 'phys_2', 'chem_1', 'chem_2', 'math_1', 'math_2')
      LIMIT 15
    `).all();

    if (rows.length > 0) {
      const q = rows[Math.floor(Math.random() * rows.length)];
      return {
        question: q,
        durationMs: Math.round(performance.now() - t0)
      };
    }
    return null;
  } catch (err) {
    console.warn("[Local Vector Engine] fetchDeterministicQuestion fallback error:", err.message);
    return null;
  }
}

