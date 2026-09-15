// MCQ Quiz and Search Database Queries
import { executeRawSql } from "../client.js";
import { appCache } from "../../cache.js";

// 1. Search Questions by keyword
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

// 2. Generate Random Quiz
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

// 3. Get Question By ID
export async function getQuestionById(id) {
  if (!id) return { data: null, fromCache: false, durationMs: 0 };
  const cleanId = String(id).replace(/'/g, "''");
  const cacheKey = `q:${cleanId}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true, durationMs: 0 };

  const sql = `SELECT * FROM questions WHERE id = '${cleanId}' LIMIT 1;`;
  const { rows, durationMs } = await executeRawSql(sql);
  const q = rows[0] || null;
  if (q) appCache.set(cacheKey, q, 3600);
  return { data: q, fromCache: false, durationMs };
}
