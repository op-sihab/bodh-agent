import { executeRawSql } from "./src/db.js";

async function main() {
  const types = await executeRawSql("SELECT DISTINCT type, COUNT(*) as count FROM questions GROUP BY type;");
  console.log("Question types in DB:", types.rows);

  const sampleExams = await executeRawSql("SELECT id, name, subject_id, q_count FROM exams WHERE name LIKE '%বোর্ড%' LIMIT 10;");
  console.log("Sample Board Exams:", sampleExams.rows);

  const sampleCQ = await executeRawSql("SELECT id, type, question_text, option_a, option_b, option_c, option_d, tags FROM questions WHERE type LIKE '%CQ%' LIMIT 2;");
  console.log("Sample CQ:", JSON.stringify(sampleCQ.rows, null, 2));

  // Check how tags show board repetition
  const sampleTags = await executeRawSql("SELECT tags, COUNT(*) as c FROM questions WHERE tags IS NOT NULL AND tags != '' GROUP BY tags ORDER BY c DESC LIMIT 10;");
  console.log("Top Tags / Board Frequency:", sampleTags.rows);
}

main().catch(console.error);
