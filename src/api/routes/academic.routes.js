// Direct REST Academic Question and Syllabus Endpoints
import { Hono } from "hono";
import {
  getSubjects,
  getChapters,
  getBoardExams,
  getCQQuestions,
  getQuestionFrequency,
  getQuiz,
  searchQuestions
} from "../../core/db/index.js";
import { handleGetMcqQuiz } from "../../agent/tools/handlers/quiz-handler.js";

export const academicRoutes = new Hono();

academicRoutes.get("/subjects", async (c) => {
  const result = await getSubjects();
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, data: result.data });
});

academicRoutes.get("/chapters", async (c) => {
  const subjectId = c.req.query("subject_id");
  const result = await getChapters(subjectId);
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, count: result.data.length, data: result.data });
});

academicRoutes.get("/board-exams", async (c) => {
  const board = c.req.query("board") || "";
  const result = await getBoardExams(board, null, 10);
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, count: result.data.length, data: result.data });
});

academicRoutes.get("/cq", async (c) => {
  const subject_id = c.req.query("subject_id");
  const count = parseInt(c.req.query("count")) || 2;
  const result = await getCQQuestions({ subject_id, limit: count });
  return c.json({ success: true, latency: `${result.durationMs}ms`, count: result.data.length, data: result.data });
});

academicRoutes.get("/frequency", async (c) => {
  const topic = c.req.query("topic") || "";
  const result = await getQuestionFrequency(topic);
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, data: result });
});

academicRoutes.get("/quiz", async (c) => {
  const subject_id = c.req.query("subject_id");
  const count = parseInt(c.req.query("count")) || 5;
  const result = await getQuiz({ subject_id, limit: count });
  return c.json({ success: true, latency: `${result.durationMs}ms`, count: result.data.length, data: result.data });
});

academicRoutes.get("/search", async (c) => {
  const q = c.req.query("q") || "";
  const result = await searchQuestions(q, 10);
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, data: result.data });
});

// Dedicated Instant Exam Generator Endpoint (0 LLM token cost)
academicRoutes.all("/quiz/generate", async (c) => {
  let body = {};
  if (c.req.method === "POST") {
    try {
      body = await c.req.json();
    } catch (e) {}
  }
  const query = c.req.query() || {};
  const params = { ...query, ...body };
  const count = Math.min(Math.max(parseInt(params.count) || 5, 1), 30);

  const result = await handleGetMcqQuiz({
    subject: params.subject || params.subject_id,
    chapter: params.chapter,
    topic: params.topic,
    board: params.board,
    year: params.year,
    difficulty: params.difficulty,
    count,
    mode: params.mode || "mock_test"
  });

  return c.json({
    success: true,
    subject: result.subject,
    chapter: result.actual_chapter,
    total: result.quiz?.length || 0,
    questions: result.quiz || []
  });
});
