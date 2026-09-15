// Unified Database Layer
export { executeRawSql } from "./client.js";
export { getSubjects, getChapters } from "./queries/subjects.js";
export { getBoardExams, getQuestionFrequency } from "./queries/exams.js";
export { searchQuestions, getQuiz, getQuestionById } from "./queries/mcq.js";
export { getCQQuestions } from "./queries/cq.js";
export { getSimilarQuestionsByVector } from "./queries/vector.js";
