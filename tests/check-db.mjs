import { executeRawSql } from "./src/db.js";

async function main() {
  const subjects = await executeRawSql("SELECT * FROM subjects;");
  console.log("All Subjects:", subjects.rows);

  const chapters = await executeRawSql("SELECT chapters.subject_id, subjects.name as subject_name, COUNT(*) as total_chapters FROM chapters LEFT JOIN subjects ON chapters.subject_id = subjects.id GROUP BY chapters.subject_id;");
  console.log("Chapters per Subject:", chapters.rows);

  const sampleQuestions = await executeRawSql("SELECT id, subject_id, question_text, option_a, answer, tags FROM questions LIMIT 3;");
  console.log("Sample Questions:", sampleQuestions.rows);
}

main().catch(console.error);
