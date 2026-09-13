import { executeRawSql } from "./src/db.js";

async function main() {
  const d26 = await executeRawSql("SELECT id, name, subject_id, q_count FROM exams WHERE name LIKE '%ঢাকা%' AND name LIKE '%২০২৬%';");
  console.log("Exams with ঢাকা and ২০২৬:", d26.rows);

  const tags26 = await executeRawSql("SELECT tags, COUNT(*) as c FROM questions WHERE tags LIKE '%DB 26%' OR tags LIKE '%DB 25%' GROUP BY tags;");
  console.log("Questions with DB 26 / DB 25:", tags26.rows);
}

main().catch(console.error);
