// Tool Handler: get_creative_question
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

export async function handleGetCreativeQuestion(args) {
  let subjId = normalizeSubject(args.subject);

  const matchedChapterInfo = await findChapterCached(args, subjId);
  const rawT = [args.chapter, args.topic, args.query].filter(Boolean).join(" ");
  if (matchedChapterInfo && matchedChapterInfo.subject_id) {
    subjId = matchedChapterInfo.subject_id;
  }
  const matchedCqChapterId = matchedChapterInfo ? matchedChapterInfo.id : null;

  // Granular Topic / Story tokens (e.g. 'নিমগাছ', 'কপোতাক্ষ নদ', 'জারণ-বিজারণ')
  const directTopicTokens = extractDirectTopicTokens(rawT, matchedChapterInfo);

  // Board filter
  const boardTag = normalizeBoard(args.board);

  // Year filter (supports ranges like '2020-2025')
  const years = parseYearFilter(args.year);

  // Difficulty level
  const diff = args.difficulty || (args.board ? "standard" : "hard");

  // Extract search keywords for this chapter/topic
  const chapterKeywords = extractChapterKeywords(rawT, matchedChapterInfo, subjId);

  // Two-Tier Chapter Lookup:
  let chapterConditionSql = matchedCqChapterId ? `chapter_id = '${matchedCqChapterId}'` : "";
  if (!chapterConditionSql && chapterKeywords.length > 0) {
    const kwSql = chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
    chapterConditionSql = `(${kwSql})`;
  }

  // If specific story/topic tokens exist, enforce topic-level filtering
  let topicConditionSql = "";
  if (directTopicTokens.length > 0) {
    const tKw = directTopicTokens.map(t => `(question_text LIKE '%${t.replace(/'/g, "''")}%' OR question_html LIKE '%${t.replace(/'/g, "''")}%' OR option_a LIKE '%${t.replace(/'/g, "''")}%' OR option_b LIKE '%${t.replace(/'/g, "''")}%' OR option_c LIKE '%${t.replace(/'/g, "''")}%' OR option_d LIKE '%${t.replace(/'/g, "''")}%')`).join(' OR ');
    topicConditionSql = `(${tKw})`;
  }

  // In-Memory Question Pool Cache for ultra-fast instant 0ms responses!
  const yrKey = years.length > 0 ? years.join('_') : 'all';
  const topicKey = directTopicTokens.length > 0 ? directTopicTokens.join('_') : 'all';
  const poolKey = `cq_pool:${subjId || 'any'}:${matchedCqChapterId || 'none'}:${topicKey}:${boardTag || 'none'}:${yrKey}:${diff}`;
  let qRows = appCache.get(poolKey);
  console.log(`[CQ Tool] poolKey="${poolKey}", cacheHit=${Boolean(qRows && qRows.length)}`);

  if (!qRows || qRows.length === 0) {
    const baseConditions = [`type IN ('CQ_4', 'CQ_3', 'CQ_N')`, `(question_text != '' OR question_html != '' OR option_c != '')`];
    if (subjId) baseConditions.push(`subject_id = '${subjId}'`);
    if (chapterConditionSql) baseConditions.push(chapterConditionSql);
    if (topicConditionSql) baseConditions.push(topicConditionSql);

    // Chapter-level concept guards for collision-prone chapters (e.g. Physics Optics Reflection vs Refraction)
    if (subjId === 'ssc_physics') {
      if (matchedCqChapterId === 'ch_0009' || rawT.includes('প্রতিসরণ')) {
        baseConditions.push(`(question_text NOT LIKE '%অবতল দর্পণ%' AND question_text NOT LIKE '%উত্তল দর্পণ%' AND question_text NOT LIKE '%সমতল দর্পণ%')`);
      } else if (matchedCqChapterId === 'ch_0008' || rawT.includes('প্রতিফলন')) {
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
      if (!boardTag || boardTag === "RANDOM") {
        whereClauses.push(`(type = 'CQ_4' OR tags LIKE '%RCC%' OR tags LIKE '%MCC%' OR tags LIKE '%RUMC%' OR tags LIKE '%DRMC%')`);
      } else {
        whereClauses.push(`(type = 'CQ_4' OR option_d != '')`);
      }
    } else if (diff === "medium") {
      whereClauses.push(`type IN ('CQ_3', 'CQ_4')`);
    }

    // Fast query with recent-year priority!
    let sql = `
      SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
      FROM questions
      WHERE ${whereClauses.join(" AND ")}
      ${RECENT_YEAR_ORDER_BY}
      LIMIT 80;
    `;
    let res = await executeRawSql(sql);

    // Fallback 1: If board + year was too strict, try requested years across ANY board first!
    if (res.rows.length === 0 && boardTag && boardTag !== "RANDOM" && years.length > 0) {
      const yrAllBoards = buildYearSqlConditions(null, years);
      const fb1 = [...baseConditions, yrAllBoards];
      sql = `
        SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
        FROM questions
        WHERE ${fb1.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    // Fallback 2: If still empty, try board without year restriction
    if (res.rows.length === 0 && boardTag && boardTag !== "RANDOM") {
      const fb2 = [...baseConditions, `tags LIKE '%${boardTag}%'`];
      sql = `
        SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
        FROM questions
        WHERE ${fb2.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    // Fallback 3: Any authentic question in this chapter
    if (res.rows.length === 0) {
      const fb3 = [...baseConditions, `tags != '' AND tags IS NOT NULL`];
      sql = `
        SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
        FROM questions
        WHERE ${fb3.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    // Fallback 3.5: If verified chapter ID had 0 questions, check unmapped questions using concepts
    if (res.rows.length === 0 && chapterKeywords.length > 0) {
      const kwSql = chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
      const fbUnmapped = [`type IN ('CQ_4', 'CQ_3', 'CQ_N')`, `(question_text != '' OR question_html != '' OR option_c != '')`, `(chapter_id NOT LIKE 'ch_%' AND (${kwSql}))`];
      if (subjId) fbUnmapped.push(`subject_id = '${subjId}'`);
      let fbUnmappedWhere = [...fbUnmapped];
      if (boardTag && boardTag !== "RANDOM") {
        fbUnmappedWhere.push(`tags LIKE '%${boardTag}%'`);
      } else {
        fbUnmappedWhere.push(`tags != '' AND tags IS NOT NULL`);
      }
      sql = `
        SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
        FROM questions
        WHERE ${fbUnmappedWhere.join(" AND ")}
        ${RECENT_YEAR_ORDER_BY}
        LIMIT 80;
      `;
      res = await executeRawSql(sql);
    }

    // Fallback 4: General subject fallback ONLY IF user did not specify chapter/topic
    if (res.rows.length === 0 && !rawT) {
      const fb4 = [`type IN ('CQ_4', 'CQ_3', 'CQ_N')`, `(question_text != '' OR question_html != '' OR option_c != '')`];
      if (subjId) fb4.push(`subject_id = '${subjId}'`);
      sql = `
        SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
        FROM questions
        WHERE ${fb4.join(" AND ")}
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
  // Discard candidate CQs that have zero target concepts and multiple alien concepts from another chapter
  const targetOrder = matchedChapterInfo?.order_num;
  let verifiedCqRows = (qRows && targetOrder)
    ? qRows.filter(r => isQuestionRelevantToChapter(r, subjId, targetOrder))
    : (qRows || []);

  // If user requested a specific story/topic (e.g. 'নিমগাছ', 'কপোতাক্ষ নদ'), strictly retain topic-matched questions!
  if (directTopicTokens.length > 0 && verifiedCqRows.length > 0) {
    const topicFiltered = verifiedCqRows.filter(r => {
      const allText = `${r.question_text || ''} ${r.question_html || ''} ${r.option_a || ''} ${r.option_b || ''} ${r.option_c || ''} ${r.option_d || ''} ${r.tags || ''}`;
      return directTopicTokens.some(t => allText.includes(t));
    });
    if (topicFiltered.length > 0) {
      verifiedCqRows = topicFiltered;
    }
  }

  const activeCqPool = verifiedCqRows.length > 0 ? verifiedCqRows : (qRows || []);

  // Sample prioritizing the most recent available years in activeCqPool
  const topCqSlice = activeCqPool.slice(0, Math.min(activeCqPool.length, 6));
  const q = topCqSlice.length > 0 ? topCqSlice[Math.floor(Math.random() * topCqSlice.length)] : null;
  if (!q) return { error: "কোনো সৃজনশীল প্রশ্ন পাওয়া যায়নি" };

  const allChapters = await getAllChaptersCached();
  const chObj = allChapters.find(c => c.id === q.chapter_id);
  const chName = chObj?.name || matchedChapterInfo?.name || "";
  const chOrder = chObj?.order_num || matchedChapterInfo?.order_num || "";
  const chapterDisplay = chName ? `অধ্যায় ${toBnDigits(chOrder)}: ${chName}` : "বোর্ড সৃজনশীল প্রশ্ন";

  return {
    question_id: q.id,
    actual_chapter: {
      id: q.chapter_id,
      order_num: chOrder,
      name: chName,
      display: chapterDisplay
    },
    difficulty_level: diff === "hard" ? "কঠিন / অ্যাডভান্সড (উচ্চতর দক্ষতা)" : diff === "medium" ? "মাঝারি (বোর্ড স্ট্যান্ডার্ড)" : "সহজ (বেসিক)",
    board_tag: formatTag(q.tags),
    raw_tag: q.tags,
    stem: q.question_text || q.question_html || "নিচের উদ্দীপকটি লক্ষ করো এবং সংশ্লিষ্ট প্রশ্নগুলোর উত্তর দাও:",
    part_ka: q.option_a || "জ্ঞানমূলক প্রশ্ন",
    part_kha: q.option_b || "অনুধাবনমূলক প্রশ্ন",
    part_ga: q.option_c || "প্রয়োগমূলক প্রশ্ন (৩ নম্বর)",
    part_gha: q.option_d || "উচ্চতর দক্ষতা (৪ নম্বর)",
    examiner_marking_guide: {
      part_ka: "জ্ঞানমূলক (১ নম্বর): ভূমিকা ছাড়া সরাসরি ১ লাইনে সঠিক সংজ্ঞা লিখলে পুরো ১ নম্বর পাওয়া যাবে।",
      part_kha: "অনুধাবনমূলক (২ নম্বর): স্পষ্ট ২টি আলাদা প্যারায় লিখতে হবে। ১ম প্যারায় মূল উত্তর (১ লাইন), ২য় প্যারায় ৩-৪ লাইনে কারণ বা ব্যাখ্যা।",
      part_ga: "প্রয়োগমূলক (৩ নম্বর): দেওয়া আছে তথ্য -> সূত্র -> মান বসানো -> হিসাব -> এককসহ উত্তর। (সতর্কতা: একক না দিলে স্যার ১ নম্বর কেটে নেন!)",
      part_gha: "উচ্চতর দক্ষতা (৪ নম্বর): গাণিতিক প্রমাণ বা যৌক্তিক বিশ্লেষণের পর স্পষ্ট সিদ্ধান্তমূলক সমাপনী বাক্য (যেমন: 'অতএব উদ্দীপকের উক্তিটি সঠিক') লেখা বাধ্যতামূলক।"
    },
    instructions_for_mentor: `সৃজনশীল প্রশ্ন উপস্থাপনের সময় শিরোনামে এই প্রশ্নের আসল অধ্যায় [${chapterDisplay}] এবং বোর্ড/কলেজ ট্যাগ [${formatTag(q.tags)}] স্পষ্টভাবে উল্লেখ করবে। ভুলেও ভুল বা অন্য কোনো অধ্যায়ের নাম লিখবে না! সৃজনশীল প্রশ্ন কুইজ নয়, তাই কোনো অপশন নির্বাচন করতে বলবে না—বরং শিক্ষার্থীকে উদ্দীপক পড়ে ক, খ, গ, ঘ সমাধান করতে বলবে।`
  };
}
