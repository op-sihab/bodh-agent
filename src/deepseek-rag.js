// DeepSeek V4.1 Flash + Turso RAG Engine (via Fireworks AI)
import { searchQuestions, getQuestionFrequency, getBoardExams, getCQQuestions, getQuiz } from "./db.js";
import { appCache } from "./cache.js";

const FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/chat/completions";
const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || "fw_FvExFEpV6HujJDKnuS86Fp";
const MODEL_NAME = "accounts/fireworks/models/deepseek-v4p1-flash";

const SYSTEM_PROMPT = `
তুমি একজন বিচক্ষণ, বন্ধুবৎসল ও অভিজ্ঞ একাডেমিক মেন্টর এবং প্রাইভেট টিউটর 'বড় ভাইয়া'।
তোমার দায়িত্ব হলো স্টুডেন্টকে টেস্ট পেপার আর বইয়ের পৃষ্ঠা না উল্টেই সহজে, পয়েন্ট-টু-পয়েন্ট এবং যুক্তি দিয়ে বুঝিয়ে দেওয়া।

কঠোর নির্দেশনা:
১. তোমার কাছে নিচে [DATABASE CONTEXT / RAG DATA] দেওয়া থাকবে। সেখানে থাকা আসল বোর্ড প্রশ্ন, বছর, ট্যাগ ও পরিসংখ্যানের ওপর ভিত্তি করে ১০০% নির্ভুল উত্তর দেবে। মনগড়া তথ্য দেবে না।
২. স্টুডেন্ট যা জানতে চায় টু-দ্য-পয়েন্ট উত্তর দাও। সবসময় শুধু MCQ ছুড়ে দেবে না।
৩. যদি স্টুডেন্ট কোনো প্রশ্ন বোর্ডে কয়বার আসছে জানতে চায়, তাহলে RAG ডেটা থেকে মোট সংখ্যা এবং কোন কোন বোর্ডে এসেছে তা উল্লেখ করো এবং সেটির গুরুত্ব (Star rating) বোঝাও।
৪. যদি নির্দিষ্ট কোনো বোর্ড চায় (যেমন ঢাকা বোর্ড, চট্টগ্রাম বোর্ড), সেই বোর্ডের প্রশ্ন নিয়ে আলোচনা করো।
৫. যদি সৃজনশীল (CQ) চায়, উদ্দীপক উল্লেখ করে (ক), (খ), (গ), (ঘ) উত্তর লেখার কৌশল বুঝিয়ে দাও।
৬. ভাষা হবে সাবলীল, আন্তরিক ও পরিষ্কার বাংলা। গাণিতিক সূত্র সুন্দর ফরম্যাটে লিখবে।
`;

