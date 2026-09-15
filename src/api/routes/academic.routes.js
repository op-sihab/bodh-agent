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
