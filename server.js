import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";
import { cors } from "hono/cors";
import { appCache } from "./src/cache.js";
import { getSubjects, getChapters, getQuiz, searchQuestions, getBoardExams, getCQQuestions, getQuestionFrequency } from "./src/db.js";
import { runAgenticConversation } from "./src/agent-loop.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = new Hono();

app.use("*", cors());

app.use("*", async (c, next) => {
  const start = performance.now();
  await next();
  const ms = Math.round(performance.now() - start);
  c.header("X-Response-Time", `${ms}ms`);
});

// 1. Web Test UI
app.get("/", (c) => {
  const htmlPath = path.join(__dirname, "public", "index.html");
  if (fs.existsSync(htmlPath)) {
    return c.html(fs.readFileSync(htmlPath, "utf-8"));
  }
  return c.text("BODH AI (Autonomous Academic Intelligence) running!");
});

// 1b. Static Assets (SVG Icons & Logos)
app.get("/assets/:file", (c) => {
  const fileName = c.req.param("file");
  const filePath = path.join(__dirname, "public", "assets", fileName);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap = {
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".webp": "image/webp",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".js": "application/javascript",
      ".css": "text/css"
    };
    const mime = mimeMap[ext] || "application/octet-stream";
    return c.body(fs.readFileSync(filePath), 200, { "Content-Type": mime });
  }
  return c.notFound();
});

// 2. Health & Cache Stats
app.get("/api/stats", (c) => {
  return c.json({
    status: "online",
    name: "BODH AI",
    tagline: "না বুঝে মুখস্থ নয়, পড়াশোনায় এবার গভীর বোধ",
    mode: "Autonomous Academic Intelligence — Understanding over Memorization",
    model: "openai/gpt-5.6-luna (Merge.dev Gateway)",
    database: "Turso LibSQL (AWS ap-south-1 Mumbai)",
    cache: appCache.getStats(),
    timestamp: new Date().toISOString()
  });
});

// 3. Agentic Streaming / Event Chat Endpoint (Server-Sent Events)
app.post("/api/chat/stream", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = body.message || "";
  const history = body.history || [];

  if (!message.trim()) {
    return c.json({ error: "Message is required" }, 400);
  }

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("Connection", "keep-alive");
  c.header("X-Accel-Buffering", "no");

  return streamSSE(c, async (stream) => {
    try {
      await runAgenticConversation(message, async (event) => {
        await stream.writeSSE({
          data: JSON.stringify(event)
        });
      }, { history });
    } catch (err) {
      await stream.writeSSE({
        data: JSON.stringify({ type: "error", error: err.message })
      });
    }
  });
});

// 4. Non-streaming Chat Fallback
app.post("/api/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = body.message || "";
  const history = body.history || [];

  if (!message.trim()) {
    return c.json({ error: "Message is required" }, 400);
  }

  let finalResponse = null;

  try {
    await runAgenticConversation(message, (event) => {
      if (event.type === "done") {
        finalResponse = event;
      }
    }, { history });

    return c.json({
      success: true,
      ...finalResponse
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 5. Raw Direct APIs
app.get("/api/subjects", async (c) => {
  const result = await getSubjects();
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, data: result.data });
});

app.get("/api/chapters", async (c) => {
  const subjectId = c.req.query("subject_id");
  const result = await getChapters(subjectId);
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, count: result.data.length, data: result.data });
});

app.get("/api/board-exams", async (c) => {
  const board = c.req.query("board") || "";
  const result = await getBoardExams(board, null, 10);
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, count: result.data.length, data: result.data });
});

app.get("/api/cq", async (c) => {
  const subject_id = c.req.query("subject_id");
  const count = parseInt(c.req.query("count")) || 2;
  const result = await getCQQuestions({ subject_id, limit: count });
  return c.json({ success: true, latency: `${result.durationMs}ms`, count: result.data.length, data: result.data });
});

app.get("/api/frequency", async (c) => {
  const topic = c.req.query("topic") || "";
  const result = await getQuestionFrequency(topic);
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, data: result });
});

app.get("/api/quiz", async (c) => {
  const subject_id = c.req.query("subject_id");
  const count = parseInt(c.req.query("count")) || 5;
  const result = await getQuiz({ subject_id, limit: count });
  return c.json({ success: true, latency: `${result.durationMs}ms`, count: result.data.length, data: result.data });
});

app.get("/api/search", async (c) => {
  const q = c.req.query("q") || "";
  const result = await searchQuestions(q, 10);
  return c.json({ success: true, fromCache: result.fromCache, latency: `${result.durationMs}ms`, data: result.data });
});

const PORT = process.env.PORT || 3000;
console.log(`🚀 BODH AI (বোধ) starting on port ${PORT}...`);
serve({ fetch: app.fetch, port: PORT });
console.log(`✨ BODH AI (বোধ) ready at http://localhost:${PORT}`);
