// Cloudflare Workers Edge API & Gateway for BODH AI (বোধ)
// Built with Hono + Cloudflare Global Edge Caching (caches.default) + Turso + OpenAI GPT-5.6-Luna
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { appCache } from "./src/cache.js";
import { getSubjects, getChapters, getQuiz, searchQuestions, getBoardExams, getCQQuestions, getQuestionFrequency } from "./src/db.js";
import { runAgenticConversation } from "./src/agent-loop.js";
import { triggerPrewarm } from "./src/agent-tools.js";

const app = new Hono();

// 1. Cross-Origin Resource Sharing (CORS)
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// 2. High-precision Latency & Environment Forwarding Middleware
app.use("*", async (c, next) => {
  const start = performance.now();

  // Forward Cloudflare Worker env variables to process.env if present
  if (c.env) {
    if (c.env.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = c.env.TURSO_DATABASE_URL;
    if (c.env.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = c.env.TURSO_AUTH_TOKEN;
    if (c.env.MERGE_API_KEY) process.env.MERGE_API_KEY = c.env.MERGE_API_KEY;
  }

  // Safe background pool pre-warming in request lifecycle
  triggerPrewarm(c.executionCtx);

  await next();

  const ms = Math.round(performance.now() - start);
  c.header("X-Response-Time", `${ms}ms`);
  const colo = c.req.raw?.cf?.colo || "EDGE";
  c.header("X-Edge-Location", colo);
});

// 3. Multi-Tier Edge Cache Middleware
// Tier 1: Cloudflare Global Edge Cache (caches.default across 300+ edge data centers)
// Tier 2: In-Memory Isolate Cache (appCache for sub-1ms local hits)
function edgeCache(ttlSeconds = 3600) {
  return async (c, next) => {
    if (c.req.method !== "GET") {
      return next();
    }

    const cacheUrl = new URL(c.req.url);
    const cacheKey = new Request(cacheUrl.toString(), {
      method: "GET",
      headers: c.req.raw.headers
    });

    let cloudflareCache = null;
    try {
      if (typeof caches !== "undefined" && caches.default) {
        cloudflareCache = caches.default;
      }
    } catch (e) {}

    // Tier 1 Check: Cloudflare Edge Cache
    if (cloudflareCache) {
      try {
        const cachedRes = await cloudflareCache.match(cacheKey);
        if (cachedRes) {
          const response = new Response(cachedRes.body, cachedRes);
          response.headers.set("X-Edge-Cache", "HIT");
          response.headers.set("X-Edge-Tier", "Cloudflare-Global-Cache");
          const colo = c.req.raw?.cf?.colo || "EDGE";
          response.headers.set("X-Edge-Location", colo);
          return response;
        }
      } catch (e) {}
    }

    // Tier 2 Check: In-Memory Isolate Cache
    const memKey = `edge:${cacheUrl.pathname}${cacheUrl.search}`;
    const memCached = appCache.get(memKey);
    if (memCached) {
      const response = c.json(memCached.data);
      response.headers.set("X-Edge-Cache", "HIT");
      response.headers.set("X-Edge-Tier", "Worker-Memory-Cache");
      response.headers.set("X-Edge-TTL", `${ttlSeconds}s`);
      return response;
    }

    // Cache Miss -> Execute API Handler
    await next();

    // Cache successful 200 responses
    if (c.res && c.res.status === 200) {
      c.res.headers.set("Cache-Control", `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}, stale-while-revalidate=300`);
      c.res.headers.set("X-Edge-Cache", "MISS");
      const colo = c.req.raw?.cf?.colo || "EDGE";
      c.res.headers.set("X-Edge-Location", colo);

      // Save to Cloudflare Global Edge Cache asynchronously
      if (cloudflareCache && c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(cloudflareCache.put(cacheKey, c.res.clone()));
      }

      // Save to Worker Memory Cache
      try {
        const cloned = c.res.clone();
        const json = await cloned.json().catch(() => null);
        if (json) {
          appCache.set(memKey, { data: json }, ttlSeconds);
        }
      } catch (e) {}
    }
  };
}

// =========================================================================
// API ENDPOINTS
// =========================================================================

// 1. Health, Edge Location & Cache Stats
app.get("/api/stats", (c) => {
  const colo = c.req.raw?.cf?.colo || "EDGE";
  return c.json({
    status: "online",
    name: "BODH AI (বোধ) — Cloudflare Edge Worker",
    edgeLocation: colo,
    model: "openai/gpt-5.6-luna (Merge.dev Gateway)",
    database: "Turso LibSQL (AWS ap-south-1 Mumbai)",
    cache: appCache.getStats(),
    timestamp: new Date().toISOString()
  });
});

// 2. Autonomous Streaming Agent Chat (Server-Sent Events)
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

// 3. Non-streaming Chat Fallback
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

// 4. Cached Database Endpoints (All cached at Cloudflare Edge)
// Subjects (24h Edge Cache)
app.get("/api/subjects", edgeCache(86400), async (c) => {
  const result = await getSubjects();
  return c.json({
    success: true,
    fromCache: result.fromCache,
    latency: `${result.durationMs}ms`,
    data: result.data
  });
});

// Chapters by Subject (24h Edge Cache)
app.get("/api/chapters", edgeCache(86400), async (c) => {
  const subjectId = c.req.query("subject_id");
  const result = await getChapters(subjectId);
  return c.json({
    success: true,
    fromCache: result.fromCache,
    latency: `${result.durationMs}ms`,
    count: result.data.length,
    data: result.data
  });
});

// Board Exams (12h Edge Cache)
app.get("/api/board-exams", edgeCache(43200), async (c) => {
  const board = c.req.query("board") || "";
  const result = await getBoardExams(board, null, 10);
  return c.json({
    success: true,
    fromCache: result.fromCache,
    latency: `${result.durationMs}ms`,
    count: result.data.length,
    data: result.data
  });
});

// Creative Questions (1h Edge Cache)
app.get("/api/cq", edgeCache(3600), async (c) => {
  const subject_id = c.req.query("subject_id");
  const count = parseInt(c.req.query("count")) || 2;
  const result = await getCQQuestions({ subject_id, limit: count });
  return c.json({
    success: true,
    latency: `${result.durationMs}ms`,
    count: result.data.length,
    data: result.data
  });
});

// Topic Frequency (24h Edge Cache)
app.get("/api/frequency", edgeCache(86400), async (c) => {
  const topic = c.req.query("topic") || "";
  const result = await getQuestionFrequency(topic);
  return c.json({
    success: true,
    fromCache: result.fromCache,
    latency: `${result.durationMs}ms`,
    data: result
  });
});

// MCQ Quiz Pool (1h Edge Cache)
app.get("/api/quiz", edgeCache(3600), async (c) => {
  const subject_id = c.req.query("subject_id");
  const count = parseInt(c.req.query("count")) || 5;
  const result = await getQuiz({ subject_id, limit: count });
  return c.json({
    success: true,
    latency: `${result.durationMs}ms`,
    count: result.data.length,
    data: result.data
  });
});

// Question Bank Search (12h Edge Cache)
app.get("/api/search", edgeCache(43200), async (c) => {
  const q = c.req.query("q") || "";
  const result = await searchQuestions(q, 10);
  return c.json({
    success: true,
    fromCache: result.fromCache,
    latency: `${result.durationMs}ms`,
    data: result.data
  });
});

// 5. Static Assets (Cloudflare Workers Static Assets or Fallback)
app.get("*", async (c) => {
  if (c.env && c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("BODH AI Edge Worker Active! Use /api/stats or /api/chat/stream", 200);
});

export default app;
