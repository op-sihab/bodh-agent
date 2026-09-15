// Tool Handler: query_question_database_sql (Dynamic Read-Only SQL Engine)
import { executeRawSql } from "../../../core/db/client.js";
import { formatTag } from "../../../config/tag-map.js";

export async function handleQueryQuestionDatabaseSql(args) {
  const rawSql = args.sql || "";
  const purpose = args.explanation || "";

  // 1. Clean query
  const cleaned = rawSql.trim().replace(/^--.*$/gm, '').trim();
  const lower = cleaned.toLowerCase();

  if (!cleaned) {
    return {
      success: false,
      error: "কোনো SQL কোয়েরি দেওয়া হয়নি। অনুগ্রহ করে একটি বৈধ SELECT কোয়েরি প্রদান করুন।"
    };
  }

  // 2. Strict Read-Only Guardrail
  if (!lower.startsWith("select") && !lower.startsWith("with") && !lower.startsWith("pragma") && !lower.startsWith("explain")) {
    return {
      success: false,
      error: "নিরাপত্তার স্বার্থে শুধুমাত্র রিড-অনলি (SELECT / WITH) এসকিউএল কুয়েরি অনুমোদিত। ডেটাবেসের কোনো তথ্য পরিবর্তন, সংযোজন বা মোছা যাবে না।"
    };
  }

  // 3. Destructive Keywords Guardrail
  const forbidden = ["drop ", "delete ", "update ", "insert ", "alter ", "truncate ", "create ", "replace ", "attach ", "detach "];
  for (const keyword of forbidden) {
    if (lower.includes(keyword)) {
      return {
        success: false,
        error: `নিরাপত্তা সতর্কতা: '${keyword.trim()}' কমান্ড ডেটাবেসে সম্পূর্ণ নিষিদ্ধ। শুধুমাত্র তথ্য অনুসন্ধানের জন্য SELECT কুয়েরি ব্যবহার করো।`
      };
    }
  }

  try {
    const t0 = performance.now();
    const res = await executeRawSql(cleaned);
    const durationMs = Math.round(performance.now() - t0);

    // Limit results to maximum 20 rows to keep LLM context clean & fast
    const totalRows = res.rows ? res.rows.length : 0;
    const cappedRows = res.rows ? res.rows.slice(0, 20) : [];

    // Enrich rows with human-readable board tags if tags column present
    const enrichedRows = cappedRows.map(row => {
      if (row.tags && typeof row.tags === "string") {
        return {
          ...row,
          board_formatted: formatTag(row.tags)
        };
      }
      return row;
    });

    return {
      success: true,
      purpose,
      executed_sql: cleaned,
      duration_ms: durationMs,
      total_matching_rows: totalRows,
      returned_rows_count: enrichedRows.length,
      columns: res.columns || (enrichedRows[0] ? Object.keys(enrichedRows[0]) : []),
      rows: enrichedRows,
      notice: totalRows > 20 ? `মোট ${totalRows}টি ফলাফল পাওয়া গেছে। প্রথম ২০টি সারি এখানে দেখানো হলো।` : null
    };
  } catch (err) {
    return {
      success: false,
      error: `SQL Execution Error: ${err.message}`,
      attempted_sql: cleaned,
      hint: "এসকিউএল সিনট্যাক্স বা টেবিলের কলামের নাম পুনরায় যাচাই করে সঠিক কুয়েরি রান করো। questions টেবিলের প্রধান কলাম: id, subject_id, chapter_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution"
    };
  }
}
