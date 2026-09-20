// Tool Handlers: search_question_bank & get_board_exam_questions
import { executeRawSql } from "../../../core/db/client.js";
import { normalizeSubject } from "../../../config/subject-map.js";
import { normalizeBoard } from "../../../config/board-map.js";
import { formatTag } from "../../../config/tag-map.js";
import { parseYearFilter, buildYearSqlConditions, RECENT_YEAR_ORDER_BY } from "../../../config/chapter-map.js";
import { findChapterCached } from "../helpers.js";

export async function handleSearchQuestionBank(args) {
  const query = (args.query || "").replace(/'/g, "''").trim();
  if (!query) return { error: "অনুসন্ধানের জন্য কোনো কীওয়ার্ড বা সূত্র দেওয়া হয়নি" };

  const subjId = normalizeSubject(args.subject);
  const boardTag = normalizeBoard(args.board);
  const years = parseYearFilter(args.year);

  const whereClauses = [
    `(question_text LIKE '%${query}%' OR question_html LIKE '%${query}%' OR solution LIKE '%${query}%')`
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
  let sql = `SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, answer, solution, tags, type, subject_id, chapter_id FROM questions WHERE ${whereClauses.join(" AND ")} ${RECENT_YEAR_ORDER_BY} LIMIT ${Math.max(limit * 5, 25)};`;
  let res = await executeRawSql(sql);

  // Fallback if combination is too strict
  if (res.rows.length === 0) {
    const fallbackSql = `SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, answer, solution, tags, type, subject_id, chapter_id FROM questions WHERE (question_text LIKE '%${query}%' OR question_html LIKE '%${query}%' OR solution LIKE '%${query}%') ${RECENT_YEAR_ORDER_BY} LIMIT ${Math.max(limit * 5, 25)};`;
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
      id: r.id,
      type: r.type,
      stem_or_question: r.question_text || r.question_html,
      question_text: r.question_text || r.question_html,
      option_a: r.option_a,
      option_b: r.option_b,
      option_c: r.option_c,
      option_d: r.option_d,
      answer: r.answer,
      solution: r.solution,
      exam_source: formatTag(r.tags),
      board_tag: formatTag(r.tags),
      raw_tag: r.tags
    })),
    mentor_instructions: "প্রাপ্ত আসল প্রশ্ন ও সমাধান নির্ভুলভাবে উপস্থাপন করো। শিক্ষার্থীকে প্রাসঙ্গিক সূত্র ও সমাধান পদ্ধতি প্রাঞ্জলভাবে বুঝিয়ে দাও। কুইজের ক্ষেত্রে শুরুতে উত্তর গোপন রাখবে।"
  };
}

