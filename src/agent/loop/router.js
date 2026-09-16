// Orchestrator Decision Router (Big Boss Router)
// Dynamically classifies user intent, scopes tool definitions, and prunes conversation context
// to minimize LLM token consumption and reduce API credit burn by 80-85%.

import { AGENT_TOOLS } from "../tools/definitions.js";

export const INTENT_TYPES = {
  QUIZ_ANSWER: "QUIZ_ANSWER",
  SYLLABUS_ROADMAP: "SYLLABUS_ROADMAP",
  IMPORTANCE_RANKING: "IMPORTANCE_RANKING",
  MCQ_QUIZ: "MCQ_QUIZ",
  CQ_CREATIVE: "CQ_CREATIVE",
  SIMILAR_PATTERN: "SIMILAR_PATTERN",
  ANALYTICS_SQL: "ANALYTICS_SQL",
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

  // Fast check: direct option answer
  if (/^(?:উত্তর\s*)?[ক-ঘa-dA-D১-৪]$/i.test(raw) || /^(?:ans|opt|option)\s*[:=]?\s*[a-dক-ঘ১-৪]$/i.test(raw)) {
    return INTENT_TYPES.QUIZ_ANSWER;
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

  // Similar type or pattern analysis
  if (
    /(?:এই\s*টাইপের|অনুরূপ|similar|একই\s*সূত্রের|মাস্টার\s*টাইপ|ব্লুপ্রিন্ট|blueprint|pattern)/i.test(lower)
  ) {
    return INTENT_TYPES.SIMILAR_PATTERN;
  }

  // MCQ / Quiz / Mock test
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

  // SQL / Deep Database Analytics
  if (
    /(?:কতটি\s*প্রশ্ন|মোট\s*প্রশ্ন|ফ্রিকোয়েন্সি|frequency|sql|database|পরিসংখ্যান|কোন\s*বোর্ডে\s*কত)/i.test(lower)
  ) {
    return INTENT_TYPES.ANALYTICS_SQL;
  }

  return INTENT_TYPES.GENERAL;
}

/**
 * Returns a focused, minimal subset of tool schemas based on the classified intent
 */
export function getScopedTools(intent) {
  if (intent === INTENT_TYPES.QUIZ_ANSWER) {
    return undefined; // 0 tool overhead when grading a quiz!
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
    case INTENT_TYPES.QUIZ_ANSWER:
      return 600; // Crisp grading, gentle encouragement & scientific principle
    case INTENT_TYPES.MCQ_QUIZ:
      return 750; // Stem, board tag, 4 options, and [ans: ...]
    case INTENT_TYPES.SYLLABUS_ROADMAP:
      return 1000; // Complete official chapter roadmap with division breakdown
    case INTENT_TYPES.CQ_CREATIVE:
      return 1500; // Full authentic stem + complete Ka, Kha, Ga, Gha levels
    case INTENT_TYPES.IMPORTANCE_RANKING:
      return 1200; // Priority chapters, 80/20 breakdown & board tips
    case INTENT_TYPES.SIMILAR_PATTERN:
      return 1100; // Deep pattern analysis & formula matching
    default:
      return 1600; // Full masterclass pedagogical depth for concepts & math problems
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

