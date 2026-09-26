// Chapter Indexing, Inverted Token Matching, and Dynamic Resolution Engine
import { executeRawSql } from "../../core/db/client.js";
import { appCache } from "../../core/cache.js";
import { normalizeSubject } from "../../config/subject-map.js";
import {
  extractChapterNum,
  STOP_WORDS_IR,
  normalizeAcademicString
} from "../../config/chapter-map.js";

let cachedChapters = null;
let tokenDocFreq = new Map();
let chapterTokensMap = new Map();
let isCorpusIndexed = false;
const dynamicDbLookupCache = new Map();

export function stemBnToken(t) {
  if (!t || t.length <= 3) return t;
  if (t.endsWith('ের') && t.length >= 5) return t.slice(0, -2);
  if (t.endsWith('গুলো') && t.length >= 6) return t.slice(0, -4);
  if (t.endsWith('গুলি') && t.length >= 6) return t.slice(0, -4);
  if (t.endsWith('তে') && t.length >= 4) return t.slice(0, -2);
  if (t.endsWith('কে') && t.length >= 4) return t.slice(0, -2);
  if (t.endsWith('র') && t.length >= 4) return t.slice(0, -1);
  if (t.endsWith('ে') && t.length >= 4) return t.slice(0, -1);
  return t;
}

export function getSubjectForChapter(r) {
  const o = parseInt(r.order_num, 10);
  if (r.id?.startsWith('phys_') || (o >= 33 && o <= 45)) return { subject_id: 'hsc_physics', relative_num: o - 32 };
  if (r.id?.startsWith('chem_') || (o >= 46 && o <= 55)) return { subject_id: 'hsc_chemistry', relative_num: o - 45 };
  if (r.id?.startsWith('bio_') || (o >= 56 && o <= 79)) return { subject_id: 'hsc_biology', relative_num: o - 55 };
  if (r.id?.startsWith('math_') || (o >= 80 && o <= 99)) return { subject_id: 'hsc_math', relative_num: o - 79 };
  if (o >= 100 && o <= 105) return { subject_id: 'hsc_ict', relative_num: o - 99 };
  if (o <= 29) return { subject_id: 'hsc_bangla', relative_num: o };
  if (o <= 32) return { subject_id: 'hsc_english', relative_num: o - 29 };
  return { subject_id: 'hsc_general', relative_num: o };
}

function buildCorpusIndex(chapters) {
  if (!chapters || chapters.length === 0) return;
  tokenDocFreq.clear();
  chapterTokensMap.clear();

  for (const ch of chapters) {
    const normName = normalizeAcademicString(ch.name);
    const titleTokens = normName.split(' ').filter(t => t.length >= 2 && !STOP_WORDS_IR.has(t));
    const stemmed = titleTokens.map(stemBnToken).filter(t => t.length >= 2 && !STOP_WORDS_IR.has(t));
    const allTokens = [...new Set([...titleTokens, ...stemmed])];
    chapterTokensMap.set(ch.id, allTokens);
    for (const t of allTokens) {
      tokenDocFreq.set(t, (tokenDocFreq.get(t) || 0) + 1);
    }
  }
  isCorpusIndexed = true;
}

function getIDF(token, totalDocs) {
  const df = tokenDocFreq.get(token) || 1;
  return Math.log(1 + (totalDocs / df));
}

export function getChaptersSync() {
  if (cachedChapters && cachedChapters.length > 0) return cachedChapters;
  const fromCache = appCache.get("all_hsc_chapters");
  if (fromCache && fromCache.length > 0) {
    cachedChapters = fromCache;
    return cachedChapters;
  }
  return [];
}

export async function getAllChaptersCached() {
  if (cachedChapters && cachedChapters.length > 0) {
    if (!isCorpusIndexed) buildCorpusIndex(cachedChapters);
    return cachedChapters;
  }
  const fromCache = appCache.get("all_hsc_chapters");
  if (fromCache && fromCache.length > 0) {
    cachedChapters = fromCache;
    buildCorpusIndex(cachedChapters);
    return cachedChapters;
  }
  try {
    const res = await executeRawSql("SELECT id, subject_id, name, order_num FROM chapters ORDER BY CAST(order_num AS INTEGER) ASC;");
    if (res.rows && res.rows.length > 0) {
      cachedChapters = res.rows.map(r => {
        const meta = getSubjectForChapter(r);
        return {
          ...r,
          subject_id: meta.subject_id,
          relative_num: meta.relative_num
        };
      });
      appCache.set("all_hsc_chapters", cachedChapters, 3600);
      buildCorpusIndex(cachedChapters);
    }
  } catch (e) {
    console.error("Failed to load chapters cache:", e.message);
  }
  return cachedChapters || [];
}

// Background preload
getAllChaptersCached().catch(() => {});