export async function handleGetBoardExamQuestions(args) {
  const bName = args.board_name || "ঢাকা";
  const bCode = normalizeBoard(bName) || "DB";
  const subjId = normalizeSubject(args.subject);

  let yrCode = null;
  if (args.year) {
    const yStr = String(args.year).replace(/[^0-9]/g, '');
    yrCode = yStr.length === 4 ? yStr.slice(2) : yStr;
  }

  const isFullExam = args.mode === "full_exam" ||
                     parseInt(args.count) >= 15 ||
                     /সব|সকল|full|সবগুলো|পূর্ণাঙ্গ|পুরো|25|২৫|sob/i.test(args.query || args.academic_intent || "");
  const mcqLimit = isFullExam ? Math.min(parseInt(args.count) || 30, 30) : Math.min(parseInt(args.count) || 3, 10);

  const matchedCh = await findChapterCached(args, subjId);

  let qWhere = [`tags LIKE '%${bCode}%'`, `question_text != ''`];
  if (subjId) {
    qWhere.push(`subject_id = '${subjId}'`);
  }
  if (matchedCh) {
    qWhere.push(`chapter_id = '${matchedCh.id}'`);
  }
  if (yrCode) {
    qWhere.push(`(tags LIKE '%${bCode} ${yrCode}%' OR tags LIKE '%${yrCode}%')`);
  }

  // 1. Retrieve authentic board MCQs (both standard MCQ and MCQ_N)
  let mcqSql = `SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id FROM questions WHERE ${qWhere.join(" AND ")} AND type IN ('MCQ', 'MCQ_N') AND answer != '' ${RECENT_YEAR_ORDER_BY} LIMIT ${isFullExam ? 50 : 25};`;
  let mcqRes = await executeRawSql(mcqSql);

  // Fallback: without year constraint if strict board+year had no rows (preserves board and chapter!)
  if (mcqRes.rows.length === 0 && yrCode) {
    const fbWhere = [`tags LIKE '%${bCode}%'`, `question_text != ''`];
    if (subjId) fbWhere.push(`subject_id = '${subjId}'`);
    if (matchedCh) fbWhere.push(`chapter_id = '${matchedCh.id}'`);
    mcqRes = await executeRawSql(`SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id FROM questions WHERE ${fbWhere.join(" AND ")} AND type IN ('MCQ', 'MCQ_N') AND answer != '' ${RECENT_YEAR_ORDER_BY} LIMIT ${isFullExam ? 50 : 25};`);
  }

  // Fallback: ONLY if neither chapter nor specific board was requested, allow general recent questions
  if (mcqRes.rows.length === 0 && subjId && !matchedCh && !args.board_name) {
    mcqRes = await executeRawSql(`SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id FROM questions WHERE subject_id = '${subjId}' AND tags != '' AND question_text != '' AND type IN ('MCQ', 'MCQ_N') AND answer != '' ${RECENT_YEAR_ORDER_BY} LIMIT ${isFullExam ? 50 : 25};`);
  }

  // Determine returned slice of MCQs
  let topMcqs = mcqRes.rows;

  // Smart Backfill: If a full exam is requested (e.g. 25-30 MCQs) and specific year had slightly fewer (e.g. 27 in 2026),
  // seamlessly complete the set using recent authentic Dhaka Board questions from preceding years (e.g. 2025/2024)!
  if (isFullExam && topMcqs.length < mcqLimit && subjId) {
    const existingIds = new Set(topMcqs.map(r => r.id));
    const bfWhere = [`tags LIKE '%${bCode}%'`, `subject_id = '${subjId}'`, `type IN ('MCQ', 'MCQ_N')`, `answer != ''`];
    if (matchedCh) bfWhere.push(`chapter_id = '${matchedCh.id}'`);
    const backfillSql = `SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id FROM questions WHERE ${bfWhere.join(" AND ")} ${RECENT_YEAR_ORDER_BY} LIMIT 50;`;
    const bfRes = await executeRawSql(backfillSql);
    for (const row of bfRes.rows) {
      if (!existingIds.has(row.id)) {
        topMcqs.push(row);
        existingIds.add(row.id);
        if (topMcqs.length >= mcqLimit) break;
      }
    }
  }

  if (!isFullExam && topMcqs.length > mcqLimit) {
    topMcqs = topMcqs.slice(0, 10).sort(() => Math.random() - 0.5).slice(0, mcqLimit);
  } else if (topMcqs.length > mcqLimit) {
    topMcqs = topMcqs.slice(0, mcqLimit);
  }

  // 2. Retrieve authentic board CQ
  let cqSql = `SELECT id, question_text, option_a, option_b, option_c, option_d, solution, tags, subject_id FROM questions WHERE ${qWhere.join(" AND ")} AND type IN ('CQ_4', 'CQ_3', 'CQ_N') ${RECENT_YEAR_ORDER_BY} LIMIT 25;`;
  let cqRes = await executeRawSql(cqSql);

  if (cqRes.rows.length === 0 && yrCode) {
    const fbWhere = [`tags LIKE '%${bCode}%'`, `question_text != ''`];
    if (subjId) fbWhere.push(`subject_id = '${subjId}'`);
    if (matchedCh) fbWhere.push(`chapter_id = '${matchedCh.id}'`);
    cqRes = await executeRawSql(`SELECT id, question_text, option_a, option_b, option_c, option_d, solution, tags, subject_id FROM questions WHERE ${fbWhere.join(" AND ")} AND type IN ('CQ_4', 'CQ_3', 'CQ_N') ${RECENT_YEAR_ORDER_BY} LIMIT 25;`);
  }

  if (cqRes.rows.length === 0 && subjId && !matchedCh && !args.board_name) {
    cqRes = await executeRawSql(`SELECT id, question_text, option_a, option_b, option_c, option_d, solution, tags, subject_id FROM questions WHERE subject_id = '${subjId}' AND tags != '' AND question_text != '' AND type IN ('CQ_4', 'CQ_3', 'CQ_N') ${RECENT_YEAR_ORDER_BY} LIMIT 25;`);
  }

  const sampleCqs = isFullExam
    ? cqRes.rows.slice(0, 4)
    : (cqRes.rows.length > 0 ? [cqRes.rows[Math.floor(Math.random() * Math.min(cqRes.rows.length, 5))]] : []);
  const sampleCq = sampleCqs[0] || null;

  return {
    board: bName,
    year: args.year || "সকল বছর",
    subject: subjId || "সকল বিষয়",
    chapter: matchedCh?.name || null,
    mode: isFullExam ? "full_exam" : "sample",
    is_full_exam: isFullExam,
    exam_title: isFullExam ? `${bName} বোর্ড ${args.year || ''} পূর্ণাঙ্গ প্রশ্নপত্র` : null,
    total_found: topMcqs.length + sampleCqs.length,
    sample_mcq: topMcqs.map(r => ({
      id: r.id,
      question_text: r.question_text,
      option_a: r.option_a,
      option_b: r.option_b,
      option_c: r.option_c,
      option_d: r.option_d,
      answer: r.answer,
      solution: r.solution,
      tags: r.tags,
      subject_id: r.subject_id,
      formatted_source: formatTag(r.tags),
      all_board_tags: r.tags
    })),
    sample_cq: sampleCq ? {
      id: sampleCq.id,
      question_text: sampleCq.question_text,
      option_a: sampleCq.option_a,
      option_b: sampleCq.option_b,
      option_c: sampleCq.option_c,
      option_d: sampleCq.option_d,
      solution: sampleCq.solution,
      tags: sampleCq.tags,
      subject_id: sampleCq.subject_id,
      formatted_source: formatTag(sampleCq.tags),
      all_board_tags: sampleCq.tags
    } : null,
    sample_cqs: sampleCqs.map(c => ({
      id: c.id,
      question_text: c.question_text,
      option_a: c.option_a,
      option_b: c.option_b,
      option_c: c.option_c,
      option_d: c.option_d,
      solution: c.solution,
      tags: c.tags,
      subject_id: c.subject_id,
      formatted_source: formatTag(c.tags)
    })),
    instructions_for_mentor: isFullExam
      ? `শিক্ষার্থীকে এই বোর্ডের ও নির্দিষ্ট সালের পূর্ণাঙ্গ প্রশ্নপত্রের সবকটি MCQ (${topMcqs.length}টি) পরপর উপস্থাপন করো। প্রতিটি প্রশ্নের [বোর্ড: ...] ট্যাগ, ৪টি অপশন ও শেষে [ans: ...] [qid: ...] দেবে।`
      : "শিক্ষার্থীকে এই বোর্ডের আসল প্রশ্ন ও অপশন উপস্থাপন করো। MCQ উপস্থাপনের ক্ষেত্রে শুরুতে সঠিক উত্তর বা ব্যাখ্যা গোপন রাখবে, কেবল [বোর্ড: ...] ট্যাগ, প্রশ্ন ও ৪টি অপশন দেবে এবং শেষে [ans: ...] [qid: ...] রাখবে।"
  };
}
