// Creative Questions (সৃজনশীল / CQ) Database Queries
import { executeRawSql } from "../client.js";

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