export async function findChapterCached(rawTopicOrCh, subjId = null) {
  if (!rawTopicOrCh) return null;
  const all = await getAllChaptersCached();
  if (!all.length) return null;

  // Extract all available textual signals from string or object
  let fullContext = "";
  let targetSubj = subjId ? normalizeSubject(subjId) : null;
  let targetChapterNum = null;

  if (typeof rawTopicOrCh === "object" && rawTopicOrCh !== null) {
    if (rawTopicOrCh.chapter) {
      targetChapterNum = extractChapterNum(rawTopicOrCh.chapter);
    }
    const parts = [
      rawTopicOrCh.chapter,
      rawTopicOrCh.topic,
      rawTopicOrCh.query,
      rawTopicOrCh.userMessage
    ].filter(Boolean);
    fullContext = parts.join(" ");
    targetSubj = rawTopicOrCh.subject ? normalizeSubject(rawTopicOrCh.subject) : (targetSubj || normalizeSubject(fullContext));
  } else {
    fullContext = String(rawTopicOrCh);
    targetChapterNum = extractChapterNum(fullContext);
    targetSubj = targetSubj || normalizeSubject(fullContext);
  }

  if (!targetChapterNum) {
    targetChapterNum = extractChapterNum(fullContext);
  }

  // TIER 0: 100% Deterministic Subject + Chapter Number Resolution
  if (targetSubj && targetChapterNum) {
    const numInt = parseInt(targetChapterNum, 10);
    // Match by relative number within this subject or absolute order_num
    const directCh = all.find(c => c.subject_id === targetSubj && (c.relative_num === numInt || parseInt(c.order_num, 10) === numInt));
    if (directCh) return directCh;
  }

  // Broad Syllabus / Entire Book check: do not map to a single chapter
  const isBroadSyllabus = /সম্পূর্ণ|পুরো\s*(?:বই|সিলেবাস|পাঠ্যক্রম)|সব\s*অধ্যায়|সকল\s*অধ্যায়|ফুল\s*বই|ফুল\s*সিলেবাস|full\s*(?:syllabus|book)|all\s*chapters|(?:1st|2nd|১ম|২য়|প্রথম|দ্বিতীয়|first|second)\s*(?:paper|পত্র)?\s*(?:er\s*)?(?:list|তালিকা|অধ্যায়|chapter|নাম)|(?:অধ্যায়গুলো|অধ্যায়ের\s*তালিকা|অধ্যায়\s*তালিকা|সিলেবাস|syllabus|\blist\b|তালিকা)/i.test(fullContext);
  if (isBroadSyllabus && !targetChapterNum) {
    return null;
  }

  const rawClean = normalizeAcademicString(fullContext);
  const extractedNum = targetChapterNum;
  const rawTokens = rawClean.split(' ').filter(t => t.length >= 2 && !STOP_WORDS_IR.has(t));
  const queryTokens = [...new Set([
    ...rawTokens,
    ...rawTokens.map(stemBnToken).filter(t => t.length >= 2 && !STOP_WORDS_IR.has(t))
  ])];

  // If query contains no meaningful academic tokens and no explicit number, abort immediately
  if (queryTokens.length === 0 && !extractedNum) {
    return null;
  }

  let bestMatch = null;
  let highestScore = -99999;
  const totalChapters = all.length;

  for (const c of all) {
    let score = 0;
    const normChName = normalizeAcademicString(c.name);
    const chNum = parseInt(c.order_num, 10);
    const isSameSubj = targetSubj && c.subject_id === targetSubj;
    const chTokens = chapterTokensMap.get(c.id) || [];

    // Paper-level pseudo-chapters (Bangla 1st/2nd, English 1st/2nd/Admission)
    // NEVER match unless user explicitly mentioned that subject or targetSubj matches
    if (chNum >= 28 && chNum <= 32) {
      const mentionsPaperSubject = (chNum <= 29 && /(?:bangla|বাংলা)/i.test(rawClean)) ||
                                   (chNum >= 30 && /(?:english|ইংরেজি)/i.test(rawClean));
      if (!isSameSubj && !mentionsPaperSubject) {
        continue;
      }
    }

    // Strict subject isolation: if targetSubj is active, heavily penalize chapters from other subjects
    if (targetSubj && !isSameSubj) {
      score -= 5000;
    }

    // 1. Exact normalized name match
    if (rawClean === normChName) {
      score += 2500;
    } else if (rawClean.includes(normChName)) {
      score += 1800 + (normChName.length * 8);
    } else if (normChName.includes(rawClean) && rawClean.length >= 3) {
      score += 1400 + (rawClean.length * 8);
    }

    // 2. Explicit chapter number match
    if (extractedNum) {
      const numInt = parseInt(extractedNum, 10);
      if (c.relative_num === numInt || chNum === numInt) {
        score += isSameSubj ? 1500 : 600;
      }
    }

    // 3. Dynamic BM25 / TF-IDF Token Similarity
    let matchedWeight = 0;
    let matchedCount = 0;
    for (const qt of queryTokens) {
      const isExact = chTokens.includes(qt);
      const isSub = !isExact && chTokens.some(ct => (ct.length >= 3 && qt.length >= 3 && (ct.includes(qt) || qt.includes(ct))));
      if (isExact || isSub) {
        const idf = getIDF(qt, totalChapters);
        matchedWeight += idf * (isExact ? 200 : 120);
        matchedCount++;
      }
    }
    score += matchedWeight;

    if (isSameSubj) {
      score += 200;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = c;
    }
  }

  if (bestMatch && highestScore >= 300) {
    return bestMatch;
  }

  return null;
}
