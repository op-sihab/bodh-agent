// Tool Handlers: search_question_bank & get_board_exam_questions
import { executeRawSql } from "../../../core/db/client.js";
import { normalizeSubject } from "../../../config/subject-map.js";
import { normalizeBoard } from "../../../config/board-map.js";
import { formatTag } from "../../../config/tag-map.js";
import { parseYearFilter, buildYearSqlConditions, RECENT_YEAR_ORDER_BY } from "../../../config/chapter-map.js";

export async function handleSearchQuestionBank(args) {
  const query = (args.query || "").replace(/'/g, "''").trim();
  if (!query) return { error: "অনুসন্ধানের জন্য কোনো কীওয়ার্ড বা সূত্র দেওয়া হয়নি" };

  const subjId = normalizeSubject(args.subject);
  const boardTag = normalizeBoard(args.board);
  const years = parseYearFilter(args.year);

  const whereClauses = [
    `(question_text LIKE '%${query}%' OR solution LIKE '%${query}%')`
  ];

  if (subjId) whereClauses.push(`subject_id = '${subjId}'`);

  if (years.length > 0) {
    whereClauses.push(buildYearSqlConditions(boardTag, years));
  } else if (boardTag && boardTag !== "RANDOM") {
    whereClauses.push(`tags LIKE '%${boardTag}%'`);
  }

  if (args.type === "MCQ") {
    whereClauses.push(`type IN ('MCQ', 'MCQ_N')`);
  } else if (args.type === "CQ") {
    whereClauses.push(`type IN ('CQ_4', 'CQ_3', 'CQ_N')`);
  }

  const limit = Math.min(parseInt(args.limit) || 2, 5);
  let sql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, solution, tags, type, subject_id FROM questions WHERE ${whereClauses.join(" AND ")} ${RECENT_YEAR_ORDER_BY} LIMIT ${Math.max(limit * 5, 25)};`;
  let res = await executeRawSql(sql);

  // Fallback if combination is too strict
  if (res.rows.length === 0) {
    const fallbackSql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, solution, tags, type, subject_id FROM questions WHERE (question_text LIKE '%${query}%' OR solution LIKE '%${query}%') ${RECENT_YEAR_ORDER_BY} LIMIT ${Math.max(limit * 5, 25)};`;
    res = await executeRawSql(fallbackSql);
  }

  // Prioritize top recent slice
  const topSearchSlice = res.rows.slice(0, Math.max(limit * 3, limit));
  if (topSearchSlice.length > limit) {
    res.rows = topSearchSlice.sort(() => Math.random() - 0.5).slice(0, limit);
  } else {
    res.rows = topSearchSlice;
  }

  return {
    search_query: query,
    total_found: res.rows.length,
    results: res.rows.map(r => ({
      type: r.type,
      stem_or_question: r.question_text,
      option_a: r.option_a,
      option_b: r.option_b,
      option_c: r.option_c,
      option_d: r.option_d,
      answer: r.answer,
      solution: r.solution,
      exam_source: formatTag(r.tags),
      raw_tag: r.tags
    })),
    mentor_instructions: "প্রাপ্ত আসল প্রশ্ন ও সমাধান নির্ভুলভাবে উপস্থাপন করো। শিক্ষার্থীকে প্রাসঙ্গিক সূত্র ও সমাধান পদ্ধতি প্রাঞ্জলভাবে বুঝিয়ে দাও।"
  };
}

export async function handleGetBoardExamQuestions(args) {
  const bName = args.board_name || "ঢাকা";
  const bCode = normalizeBoard(bName) || "DB";

  let yrCode = null;
  if (args.year) {
    const yStr = String(args.year).replace(/[^0-9]/g, '');
    yrCode = yStr.length === 4 ? yStr.slice(2) : yStr;
  }

  let qWhere = [`tags LIKE '%${bCode}%'`, `question_text != ''`];
  if (yrCode) {
    qWhere.push(`(tags LIKE '%${bCode} ${yrCode}%' OR tags LIKE '%${yrCode}%')`);
  }

  const mcqRes = await executeRawSql(`SELECT question_text, option_a, option_b, option_c, option_d, answer, tags, subject_id FROM questions WHERE ${qWhere.join(" AND ")} AND type = 'MCQ' AND answer != '' LIMIT 25;`);
  if (mcqRes.rows.length > 2) {
    mcqRes.rows = mcqRes.rows.sort(() => Math.random() - 0.5).slice(0, 2);
  }
  const cqRes = await executeRawSql(`SELECT question_text, option_a, option_b, option_c, option_d, tags, subject_id FROM questions WHERE ${qWhere.join(" AND ")} AND type IN ('CQ_4', 'CQ_3', 'CQ_N') LIMIT 25;`);
  if (cqRes.rows.length > 1) {
    cqRes.rows = [cqRes.rows[Math.floor(Math.random() * cqRes.rows.length)]];
  }

  return {
    board: bName,
    year: args.year || "সকল বছর",
    sample_mcq: mcqRes.rows.map(r => ({ ...r, formatted_source: formatTag(r.tags), all_board_tags: r.tags })),
    sample_cq: cqRes.rows[0] ? { ...cqRes.rows[0], formatted_source: formatTag(cqRes.rows[0].tags), all_board_tags: cqRes.rows[0].tags } : null,
    instructions_for_mentor: "শিক্ষার্থীকে এই বোর্ডের ও নির্দিষ্ট সালের প্রশ্ন ও অপশন উপস্থাপন করো। যদি প্রশ্নটি একাধিক বোর্ডে বা কলেজে এসে থাকে তবে [বোর্ড: " + (mcqRes.rows[0]?.tags || bCode) + "] উল্লেখ করবে।"
  };
}
