// Chapter and Topic Normalization, Year Parsing & SQL Utilities
// Clean, lean utilities for database queries without hardcoded topic bloat

export const BN_TO_EN_DIGITS = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
};

/**
 * Extracts numeric chapter index from string if explicitly mentioned
 */
export function extractChapterNum(raw) {
  if (!raw) return null;
  const str = String(raw).normalize("NFC").trim();
  const enStr = str.replace(/[০-৯]/g, d => BN_TO_EN_DIGITS[d] || d);

  // Match: "ch 2", "chapter 3", "২য় অধ্যায়", "অধ্যায় ৪"
  const m = enStr.match(/(?:অধ্যায়|অধ্যায়|chapter|ch)\s*[:.\-]?\s*(\d{1,2})/i) ||
            enStr.match(/(\d{1,2})\s*(?:তম|নং|শ|ম|র্থ|nd|rd|th)?\s*(?:অধ্যায়|অধ্যায়|chapter)/i) ||
            enStr.match(/^(\d{1,2})\s*(?:নং|er|এর|theke|থেকে)?$/i);

  if (m) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 30) return String(num);
  }

  return null;
}

export function findChapterNumByKeywords(message) {
  if (!message) return null;
  return extractChapterNum(message);
}

export function parseYearFilter(yearInput) {
  if (!yearInput) return [];
  const str = String(yearInput).replace(/[০-৯]/g, d => BN_TO_EN_DIGITS[d] || d).trim();
  if (str === "all" || str === "any" || str === "none") return [];

  const years = [];
  const rangeMatch = str.match(/(\d{2,4})\s*-\s*(\d{2,4})/);
  if (rangeMatch) {
    let start = parseInt(rangeMatch[1]);
    let end = parseInt(rangeMatch[2]);
    if (start < 100) start += 2000;
    if (end < 100) end += 2000;
    for (let y = Math.min(start, end); y <= Math.max(start, end); y++) {
      years.push(String(y).slice(-2));
    }
    return years;
  }

  const matches = str.match(/\b\d{2,4}\b/g);
  if (matches) {
    for (const m of matches) {
      years.push(m.length === 4 ? m.slice(-2) : m);
    }
  }
  return years;
}

export function buildYearSqlConditions(boardCode, years) {
  if (!years || years.length === 0) return "";
  const clauses = [];
  for (const yr of years) {
    if (boardCode && boardCode !== "RANDOM") {
      clauses.push(`tags LIKE '%${boardCode} ${yr}%'`);
      clauses.push(`tags LIKE '%${boardCode}${yr}%'`);
    } else {
      clauses.push(`tags LIKE '% ${yr}%'`);
    }
  }
  return clauses.length > 0 ? `(${clauses.join(" OR ")})` : "";
}

export function normalizeAcademicString(str) {
  if (!str) return "";
  return String(str)
    .normalize("NFC")
    .toLowerCase()
    .replace(/[–—\-:;।?!/&()+,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const RECENT_YEAR_ORDER_BY = `
  ORDER BY 
    CASE 
      WHEN tags LIKE '% 26%' THEN 1 
      WHEN tags LIKE '% 25%' THEN 2 
      WHEN tags LIKE '% 24%' THEN 3 
      WHEN tags LIKE '% 23%' THEN 4 
      WHEN tags LIKE '% 22%' THEN 5 
      WHEN tags LIKE '% 21%' THEN 6 
      ELSE 7 
    END ASC, 
    id DESC
`;

export function normalizeTopic(raw) {
  if (!raw) return "";
  return String(raw).toLowerCase().trim();
}

export const STOP_WORDS_IR = new Set([
  "অধ্যায়", "অধ্যায়", "chapter", "ch", "এর", "থেকে", "theke", "এবং", "ও",
  "দাও", "দেও", "dio", "কুইজ", "quiz", "কোনটি", "কোন", "কি", "কী", "নিচের", "নিচে",
  "বোর্ড", "সাল", "প্রশ্ন", "mcq", "cq", "ভাই", "sir", "please", "plz",
  "1st", "2nd", "১ম", "২য়", "প্রথম", "দ্বিতীয়", "first", "second",
  "paper", "পত্র", "list", "তালিকা", "নাম", "কয়টা", "কয়টা", "সবগুলো", "অধ্যায়গুলো"
]);

export function extractChapterKeywords(rawT, matchedChapterInfo) {
  const candidateNames = [rawT, matchedChapterInfo?.name].filter(Boolean);
  const words = [];
  for (const name of candidateNames) {
    const clean = String(name).replace(/\s+ও\s+/g, " ");
    const parts = clean.split(/[\s,–—\-:;।?!/&()+]+/).map(w => w.trim()).filter(w =>
      w.length >= 2 && !/^\d+$/.test(w) && !/^[০-৯]+$/.test(w) && !STOP_WORDS_IR.has(w.toLowerCase())
    );
    words.push(...parts);
  }
  return [...new Set(words)];
}

export function extractDirectTopicTokens(rawT, matchedChapterInfo) {
  return extractChapterKeywords(rawT, matchedChapterInfo);
}

export function isQuestionRelevantToChapter(question, subjectId, targetChapterNum) {
  return Boolean(question);
}
