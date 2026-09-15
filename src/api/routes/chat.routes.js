// Chat and SSE Streaming Routes
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { runAgenticConversation } from "../../agent/loop/index.js";

export const chatRoutes = new Hono();

// 1. Agentic Streaming SSE Chat Endpoint
chatRoutes.post("/chat/stream", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = body.message || "";
  const history = body.history || [];
  const state = body.state || null;

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
      }, { history, state });
    } catch (err) {
      await stream.writeSSE({
        data: JSON.stringify({ type: "error", error: err.message })
      });
    }
  });
});

// 2. Non-streaming Chat Fallback
chatRoutes.post("/chat", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const message = body.message || "";
  const history = body.history || [];
  const state = body.state || null;

  if (!message.trim()) {
    return c.json({ error: "Message is required" }, 400);
  }

  let finalResponse = null;

  try {
    await runAgenticConversation(message, (event) => {
      if (event.type === "done") {
        finalResponse = event;
      }
    }, { history, state });

    return c.json({
      success: true,
      ...finalResponse
    });
  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// 3. Ultra-Fast Background Pre-warm Endpoint (Eliminates 1st Message Handshake Latency)
chatRoutes.post("/chat/prewarm", async (c) => {
  try {
    const mergeUrl = process.env.MERGE_API_URL || "https://api.mergegateway.com";
    fetch(mergeUrl, { method: "HEAD" }).catch(() => {});
    return c.json({ status: "warmed", timestamp: Date.now() });
  } catch(e) {
    return c.json({ status: "ok" });
  }
});
