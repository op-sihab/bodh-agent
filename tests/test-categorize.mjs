import { executeRawSql } from "./src/db.js";

export async function checkBoardFrequency(topic) {
  const clean = topic.replace(/'/g, "''").trim();
  const countSql = `SELECT COUNT(*) as c FROM questions WHERE question_text LIKE '%${clean}%';`;
  const countRes = await executeRawSql(countSql);
  const total = parseInt(countRes.rows[0]?.c || 0);

  const tagsSql = `SELECT tags, COUNT(*) as c FROM questions WHERE question_text LIKE '%${clean}%' AND tags IS NOT NULL AND tags != '' GROUP BY tags ORDER BY c DESC LIMIT 15;`;
  const tagsRes = await executeRawSql(tagsSql);

  const recentBoards = [];
  const pastBoards = [];
  const topColleges = [];

  for (const row of tagsRes.rows) {
    const t = row.tags;
    const count = parseInt(row.c);
    // Categorize
    if (t.includes("24") || t.includes("25") || t.includes("26") || t.includes("23")) {
      if (t.includes("RCC") || t.includes("BNMPC") || t.includes("RUMC") || t.includes("DC") || t.includes("MCC") || t.includes("CCC")) {
        topColleges.push(`${t} (${count} বার)`);
      } else {
        recentBoards.push(`${t} (${count} বার)`);
      }
    } else {
      pastBoards.push(`${t} (${count} বার)`);
    }
  }

  return {
    topic: clean,
    total_count: total,
    recent_board_exams: recentBoards.slice(0, 4),
    past_board_exams: pastBoards.slice(0, 4),
    top_colleges: topColleges.slice(0, 4)
  };
}

async function test() {
  const res = await checkBoardFrequency("গতি");
  console.log("Frequency result:", JSON.stringify(res, null, 2));
}

test().catch(console.error);
