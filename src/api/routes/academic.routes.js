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

  const isMergeGateway = (ENV.AI_GATEWAY === "merge");
  const aiApiUrl = isMergeGateway ? (process.env.MERGE_API_URL || ENV.MERGE_API_URL) : ENV.AI_API_URL;
  const aiApiKey = isMergeGateway ? (process.env.MERGE_API_KEY || ENV.MERGE_API_KEY) : ENV.AI_API_KEY;
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

  const systemPrompt = `You are "বোধ" (BODH), an elite SSC tutor.
Provide a hyper-fast, highly focused MCQ explanation in clear Bengali.
Strictly under 40 words total. Format strictly as 3 bullet points:
- **সঠিক কারণ:** (১ বাক্যে মূল বৈজ্ঞানিক বা গাণিতিক কারণ)
- **ভুলের ফাঁদ:** (১ বাক্যে ভুল অপশন বা বিভ্রান্তির কারণ)
- **শর্ট ট্রিক:** (১ বাক্যে মনে রাখার টিপ বা সূত্র)
Rules:
- Strictly 1 short sentence per bullet.
- ALWAYS enclose chemical formulas, isotopes, units, or math in $...$ (e.g. $^{32}\\text{P}$, $^{60}\\text{Co}$, $\\mathrm{H_2O}$, $10^{23}$).
- Output ONLY the 3 bullets. Never output <thought> tags, conversational filler, or introductory remarks.`;

  let payload;
  if (isMergeGateway) {
    payload = {
      input: [
        { type: "message", role: "system", content: systemPrompt },
        { type: "message", role: "user", content: promptContent }
      ],
      model: modelName,
      vendor: "openai",
      stream: isStream,
      max_tokens: 280
    };
  } else {
    payload = {
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptContent }
      ],
      stream: isStream,
      max_tokens: 280
    };
  }

  if (isStream) {
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache, no-transform");
    c.header("Connection", "keep-alive");
    c.header("X-Accel-Buffering", "no");

    return streamSSE(c, async (stream) => {
      try {
        const response = await fetch(aiApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${aiApiKey}`
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
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                await stream.writeSSE({
                  data: JSON.stringify({ delta, text: fullText })
                });
              } else {
                const text = parsed.output?.[0]?.content?.[0]?.text;
                if (text && text.length > fullText.length) {
                  const d = text.slice(fullText.length);
                  fullText = text;
                  await stream.writeSSE({
                    data: JSON.stringify({ delta: d, text: fullText })
                  });
                }
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
      const response = await fetch(aiApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${aiApiKey}`
        },
        body: JSON.stringify({ ...payload, stream: false })
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || data.output?.[0]?.content?.[0]?.text || "";
      return c.json({ success: true, explanation: text });
    } catch (err) {
      return c.json({ success: false, error: err.message }, 500);
    }
  }
});

