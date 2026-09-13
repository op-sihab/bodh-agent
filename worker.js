// Cloudflare Workers Edge Entrypoint — Prime Tutor (GPT-5.6-Luna + Turso RAG)
import { Hono } from "hono";
import { cors } from "hono/cors";
import { appCache } from "./src/cache.js";
import { getSubjects, getChapters, getQuiz, searchQuestions, getBoardExams, getCQQuestions, getQuestionFrequency } from "./src/db.js";
import { streamLunaRag } from "./src/luna-rag.js";

const app = new Hono();

app.use("*", cors());

app.get("/api/stats", (c) => {
  return c.json({
    status: "online",
    name: "Prime Tutor",
    model: "openai/gpt-5.6-luna (Merge.dev Gateway)",
    edge: "Cloudflare Workers (Dhaka/Global Edge)",
    cache: appCache.getStats(),
    timestamp: new Date().toISOString()
  });
});

app.post("/api/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = body.message || "";

  let finalContent = "";
  let ragContext = null;
  let latencyMs = 0;
  let fromCache = false;

  try {
    await streamLunaRag(message, (chunk) => {
      if (chunk.type === "rag_context") ragContext = chunk.data;
      if (chunk.type === "content") finalContent += chunk.delta;
      if (chunk.type === "done") {
        latencyMs = chunk.latencyMs;
        fromCache = chunk.fromCache;
        finalContent = chunk.content;
        ragContext = chunk.ragContext;
      }
    });

    return c.json({
      success: true,
      content: finalContent,
      fromCache,
      latencyMs,
      ragContext
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
