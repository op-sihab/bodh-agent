// Intelligent Academic RAG Engine with Smart Topic Matching & Spelling Normalization
import { executeRawSql } from "./db.js";
import { appCache } from "./cache.js";

// Mapping of known subjects with common Bengali & English spelling variations
const SUBJECT_MAP = [
  { 
    id: "ssc_general_math", 
    name: "সাধারণ গণিত", 
    aliases: ["সাধারণ গণিত", "গনিত", "গণিত", "ম্যাথ", "অংক", "অঙ্ক", "math", "general math", "general-math"] 
  },
  { 
    id: "ssc_higher_math", 
    name: "উচ্চতর গণিত", 
    aliases: ["উচ্চতর গণিত", "উচ্চতর গনিত", "হায়ার ম্যাথ", "হায়ার ম্যাথ", "higher math", "higher-math"] 
  },
  { 
    id: "ssc_physics", 
    name: "পদার্থবিজ্ঞান", 
    aliases: ["পদার্থ", "পদার্থবিজ্ঞান", "ফিজিক্স", "physics"] 
  },
  { 
    id: "ssc_chemistry", 
    name: "রসায়ন", 
    aliases: ["রসায়ন", "রসায়ন", "কেমিস্ট্রি", "chemistry"] 
  },
  { 
    id: "ssc_biology", 
    name: "জীববিজ্ঞান", 
    aliases: ["জীববিজ্ঞান", "বায়োলজি", "biology"] 
  },
  { 
    id: "ssc_bangla_1st", 
    name: "বাংলা ১ম পত্র", 
    aliases: ["বাংলা ১ম", "বাংলা প্রথম", "bangla 1st"] 
  },
  { 
    id: "ssc_bangla_2nd", 
    name: "বাংলা ২য় পত্র", 
    aliases: ["বাংলা ২য়", "বাংলা দ্বিতীয়", "bangla 2nd"] 
  },
  { 
    id: "ssc_english_1st", 
    name: "English 1st Paper", 
    aliases: ["ইংরেজি ১ম", "english 1st"] 
  },
  { 
    id: "ssc_english_2nd", 
    name: "English 2nd Paper", 
    aliases: ["ইংরেজি ২য়", "english 2nd"] 
  },
  { 
    id: "ssc_bgs", 
    name: "বাংলাদেশ ও বিশ্বপরিচয়", 
    aliases: ["বাংলাদেশ ও বিশ্বপরিচয়", "বাংলাদেশ ও বিশ্বপরিচয়", "বিজিএস", "bgs"] 
  },
  { 
    id: "ssc_ict", 
    name: "তথ্য ও যোগাযোগ প্রযুক্তি", 
    aliases: ["আইসিটি", "তথ্য প্রযুক্তি", "ict"] 
  },
  { 
    id: "ssc_islam", 
    name: "ইসলাম ও নৈতিক শিক্ষা", 
    aliases: ["ইসলাম শিক্ষা", "ধর্ম", "islam"] 
  },
  { 
    id: "ssc_hindu", 
    name: "হিন্দুধর্ম", 
    aliases: ["হিন্দুধর্ম", "hindu"] 
  },
  { 
    id: "ssc_agriculture", 
    name: "কৃষি শিক্ষা", 
    aliases: ["কৃষি", "agriculture"] 
  }
];

// Detect which subject user is asking about
export function detectSubject(text) {
  const lower = text.toLowerCase();
  // Check higher math first before general math
  if (lower.includes("উচ্চতর") || lower.includes("higher")) {
    return SUBJECT_MAP.find(s => s.id === "ssc_higher_math");
  }
  for (const s of SUBJECT_MAP) {
    for (const alias of s.aliases) {
      if (lower.includes(alias)) return s;
    }
  }
  return null;
}

