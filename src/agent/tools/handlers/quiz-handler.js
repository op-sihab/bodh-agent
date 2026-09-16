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
  extractDirectTopicTokens,
  isQuestionRelevantToChapter,
  RECENT_YEAR_ORDER_BY
} from "../../../config/chapter-map.js";
import { findChapterCached, getAllChaptersCached } from "../helpers.js";

export async function handleGetMcqQuiz(args) {
  let subjId = normalizeSubject(args.subject);

  const rawT = [args.chapter, args.topic, args.query].filter(Boolean).join(" ");
  const isFullSyllabus = /সম্পূর্ণ|পুরো|সব\s*অধ্যায়|সকল\s*অধ্যায়|ফুল\s*বই|ফুল\s*সিলেবাস|full\s*(?:syllabus|book)|all\s*chapters/i.test(args.chapter || "") ||
                         /সম্পূর্ণ\s*(?:বই|সিলেবাস|পাঠ্যক্রম)|পুরো\s*(?:বই|সিলেবাস|পাঠ্যক্রম)|সব\s*অধ্যায়|সকল\s*অধ্যায়|ফুল\s*বই|ফুল\s*সিলেবাস/i.test(rawT);

  const matchedChapterInfo = isFullSyllabus ? null : await findChapterCached(args, subjId);
  if (matchedChapterInfo && matchedChapterInfo.subject_id) {
    subjId = matchedChapterInfo.subject_id;
  }
  const matchedMcqChapterId = matchedChapterInfo ? matchedChapterInfo.id : null;

  // Granular Topic / Story tokens (e.g. 'নিমগাছ', 'কপোতাক্ষ নদ', 'জারণ-বিজারণ')
  const directTopicTokens = isFullSyllabus ? [] : extractDirectTopicTokens(rawT, matchedChapterInfo);

  // Board filter
  const boardTag = normalizeBoard(args.board);

  // Year filter
  const years = parseYearFilter(args.year);

  // Difficulty level
  const diff = args.difficulty || (args.board ? "standard" : "medium");
  const count = Math.min(Math.max(parseInt(args.count) || 1, 1), 30);
  const isMockTest = args.mode === "mock_test";

  // Extract search keywords for this chapter/topic
  const chapterKeywords = isFullSyllabus ? [] : extractChapterKeywords(rawT, matchedChapterInfo, subjId);
  const kwSql = (chapterKeywords.length > 0 && !isFullSyllabus)
    ? chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ')
    : '';

  let chapterConditionSql = "";
  if (matchedMcqChapterId && kwSql) {
    chapterConditionSql = `(chapter_id = '${matchedMcqChapterId}' OR (chapter_id NOT LIKE 'ch_%' AND (${kwSql})))`;
  } else if (matchedMcqChapterId) {
    chapterConditionSql = `chapter_id = '${matchedMcqChapterId}'`;
  } else if (kwSql) {
    chapterConditionSql = `(${kwSql})`;
  }

  // If specific story/topic tokens exist, enforce topic-level filtering
  let topicConditionSql = "";
  if (directTopicTokens.length > 0 && !isFullSyllabus) {
    const tKw = directTopicTokens.map(t => `(question_text LIKE '%${t.replace(/'/g, "''")}%' OR question_html LIKE '%${t.replace(/'/g, "''")}%')`).join(' OR ');
    topicConditionSql = `(${tKw})`;
  }

  // In-Memory Question Pool Cache for ultra-fast instant 0ms responses!
  const yrKey = years.length > 0 ? years.join('_') : 'all';
  const topicKey = directTopicTokens.length > 0 ? directTopicTokens.join('_') : 'all';
  const poolKey = `mcq_pool:${subjId || 'any'}:${matchedMcqChapterId || 'none'}:${topicKey}:${boardTag || 'none'}:${yrKey}:${diff}`;
  let qRows = appCache.get(poolKey);
  console.log(`[MCQ Tool] poolKey="${poolKey}", cacheHit=${Boolean(qRows && qRows.length)}`);

  if (!qRows || qRows.length === 0) {
    const baseConditions = [`type = 'MCQ'`, `question_text != ''`, `answer != ''`, `option_a != ''`, `option_b != ''`];
    if (subjId) baseConditions.push(`subject_id = '${subjId}'`);
    if (chapterConditionSql) baseConditions.push(chapterConditionSql);
    if (topicConditionSql) baseConditions.push(topicConditionSql);

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
    if (res.rows.length < count && boardTag && boardTag !== "RANDOM" && years.length > 0) {
      const yrAllBoards = buildYearSqlConditions(null, years);
      const existingIds = res.rows.map(r => `'${r.id}'`);
      const fbWhere1 = [...baseConditions, yrAllBoards];
      if (existingIds.length > 0) fbWhere1.push(`id NOT IN (${existingIds.join(',')})`);
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbWhere1.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      const fbRes1 = await executeRawSql(sql);
      if (fbRes1.rows && fbRes1.rows.length > 0) {
        res.rows = [...res.rows, ...fbRes1.rows];
      }
    }

    // Fallback 2: Try board without year restriction
    if (res.rows.length < count && boardTag && boardTag !== "RANDOM") {
      const existingIds = res.rows.map(r => `'${r.id}'`);
      const fbWhere2 = [...baseConditions, `tags LIKE '%${boardTag}%'`];
      if (existingIds.length > 0) fbWhere2.push(`id NOT IN (${existingIds.join(',')})`);
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbWhere2.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      const fbRes2 = await executeRawSql(sql);
      if (fbRes2.rows && fbRes2.rows.length > 0) {
        res.rows = [...res.rows, ...fbRes2.rows];
      }
    }

    // Fallback 3: If this specific board has fewer questions in this chapter, try without board filter
    if (res.rows.length < count) {
      const existingIds = res.rows.map(r => `'${r.id}'`);
      const fbWhere3 = [...baseConditions, `tags != '' AND tags IS NOT NULL`];
      if (existingIds.length > 0) fbWhere3.push(`id NOT IN (${existingIds.join(',')})`);
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbWhere3.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      const fbRes3 = await executeRawSql(sql);
      if (fbRes3.rows && fbRes3.rows.length > 0) {
        res.rows = [...res.rows, ...fbRes3.rows];
      }
    }

    // Fallback 3.5: If verified chapter still has fewer questions than count, check unmapped questions using concepts
    if (res.rows.length < count && kwSql) {
      const existingIds = res.rows.map(r => `'${r.id}'`);
      const fbUnmapped = [`question_text != ''`, `answer != ''`, `type = 'MCQ'`, `(chapter_id NOT LIKE 'ch_%' AND (${kwSql}))`];
      if (subjId) fbUnmapped.push(`subject_id = '${subjId}'`);
      fbUnmapped.push(`tags != '' AND tags IS NOT NULL`);
      if (existingIds.length > 0) fbUnmapped.push(`id NOT IN (${existingIds.join(',')})`);
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbUnmapped.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      const fbRes35 = await executeRawSql(sql);
      if (fbRes35.rows && fbRes35.rows.length > 0) {
        res.rows = [...res.rows, ...fbRes35.rows];
      }
    }

    // Fallback 4: General subject fallback if fewer than count and not full syllabus or broad request
    if (res.rows.length < count && subjId) {
      const existingIds = res.rows.map(r => `'${r.id}'`);
      const fbWhere4 = [`question_text != ''`, `answer != ''`, `type = 'MCQ'`, `subject_id = '${subjId}'`, `tags != '' AND tags IS NOT NULL`];
      if (existingIds.length > 0) fbWhere4.push(`id NOT IN (${existingIds.join(',')})`);
      sql = `
        SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
        FROM questions
        WHERE ${fbWhere4.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      const fbRes4 = await executeRawSql(sql);
      if (fbRes4.rows && fbRes4.rows.length > 0) {
        res.rows = [...res.rows, ...fbRes4.rows];
      }
    }

    qRows = res.rows;
    if (qRows && qRows.length > 0) {
      appCache.set(poolKey, qRows, 600);
    }
  }

  // Universal Semantic Chapter Relevance Filter:
  // Discard any candidate rows that have zero target concepts and multiple alien concepts from another chapter
  const targetOrder = matchedChapterInfo?.order_num;
  let verifiedRows = (qRows && targetOrder)
    ? qRows.filter(r => isQuestionRelevantToChapter(r, subjId, targetOrder))
    : (qRows || []);

  // If user requested a specific story/topic (e.g. 'নিমগাছ', 'কপোতাক্ষ নদ'), strictly retain topic-matched questions!
  if (directTopicTokens.length > 0 && verifiedRows.length > 0) {
    const topicFiltered = verifiedRows.filter(r => {
      const allText = `${r.question_text || ''} ${r.question_html || ''} ${r.tags || ''}`;
      return directTopicTokens.some(t => allText.includes(t));
    });
    if (topicFiltered.length >= count) {
      verifiedRows = topicFiltered;
    } else if (topicFiltered.length > 0) {
      const used = new Set(topicFiltered.map(q => q.id));
      const rest = verifiedRows.filter(q => !used.has(q.id));
      verifiedRows = [...topicFiltered, ...rest];
    }
  }

  const activePool = verifiedRows.length > 0 ? verifiedRows : (qRows || []);

  // Sample prioritizing the most recent available years in activePool
  const topSlice = activePool.slice(0, Math.max(count * 4, 8));
  let sampled = topSlice.length > 0 ? [...topSlice].sort(() => Math.random() - 0.5).slice(0, count) : [];

  // ABSOLUTE GUARANTEE: Never return fewer questions than count if questions exist
  if (sampled.length < count) {
    const sampledIds = new Set(sampled.map(r => r.id));
    for (const r of (verifiedRows || [])) {
      if (sampled.length >= count) break;
      if (!sampledIds.has(r.id)) {
        sampled.push(r);
        sampledIds.add(r.id);
      }
    }
    if (sampled.length < count && qRows) {
      for (const r of qRows) {
        if (sampled.length >= count) break;
        if (!sampledIds.has(r.id)) {
          sampled.push(r);
          sampledIds.add(r.id);
        }
      }
    }
  }

  if (sampled.length < count && subjId) {
    const sampledIds = new Set(sampled.map(r => r.id));
    const needed = count - sampled.length;
    const finalFbSql = `
      SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
      FROM questions
      WHERE type = 'MCQ' AND question_text != '' AND answer != '' AND option_a != '' AND option_b != '' AND subject_id = '${subjId}'
      ${sampledIds.size > 0 ? `AND id NOT IN (${[...sampledIds].map(id => `'${id}'`).join(',')})` : ''}
      ${RECENT_YEAR_ORDER_BY}
      LIMIT ${needed * 4};
    `;
    const finalFbRes = await executeRawSql(finalFbSql);
    if (finalFbRes.rows && finalFbRes.rows.length > 0) {
      const extra = finalFbRes.rows.slice(0, needed);
      sampled.push(...extra);
    }
  }

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
  const chObj = isFullSyllabus ? null : allChapters.find(c => c.id === (res.rows[0]?.chapter_id || matchedMcqChapterId));
  const chName = isFullSyllabus ? "সম্পূর্ণ বই" : (chObj?.name || matchedChapterInfo?.name || "");
  const chOrder = isFullSyllabus ? "all" : (chObj?.order_num || matchedChapterInfo?.order_num || "");
  const chapterDisplay = isFullSyllabus ? "সম্পূর্ণ বই" : (chName ? `অধ্যায় ${toBnDigits(chOrder)}: ${chName}` : "");

  const qTag = res.rows[0]?.tags || "";
  const hasMatchedBoard = boardTag ? qTag.includes(boardTag) : true;
  const boardWarning = (!hasMatchedBoard && boardTag)
    ? ` (সতর্কতা: শিক্ষার্থী ${args.board} বোর্ডের প্রশ্ন চেয়েছিল, ডেটাবেসে এই অধ্যায়ের ${formatTag(qTag)} প্রশ্ন পাওয়ায় তা দেওয়া হয়েছে। শিক্ষার্থীকে বলবে: "${args.board} বোর্ডের সমমানের চমৎকার একটি বোর্ড প্রশ্ন দিচ্ছি...")`
    : "";

  let specificTopicName = "";
  if (directTopicTokens.length > 0) {
    const qText = `${res.rows[0]?.question_text || ''} ${res.rows[0]?.tags || ''}`;
    const foundToken = directTopicTokens.find(t => qText.includes(t));
    if (foundToken) {
      specificTopicName = foundToken;
    }
  }

  const topicInstruction = specificTopicName
    ? ` এই প্রশ্নটি সুনির্দিষ্টভাবে '${specificTopicName}' অংশের। উত্তরের শুরুতে স্পষ্টভাবে বলবে: "''${specificTopicName}' থেকে একটি গুরুত্বপূর্ণ বোর্ড বহুনির্বাচনী প্রশ্ন নিচে দেওয়া হলো—"। ভুলেও অন্য কোনো অধ্যায়ের সাথে কাল্পনিক যোগসূত্র টানবে না!`
    : "";

  return {
    subject: subjId || "all",
    actual_chapter: {
      id: isFullSyllabus ? "all" : (res.rows[0]?.chapter_id || matchedMcqChapterId),
      order_num: chOrder,
      name: isFullSyllabus ? "সম্পূর্ণ বই" : (specificTopicName || chName),
      display: isFullSyllabus ? "সম্পূর্ণ বই" : (specificTopicName ? `'${specificTopicName}'` : chapterDisplay)
    },
    board: args.board || "all",
    year: args.year || "all",
    mode: isMockTest ? "mock_test" : "practice",
    quiz: res.rows.map(r => ({
      ...r,
      formatted_source: formatTag(r.tags),
      all_board_tags: r.tags,
      correct_answer_bn: toBnAns[r.answer] || r.answer || 'খ'
    })),
    raw_answer_code: normAns,
    instructions_for_mentor: res.rows.length > 1
      ? `মাল্টিপল বহুনির্বাচনী/এক্সাম মোড: ডেটাবেস থেকে মোট ${res.rows.length}টি প্রামাণিক বোর্ড ও ক্যাডেট প্রশ্ন পাওয়া গেছে। প্রতিটি প্রশ্ন (১, ২, ৩...) ৪টি অপশনসহ স্পষ্টভাবে উপস্থাপন করো এবং প্রতিটি প্রশ্নের শেষে নির্দিষ্ট [ans: ক/খ/গ/ঘ] ও [qid: ...] ট্যাগ দাও যাতে ইন্টারঅ্যাক্টিভ এক্সাম মোড কাজ করে।`
      : (isMockTest
        ? `অ্যাডাপ্টিভ কুইজ মোড: এটি ১০০% আসল ও প্রামাণিক বোর্ড পরীক্ষা/ক্যাডেট কলেজের প্রশ্ন [বোর্ড: ${formatTag(qTag)}]${boardWarning}।${topicInstruction} শিক্ষার্থীর সামনে কোনো কাল্পনিক ট্যাগ ছাড়া শুধু প্রশ্ন ও ৪টি অপশন (ক, খ, গ, ঘ) তুলে ধরো এবং শেষে [ans: ${normAns}] [qid: ${res.rows[0]?.id || ''}] কোডটি দাও। ভুলেও সঠিক উত্তর ও ব্যাখ্যা লিখবে না! শিক্ষার্থী অপশন নির্বাচন করলে পরবর্তী টার্নে মূল্যায়ন করবে।`
        : `প্র্যাকটিস কুইজ মোড: এটি ১০০% প্রামাণিক প্রশ্ন [বোর্ড: ${formatTag(qTag)}]${boardWarning}।${topicInstruction} সুন্দরভাবে উপস্থাপন করে শেষে [ans: ${normAns}] [qid: ${res.rows[0]?.id || ''}] কোডটি দাও।`)
  };
}