// 1. Retrieve RAG Context from Turso LibSQL Database
export async function retrieveRagContext(userMessage) {
  const start = performance.now();
  const lower = userMessage.toLowerCase().trim();
  const context = {
    type: "general",
    retrievedItems: 0,
    frequencyData: null,
    boardExams: [],
    questions: [],
    cq: null
  };

  // Check 1: Frequency / Repetition Inquiry
  if (lower.includes("কয়বার") || lower.includes("কতবার") || lower.includes("রিপিট") || lower.includes("বেশি আসে") || lower.includes("ইম্পর্টেন্ট")) {
    context.type = "frequency";
    const topic = userMessage
      .replace(/[\?।!,]/g, "")
      .replace(/(টপিকের|প্রশ্নের|বোর্ডে|টপিক|প্রশ্ন|বোর্ড|কয়বার|কতবার|আসছে|এসেছে|রিপিট|হয়েছে|কোনটা|বেশি|আসে|ভাইয়া|বলো|তো|এই|এর)/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const searchTopic = topic.length >= 2 ? topic : "গতি";
    const freq = await getQuestionFrequency(searchTopic);
    context.frequencyData = freq;
    context.retrievedItems += freq.totalFrequency > 0 ? 1 : 0;
  }

  // Check 2: Board Exam Specific
  const boardMatch = userMessage.match(/(ঢাকা|চট্টগ্রাম|রাজশাহী|কুমিল্লা|সিলেট|যশোর|বরিশাল|দিনাজপুর|ময়মনসিংহ)/);
  if (boardMatch && (lower.includes("বোর্ড") || lower.includes("board"))) {
    context.type = "board_specific";
    const boardName = boardMatch[0];
    const exams = await getBoardExams(boardName, null, 5);
    context.boardExams = exams.data || [];
    context.retrievedItems += context.boardExams.length;
  }

  // Check 3: Creative Question (CQ)
  if (lower.includes("সৃজনশীল") || lower.includes("cq") || lower.includes("উদ্দীপক")) {
    context.type = "cq";
    let subjectId = null;
    if (lower.includes("পদার্থ") || lower.includes("physics")) subjectId = "ssc_physics";
    else if (lower.includes("উচ্চতর গণিত") || lower.includes("math")) subjectId = "ssc_higher_math";
    else if (lower.includes("বাংলা") || lower.includes("bangla")) subjectId = "ssc_bangla_1st";

    const cqRes = await getCQQuestions({ subject_id: subjectId, limit: 1 });
    if (cqRes.data?.length > 0) {
      context.cq = cqRes.data[0];
      context.retrievedItems += 1;
    }
  }

  // Check 4: General Topic / MCQ Search
  const cleanKeyword = userMessage
    .replace(/(কী|কি|কেন|কখন|কোথায়|কাকে|বলতে|কী|বুঝায়|ভাইয়া|দাও|খুঁজে|বলো|জানাও|প্রশ্ন|কুইজ)/g, "")
    .trim();

  if (cleanKeyword.length >= 2) {
    const searchRes = await searchQuestions(cleanKeyword, 4);
    if (searchRes.data?.length > 0) {
      context.questions = searchRes.data;
      context.retrievedItems += searchRes.data.length;
    }
  }

  // If still empty and quiz requested
  if (context.retrievedItems === 0 && (lower.includes("কুইজ") || lower.includes("quiz") || lower.includes("টেস্ট"))) {
    const quizRes = await getQuiz({ limit: 3 });
    context.questions = quizRes.data || [];
    context.retrievedItems += context.questions.length;
  }

  context.retrievalDurationMs = Math.round(performance.now() - start);
  return context;
}

function formatContextForPrompt(ragContext) {
  let text = "";

  if (ragContext.frequencyData) {
    text += `[বোর্ড পুনরাবৃত্তি ডেটা (Frequency Analysis)]\n`;
    text += `টপিক: ${ragContext.frequencyData.topic}\n`;
    text += `বোর্ড ও সেরা কলেজসমূহে মোট প্রশ্ন সংখ্যা: ${ragContext.frequencyData.totalFrequency}\n`;
    if (ragContext.frequencyData.boardTags?.length > 0) {
      text += `শীর্ষ বোর্ড/কলেজসমূহ: ` + ragContext.frequencyData.boardTags.map(t => `${t.tags} (${t.c} বার)`).join(", ") + `\n`;
    }
    text += `\n`;
  }

  if (ragContext.boardExams?.length > 0) {
    text += `[ডাটাবেসে সংরক্ষিত সংশ্লিষ্ট বোর্ড পরীক্ষাসমূহ]\n`;
    ragContext.boardExams.forEach((ex, i) => {
      text += `${i+1}. ${ex.name} (প্রশ্ন সংখ্যা: ${ex.q_count || 'নির্ধারিত'})\n`;
    });
    text += `\n`;
  }

  if (ragContext.cq) {
    const cq = ragContext.cq;
    text += `[প্রাসঙ্গিক সৃজনশীল প্রশ্ন (CQ)]\n`;
    text += `উদ্দীপক: ${cq.question_text}\n`;
    text += `(ক) ${cq.option_a || '-'}\n(খ) ${cq.option_b || '-'}\n(গ) ${cq.option_c || '-'}\n(ঘ) ${cq.option_d || '-'}\n`;
    text += `ট্যাগ/বোর্ড: ${cq.tags || 'বোর্ড পরীক্ষা'}\n\n`;
  }

  if (ragContext.questions?.length > 0) {
    text += `[ডাটাবেস থেকে সংশ্লিষ্ট প্রশ্নসমূহ (MCQ/প্রশ্নাবলী)]\n`;
    ragContext.questions.forEach((q, i) => {
      text += `প্রশ্ন ${i+1}: ${q.question_text}\n`;
      if (q.option_a) {
        text += `   (A) ${q.option_a} (B) ${q.option_b} (C) ${q.option_c} (D) ${q.option_d}\n`;
      }
      if (q.answer) text += `   সঠিক উত্তর: ${q.answer}\n`;
      if (q.tags) text += `   বোর্ড/ট্যাগ: ${q.tags}\n`;
      text += `\n`;
    });
  }

  return text || "ডাটাবেসে সরাসরি নির্দিষ্ট মিল মেলেনি। সাধারণ একাডেমিক গাইডলাইন ও কনসেপ্ট ব্যাখ্যা করো।";
}

// 2. Stream Generation with DeepSeek V4.1 Flash
export async function streamDeepSeekRag(userMessage, onChunk, options = {}) {
  const reasoningMode = options.reasoningMode || "medium"; // "none" or "medium"
  const cacheKey = `rag:deepseek:${reasoningMode}:${userMessage.toLowerCase().trim()}`;
  const cached = appCache.get(cacheKey);

  if (cached && !options.skipCache) {
    onChunk({
      type: "done",
      fromCache: true,
      reasoning: cached.reasoning,
      content: cached.content,
      ragContext: cached.ragContext,
      latencyMs: 1
    });
    return;
  }

  const startTime = performance.now();
  const ragContext = await retrieveRagContext(userMessage);
  const formattedContext = formatContextForPrompt(ragContext);

  // Send RAG context to client immediately before AI starts thinking!
  onChunk({ type: "rag_context", data: ragContext });

  const extraInstruction = reasoningMode === "none"
    ? "\n\n[দ্রুত রেসপন্স মোড: সরাসরি পয়েন্ট-টু-পয়েন্ট উত্তর দাও, দীর্ঘ চিন্তা করার প্রয়োজন নেই।]"
    : "";

  const messages = [
    { role: "system", content: `${SYSTEM_PROMPT}${extraInstruction}\n\n[DATABASE CONTEXT / RAG DATA]:\n${formattedContext}` },
    { role: "user", content: userMessage }
  ];

  const payload = {
    model: MODEL_NAME,
    max_tokens: 3072,
    top_k: 40,
    temperature: 0.6,
    stream: true,
    messages
  };

  if (reasoningMode === "none") {
    payload.reasoning_effort = "low";
  }

  const response = await fetch(FIREWORKS_API_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FIREWORKS_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fireworks API Error ${response.status}: ${errText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullReasoning = "";
  let fullContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const json = JSON.parse(line.substring(6));
          const delta = json.choices?.[0]?.delta;
          if (delta?.reasoning_content) {
            fullReasoning += delta.reasoning_content;
            if (reasoningMode !== "none") {
              onChunk({ type: "reasoning", delta: delta.reasoning_content });
            }
          }
          if (delta?.content) {
            fullContent += delta.content;
            onChunk({ type: "content", delta: delta.content });
          }
        } catch (e) {}
      }
    }
  }

  const totalLatencyMs = Math.round(performance.now() - startTime);

  appCache.set(cacheKey, {
    reasoning: fullReasoning,
    content: fullContent,
    ragContext
  }, 300);

  onChunk({
    type: "done",
    fromCache: false,
    reasoning: fullReasoning,
    content: fullContent,
    ragContext,
    latencyMs: totalLatencyMs
  });
}
