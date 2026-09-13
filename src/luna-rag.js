// Merge.dev Gateway (openai/gpt-5.6-luna) + Turso RAG Engine
import { retrieveRealAcademicContext, formatRagContextForPrompt } from "./rag-engine.js";
import { appCache } from "./cache.js";

const MERGE_API_URL = "https://api-gateway.merge.dev/v1/responses";
const MERGE_API_KEY = process.env.MERGE_API_KEY || "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";
const MODEL_NAME = "openai/gpt-5.6-luna";

const SYSTEM_PROMPT = `
তুমি "বোধ" (BODH) — একজন তুখোড়, বাস্তববাদী ও প্রো-অ্যাক্টিভ (Proactive) স্টাডি পার্টনার ও একাডেমিক মেন্টর। তোমার দর্শন: "না বুঝে মুখস্থ নয়, পড়াশোনায় এবার গভীর বোধ।"
তোমার ভেতরে কোনো রোবোটিক জড়তা বা কৃত্রিম ভাব থাকবে না। তুমি স্বাভাবিক বুদ্ধিমান মানুষের মতো চিন্তা করবে: 
"স্টুডেন্ট এই কথাটা কেন জিজ্ঞেস করল? তার আসল উদ্দেশ্য কী এবং আমি কীভাবে তাকে এক ধাপ এগিয়ে নিতে পারি?"

তোমার এজেন্টিক উত্তরের ফ্রেমওয়ার্ক (Agentic 3-Step Flow):
১. 【সরাসরি আসল উত্তর】: কোনো ভণিতা বা দীর্ঘ ভূমিকা ছাড়া প্রথম লাইনেই স্টুডেন্ট যা জানতে চেয়েছে তা পরিষ্কারভাবে দাও।
২. 【পরীক্ষার প্র্যাকটিক্যাল ইনসাইট】: ডাটাবেসের RAG ডেটার আলোকে ১-২ লাইনে বুঝিয়ে দাও এটা কেন জরুরি (যেমন: কোন অধ্যায়গুলো থেকে বোর্ডে সবচেয়ে বেশি মার্কস আসে, বা কোন সূত্রের প্রশ্ন বেশি রিপিট হয়)।
৩. 【প্রো-অ্যাক্টিভ নেক্সট মুভ】: থেমে থাকবে না! স্টুডেন্টের পড়া এগিয়ে নেওয়ার জন্য সরাসরি ১-২টি স্পষ্ট অ্যাকশন প্রস্তাব করো (যেমন: "আমি কি টপ ৩টি কমন ম্যাথ বের করে দেব?", "কোন অধ্যায় দিয়ে শুরু করবে রোডম্যাপ দেব?").

নির্দেশনা:
- RAG ডেটা থেকে আসল বোর্ড প্রশ্ন, বছর ও সংখ্যার ওপর ভিত্তি করে কথা বলবে।
- ভাষা হবে অত্যন্ত প্রাণবন্ত, সাবলীল ও আত্মবিশ্বাসী বাংলা।
`;

export async function streamLunaRag(userMessage, onChunk, options = {}) {
  const cacheKey = `rag:luna:v2:${userMessage.toLowerCase().trim()}`;
  const cached = appCache.get(cacheKey);

  if (cached && !options.skipCache) {
    onChunk({
      type: "done",
      fromCache: true,
      content: cached.content,
      ragContext: cached.ragContext,
      latencyMs: 1
    });
    return;
  }

  const startTime = performance.now();

  // 1. Retrieve Authentic Academic Data from Turso
  const ragContext = await retrieveRealAcademicContext(userMessage);
  const formattedContext = formatRagContextForPrompt(ragContext);

  // Send RAG context to frontend immediately!
  onChunk({ type: "rag_context", data: ragContext });

  // 2. Build Payload for Merge.dev (openai/gpt-5.6-luna)
  const payload = {
    input: [
      {
        type: "message",
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n[DATABASE CONTEXT / RAG DATA]:\n${formattedContext}`
      },
      {
        type: "message",
        role: "user",
        content: userMessage
      }
    ],
    stream: true,
    include_routing_metadata: true,
    model: MODEL_NAME
  };

  const response = await fetch(MERGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MERGE_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Merge API Error ${response.status}: ${errText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let lastSeenLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value);
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;

        try {
          const parsed = JSON.parse(raw);
          const currentText = parsed.output?.[0]?.content?.[0]?.text;
          if (currentText !== undefined) {
            if (currentText.length > lastSeenLength) {
              const delta = currentText.slice(lastSeenLength);
              lastSeenLength = currentText.length;
              fullContent = currentText;
              onChunk({ type: "content", delta });
            }
          }
        } catch (e) {}
      }
    }
  }

  const totalLatencyMs = Math.round(performance.now() - startTime);

  appCache.set(cacheKey, {
    content: fullContent,
    ragContext
  }, 300);

  onChunk({
    type: "done",
    fromCache: false,
    content: fullContent,
    ragContext,
    latencyMs: totalLatencyMs
  });
}
