// Turso LibSQL Database Client with Pipeline API
import { appCache } from "./cache.js";

const TURSO_URL = process.env.TURSO_DATABASE_URL || "https://mcq-db-primekeeper.aws-ap-south-1.turso.io/v2/pipeline";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxOTE3MjgsImlkIjoiMDFhMDkwMzAtMDgwMS03OGI1LWFjZDUtMzUyNDEzYzgwYzVlIiwia2lkIjoiVXJNT2ZOeG1ERlRQNk5pNS1CSHlTZ0tZYWVrdmVZQi1lTGx6RW92c1picyIsInJpZCI6IjMxNTlkN2YzLTg5NTAtNDc1Yi05OTZhLWE2OWJkODg4ZWViMSJ9.SJMGIVf60N0QNFYaEkgph3BEAblDo0IrvKpyns6uJOUvWccx4xFvexuAgOYo5FSpyaP1RMACzEkg03Q1jNdUCg";

export async function executeRawSql(sql) {
  const startTime = performance.now();
  const response = await fetch(TURSO_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TURSO_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql } },
        { type: "close" }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Turso HTTP ${response.status}: ${err}`);
  }

  const data = await response.json();
  const res = data.results?.[0];
  if (!res || res.type === "error") {
    throw new Error(res?.error?.message || "Unknown database error");
  }

  const result = res.response.result;
  const cols = result.cols.map(c => c.name);
  const rows = result.rows.map(r => {
    const obj = {};
    r.forEach((val, i) => {
      obj[cols[i]] = val.value;
    });
    return obj;
  });

  const durationMs = Math.round(performance.now() - startTime);
  return { rows, durationMs };
}

// 1. Get Subjects
export async function getSubjects() {
  const cacheKey = "db:subjects";
  const cached = appCache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true, durationMs: 0 };

  const { rows, durationMs } = await executeRawSql("SELECT id, name, slug, category FROM subjects ORDER BY name ASC;");
  appCache.set(cacheKey, rows, 3600);
  return { data: rows, fromCache: false, durationMs };
}

// 2. Get Chapters by Subject ID
export async function getChapters(subjectId = null) {
  const cacheKey = `db:chapters:${subjectId || "all"}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true, durationMs: 0 };

  const sql = subjectId
    ? `SELECT id, subject_id, name, order_num FROM chapters WHERE subject_id = '${subjectId.replace(/'/g, "''")}' ORDER BY CAST(order_num AS INTEGER) ASC;`
    : `SELECT id, subject_id, name, order_num FROM chapters ORDER BY subject_id, CAST(order_num AS INTEGER) ASC;`;

  const { rows, durationMs } = await executeRawSql(sql);
  appCache.set(cacheKey, rows, 1800);
  return { data: rows, fromCache: false, durationMs };
}

// 3. Search Board Exams (e.g. "ঢাকা বোর্ড", "চট্টগ্রাম বোর্ড")
export async function getBoardExams(keyword = "", subjectId = null, limit = 10) {
  const cleanKw = (keyword || "").replace(/'/g, "''").trim();
  const conditions = [];
  if (cleanKw) conditions.push(`name LIKE '%${cleanKw}%'`);
  if (subjectId) conditions.push(`subject_id = '${subjectId.replace(/'/g, "''")}'`);
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT id, name, subject_id, q_count, duration, tags FROM exams ${whereClause} ORDER BY name DESC LIMIT ${limit};`;
  
  const cacheKey = `exams:${cleanKw}:${subjectId}:${limit}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true, durationMs: 0 };

  const { rows, durationMs } = await executeRawSql(sql);
  appCache.set(cacheKey, rows, 1800);
  return { data: rows, fromCache: false, durationMs };
}

// 4. Get Creative Questions (সৃজনশীল / CQ with উদ্দীপক ও ক, খ, গ, ঘ)
export async function getCQQuestions({ subject_id, chapter_id, limit = 3 } = {}) {
  const conditions = ["type LIKE '%CQ%'"];
  if (subject_id) conditions.push(`subject_id = '${subject_id.replace(/'/g, "''")}'`);
  if (chapter_id) conditions.push(`chapter_id = '${chapter_id.replace(/'/g, "''")}'`);

  const fetchLimit = Math.max(limit * 5, 25);
  const sql = `SELECT id, subject_id, chapter_id, exam_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution 
               FROM questions 
               WHERE ${conditions.join(" AND ")} 
               LIMIT ${fetchLimit};`;

  const { rows, durationMs } = await executeRawSql(sql);
  const sampled = rows.length > limit ? rows.sort(() => Math.random() - 0.5).slice(0, limit) : rows;
  return { data: sampled, durationMs };
}