// Dedicated Exam Co-Pilot Endpoint (Fast, Socratic, No Agent Tool Overhead)
academicRoutes.post("/quiz/copilot", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const questionText = body.question_text || body.stem || "";
  const options = body.options || [];
  const correctAnswer = body.correct_answer || body.answer || "";
  const subject = body.subject || "";
  const action = body.action || "hint"; // hint | concept | eliminate | simplify | custom
  const userQuery = body.user_query || "";
  const isStream = body.stream !== false;

  if (!questionText.trim()) {
    return c.json({ error: "question_text is required" }, 400);
  }

  const isMergeGateway = (ENV.AI_GATEWAY === "merge");
  const aiApiUrl = isMergeGateway ? (process.env.MERGE_API_URL || ENV.MERGE_API_URL) : ENV.AI_API_URL;
  const aiApiKey = isMergeGateway ? (process.env.MERGE_API_KEY || ENV.MERGE_API_KEY) : ENV.AI_API_KEY;
  const modelName = process.env.MODEL_NAME || ENV.MODEL_NAME;

  let optStr = "";
  if (Array.isArray(options)) {
    optStr = options.map((opt, i) => `(${['ক','খ','গ','ঘ'][i] || i+1}) ${opt}`).join("  ");
  } else if (typeof options === "object") {
    optStr = Object.entries(options).map(([k, v]) => `(${k}) ${v}`).join("  ");
  } else {
    optStr = String(options || "");
  }

  let systemInstruction = "";
  let userPrompt = `বিষয়: ${subject || "এসএসসি"}\nপ্রশ্ন: ${questionText}\nবিকল্পসমূহ: ${optStr}`;

  if (action === "hint") {
    systemInstruction = `You are "বোধ কো-পাইলট" (BODH Exam Co-Pilot), an elite Socratic tutor for SSC.
Give 1 single Socratic clue (strictly under 40 words) in Bengali.
CRITICAL FORMATTING & ACADEMIC RULES:
- Use Markdown formatting: bold key words with **...**.
- Write ALL scientific formulas, symbols, isotopes, and equations in LaTeX $...$ (e.g. $v = u + at$, $^{32}\\text{P}$, $H_2SO_4$).
- NEVER reveal the correct option (ক, খ, গ, ঘ) or answer directly.
- Point out the core relationship so the student solves it themselves.
- Output ONLY the clue directly. Zero conversational filler or greetings.`;
    userPrompt += `\nসঠিক উত্তর: ${correctAnswer}\nঅনুরোধ: সরাসরি উত্তর না দিয়ে আমাকে ১টি সোক্রেটিক হিন্ট বা চিন্তার ক্লু দাও।`;
  } else if (action === "concept") {
    systemInstruction = `You are "বোধ কো-পাইলট" (BODH Exam Co-Pilot).
Summarize the core textbook concept and formula governing this question (strictly under 60 words) in Bengali.
CRITICAL FORMATTING & ACADEMIC RULES:
- Use clean Markdown bullet points (- ...) and bold (**...**).
- State the formula or scientific law clearly with LaTeX $...$ or display math $$...$$.
- Do NOT state which option is correct.
- Zero conversational filler.`;
    userPrompt += `\nঅনুরোধ: এই প্রশ্নের পেছনের মূল পাঠ্যবইয়ের কনসেপ্ট ও সূত্রগুলো সংক্ষেপে বুঝিয়ে দাও।`;
  } else if (action === "eliminate") {
    systemInstruction = `You are "বোধ কো-পাইলট" (BODH Exam Co-Pilot).
Analyze options and explain why 1 or 2 options can be safely eliminated (strictly under 60 words) in Bengali.
CRITICAL FORMATTING & ACADEMIC RULES:
- Use clean Markdown bullet points (- ...) and bold (**...**).
- Point out why an incorrect option is a common trap or mathematically/scientifically impossible with LaTeX $...$.
- Do NOT reveal the winning option directly.
- Zero filler.`;
    userPrompt += `\nসঠিক উত্তর: ${correctAnswer}\nঅনুরোধ: অপশন এলিমিনেশন সাহায্য: কোন অপশনগুলো কেন বাদ দেওয়া যায় ব্যাখ্যা করো।`;
  } else if (action === "simplify") {
    systemInstruction = `You are "বোধ কো-পাইলট" (BODH Exam Co-Pilot).
Rephrase this question stem into simple, intuitive, everyday Bengali (strictly under 45 words).
CRITICAL FORMATTING & ACADEMIC RULES:
- Highlight key parameters and what is asked using bold (**...**).
- Format variables, units, or chemical formulas with LaTeX $...$ (e.g. $m/s$, $g/cm^3$).
- Keep it crystal clear and encouraging. Zero filler.`;
    userPrompt += `\nঅনুরোধ: প্রশ্নটি খুব সহজ ভাষায় বুঝিয়ে বলো যে এখানে কী জানতে চাওয়া হয়েছে।`;
  } else {
    // Custom user question
    systemInstruction = `You are "বোধ কো-পাইলট" (BODH Exam Co-Pilot), an elite academic assistant for SSC.
Answer the student's question specifically in context of this MCQ (strictly under 80 words) in Bengali.
CRITICAL FORMATTING & ACADEMIC RULES:
- Use rich Markdown: bold (**...**), bullet points (- ...), and code blocks where helpful.
- Format all math, physics, chemistry symbols, equations, and units in LaTeX $...$ (e.g. $F = ma$, $CaCO_3$).
- If the student asks for the direct answer, decline politely and give a guiding hint instead.
- Direct, crisp, encouraging tone. Zero conversational filler.`;
    userPrompt += `\nশিক্ষার্থীর প্রশ্ন: ${userQuery || "এই প্রশ্নটি বুঝতে পারছি না"}`;
  }

  let payload;
  if (isMergeGateway) {
    payload = {
      input: [
        { type: "message", role: "system", content: systemInstruction },
        { type: "message", role: "user", content: userPrompt }
      ],
      model: modelName,
      vendor: "openai",
      stream: isStream,
      max_tokens: 220
    };
  } else {
    payload = {
      model: modelName,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      stream: isStream,
      max_tokens: 220
    };
  }

  if (isStream) {
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache, no-transform");
    c.header("Connection", "keep-alive");
    c.header("X-Accel-Buffering", "no");

    return streamSSE(c, async (stream) => {
      try {
        const response = await fetch(aiApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${aiApiKey}`
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
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                await stream.writeSSE({
                  data: JSON.stringify({ delta, text: fullText })
                });
              } else {
                const text = parsed.output?.[0]?.content?.[0]?.text;
                if (text && text.length > fullText.length) {
                  const d = text.slice(fullText.length);
                  fullText = text;
                  await stream.writeSSE({
                    data: JSON.stringify({ delta: d, text: fullText })
                  });
                }
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
      const response = await fetch(aiApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${aiApiKey}`
        },
        body: JSON.stringify({ ...payload, stream: false })
      });
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || data.output?.[0]?.content?.[0]?.text || "";
      return c.json({ success: true, response: text });
    } catch (err) {
      return c.json({ success: false, error: err.message }, 500);
    }
  }
});

