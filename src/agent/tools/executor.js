// Tool Dispatcher & Execution Engine with Parameter Auto-Healing
import {
  handleGetSubjectChapters,
  handleCheckBoardFrequency,
  handleGetBoardExamQuestions,
  handleGetCreativeQuestion,
  handleGetMcqQuiz,
  handleGetChapterImportanceRanking,
  handleSearchQuestionBank,
  handleFindSimilarQuestions,
  handleAnalyzeChapterPatterns,
  handleQueryQuestionDatabaseSql
} from "./handlers/index.js";
import { normalizeSubject } from "../../config/subject-map.js";

const BN_TO_EN_DIGITS = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

export function normalizeBnDigits(val) {
  if (val === null || val === undefined) return val;
  return String(val).replace(/[০-৯]/g, d => BN_TO_EN_DIGITS[d] || d);
}

export function autoHealToolArguments(toolName, rawArgs = {}, state = null) {
  const args = { ...rawArgs };

  // 1. Subject Healing: If missing or general and state has subject, heal it
  if (!args.subject || args.subject === 'all' || args.subject === 'any' || args.subject === 'none') {
    if (state?.subject_id) {
      args.subject = state.subject_id;
    }
  } else {
    const norm = normalizeSubject(args.subject);
    if (norm) args.subject = norm;
  }

  // 2. Chapter Healing & Digit Conversion
  if (args.chapter !== undefined && args.chapter !== null) {
    args.chapter = normalizeBnDigits(args.chapter);
    const chMatch = String(args.chapter).match(/(?:অধ্যায়|অধ্যায়|chapter|ch)?\s*([0-9]+)/i);
    if (chMatch && chMatch[1]) {
      args.chapter = chMatch[1];
    }
  } else if (state?.chapter_num && !args.is_full_syllabus) {
    args.chapter = normalizeBnDigits(state.chapter_num);
  }

  // 3. Count Normalization
  if (args.count !== undefined && args.count !== null) {
    const enCount = normalizeBnDigits(args.count);
    const parsed = parseInt(enCount, 10);
    args.count = !isNaN(parsed) && parsed > 0 ? parsed : 1;
  }

  // 4. Year Normalization
  if (args.year !== undefined && args.year !== null) {
    args.year = normalizeBnDigits(args.year);
  }

  // 5. Difficulty Normalization
  if (args.difficulty) {
    const diffLower = String(args.difficulty).toLowerCase();
    if (diffLower.includes('কঠিন') || diffLower.includes('hard')) {
      args.difficulty = 'hard';
    } else if (diffLower.includes('সহজ') || diffLower.includes('easy')) {
      args.difficulty = 'easy';
    } else {
      args.difficulty = 'medium';
    }
  }

  return args;
}

export async function executeAgentTool(toolName, rawArgs, state = null) {
  const args = autoHealToolArguments(toolName, rawArgs, state);

  switch (toolName) {
    case "get_subject_chapters":
      return handleGetSubjectChapters(args);

    case "check_board_frequency":
      return handleCheckBoardFrequency(args);

    case "get_board_exam_questions":
      return handleGetBoardExamQuestions(args);

    case "get_creative_question":
      return handleGetCreativeQuestion(args);

    case "get_mcq_quiz":
      return handleGetMcqQuiz(args);

    case "get_chapter_importance_ranking":
      return handleGetChapterImportanceRanking(args);

    case "search_question_bank":
      return handleSearchQuestionBank(args);

    case "find_similar_type_questions":
      return handleFindSimilarQuestions(args);

    case "analyze_chapter_patterns":
      return handleAnalyzeChapterPatterns(args);

    case "query_question_database_sql":
      return handleQueryQuestionDatabaseSql(args);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

export async function prewarmQuestionPools() {
  try {
    const targets = [
      { tool: "get_creative_question", args: { subject: "ssc_chemistry", chapter: "12", difficulty: "hard" } },
      { tool: "get_creative_question", args: { subject: "ssc_chemistry", chapter: "12", difficulty: "medium" } },
      { tool: "get_creative_question", args: { subject: "ssc_physics", chapter: "2", difficulty: "hard" } },
      { tool: "get_mcq_quiz", args: { subject: "ssc_chemistry", chapter: "12", count: 1 } },
      { tool: "get_mcq_quiz", args: { subject: "ssc_physics", chapter: "1", count: 1 } }
    ];
    for (const t of targets) {
      await executeAgentTool(t.tool, t.args).catch(() => {});
    }
  } catch (e) {}
}

let isPrewarmed = false;
export function triggerPrewarm(ctx = null) {
  if (isPrewarmed) return;
  isPrewarmed = true;
  if (ctx?.waitUntil) {
    ctx.waitUntil(prewarmQuestionPools().catch(() => {}));
  } else {
    prewarmQuestionPools().catch(() => {});
  }
}
