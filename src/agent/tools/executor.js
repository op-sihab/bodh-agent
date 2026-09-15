// Tool Dispatcher & Execution Engine
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

export async function executeAgentTool(toolName, args) {
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