// 5. Frequency & Repetition Analysis (কোন প্রশ্ন/টপিক বোর্ডে কয়বার এসেছে)
export async function getQuestionFrequency(topic) {
  if (!topic || topic.trim().length === 0) return { count: 0, tags: [], sampleQuestions: [], durationMs: 0 };

  const clean = topic.replace(/'/g, "''").trim();
  const cacheKey = `freq:${clean}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { ...cached, fromCache: true, durationMs: 0 };

  // Count total questions containing topic
  const countSql = `SELECT COUNT(*) as total FROM questions WHERE question_text LIKE '%${clean}%';`;
  const countRes = await executeRawSql(countSql);
  const total = parseInt(countRes.rows[0]?.total) || 0;

  // Group by tags/boards to see which boards repeated it
  const tagsSql = `SELECT tags, COUNT(*) as c 
                   FROM questions 
                   WHERE question_text LIKE '%${clean}%' AND tags IS NOT NULL AND tags != '' 
                   GROUP BY tags 
                   ORDER BY c DESC 
                   LIMIT 8;`;
  const tagsRes = await executeRawSql(tagsSql);

  // Sample questions
  const sampleSql = `SELECT id, type, tags, question_text, option_a, option_b, option_c, option_d, answer 
                     FROM questions 
                     WHERE question_text LIKE '%${clean}%' 
                     LIMIT 3;`;
  const sampleRes = await executeRawSql(sampleSql);

  const result = {
    topic: clean,
    totalFrequency: total,
    boardTags: tagsRes.rows,
    sampleQuestions: sampleRes.rows
  };

  appCache.set(cacheKey, result, 600);
  return { ...result, fromCache: false, durationMs: countRes.durationMs + tagsRes.durationMs };
}

// 6. Search Questions by keyword
export async function searchQuestions(keyword, limit = 10) {
  if (!keyword || keyword.trim().length === 0) return { data: [], durationMs: 0 };

  const clean = keyword.replace(/'/g, "''").trim();
  const cacheKey = `search:${clean}:${limit}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true, durationMs: 0 };

  const sql = `SELECT id, subject_id, chapter_id, exam_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution 
               FROM questions 
               WHERE question_text LIKE '%${clean}%' 
               LIMIT ${Math.min(limit, 50)};`;

  const { rows, durationMs } = await executeRawSql(sql);
  appCache.set(cacheKey, rows, 600);
  return { data: rows, fromCache: false, durationMs };
}

