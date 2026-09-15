// Tool Handler: get_mcq_quiz
import { executeRawSql } from "../../../core/db/client.js";
import { appCache } from "../../../core/cache.js";
import { normalizeSubject, toBnDigits } from "../../../config/subject-map.js";
import { normalizeBoard } from "../../../config/board-map.js";
import { formatTag } from "../../../config/tag-map.js";
import {
  parseYearFilter,
  buildYearSqlConditions,
  extractChapterKeywords,
  isQuestionRelevantToChapter,
  RECENT_YEAR_ORDER_BY
} from "../../../config/chapter-map.js";
import { findChapterCached, getAllChaptersCached } from "../helpers.js";

export async function handleGetMcqQuiz(args) {
  let subjId = normalizeSubject(args.subject);

  const matchedChapterInfo = await findChapterCached(args, subjId);
  const rawT = [args.chapter, args.topic, args.query].filter(Boolean).join(" ");
  if (matchedChapterInfo && matchedChapterInfo.subject_id) {
    subjId = matchedChapterInfo.subject_id;
  }
  const matchedMcqChapterId = matchedChapterInfo ? matchedChapterInfo.id : null;

  // Board filter
  const boardTag = normalizeBoard(args.board);

  // Year filter
  const years = parseYearFilter(args.year);

  // Difficulty level
  const diff = args.difficulty || (args.board ? "standard" : "medium");
  const count = Math.min(Math.max(parseInt(args.count) || 1, 1), 3);
  const isMockTest = args.mode === "mock_test";

  // Extract search keywords for this chapter/topic
  const chapterKeywords = extractChapterKeywords(rawT, matchedChapterInfo, subjId);

  let chapterConditionSql = matchedMcqChapterId ? `chapter_id = '${matchedMcqChapterId}'` : "";
  if (!chapterConditionSql && chapterKeywords.length > 0) {
    const kwSql = chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
    chapterConditionSql = `(${kwSql})`;
  }

  // In-Memory Question Pool Cache for ultra-fast instant 0ms responses!
  const yrKey = years.length > 0 ? years.join('_') : 'all';
  const poolKey = `mcq_pool:${subjId || 'any'}:${matchedMcqChapterId || 'none'}:${boardTag || 'none'}:${yrKey}:${diff}`;
  let qRows = appCache.get(poolKey);
  console.log(`[MCQ Tool] poolKey="${poolKey}", cacheHit=${Boolean(qRows && qRows.length)}`);

  if (!qRows || qRows.length === 0) {
    const baseConditions = [`type = 'MCQ'`, `question_text != ''`, `answer != ''`, `option_a != ''`, `option_b != ''`];
    if (subjId) baseConditions.push(`subject_id = '${subjId}'`);
    if (chapterConditionSql) baseConditions.push(chapterConditionSql);

    // Chapter-level concept guards for collision-prone chapters (e.g. Physics Optics Reflection vs Refraction)
    if (subjId === 'ssc_physics') {
      if (matchedMcqChapterId === 'ch_0009' || rawT.includes('প্রতিসরণ')) {
        baseConditions.push(`(question_text NOT LIKE '%অবতল দর্পণ%' AND question_text NOT LIKE '%উত্তল দর্পণ%' AND question_text NOT LIKE '%সমতল দর্পণ%' AND option_a NOT LIKE '%অবতল দর্পণ%' AND option_b NOT LIKE '%অবতল দর্পণ%')`);
      } else if (matchedMcqChapterId === 'ch_0008' || rawT.includes('প্রতিফলন')) {
        baseConditions.push(`(question_text NOT LIKE '%উত্তল লেন্স%' AND question_text NOT LIKE '%অবতল লেন্স%' AND question_text NOT LIKE '%লেন্সের ক্ষমতা%')`);
      }
    }

    let whereClauses = [...baseConditions];

    if (years.length > 0) {
      whereClauses.push(buildYearSqlConditions(boardTag, years));
    } else if (boardTag && boardTag !== "RANDOM") {
      whereClauses.push(`tags LIKE '%${boardTag}%'`);
    } else {
      whereClauses.push(`tags != '' AND tags IS NOT NULL`);
    }

    if (diff === "hard") {
      whereClauses.push(`(tags LIKE '%CC%' OR tags LIKE '%RUMC%' OR tags LIKE '%DRMC%' OR tags LIKE '%SJHSS%' OR question_text LIKE '%নিচের কোনটি সঠিক%' OR question_text LIKE '%i.%')`);
    } else if (diff === "easy") {
      whereClauses.push(`question_text NOT LIKE '%নিচের কোনটি সঠিক%' AND LENGTH(question_text) < 100`);
    }

    // Fast join-free query with recent-year priority!
    let sql = `
      SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
      FROM questions
      WHERE ${whereClauses.join(" AND ")}
      ${RECENT_YEAR_ORDER_BY}
      LIMIT 80;
    `;
    let res = await executeRawSql(sql);

    // Fallback 1: If board + year was too restrictive, try requested years across ANY authentic board first!
    if (res.rows.length === 0 && boardTag && boardTag !== "RANDOM" && years.length > 0) {
      const yrAllBoards = buildYearSqlConditions(null, years);
      const fbWhere1 = [...baseConditions, yrAllBoards];
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbWhere1.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    // Fallback 2: Try board without year restriction
    if (res.rows.length === 0 && boardTag && boardTag !== "RANDOM") {
      const fbWhere2 = [...baseConditions, `tags LIKE '%${boardTag}%'`];
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbWhere2.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    // Fallback 3: If this specific board has no questions in this chapter, try without board filter
    if (res.rows.length === 0) {
      const fbWhere3 = [...baseConditions, `tags != '' AND tags IS NOT NULL`];
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbWhere3.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    // Fallback 3.5: If verified chapter had 0 questions, check unmapped questions using concepts
    if (res.rows.length === 0 && chapterKeywords.length > 0) {
      const kwSql = chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
      const fbUnmapped = [`question_text != ''`, `answer != ''`, `type = 'MCQ'`, `(chapter_id NOT LIKE 'ch_%' AND (${kwSql}))`];
      if (subjId) fbUnmapped.push(`subject_id = '${subjId}'`);
      let fbUnmappedWhere = [...fbUnmapped];
      if (boardTag && boardTag !== "RANDOM") {
        fbUnmappedWhere.push(`tags LIKE '%${boardTag}%'`);
      } else {
        fbUnmappedWhere.push(`tags != '' AND tags IS NOT NULL`);
      }
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbUnmappedWhere.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    // Fallback 4: General subject fallback ONLY IF user did not specify chapter/topic
    if (res.rows.length === 0 && !rawT) {
      const fbWhere4 = [`question_text != ''`, `answer != ''`, `type = 'MCQ'`];
      if (subjId) fbWhere4.push(`subject_id = '${subjId}'`);
      if (boardTag && boardTag !== "RANDOM") fbWhere4.push(`tags LIKE '%${boardTag}%'`);
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbWhere4.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    qRows = res.rows;
    if (qRows && qRows.length > 0) {
      appCache.set(poolKey, qRows, 600);
    }
  }

  // Universal Semantic Chapter Relevance Filter:
  // Discard any candidate rows that have zero target concepts and multiple alien concepts from another chapter
  const targetOrder = matchedChapterInfo?.order_num;
  const verifiedRows = (qRows && targetOrder)
    ? qRows.filter(r => isQuestionRelevantToChapter(r, subjId, targetOrder))
    : (qRows || []);
  const activePool = verifiedRows.length > 0 ? verifiedRows : (qRows || []);

  // Sample prioritizing the most recent available years in activePool
  const topSlice = activePool.slice(0, Math.max(count * 4, 8));
  let sampled = topSlice.length > 0 ? [...topSlice].sort(() => Math.random() - 0.5).slice(0, count) : [];
  let res = { rows: sampled };

  if (!res.rows || res.rows.length === 0) {
    return {
      subject: subjId || "all",
      quiz: [],
      status: "not_found",
      message: "নির্দিষ্ট অধ্যায়ে কোনো বহুনির্বাচনী প্রশ্ন পাওয়া যায়নি।"
    };
  }

  const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
  const rawAns = res.rows[0]?.answer || '';
  const normAns = toBnAns[rawAns] || rawAns || 'খ';

  const allChapters = await getAllChaptersCached();
  const chObj = allChapters.find(c => c.id === (res.rows[0]?.chapter_id || matchedMcqChapterId));
  const chName = chObj?.name || matchedChapterInfo?.name || "";
  const chOrder = chObj?.order_num || matchedChapterInfo?.order_num || "";
  const chapterDisplay = chName ? `অধ্যায় ${toBnDigits(chOrder)}: ${chName}` : "";

  const qTag = res.rows[0]?.tags || "";
  const hasMatchedBoard = boardTag ? qTag.includes(boardTag) : true;
  const boardWarning = (!hasMatchedBoard && boardTag)
    ? ` (সতর্কতা: শিক্ষার্থী ${args.board} বোর্ডের প্রশ্ন চেয়েছিল, ডেটাবেসে এই অধ্যায়ের ${formatTag(qTag)} প্রশ্ন পাওয়ায় তা দেওয়া হয়েছে। শিক্ষার্থীকে বলবে: "${args.board} বোর্ডের সমমানের চমৎকার একটি বোর্ড প্রশ্ন দিচ্ছি...")`
    : "";

  return {
    subject: subjId || "all",
    actual_chapter: {
      id: res.rows[0]?.chapter_id || matchedMcqChapterId,
      order_num: chOrder,
      name: chName,
      display: chapterDisplay
    },
    board: args.board || "all",
    year: args.year || "all",
    mode: isMockTest ? "mock_test" : "practice",
    quiz: res.rows.map(r => ({
      ...r,
      formatted_source: formatTag(r.tags),
      all_board_tags: r.tags
    })),
    raw_answer_code: normAns,
    instructions_for_mentor: isMockTest
      ? `অ্যাডাপ্টিভ কুইজ মোড: এটি ১০০% আসল ও প্রামাণিক বোর্ড পরীক্ষা/ক্যাডেট কলেজের প্রশ্ন [বোর্ড: ${formatTag(qTag)}]${boardWarning}। শিক্ষার্থীর সামনে কোনো কাল্পনিক ট্যাগ ছাড়া শুধু প্রশ্ন ও ৪টি অপশন (ক, খ, গ, ঘ) তুলে ধরো এবং শেষে [ans: ${normAns}] [qid: ${res.rows[0]?.id || ''}] কোডটি দাও। ভুলেও সঠিক উত্তর ও ব্যাখ্যা লিখবে না! শিক্ষার্থী অপশন নির্বাচন করলে পরবর্তী টার্নে মূল্যায়ন করবে।`
      : `প্র্যাকটিস কুইজ মোড: এটি ১০০% প্রামাণিক প্রশ্ন [বোর্ড: ${formatTag(qTag)}]${boardWarning}। সুন্দরভাবে উপস্থাপন করে শেষে [ans: ${normAns}] [qid: ${res.rows[0]?.id || ''}] কোডটি দাও।`
  };
}
