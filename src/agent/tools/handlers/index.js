// Tool Handlers Barrel
export { handleGetMcqQuiz } from "./quiz-handler.js";
export { handleGetCreativeQuestion } from "./cq-handler.js";
export { handleFindSimilarQuestions } from "./similar-handler.js";
export { handleSearchQuestionBank, handleGetBoardExamQuestions } from "./search-handler.js";
export {
  handleGetSubjectChapters,
  handleCheckBoardFrequency,
  handleGetChapterImportanceRanking,
  handleAnalyzeChapterPatterns
} from "./stats-handler.js";
export { handleQueryQuestionDatabaseSql } from "./sql-handler.js";