// 7. Generate Random Quiz
export async function getQuiz({ subject_id, chapter_id, exam_id, limit = 5, count = null, type = "MCQ" } = {}) {
  const finalLimit = count || limit || 5;
  const conditions = [];
  if (type) conditions.push(`type = '${type.replace(/'/g, "''")}'`);
  if (subject_id) conditions.push(`subject_id = '${subject_id.replace(/'/g, "''")}'`);
  if (chapter_id) conditions.push(`chapter_id = '${chapter_id.replace(/'/g, "''")}'`);
  if (exam_id) conditions.push(`exam_id = '${exam_id.replace(/'/g, "''")}'`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const fetchLimit = Math.max(finalLimit * 5, 25);
  const sql = `SELECT id, subject_id, chapter_id, exam_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution 
               FROM questions 
               ${whereClause} 
               LIMIT ${fetchLimit};`;

  const { rows, durationMs } = await executeRawSql(sql);
  const sampled = rows.length > finalLimit ? rows.sort(() => Math.random() - 0.5).slice(0, finalLimit) : rows;
  return { data: sampled, durationMs };
}

// 8. Get Question By ID
export async function getQuestionById(id) {
  const cleanId = id.replace(/'/g, "''");
  const cacheKey = `q:${cleanId}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true, durationMs: 0 };

  const sql = `SELECT * FROM questions WHERE id = '${cleanId}' LIMIT 1;`;
  const { rows, durationMs } = await executeRawSql(sql);
  const q = rows[0] || null;
  if (q) appCache.set(cacheKey, q, 3600);
  return { data: q, fromCache: false, durationMs };
}

// 9. Vector Similarity Search (টাইপভিত্তিক অনুরূপ প্রশ্ন অনুসন্ধান)
export async function getSimilarQuestionsByVector({ questionId, queryText, subjectId, limit = 4 } = {}) {
  let targetId = questionId ? String(questionId).trim() : null;

  // If questionId not directly valid, find seed question via queryText
  if (!targetId || !targetId.startsWith('q_')) {
    let cleanKw = (queryText || "").replace(/'/g, "''").trim();
    if (!cleanKw) return { seed: null, similar: [] };

    let seed = null;
    // 1. Try direct substring match
    const conds = [`question_text LIKE '%${cleanKw}%'`];
    if (subjectId) conds.push(`subject_id = '${subjectId.replace(/'/g, "''")}'`);
    const exactRes = await executeRawSql(`SELECT id, subject_id, chapter_id, tags, question_text FROM questions WHERE ${conds.join(' AND ')} LIMIT 1;`);
    if (exactRes.rows.length) {
      seed = exactRes.rows[0];
    } else {
      // 2. Filter stop words & use significant keywords
      const stopWords = ['এই', 'প্রশ্নের', 'অনুরূপ', 'টাইপের', 'আরেকটি', 'বোর্ড', 'প্রশ্ন', 'দাও', 'করলে', 'কত', 'কোনটি', 'হলে', 'নিচের'];
      const words = cleanKw.split(/[\s,\.\?\!\:\-\(\)\[\]]+/).filter(w => w.length >= 3 && !stopWords.includes(w));
      if (words.length > 0) {
        const wordConds = words.slice(0, 3).map(w => `question_text LIKE '%${w}%'`);
        if (subjectId) wordConds.push(`subject_id = '${subjectId.replace(/'/g, "''")}'`);
        const kwRes = await executeRawSql(`SELECT id, subject_id, chapter_id, tags, question_text FROM questions WHERE ${wordConds.join(' AND ')} LIMIT 1;`);
        if (kwRes.rows.length) seed = kwRes.rows[0];
      }
    }

    if (!seed) {
      // 3. Fallback: search by first significant keyword
      const words = cleanKw.split(/[\s,\.\?\!\:\-\(\)\[\]]+/).filter(w => w.length >= 4);
      for (const w of words) {
        const sRes = await executeRawSql(`SELECT id, subject_id, chapter_id, tags, question_text FROM questions WHERE question_text LIKE '%${w}%' LIMIT 1;`);
        if (sRes.rows.length) {
          seed = sRes.rows[0];
          break;
        }
      }
    }

    if (!seed) return { seed: null, similar: [] };
    targetId = seed.id;
  }

  // Check cache for this targetId
  const cacheKey = `vec_sim:${targetId}:${subjectId || 'all'}:${limit}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { ...cached, fromCache: true, durationMs: 0 };

  const t0 = performance.now();
  // Get seed question
  const seedRes = await executeRawSql(`SELECT id, subject_id, chapter_id, tags, question_text, option_a, option_b, option_c, option_d, answer, solution FROM questions WHERE id = '${targetId}';`);
  const seedQ = seedRes.rows[0];
  if (!seedQ) return { seed: null, similar: [] };

  const subj = subjectId || seedQ.subject_id;
  const subjClause = subj ? `AND qs.subject_id = '${subj.replace(/'/g, "''")}'` : "";

  // Vector distance query using Turso's native vector_distance_cos
  const count = Math.min(Math.max(parseInt(limit) || 3, 1), 6);
  const sql = `
    SELECT q.qid, vector_distance_cos(q.emb, (SELECT emb FROM question_vectors WHERE qid = '${targetId}')) as dist
    FROM question_vectors q
    JOIN questions qs ON q.qid = qs.id
    WHERE q.qid != '${targetId}' ${subjClause}
    ORDER BY dist ASC
    LIMIT ${count};
  `;

  const vecRes = await executeRawSql(sql);
  if (!vecRes.rows.length) {
    const res = { seed: seedQ, similar: [] };
    appCache.set(cacheKey, res, 1800);
    return { ...res, fromCache: false, durationMs: Math.round(performance.now() - t0) };
  }

  const qids = vecRes.rows.map(r => `'${r.qid}'`).join(',');
  const qDetails = await executeRawSql(`
    SELECT id, subject_id, chapter_id, exam_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution
    FROM questions
    WHERE id IN (${qids});
  `);

  const similar = qDetails.rows.map(q => {
    const distInfo = vecRes.rows.find(s => s.qid === q.id);
    const cosDist = distInfo ? parseFloat(distInfo.dist) : 0.5;
    const similarityScore = Math.max(0, Math.min(100, Math.round((1 - cosDist) * 100)));
    return {
      ...q,
      similarity_score: `${similarityScore}%`
    };
  });

  const result = { seed: seedQ, similar };
  appCache.set(cacheKey, result, 1800);
  return { ...result, fromCache: false, durationMs: Math.round(performance.now() - t0) };
}

