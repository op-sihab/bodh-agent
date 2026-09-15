// Board Exams and Topic Frequency Database Queries
import { executeRawSql } from "../client.js";
import { appCache } from "../../cache.js";

// 1. Search Board Exams (e.g. "ঢাকা বোর্ড", "চট্টগ্রাম বোর্ড")
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

// 2. Frequency & Repetition Analysis (কোন প্রশ্ন/টপিক বোর্ডে কয়বার এসেছে)
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