// Extract search keywords from Bengali user query
export function extractKeywords(text) {
  return text
    .replace(/[\?।!,:;'"\(\)\{\}\[\]\-\_\/]/g, " ")
    .replace(/(কয়টা|কয়টা|কতটি|কয়টি|কতগুলো|আছে|বলো|বলোতো|বলো তো|ভাইয়া|ভাই|দাও|দেখাও|খুঁজে|জানাও|কী|কি|কেন|কখন|কোথায়|কাকে|বলতে|বুঝায়|নাম|তালিকা|একটু|হবে|পারি|চাচ্ছি|প্রশ্ন|প্রশ্নের|অধ্যায়|অধ্যায়|অধ্যায়ের|টপিক|টপিকের|টপিক্স|সম্পর্কে|এর|টপিকটি)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Full RAG Retrieval Engine
export async function retrieveRealAcademicContext(userQuery) {
  const start = performance.now();
  const lower = userQuery.toLowerCase().trim();
  const detectedSubject = detectSubject(userQuery);

  const context = {
    userQuery,
    detectedSubject: detectedSubject ? detectedSubject.name : null,
    totalChapters: null,
    chapterList: [],
    matchedQuestions: [],
    frequencyAnalysis: null,
    boardExams: [],
    retrievedItemsCount: 0
  };

  // 1. Check if user is asking about chapters / syllabus / list of chapters
  if (lower.includes("অধ্যায়") || lower.includes("অধ্যায়") || lower.includes("চ্যাপ্টার") || lower.includes("সিলেবাস") || lower.includes("কয়টা") || lower.includes("কয়টা")) {
    if (detectedSubject) {
      const sql = `SELECT id, name, order_num FROM chapters WHERE subject_id = '${detectedSubject.id}' ORDER BY CAST(order_num AS INTEGER) ASC;`;
      const res = await executeRawSql(sql);
      context.totalChapters = res.rows.length;
      context.chapterList = res.rows.map(r => `${r.order_num}. ${r.name}`);
      context.retrievedItemsCount += res.rows.length;
    } else {
      const sql = `SELECT subjects.name, COUNT(chapters.id) as chapter_count 
                   FROM subjects 
                   LEFT JOIN chapters ON subjects.id = chapters.subject_id 
                   GROUP BY subjects.id 
                   ORDER BY subjects.name ASC;`;
      const res = await executeRawSql(sql);
      context.allSubjectChapters = res.rows;
      context.retrievedItemsCount += res.rows.length;
    }
  }

  // 2. Check if user is asking about board exam repetition / frequency ("কয়বার আসছে", "ইম্পর্টেন্ট")
  if (lower.includes("কয়বার") || lower.includes("কতবার") || lower.includes("রিপিট") || lower.includes("ইম্পর্টেন্ট") || lower.includes("বেশি আসে")) {
    let searchWord = extractKeywords(userQuery).split(" ")[0] || "গতি";
    if (searchWord.endsWith("র") && searchWord.length > 3) {
      searchWord = searchWord.slice(0, -1); // e.g. 'গতির' -> 'গতি'
    }

    const countRes = await executeRawSql(`SELECT COUNT(*) as c FROM questions WHERE question_text LIKE '%${searchWord.replace(/'/g, "''")}%';`);
    const totalFreq = parseInt(countRes.rows[0]?.c || 0);

    const tagRes = await executeRawSql(`SELECT tags, COUNT(*) as c FROM questions WHERE question_text LIKE '%${searchWord.replace(/'/g, "''")}%' AND tags IS NOT NULL AND tags != '' GROUP BY tags ORDER BY c DESC LIMIT 6;`);

    const sampleRes = await executeRawSql(`SELECT question_text, option_a, option_b, option_c, option_d, answer, tags FROM questions WHERE question_text LIKE '%${searchWord.replace(/'/g, "''")}%' LIMIT 2;`);

    context.frequencyAnalysis = {
      keyword: searchWord,
      totalCount: totalFreq,
      topBoards: tagRes.rows,
      sampleQuestions: sampleRes.rows
    };
    context.retrievedItemsCount += totalFreq > 0 ? 1 : 0;
  }

  // 3. Check if user asks for specific Board Exam (e.g. ঢাকা বোর্ড ২০২৬, চট্টগ্রাম বোর্ড)
  const boardMatch = userQuery.match(/(ঢাকা|চট্টগ্রাম|রাজশাহী|কুমিল্লা|সিলেট|যশোর|বরিশাল|দিনাজপুর|ময়মনসিংহ)/);
  if (boardMatch) {
    const bName = boardMatch[0];
    let sql = `SELECT id, name, subject_id, q_count FROM exams WHERE name LIKE '%${bName}%' `;
    if (detectedSubject) sql += `AND subject_id = '${detectedSubject.id}' `;
    if (lower.includes("২০২৬") || lower.includes("2026")) sql += `AND name LIKE '%২০২৬%' `;
    else if (lower.includes("২০২৫") || lower.includes("2025")) sql += `AND name LIKE '%২০২৫%' `;
    sql += `ORDER BY name DESC LIMIT 6;`;

    const examRes = await executeRawSql(sql);
    context.boardExams = examRes.rows;
    context.retrievedItemsCount += examRes.rows.length;

    // Get sample questions tagged with this board
    const tagQuery = bName === "ঢাকা" ? "DB" : bName === "চট্টগ্রাম" ? "CB" : bName === "রাজশাহী" ? "RB" : bName === "কুমিল্লা" ? "CB" : bName === "সিলেট" ? "SB" : bName === "যশোর" ? "JB" : "BB";
    let qSql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, tags, type FROM questions WHERE tags LIKE '%${tagQuery}%' `;
    if (detectedSubject) qSql += `AND subject_id = '${detectedSubject.id}' `;
    qSql += `LIMIT 3;`;
    const taggedQ = await executeRawSql(qSql);
    context.matchedQuestions.push(...taggedQ.rows);
    context.retrievedItemsCount += taggedQ.rows.length;
  }

  // 4. Keyword / Topic Search in 50,000+ Questions
  const kw = extractKeywords(userQuery);
  if (kw.length >= 2 && context.matchedQuestions.length < 3) {
    const searchTerms = kw.split(" ").filter(w => w.length >= 2).slice(0, 2);
    for (const term of searchTerms) {
      let qSql = `SELECT id, question_text, option_a, option_b, option_c, option_d, answer, tags, type 
                  FROM questions 
                  WHERE question_text LIKE '%${term.replace(/'/g, "''")}%' `;
      if (detectedSubject) qSql += `AND subject_id = '${detectedSubject.id}' `;
      qSql += `LIMIT 3;`;

      const qRes = await executeRawSql(qSql);
      if (qRes.rows.length > 0) {
        context.matchedQuestions.push(...qRes.rows);
        context.retrievedItemsCount += qRes.rows.length;
        break;
      }
    }
  }

  // 5. If CQ (Creative Question) requested
  if (lower.includes("সৃজনশীল") || lower.includes("cq") || lower.includes("উদ্দীপক")) {
    let cqSql = `SELECT id, question_text, option_a, option_b, option_c, option_d, answer, tags 
                 FROM questions 
                 WHERE type LIKE '%CQ%' `;
    if (detectedSubject) cqSql += `AND subject_id = '${detectedSubject.id}' `;
    cqSql += `LIMIT 25;`;
    const cqRes = await executeRawSql(cqSql);
    if (cqRes.rows.length > 0) {
      context.creativeQuestion = cqRes.rows[Math.floor(Math.random() * cqRes.rows.length)];
      context.retrievedItemsCount += 1;
    }
  }

  context.retrievalDurationMs = Math.round(performance.now() - start);
  return context;
}

// Convert RAG Context to clear factual text for LLM
export function formatRagContextForPrompt(ctx) {
  let parts = [];

  if (ctx.detectedSubject && ctx.totalChapters !== null) {
    parts.push(`【${ctx.detectedSubject} সিলেবাস ও অধ্যায় তথ্য】\nমোট অধ্যায়: ${ctx.totalChapters}টি।\nঅধ্যায়সমূহ:\n` + ctx.chapterList.join("\n"));
  } else if (ctx.allSubjectChapters?.length > 0) {
    parts.push(`【এসএসসি সকল বিষয়ের অধ্যায় সংখ্যা】\n` + ctx.allSubjectChapters.map(s => `• ${s.name}: ${s.chapter_count || 0}টি অধ্যায়`).join("\n"));
  }

  if (ctx.frequencyAnalysis && ctx.frequencyAnalysis.totalCount > 0) {
    parts.push(`【বোর্ড পুনরাবৃত্তি পরিসংখ্যান (Frequency Analysis)】\nটপিক: '${ctx.frequencyAnalysis.keyword}'\nআমাদের ডাটাবেসে মোট প্রশ্ন সংখ্যা: ${ctx.frequencyAnalysis.totalCount}টি।\nবোর্ড ট্যাগসমূহ: ` + ctx.frequencyAnalysis.topBoards.map(b => `${b.tags} (${b.c} বার)`).join(", "));
  }

  if (ctx.boardExams?.length > 0) {
    parts.push(`【সংরক্ষিত বোর্ড পরীক্ষা ও টেস্ট পেপার】\n` + ctx.boardExams.map(e => `• ${e.name} (${e.q_count || 0}টি প্রশ্ন)`).join("\n"));
  }

  if (ctx.creativeQuestion) {
    const cq = ctx.creativeQuestion;
    parts.push(`【আসল সৃজনশীল প্রশ্ন (CQ)】\nউদ্দীপক: ${cq.question_text}\n(ক) ${cq.option_a || '-'}\n(খ) ${cq.option_b || '-'}\n(গ) ${cq.option_c || '-'}\n(ঘ) ${cq.option_d || '-'}\nবোর্ড ট্যাগ: ${cq.tags || 'বোর্ড পরীক্ষা'}`);
  }

  if (ctx.matchedQuestions?.length > 0) {
    const qList = ctx.matchedQuestions.slice(0, 3).map((q, idx) => {
      let s = `[প্রশ্ন ${idx+1}] ${q.question_text}`;
      if (q.option_a && q.option_a !== 'Option A') {
        s += `\n(A) ${q.option_a} (B) ${q.option_b} (C) ${q.option_c} (D) ${q.option_d}\nউত্তর: ${q.answer || 'N/A'}`;
      }
      if (q.tags) s += `\nবোর্ড/ট্যাগ: ${q.tags}`;
      return s;
    });
    parts.push(`【ডাটাবেস থেকে পাওয়া আসল বোর্ড প্রশ্নসমূহ】\n` + qList.join("\n\n"));
  }

  return parts.join("\n\n---\n\n");
}
