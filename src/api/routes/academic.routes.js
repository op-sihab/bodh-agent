// Direct REST Academic Question and Syllabus Endpoints
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { ENV } from "../../config/env.js";
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

// Dedicated In-Modal & Real-time AI Explanation Endpoint
academicRoutes.post("/quiz/explain", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const questionText = body.question_text || body.stem || "";
  const options = body.options || [];
  const correctAnswer = body.correct_answer || body.answer || "";
  const userAnswer = body.user_answer || "";
  const subject = body.subject || "";
  const board = body.board || "";
  const isStream = body.stream !== false;

  if (!questionText.trim()) {
    return c.json({ error: "question_text is required" }, 400);
  }

  const mergeUrl = process.env.MERGE_API_URL || ENV.MERGE_API_URL;
  const mergeKey = process.env.MERGE_API_KEY || ENV.MERGE_API_KEY;
  const modelName = process.env.MODEL_NAME || ENV.MODEL_NAME;

  let optStr = "";
  if (Array.isArray(options)) {
    optStr = options.join("  ");
  } else if (typeof options === "object") {
    optStr = Object.entries(options).map(([k, v]) => `(${k}) ${v}`).join("  ");
  } else {
    optStr = String(options || "");
  }

  const promptContent = `বিষয়: ${subject || "এসএসসি"}
${board ? `বোর্ড/উৎস: ${board}\n` : ""}প্রশ্ন: ${questionText}
${optStr ? `বিকল্পসমূহ: ${optStr}\n` : ""}সঠিক উত্তর: ${correctAnswer}
${userAnswer ? `শিক্ষার্থীর উত্তর: ${userAnswer}` : ""}`;

  const payload = {
    input: [
      {
        type: "message",
        role: "system",
        content: `You are "বোধ" (BODH), Bangladesh's premier SSC academic mentor ("বড় ভাইয়া").
Provide a concise, highly pedagogical, and encouraging explanation for this MCQ in natural Bengali.
Structure your response strictly in these 3 clear points:
1. **সঠিক উত্তরের কারণ:** (১-২ বাক্যে মূল বৈজ্ঞানিক/গাণিতিক ব্যাখ্যা)
2. **ফাঁদ বা ভুল ধারণার বিশ্লেষণ:** (শিক্ষার্থী কেন বিভ্রান্ত হতে পারে বা অন্য অপশন কেন ভুল)
3. **বড় ভাইয়ার শর্টকাট/টিপস:** (পরীক্ষার হলে দ্রুত মনে রাখার ট্রিক বা সূত্র)
Rules:
- Strictly under 90 words.
- Use KaTeX math syntax ($...$) for chemical formulas, units, numbers with powers, or mathematical equations.
- Never output <thought> tags or conversational filler.`
      },
      {
        type: "message",
        role: "user",
        content: promptContent
      }
    ],
    model: modelName,
    vendor: "openai",
    stream: isStream,
    max_tokens: 350
  };

  if (isStream) {
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache, no-transform");
    c.header("Connection", "keep-alive");
    c.header("X-Accel-Buffering", "no");

    return streamSSE(c, async (stream) => {
      try {
        const response = await fetch(mergeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${mergeKey}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          await stream.writeSSE({ data: JSON.stringify({ error: `Gateway error: ${response.status}` }) });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const parsed = JSON.parse(raw);
              const text = parsed.output?.[0]?.content?.[0]?.text;
              if (text && text.length > fullText.length) {
                const delta = text.slice(fullText.length);
                fullText = text;
                await stream.writeSSE({
                  data: JSON.stringify({ delta, text: fullText })
                });
              }
            } catch (e) {}
          }
        }

        await stream.writeSSE({
          data: JSON.stringify({ done: true, text: fullText })
        });
      } catch (err) {
        await stream.writeSSE({
          data: JSON.stringify({ error: err.message })
        });
      }
    });
  } else {
    try {
      const response = await fetch(mergeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${mergeKey}`
        },
        body: JSON.stringify({ ...payload, stream: false })
      });
      const data = await response.json();
      const text = data.output?.[0]?.content?.[0]?.text || "";
      return c.json({ success: true, explanation: text });
    } catch (err) {
      return c.json({ success: false, error: err.message }, 500);
    }
  }
});

