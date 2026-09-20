// Chapter Indexing, Inverted Token Matching, and Resolution Algorithms
import { executeRawSql } from "../../core/db/client.js";
import { appCache } from "../../core/cache.js";
import { normalizeSubject } from "../../config/subject-map.js";
import {
  extractChapterNum,
  findChapterNumByKeywords,
  normalizeTopic,
  CHAPTER_CONCEPTS_MAP,
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

function buildCorpusIndex(chapters) {
  if (!chapters || chapters.length === 0) return;
  tokenDocFreq.clear();
  chapterTokensMap.clear();

  for (const ch of chapters) {
    const normName = normalizeAcademicString(ch.name);
    const titleTokens = normName.split(' ').filter(t => t.length >= 2 && !STOP_WORDS_IR.has(t));
    const concepts = CHAPTER_CONCEPTS_MAP[ch.subject_id]?.[String(ch.order_num)] || [];
    const conceptTokens = concepts.flatMap(c => normalizeAcademicString(c).split(' ')).filter(t => t.length >= 2 && !STOP_WORDS_IR.has(t));
    const combined = [...titleTokens, ...conceptTokens];
    const stemmed = combined.map(stemBnToken).filter(t => t.length >= 2 && !STOP_WORDS_IR.has(t));
    const allTokens = [...new Set([...combined, ...stemmed])];
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

export async function getAllChaptersCached() {
  if (cachedChapters && cachedChapters.length > 0) {
    if (!isCorpusIndexed) buildCorpusIndex(cachedChapters);
    return cachedChapters;
  }
  const fromCache = appCache.get("all_nctb_chapters");
  if (fromCache && fromCache.length > 0) {
    cachedChapters = fromCache;
    buildCorpusIndex(cachedChapters);
    return cachedChapters;
  }
  try {
    const res = await executeRawSql("SELECT id, subject_id, name, order_num FROM chapters ORDER BY subject_id, CAST(order_num AS INTEGER) ASC;");
    if (res.rows && res.rows.length > 0) {
      cachedChapters = res.rows;
      appCache.set("all_nctb_chapters", cachedChapters, 3600);
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
    const directCh = all.find(c => c.subject_id === targetSubj && parseInt(c.order_num, 10) === numInt);
    if (directCh) return directCh;
  }

  // TIER 0.5: Direct Keyword / Topic / Concept Mapping via findChapterNumByKeywords
  if (targetSubj) {
    const kwNum = findChapterNumByKeywords(fullContext, targetSubj);
    if (kwNum) {
      const numInt = parseInt(kwNum, 10);
      const kwCh = all.find(c => c.subject_id === targetSubj && parseInt(c.order_num, 10) === numInt);
      if (kwCh) return kwCh;
    }
  }

  // Broad Syllabus / Entire Book check: do not map to a single chapter
  const isBroadSyllabus = /সম্পূর্ণ|পুরো\s*(?:বই|সিলেবাস|পাঠ্যক্রম)|সব\s*অধ্যায়|সকল\s*অধ্যায়|ফুল\s*বই|ফুল\s*সিলেবাস|full\s*(?:syllabus|book)|all\s*chapters/i.test(fullContext);
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

    // 1. Exact normalized name match (Punctuation Invariant)
    if (rawClean === normChName) {
      score += 2500;
    } else if (rawClean.includes(normChName)) {
      score += 1800 + (normChName.length * 8);
    } else if (normChName.includes(rawClean) && rawClean.length >= 4) {
      score += 1400 + (rawClean.length * 8);
    }

    // 2. Explicit chapter number match or mismatch penalty
    if (extractedNum) {
      if (chNum === parseInt(extractedNum, 10)) {
        score += isSameSubj ? 1500 : 800;
      } else {
        score -= 1000; // Strong penalty if user specified another number!
      }
    }

    // 3. Dynamic BM25 / TF-IDF Token Similarity (Weighted by Uniqueness across all chapters)
    let matchedWeight = 0;
    let matchedCount = 0;
    for (const qt of queryTokens) {
      // Avoid false positive on "function of X" queries matching Physics Chapter 4 (কাজ, ক্ষমতা ও শক্তি)
      const isWorkGeneric = (qt === 'কাজ' && /(?:এর|\w+ের|\w+র)\s*কাজ\s*(?:কি|কী|গুলো|বর্ণনা|লিখ)/i.test(fullContext));
      if (isWorkGeneric && c.subject_id === 'ssc_physics') {
        continue;
      }

      const isExact = chTokens.includes(qt);
      const isSub = !isExact && chTokens.some(ct => (ct.length >= 4 && qt.length >= 4 && (ct.includes(qt) || qt.includes(ct))));
      if (isExact || isSub) {
        const idf = getIDF(qt, totalChapters);
        matchedWeight += idf * (isExact ? 180 : 100);
        matchedCount++;
      }
    }
    score += matchedWeight;

    // Coverage Bonus & Dynamic Mutual Exclusion Penalty
    if (chTokens.length > 0 && queryTokens.length > 0) {
      const queryOverlapRatio = matchedCount / queryTokens.length;
      const chOverlapRatio = matchedCount / chTokens.length;
      score += (queryOverlapRatio * 400) + (chOverlapRatio * 250);

      // Dynamic mutual exclusion penalty
      const missingTokens = queryTokens.filter(qt => {
        if (qt === 'কাজ' && /(?:এর|\w+ের|\w+র)\s*কাজ/i.test(fullContext)) return false;
        return !chTokens.includes(qt) && !chTokens.some(ct => (ct.length >= 4 && qt.length >= 4 && (ct.includes(qt) || qt.includes(ct))));
      });
      for (const mt of missingTokens) {
        if (tokenDocFreq.has(mt)) {
          score -= getIDF(mt, totalChapters) * 180;
        }
      }
    }

    // 4. Curriculum Concept Map Matching
    const concepts = CHAPTER_CONCEPTS_MAP[c.subject_id]?.[String(c.order_num)] || [];
    const isWorkGenericContext = /(?:এর|\w+ের|\w+র)\s*কাজ\s*(?:কি|কী|গুলো|বর্ণনা|লিখ)/i.test(fullContext);
    for (const con of concepts) {
      const normCon = normalizeAcademicString(con);
      if (normCon === 'কাজ' && c.subject_id === 'ssc_physics' && isWorkGenericContext) {
        continue;
      }
      if (normCon.length >= 2 && (rawClean.includes(normCon) || queryTokens.includes(normCon))) {
        score += 850;
      }
    }

    // 5. Subject Alignment Bonus
    if (isSameSubj) {
      score += 150;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = c;
    }
  }

  // Phase 2 Fallback: If title and concept matching confidence is low (< 350),
  // dynamically query the questions database for specific academic terms only!
  if (highestScore < 350 && queryTokens.length > 0) {
    const searchTerms = queryTokens.filter(t => t.length >= 3 && !STOP_WORDS_IR.has(t) && !/^\d+$/.test(t));
    if (searchTerms.length > 0) {
      const cacheKey = `${targetSubj || 'all'}_${searchTerms.join("_")}`;
      if (dynamicDbLookupCache.has(cacheKey)) {
        const cached = dynamicDbLookupCache.get(cacheKey);
        bestMatch = cached.ch;
        highestScore = cached.score;
      } else {
        const fullPhrase = searchTerms.join(" ");
        const clauses = [`q.question_text LIKE '%${fullPhrase.replace(/'/g, "''")}%'`];
        for (const t of searchTerms) {
          clauses.push(`q.question_text LIKE '%${t.replace(/'/g, "''")}%'`);
        }
        const subjCondition = targetSubj ? `AND c.subject_id = '${targetSubj}'` : '';
        const dbSearchSql = `
          SELECT q.chapter_id, c.id, c.name, c.subject_id, COUNT(*) as cnt 
          FROM questions q 
          JOIN chapters c ON q.chapter_id = c.id 
          WHERE (${clauses.join(' OR ')}) ${subjCondition}
          GROUP BY q.chapter_id, c.id, c.name, c.subject_id 
          HAVING COUNT(*) >= 3
          ORDER BY 
            CASE WHEN q.question_text LIKE '%${fullPhrase.replace(/'/g, "''")}%' THEN 1 ELSE 2 END ASC,
            cnt DESC 
          LIMIT 1;
        `;
        try {
          const dbRes = await executeRawSql(dbSearchSql);
          if (dbRes.rows.length > 0) {
            const foundChId = dbRes.rows[0].chapter_id;
            const foundCh = all.find(c => c.id === foundChId);
            if (foundCh) {
              bestMatch = foundCh;
              highestScore = 400;
              dynamicDbLookupCache.set(cacheKey, { ch: foundCh, score: 400 });
            }
          }
        } catch (e) {
          console.error("Dynamic DB lookup error:", e);
        }
      }
    }
  }

  // If match confidence is solid, return chapter
  if (bestMatch && highestScore >= 300) {
    return bestMatch;
  }

  return null;
}
