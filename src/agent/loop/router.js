// Orchestrator Decision Router (Big Boss Router)
// Dynamically classifies user intent, scopes tool definitions, and prunes conversation context
// to minimize LLM token consumption and reduce API credit burn by 80-85%.

import { AGENT_TOOLS } from "../tools/definitions.js";

export const INTENT_TYPES = {
  QUIZ_ANSWER: "QUIZ_ANSWER",
  EXAM_AUDIT_REVIEW: "EXAM_AUDIT_REVIEW",
  SYLLABUS_ROADMAP: "SYLLABUS_ROADMAP",
  IMPORTANCE_RANKING: "IMPORTANCE_RANKING",
  MCQ_QUIZ: "MCQ_QUIZ",
  CQ_CREATIVE: "CQ_CREATIVE",
  SIMILAR_PATTERN: "SIMILAR_PATTERN",
  ANALYTICS_SQL: "ANALYTICS_SQL",
  BOARD_QUESTIONS: "BOARD_QUESTIONS",
  GREETING: "GREETING",
  GENERAL: "GENERAL"
};

/**
 * Classify user intent using fast deterministic pattern matching
 */
export function classifyIntent(userMessage, state = {}, isAnswering = false) {
  if (isAnswering) {
    return INTENT_TYPES.QUIZ_ANSWER;
  }

  const raw = (userMessage || "").trim();
  const lower = raw.toLowerCase();

  // Fast check 1: Exam Completion Report / Mistake Review / Performance Audit (0 tool overhead, pure tutoring!)
  if (
    /(?:পরীক্ষা\s*সমাপ্তি|ফলাফল\s*রিপোর্ট|ফলাফল\s*অডিট|মিস্টেক\s*ক্লিনিক|পারফরম্যান্স\s*অডিট|ভুল\s*হওয়া\s*প্রশ্নসমূহ|ভুল\s*প্রশ্নাবলি|আমার\s*ভুল\s*হয়েছিল|ক্লিয়ার\s*করতে\s*চাই\s*কিনা)/i.test(raw)
  ) {
    return INTENT_TYPES.EXAM_AUDIT_REVIEW;
  }

  // Fast check 2: direct option answer
  if (/^(?:উত্তর\s*)?[ক-ঘa-dA-D১-৪]$/i.test(raw) || /^(?:ans|opt|option)\s*[:=]?\s*[a-dক-ঘ১-৪]$/i.test(raw)) {
    return INTENT_TYPES.QUIZ_ANSWER;
  }

  // Similar type or pattern analysis (Highest Priority when student asks for another question of the same pattern)
  if (
    /(?:এই\s*টাইপের|অনুরূপ|similar|একই\s*সূত্রের|আরেকটি\s*প্রশ্ন|আরেকটা\s*প্রশ্ন|আরেকটা\s*mcq|আরেকটি\s*mcq|আরেকটা\s*cq|আরেকটি\s*cq|মাস্টার\s*টাইপ|ব্লুপ্রিন্ট|blueprint|pattern)/i.test(lower)
  ) {
    return INTENT_TYPES.SIMILAR_PATTERN;
  }

  // Board Exam Questions (e.g. "dhaka board er qs dew", "dhaka baord 2026সাধারণ গণিত qs gula sob dew to", "ঢাকা বোর্ডের প্রশ্ন")
  const hasBoardMention = /(?:বোর্ড(?:ের)?|board(?:s|'s)?|baord(?:s)?|borde|ঢাকা(?:র)?|চট্টগ্রাম(?:ের)?|রাজশাহী(?:র)?|সিলেট(?:ের)?|যশোর(?:ের)?|বরিশাল(?:ের)?|দিনাজপুর(?:ের)?|ময়মনসিংহ(?:ের)?|কুমিল্লা(?:র)?|dhaka|ctg|rajshahi|sylhet|jashore|jessore|barishal|dinajpur|mymensingh|comilla)/i.test(lower);
  const hasQuestionMention = /(?:প্রশ্ন|qs|question|নৈর্ব্যক্তিক|mcq|cq|পরীক্ষা|exam|প্রশ্নপত্র)/i.test(lower);

  if (hasBoardMention && hasQuestionMention) {
    return INTENT_TYPES.BOARD_QUESTIONS;
  }

  // MCQ / Quiz / Mock test (Highest Priority for question generation)
  if (
    /(?:mcq|কুইজ|quiz|বহুনির্বাচন|নৈর্ব্যক্তিক|মক\s*টেস্ট|mock\s*test|পরীক্ষা\s*নাও|টেস্ট\s*দাও)/i.test(lower)
  ) {
    return INTENT_TYPES.MCQ_QUIZ;
  }

  // CQ / Creative question
  if (
    /(?:সৃজনশীল|cq|উদ্দীপক|ক\s*খ\s*গ\s*ঘ|গ\s*ও\s*ঘ|creative)/i.test(lower)
  ) {
    return INTENT_TYPES.CQ_CREATIVE;
  }

  // Syllabus / Chapter list
  if (
    /(?:সবগুলো|সকল|সকল\s*অধ্যায়|অধ্যায়গুলোর|অধ্যায়\s*কয়টি|অধ্যায়\s*তালিকা|সিলেবাস|syllabus|chapter\s*list|all\s*chapters|গদ্য\s*ও\s*কবিতা|গদ্য\s*কয়টা|কবিতা\s*কয়টা)/i.test(lower)
  ) {
    return INTENT_TYPES.SYLLABUS_ROADMAP;
  }

  // Importance / Priority / 80-20
  if (
    /(?:৮০\/২০|80\/20|গুরুত্বপূর্ণ|ইম্পর্টেন্ট|important|priorit|আগে\s*পড়ব|কোনগুলো\s*পড়ব|সহজ\s*কোনটা|বেশি\s*আসে|কম\s*পড়ে)/i.test(lower)
  ) {
    return INTENT_TYPES.IMPORTANCE_RANKING;
  }

  // SQL / Deep Database Analytics
  if (
    /(?:কতটি\s*প্রশ্ন|মোট\s*প্রশ্ন|ফ্রিকোয়েন্সি|frequency|sql|database|পরিসংখ্যান|কোন\s*বোর্ডে\s*কত)/i.test(lower)
  ) {
    return INTENT_TYPES.ANALYTICS_SQL;
  }

  // Greetings & Pleasantries (0 tool overhead, minimal token footprint)
  if (
    /^(?:hi|hello|hey|হাই|হ্যালো|হে|হেই|সালাম|আসসালামু\s*আলাইকুম|assalamu\s*alaikum|kemon\s*acho|কেমন\s*আছো|কেমন\s*আছেন|ki\s*khobor|কী\s*খবর|kire|yo|hola|নমস্কার|শুভ\s*(?:সকাল|সন্ধ্যা|রাত্রি|অপরাহ্ন))(?:\s+(?:বোধ|bodh|vai|ভাই|ai|বন্ধু|apu|আপু|কেমন\s*আছো|kemon\s*acho))?[\s!.,?]*$/i.test(raw) ||
    /^(?:hi|hello|hey|হাই|হ্যালো)\s+(?:kemon\s*acho|কেমন\s*আছো|vai|ভাই)[\s!.,?]*$/i.test(raw)
  ) {
    return INTENT_TYPES.GREETING;
  }

  return INTENT_TYPES.GENERAL;
}

/**
 * Returns a focused, minimal subset of tool schemas based on the classified intent
 */
export function getScopedTools(intent) {
  if (intent === INTENT_TYPES.QUIZ_ANSWER || intent === INTENT_TYPES.GREETING || intent === INTENT_TYPES.EXAM_AUDIT_REVIEW) {
    return undefined; // 0 tool overhead when grading a quiz, greeting, or reviewing exam results!
  }

  const toolMap = new Map(AGENT_TOOLS.map(t => [t.function.name, t]));

  switch (intent) {
    case INTENT_TYPES.SYLLABUS_ROADMAP:
      return [
        toolMap.get("get_subject_chapters"),
        toolMap.get("get_chapter_importance_ranking")
      ].filter(Boolean);

    case INTENT_TYPES.IMPORTANCE_RANKING:
      return [
        toolMap.get("get_chapter_importance_ranking"),
        toolMap.get("get_subject_chapters"),
        toolMap.get("check_board_frequency")
      ].filter(Boolean);

    case INTENT_TYPES.MCQ_QUIZ:
      return [
        toolMap.get("get_mcq_quiz"),
        toolMap.get("find_similar_type_questions"),
        toolMap.get("search_question_bank")
      ].filter(Boolean);

    case INTENT_TYPES.CQ_CREATIVE:
      return [
        toolMap.get("get_creative_question"),
        toolMap.get("search_question_bank")
      ].filter(Boolean);

    case INTENT_TYPES.SIMILAR_PATTERN:
      return [
        toolMap.get("find_similar_type_questions"),
        toolMap.get("analyze_chapter_patterns"),
        toolMap.get("get_mcq_quiz"),
        toolMap.get("get_creative_question")
      ].filter(Boolean);

    case INTENT_TYPES.BOARD_QUESTIONS:
      return [
        toolMap.get("get_board_exam_questions"),
        toolMap.get("get_mcq_quiz"),
        toolMap.get("get_creative_question"),
        toolMap.get("search_question_bank")
      ].filter(Boolean);

    case INTENT_TYPES.ANALYTICS_SQL:
      return [
        toolMap.get("query_question_database_sql"),
        toolMap.get("check_board_frequency"),
        toolMap.get("get_board_exam_questions")
      ].filter(Boolean);

    case INTENT_TYPES.GENERAL:
    default:
      return AGENT_TOOLS;
  }
}

/**
 * Prune history messages to minimize token payload:
 * - Strips internal <thought> blocks from older assistant messages
 * - Limits historical turns to the last 4 clean turns
 */
export function pruneHistoryForContext(pastHistory = [], maxTurns = 4) {
  const result = [];
  const sliced = pastHistory.slice(-maxTurns);

  for (const item of sliced) {
    if (item.role === "user" || item.role === "assistant") {
      let content = item.content;
      if (typeof content === "string") {
        // Strip out internal thought logs from previous turns to save tokens
        content = content.replace(/<[\s]*(?:thought|thinking)[\s]*>[\s\S]*?<[\s]*\/[\s]*(?:thought|thinking)[\s]*>/gi, '').trim();
        
        // Truncate excessively long historical content
        if (content.length > 1000) {
          content = content.slice(0, 950) + "...\n[পূর্ববর্তী উত্তর সংক্ষেপিত]";
        }
      }
      if (content) {
        result.push({
          type: "message",
          role: item.role,
          content
        });
      }
    }
  }

  return result;
}
/**
 * Dynamic Response Token Budget per Intent:
 * Restricts output tokens to the necessary budget so the model doesn't generate bloated or runaway responses
 */
export function getMaxTokensForIntent(intent) {
  switch (intent) {
    case INTENT_TYPES.GREETING:
      return 500; // Ultra-fast, minimal greeting response
    case INTENT_TYPES.QUIZ_ANSWER:
      return 1200; // Crisp grading, gentle encouragement & scientific principle
    case INTENT_TYPES.MCQ_QUIZ:
      return 1500; // Stem, board tag, 4 options, and [ans: ...]
    case INTENT_TYPES.SYLLABUS_ROADMAP:
      return 4096; // Complete official chapter roadmap with division breakdown
    case INTENT_TYPES.CQ_CREATIVE:
      return 4096; // Full authentic stem + complete Ka, Kha, Ga, Gha levels
    case INTENT_TYPES.IMPORTANCE_RANKING:
      return 4096; // Priority chapters, 80/20 breakdown & board tips
    case INTENT_TYPES.BOARD_QUESTIONS:
      return 4096; // Full token budget for complete 25-MCQ board question paper
    case INTENT_TYPES.SIMILAR_PATTERN:
      return 4096; // Deep pattern analysis & formula matching
    default:
      return 4096; // Generous ceiling so full masterclass lessons, formulas, and KaTeX math never truncate midway
  }
}

/**
 * Calculate token savings compared to legacy unoptimized baseline
 */
export function calculateTokenTelemetry(inputHistory = [], activeTools = null) {
  const BASELINE_OVERHEAD_BYTES = 58941 + 17130; // Legacy prompt (59KB) + all tools schema (17KB)
  
  let currentBytes = 0;
  for (const m of inputHistory) {
    if (typeof m.content === 'string') currentBytes += m.content.length;
    else if (Array.isArray(m.content)) currentBytes += JSON.stringify(m.content).length;
  }
  if (activeTools && Array.isArray(activeTools)) {
    currentBytes += JSON.stringify(activeTools).length;
  }

  const baselineEstTokens = Math.round(BASELINE_OVERHEAD_BYTES / 4);
  const currentEstTokens = Math.round(currentBytes / 4);
  const tokensSaved = Math.max(0, baselineEstTokens - currentEstTokens);
  const savingsPercent = Math.min(95, Math.round((tokensSaved / baselineEstTokens) * 100));

  return {
    current_tokens_est: currentEstTokens,
    baseline_tokens_est: baselineEstTokens,
    tokens_saved_est: tokensSaved,
    savings_percent: savingsPercent
  };
}

