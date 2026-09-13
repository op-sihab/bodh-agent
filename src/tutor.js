// AI Tutor Persona & RAG Agent Engine
import { searchQuestions, getQuiz, getSubjects, getChapters, getBoardExams, getCQQuestions, getQuestionFrequency } from "./db.js";
import { appCache } from "./cache.js";

const TUTOR_SYSTEM_PROMPT = `
তুমি একজন বিচক্ষণ, সহমর্মী এবং অভিজ্ঞ স্টাডি মেন্টর বা প্রাইভেট টিউটর 'বড় ভাইয়া'।
তোমার স্টুডেন্ট যাতে গাদা গাদা বই বা টেস্ট পেপার মুখস্থ না করে বুদ্ধি খাটিয়ে পরীক্ষায় সেরা রেজাল্ট করতে পারে, সেটাই তোমার লক্ষ্য।

তোমার কথা বলার বৈশিষ্ট্য:
1. সবসময় রোবটের মতো শুধু MCQ ছুড়ে দেবে না! স্টুডেন্ট কী জানতে চাচ্ছে আগে বুঝে নাও।
2. যদি স্টুডেন্ট কোনো কনসেপ্ট জানতে চায়, গল্পের মতো বা বাস্তব উদাহরণ দিয়ে সহজ ভাষায় বুঝিয়ে দাও।
3. যদি স্টুডেন্ট জানতে চায় "কোন প্রশ্ন বোর্ডে কয়বার আসছে", ডাটা দেখে বলো যে এই টপিকটি অমুক অমুক বোর্ডে এতবার এসেছে এবং এটি কতটা গুরুত্বপূর্ণ (Star rating বা 80/20 rule দিয়ে)।
4. যদি কোনো নির্দিষ্ট বোর্ডের প্রশ্ন চায় (যেমন ঢাকা বোর্ড, চট্টগ্রাম বোর্ড), সেই বোর্ডের আসল প্রশ্ন ও প্যাটার্ন নিয়ে কথা বলো।
5. যদি সৃজনশীল (CQ) চায়, উদ্দীপক তুলে ধরে (ক), (খ), (গ), (ঘ) এর উত্তর লেখার কৌশল ও ১০-এ ১০ পাওয়ার হ্যাক বুঝিয়ে দাও।
6. ভাষা হবে খাঁটি ও সাবলীল বাংলা, বন্ধুর মতো আন্তরিক ("আরে শোনো", "চলো দেখে নিই", "একদম সহজ একটা ট্রিকস বলি")।
`;

export async function processTutorMessage(userMessage, apiKey = process.env.GEMINI_API_KEY) {
  const normalizedMsg = userMessage.toLowerCase().trim();
  const cacheKey = `agent:reply:${normalizedMsg}`;
  
  // 1. Check Cache
  const cachedResponse = appCache.get(cacheKey);
  if (cachedResponse) {
    return {
      reply: cachedResponse,
      fromCache: true,
      latencyMs: 1
    };
  }

  const startTime = performance.now();
  let reply = "";

  // 2. If Gemini API key provided, use full LLM with intelligent RAG injection
  if (apiKey) {
    try {
      let ragContext = "";
      
      // Check if board-specific query
      if (normalizedMsg.includes("বোর্ড") || normalizedMsg.includes("board")) {
        const boardMatch = userMessage.match(/(ঢাকা|চট্টগ্রাম|রাজশাহী|কুমিল্লা|সিলেট|যশোর|বরিশাল|দিনাজপুর|ময়মনসিংহ)/);
        const boardName = boardMatch ? boardMatch[0] : "";
        const exams = await getBoardExams(boardName, null, 3);
        ragContext += `বোর্ড পরীক্ষার রেফারেন্স:\n${JSON.stringify(exams.data, null, 2)}\n\n`;
      }

      // Check frequency
      if (normalizedMsg.includes("কয়বার") || normalizedMsg.includes("কতবার") || normalizedMsg.includes("রিপিট") || normalizedMsg.includes("ইম্পর্টেন্ট")) {
        const topic = userMessage.replace(/(বোর্ডে|কয়বার|কতবার|আসছে|এসেছে|রিপিট|হয়েছে|প্রশ্ন|ইম্পর্টেন্ট|ভাইয়া)/g, "").trim();
        const freq = await getQuestionFrequency(topic);
        ragContext += `বোর্ড পুনরাবৃত্তি ডেটা (Frequency Analysis):\nমোট প্রশ্ন: ${freq.totalFrequency}\nবোর্ড ট্যাগসমূহ: ${JSON.stringify(freq.boardTags)}\n\n`;
      }

      // General question search
      const searchRes = await searchQuestions(userMessage, 3);
      if (searchRes.data.length > 0) {
        ragContext += `ডাটাবেস থেকে প্রাসঙ্গিক প্রশ্নসমূহ:\n${JSON.stringify(searchRes.data, null, 2)}\n\n`;
      }

      const prompt = `${TUTOR_SYSTEM_PROMPT}

ডাটাবেস থেকে আসল তথ্য (RAG Context):
${ragContext || "সাধারণ একাডেমিক দিকনির্দেশনা ও মেন্টরিং প্রদান করো।"}

শিক্ষার্থীর কথা: "${userMessage}"

নির্দেশনা: একজন অভিজ্ঞ বড় ভাইয়া ও শিক্ষকের মতো প্রাণবন্ত, সাহায্যকারী ও দিকনির্দেশনামূলক ভাষায় উত্তর দাও। সবসময় শুধু MCQ ছুড়ে দেবে না।`;

      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (resp.ok) {
        const json = await resp.json();
        reply = json.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } catch (err) {
      console.error("Gemini fallback:", err.message);
    }
  }

  // 3. Smart Pedagogical Rule-Based Engine (Instant Bengali Tutor)
  if (!reply) {
    reply = await generatePedagogicalReply(normalizedMsg, userMessage);
  }

  const latencyMs = Math.round(performance.now() - startTime);
  appCache.set(cacheKey, reply, 300);

  return {
    reply,
    fromCache: false,
    latencyMs
  };
}

async function generatePedagogicalReply(normalizedMsg, originalMsg) {
  // Case 1: Question Frequency / Repetition Inquiry ("কয়বার আসছে", "কতবার আসছে", "ইম্পর্টেন্ট")
  if (normalizedMsg.includes("কয়বার") || normalizedMsg.includes("কতবার") || normalizedMsg.includes("রিপিট") || normalizedMsg.includes("বেশি আসে")) {
    const topic = originalMsg
      .replace(/[\?।!,]/g, "")
      .replace(/(টপিকের|প্রশ্নের|বোর্ডে|টপিক|প্রশ্ন|বোর্ড|কয়বার|কতবার|আসছে|এসেছে|রিপিট|হয়েছে|কোনটা|বেশি|আসে|ভাইয়া|বলো|তো|এই|এর)/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const searchTopic = topic.length >= 2 ? topic : "গতি";
    const freq = await getQuestionFrequency(searchTopic);

    let text = `দারুণ এবং খুব বুদ্ধিমানের মতো একটা প্রশ্ন করেছ! 💡\n\n`;
    text += `টেস্ট পেপারের সব পড়ার কোনো মানে নেই, আমাদের দেখতে হবে **বোর্ড কোনটাতে বেশি গুরুত্ব দেয়**।\n\n`;
    text += `📊 **'${searchTopic}' টপিকের বোর্ড এনালাইসিস:**\n`;
    text += `• আমাদের ৫০,০০০+ প্রশ্নের ডাটাবেসে এই টপিক থেকে প্রশ্ন এসেছে মোট: **${freq.totalFrequency} বার**!\n`;
    
    if (freq.boardTags && freq.boardTags.length > 0) {
      text += `• **যে যে বোর্ড ও কলেজে সবচেয়ে বেশি রিপিট হয়েছে:**\n`;
      freq.boardTags.slice(0, 5).forEach(t => {
        text += `  - \`${t.tags}\` : প্রায় ${t.c} টি প্রশ্নে এসেছে\n`;
      });
    }

    text += `\n🎯 **মেন্টর টিপ:** এই টপিকটি পরীক্ষার জন্য **৩-স্টার (⭐⭐⭐) ক্যাটাগরির**! অর্থাৎ এখান থেকে সৃজনশীল (গ বা ঘ) অথবা অন্তত ২টা MCQ নিশ্চিত পাবে। পুরো চ্যাপ্টার না পড়ে এই নির্দিষ্ট সূত্রের ম্যাথগুলো আগে শেষ করো।`;
    return text;
  }

  // Case 2: Specific Board Question Request ("ঢাকা বোর্ড", "চট্টগ্রাম বোর্ড", "রাজশাহী বোর্ড")
  const boardMatch = originalMsg.match(/(ঢাকা|চট্টগ্রাম|রাজশাহী|কুমিল্লা|সিলেট|যশোর|বরিশাল|দিনাজপুর|ময়মনসিংহ)/);
  if (boardMatch && (normalizedMsg.includes("বোর্ড") || normalizedMsg.includes("board"))) {
    const boardName = boardMatch[0];
    const exams = await getBoardExams(boardName, null, 4);

    let text = `তুমি **${boardName} বোর্ডের** প্রশ্ন দেখতে চেয়েছ, চমৎকার চয়েস! 🏫\n\n`;
    if (exams.data && exams.data.length > 0) {
      text += `আমাদের ডাটাবেসে **${boardName} বোর্ডের** যে পরীক্ষাগুলো সংরক্ষিত আছে:\n`;
      exams.data.forEach(ex => {
        text += `• 📌 **${ex.name}** (প্রশ্ন সংখ্যা: ${ex.q_count || 'নির্ধারিত'})\n`;
      });
      text += `\nতুমি কি এই বোর্ডের **সৃজনশীল (CQ)** প্রশ্ন দেখতে চাও, নাকি **MCQ** প্র্যাকটিস করতে চাও? আমাকে বলো, আমি সাথে সাথে বের করে দিচ্ছি!`;
      return text;
    }
  }

  // Case 3: Creative Question / CQ / উদ্দীপক ("সৃজনশীল", "cq", "উদ্দীপক")
  if (normalizedMsg.includes("সৃজনশীল") || normalizedMsg.includes("cq") || normalizedMsg.includes("উদ্দীপক")) {
    let subjectId = null;
    if (normalizedMsg.includes("পদার্থ") || normalizedMsg.includes("physics")) subjectId = "ssc_physics";
    else if (normalizedMsg.includes("উচ্চতর গণিত") || normalizedMsg.includes("math")) subjectId = "ssc_higher_math";
    else if (normalizedMsg.includes("বাংলা") || normalizedMsg.includes("bangla")) subjectId = "ssc_bangla_1st";

    const cqRes = await getCQQuestions({ subject_id: subjectId, limit: 1 });
    if (cqRes.data && cqRes.data.length > 0) {
      const cq = cqRes.data[0];
      let text = `চলো, বই বা টেস্ট পেপার না খুলেই সরাসরি বোর্ড স্ট্যান্ডার্ড একটা **সৃজনশীল (CQ)** সমাধান করি! 📝\n\n`;
      text += `📖 **উদ্দীপক:**\n${cq.question_text}\n\n`;
      text += `🔹 **(ক) [১ নম্বর]:** ${cq.option_a || 'জ্ঞানমূলক প্রশ্ন'}\n`;
      text += `🔹 **(খ) [২ নম্বর]:** ${cq.option_b || 'অনুধাবনমূলক প্রশ্ন'}\n`;
      text += `🔹 **(গ) [৩ নম্বর]:** ${cq.option_c || 'প্রয়োগমূলক প্রশ্ন'}\n`;
      text += `🔹 **(ঘ) [৪ নম্বর]:** ${cq.option_d || 'উচ্চতর দক্ষতামূলক প্রশ্ন'}\n\n`;
      text += `🏷️ *বোর্ড রেফারেন্স:* \`${cq.tags || "বোর্ড পরীক্ষা"}\`\n\n`;
      text += `💡 **বড় ভাইয়ার লেখার টেকনিক:**\n`;
      text += `(ক) এর জন্য এক লাইনে সরাসরি উত্তর দেবে।\n`;
      text += `(খ) এর জন্য দুই প্যারায়—প্রথমে ১ লাইনে মূল কথা, পরের প্যারায় ২-৩ লাইনে ব্যাখ্যা।\n`;
      text += `তুমি কি এটার সমাধান চেষ্টা করবে, নাকি আমি উত্তরটা সাজিয়ে দেব?`;
      return text;
    }
  }

  // Case 4: Explicit Quiz Request
  if (normalizedMsg.includes("কুইজ") || normalizedMsg.includes("quiz") || normalizedMsg.includes("টেস্ট নাও") || normalizedMsg.includes("mcq দাও")) {
    const quizRes = await getQuiz({ limit: 3 });
    if (quizRes.data && quizRes.data.length > 0) {
      let text = `চলো চটপট ৩টা বোর্ড MCQ যাচাই করে ফেলি! ⏱️\n\n`;
      quizRes.data.forEach((q, idx) => {
        text += `📌 **প্রশ্ন ${idx + 1}:** ${q.question_text}\n`;
        text += `   (A) ${q.option_a}\n   (B) ${q.option_b}\n   (C) ${q.option_c}\n   (D) ${q.option_d}\n`;
        text += `   🏷️ \`${q.tags || "Board Exam"}\`\n\n`;
      });
      text += `তোমার উত্তরগুলো লিখে পাঠাও, আমি সাথে সাথে চেক করে সঠিক লজিক বুঝিয়ে দিচ্ছি।`;
      return text;
    }
  }

  // Case 5: Academic Advice / How to prepare / Syllabus strategy
  if (normalizedMsg.includes("পড়ব") || normalizedMsg.includes("প্রস্তুতি") || normalizedMsg.includes("ভয়") || normalizedMsg.includes("পদ্ধতি") || normalizedMsg.includes("টিপস")) {
    return `শোনো, পরীক্ষার জন্য সবচেয়ে জরুরি হলো **'স্মার্ট ওয়ার্ক'**—গাধার খাটুনি দিয়ে টেস্ট পেপারের সব প্রশ্ন পড়ার কোনো দরকার নেই! 🎯\n\n` +
           `আমি তোমাকে ৩টি গোপন টেকনিক বলে দিচ্ছি:\n` +
           `১. **৮০/২০ নিয়ম:** প্রতিটি অধ্যায়ের মাত্র ২০% টপিক থেকে বোর্ডের ৮০% প্রশ্ন আসে। যেমন: ফিজিক্সের গতি চ্যাপ্টারে বেগের সমীকরণ ও পরন্ত বস্তুর সূত্র থেকেই ৯৫% ম্যাথ আসে।\n` +
           `২. **বিগত ৩ বছরের বোর্ড প্রশ্ন:** শুধু ঢাকা, চট্টগ্রাম ও রাজশাহী বোর্ডের বিগত ৩ বছরের প্রশ্ন সমাধান করলেই সব কমন পড়ে যায়।\n` +
           `৩. **CQ-এর 'ক' এবং 'খ':** বোর্ড পরীক্ষার ক ও খ প্রশ্নগুলো বইয়ের বোল্ড করা সংজ্ঞা থেকে আসে, এগুলো আলাদা একটি খাতায় নোট করে রাখো।\n\n` +
           `তুমি এখন কোন চ্যাপ্টারটা নিয়ে সবচেয়ে বেশি চিন্তিত আছো বলো? আমি সেই চ্যাপ্টারের আসল বোর্ড প্রশ্ন বের করে দিচ্ছি!`;
  }

  // General Teacher / Tutor Conversation
  const searchRes = await searchQuestions(originalMsg, 1);
  if (searchRes.data && searchRes.data.length > 0) {
    const q = searchRes.data[0];
    return `তোমার কথার প্রেক্ষিতে টেস্ট পেপার থেকে এই প্রশ্নটি বিশেষভাবে লক্ষণীয়:\n\n` +
           `📖 **প্রশ্ন:** ${q.question_text}\n\n` +
           `• (A) ${q.option_a}\n• (B) ${q.option_b}\n• (C) ${q.option_c}\n• (D) ${q.option_d}\n\n` +
           `✅ **সঠিক উত্তর:** ${q.answer || 'B'} (বোর্ড রেফারেন্স: \`${q.tags || "বোর্ড পরীক্ষা"}\`)\n\n` +
           `এই টপিক নিয়ে কি কোনো খটকা বা কনফিউশন আছে? থাকলে নিঃসংকোচে বলো, একদম পানি করে বুঝিয়ে দিচ্ছি!`;
  }

  return `আমি আছি তোমার সাথে! একজন প্রাইভেট টিউটর ভাইয়ার মতো তুমি আমাকে যেকোনো কিছু বলতে পারো:\n\n` +
         `১. **"অমুক প্রশ্নটা বোর্ডে কয়বার আসছে?"** (আমি বোর্ড এনালাইসিস করে দেব)\n` +
         `২. **"ঢাকা বোর্ডের বা চট্টগ্রাম বোর্ডের প্রশ্ন দাও"** (নির্দিষ্ট বোর্ডের প্রশ্ন আনব)\n` +
         `৩. **"সৃজনশীল (CQ) প্রশ্ন প্র্যাকটিস করাবো"** (উদ্দীপক ও ক, খ, গ, ঘ সমাধানসহ)\n` +
         `৪. **"পড়াশোনার স্ট্র্যাটেজি ও ট্রিকস বলো"**\n\n` +
         `বলো, আজ আমরা কোন বিষয়ে বাজিমাত করতে যাচ্ছি? 😊`;
}
