// Multi-turn Autonomous ReAct Agent Execution Loop with Tool Calling & Token Streaming
import { AGENT_TOOLS, executeAgentTool } from "../tools/index.js";
import { findChapterCached } from "../tools/helpers.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { SUBJECT_DISPLAY_NAMES, toBnDigits, normalizeSubject } from "../../config/subject-map.js";
import { extractChapterNum, findChapterNumByKeywords } from "../../config/chapter-map.js";
import { detectSubjectFromAcademicContent, detectSubjectAndChapterFromQuery } from "../../config/concept-detector.js";
import { ENV } from "../../config/env.js";
import { SYSTEM_PROMPT } from "../prompts/system-prompt.js";
import { compactToolResult } from "./compaction.js";
import { classifyIntent, getScopedTools, pruneHistoryForContext, getMaxTokensForIntent, calculateTokenTelemetry, INTENT_TYPES } from "./router.js";
import { calculateStepCost, calculateBaselineCost, formatCostUsd, formatCostBdt, recordGatewayCall, USD_TO_BDT_RATE } from "./gateway-metrics.js";
import { globalCreditManager } from "./credit-manager.js";
import { routeStudentIntentWithJev } from "../router/jev-router.js";

// Helpers for student-friendly, empathetic tool progress labels
function getToolHumanLabel(tool, args) {
  switch (tool) {
    case "get_subject_chapters":
      return `এনসিটিবি কারিকুলাম ও অফিশিয়াল অধ্যায় বিন্যাস যাচাই চলছে...`;
    case "check_board_frequency":
      return `'${args.topic || ""}' টপিকের বিগত বোর্ড পুনরাবৃত্তি রেকর্ড বিশ্লেষণ চলছে...`;
    case "get_board_exam_questions":
      return `${args.board_name || ""} বোর্ডের বিগত প্রশ্নপত্র ও পরীক্ষার প্যাটার্ন অনুসন্ধান চলছে...`;
    case "get_creative_question":
      return `বোর্ড স্ট্যান্ডার্ড সৃজনশীল (CQ) উদ্দীপক ও মানবণ্টন কাঠামো যাচাই চলছে...`;
    case "get_mcq_quiz":
      return `বোর্ড প্রশ্নব্যাংক থেকে ট্রিকি ও গুরুত্বপূর্ণ MCQ বাছাই করা হচ্ছে...`;
    case "get_chapter_importance_ranking":
      return `বিগত ৫ বছরের বোর্ড পরীক্ষার ৮০/২০ প্রায়োরিটি রুটম্যাপ বিশ্লেষণ চলছে...`;
    case "search_question_bank":
      return `'${args.query || ""}' সংক্রান্ত বোর্ড প্রশ্ন ও সমাধান অনুসন্ধান চলছে...`;
    case "find_similar_type_questions":
      return `অনুরূপ সূত্রের প্রশ্ন ও ভেক্টর প্যাটার্ন ম্যাচিং চলছে...`;
    case "analyze_chapter_patterns":
      return `${args.chapter || ""} অধ্যায়ের বিগত ১০ বছরের মাস্টার টাইপ ব্লুপ্রিন্ট প্রস্তুত হচ্ছে...`;
    case "query_question_database_sql":
      return args.explanation ? `অ্যাকাডেমিক অনুসন্ধান: ${args.explanation}...` : `৫০,৮৫৫টি বোর্ড প্রশ্ন থেকে লাইভ অ্যানালিটিক্স সংগ্রহ চলছে...`;
    default:
      return `বোর্ড পরীক্ষার ডেটাবেস বিশ্লেষণ চলছে...`;
  }
}

function getToolCompletedTitle(tool, args, result) {
  switch (tool) {
    case "get_subject_chapters":
      return `${result?.subject || "সিলেবাস"}: অফিশিয়াল এনসিটিবি কারিকুলাম যাচাইকৃত`;
    case "get_chapter_importance_ranking":
      return `${result?.subject || "সকল"}: বিগত ৫ বছরের বোর্ড প্রশ্ন ফ্রিকোয়েন্সি ও প্রায়োরিটি`;
    case "check_board_frequency":
      return `'${result?.topic || args?.topic || ""}' টপিকের বোর্ড পরীক্ষার রেকর্ড যাচাইকৃত`;
    case "get_board_exam_questions":
      return `${result?.board || args?.board_name || ""} বোর্ডের বিগত প্রশ্নপত্র সংগ্রহ প্রস্তুত`;
    case "get_creative_question":
      return `বোর্ড স্ট্যান্ডার্ড সৃজনশীল (CQ) উদ্দীপক ও ৪ স্তরের মানবণ্টন প্রস্তুত`;
    case "get_mcq_quiz":
      return `বোর্ড পরীক্ষার স্ট্যান্ডার্ড MCQ ও কনসেপ্ট বিশ্লেষণ প্রস্তুত`;
    case "search_question_bank":
      return `বোর্ড প্রশ্নব্যাংক অনুসন্ধান ও নির্ভরযোগ্য সমাধান প্রস্তুত`;
    case "find_similar_type_questions":
      return `অনুরূপ সূত্রের প্রশ্ন ও ভেক্টর প্যাটার্ন প্রস্তুত`;
    case "analyze_chapter_patterns":
      return `${result?.chapter_name || args?.chapter || ""} অধ্যায়ের মাস্টার টাইপ ব্লুপ্রিন্ট প্রস্তুত`;
    case "query_question_database_sql":
      return `৫০,৮৫৫টি প্রশ্নব্যাংক থেকে লাইভ অ্যাকাডেমিক অ্যানালিটিক্স সংগৃহীত`;
    default:
      return `বোর্ড ডেটাবেস থেকে তথ্য যাচাই সম্পন্ন`;
  }
}

function getToolSummary(tool, result) {
  switch (tool) {
    case "get_subject_chapters": {
      const total = result.total_chapters || (result.numbered_chapters ? result.numbered_chapters.length : 0);
      return `${result.subject}: মোট ${toBnDigits(total)}টি অধ্যায়ের অফিশিয়াল তালিকা প্রস্তুত।`;
    }
    case "check_board_frequency":
      return `'${result.topic}': বিগত বছরগুলোতে মোট ${toBnDigits(result.total_questions)} বার বোর্ডে এসেছে।`;
    case "get_board_exam_questions":
      return `${result.board} বোর্ড: ${toBnDigits(result.available_exam_sets?.length || 0)}টি অফিশিয়াল প্রশ্ন সেট সংগৃহীত।`;
    case "get_creative_question":
      return `বোর্ড স্ট্যান্ডার্ড সৃজনশীল প্রশ্ন ও পূর্ণাঙ্গ ক, খ, গ, ঘ পাওয়া গেছে।`;
    case "get_mcq_quiz":
      return `${toBnDigits(result.quiz?.length || 0)}টি বাছাইকৃত বোর্ড MCQ প্রস্তুত।`;
    case "get_chapter_importance_ranking":
      return `${result.subject}: আসল বোর্ড ডেটা অনুযায়ী সর্বাধিক গুরুত্বপূর্ণ অধ্যায় '${result.most_important_chapter}' (শীর্ষ প্রায়োরিটি চিহ্নিত)`;
    case "search_question_bank":
      return `'${result.search_query}': ${toBnDigits(result.total_found || 0)}টি সমাধানকৃত প্রশ্ন পাওয়া গেছে।`;
    case "find_similar_type_questions":
      return `${toBnDigits(result.similar_type_questions?.length || 0)}টি অনুরূপ বোর্ড প্রশ্ন প্রস্তুত।`;
    case "analyze_chapter_patterns":
      return `${result.chapter_name}: মোট ${toBnDigits(result.total_questions_in_database)}টি বোর্ড প্রশ্নের টাইপ ব্লুপ্রিন্ট প্রস্তুত।`;
    case "query_question_database_sql":
      return result.success ? `অ্যানালিটিক্স সম্পন্ন: ${toBnDigits(result.total_matching_rows)}টি রেকর্ড বিশ্লেষিত (${result.duration_ms}ms)` : `অ্যানালিটিক্স ত্রুটি: ${result.error}`;
    default:
      return `বোর্ড ডেটাবেস যাচাই সফলভাবে সম্পন্ন হয়েছে।`;
  }
}

// Stream words immediately with zero artificial delay for instant TTFT
async function streamWords(text, onEvent) {
  const tokens = text.match(/\S+|\s+/g) || [text];
  for (const token of tokens) {
    await onEvent({ type: "content_delta", delta: token });
  }
}

export function stripInternalThoughts(text) {
  if (!text) return "";
  return text
    .replace(/<[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>[\s\S]*?<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>/gi, '')
    .replace(/^<[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>[\s\S]*?(?:\n\n|$)/gi, '')
    .replace(/(?:<[\s]*\/?)?(?:thought|thinking|থought|থট)[\s>]*\[[\s\S]*?\]/gi, '')
    .replace(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|অধ্যায়|অধ্যায়|subject|chapter)[^\]]*\]/gi, '')
    .replace(/<\/?[\s]*(?:thought|thinking)[\s]*>/gi, '');
}

// Dynamically extract AI model's autonomous reasoning, subject choice, and chapter from thought or leading text
export function extractAiAcademicIntent(thoughtText) {
  if (!thoughtText) return null;

  // 1. Explicit tag declaration: [বিষয়: ...] or [বিষয়: ...] or [subject: ...]
  const tagMatch = thoughtText.match(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|subject)\s*[:ঃ]\s*([^,\]]+)(?:,\s*(?:অধ্যায়|অধ্যায়|chapter)\s*[:ঃ]\s*([^\]]+))?\s*\]/i) ||
                   thoughtText.match(/(?:thought|thinking|থought|থট)[\s>]*\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|subject)\s*[:ঃ]\s*([^,\]]+)(?:,\s*(?:অধ্যায়|অধ্যায়|chapter)\s*[:ঃ]\s*([^\]]+))?\s*\]/i);
  if (tagMatch) {
    const rawSubj = tagMatch[1].trim();
    const rawCh = tagMatch[2] ? tagMatch[2].trim() : null;
    const normSubj = normalizeSubject(rawSubj);
    if (normSubj) {
      return {
        subject: normSubj,
        chapter: rawCh ? (extractChapterNum(rawCh) || findChapterNumByKeywords(rawCh, normSubj)) : null
      };
    }
  }

  // 2. Natural Bengali reasoning: "বিষয়: বাংলাদেশ ও বিশ্বপরিচয়", "বিষয় পরিবর্তন: পদার্থবিজ্ঞান"
  const phraseMatch = thoughtText.match(/(?:বিষয়\s*হলো|বিষয়\s*নির্ধারণ|বিষয়\s*পরিবর্তন|সক্রিয়\s*বিষয়|বিষয়\s*হিসেবে|বিষয়)\s*[:ঃ]?\s*([^,।—\n\]]+)/i);
  if (phraseMatch) {
    const normSubj = normalizeSubject(phraseMatch[1].trim());
    if (normSubj) {
      const chMatch = thoughtText.match(/(?:অধ্যায়|অধ্যায়|chapter)\s*([০-৯0-9]+)/i) ||
                      thoughtText.match(/([০-৯0-9]+)\s*(?:তম|ম|র্থ|ষ্ঠ|ম|য়|ই|য়)?\s*(?:অধ্যায়|অধ্যায়)/i);
      const ch = chMatch ? extractChapterNum(chMatch[1]) : null;
      return { subject: normSubj, chapter: ch };
    }
  }

  return null;
}

export function formatProfessionalThought(rawThought, subjectId, chapterNum, userMessage = "") {
  let text = (rawThought || "").trim();

  // Extract tag if present: [বিষয়: ..., অধ্যায়: ...]
  let tagSubj = "";
  let tagCh = "";
  const tagMatch = text.match(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|subject)\s*[:ঃ]\s*([^,\]]+)(?:,\s*(?:অধ্যায়|অধ্যায়|chapter)\s*[:ঃ]\s*([^\]]+))?\s*\]/i);
  if (tagMatch) {
    tagSubj = tagMatch[1].trim();
    if (tagMatch[2]) tagCh = tagMatch[2].trim();
  }

  // Clean raw thought tags and robotic brackets
  let cleanText = text
    .replace(/^<[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>/gi, '')
    .replace(/<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>$/gi, '')
    .replace(/(?:<[\s]*\/?)?(?:thought|thinking|থought|থট)[\s>]*\[[\s\S]*?\]/gi, '')
    .replace(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|subject)[^\]]*\]/gi, '')
    .trim();

  // If user did not explicitly mention a new subject, lock to active session subject
  const explicitSubjInMsg = normalizeSubject(userMessage);
  const activeSubj = (!explicitSubjInMsg && subjectId) ? (SUBJECT_DISPLAY_NAMES[subjectId] || "চলমান বিষয়") : (tagSubj || SUBJECT_DISPLAY_NAMES[subjectId] || "চলমান বিষয়");
  let activeChNum = (!explicitSubjInMsg && chapterNum) ? chapterNum : (tagCh || chapterNum);

  // If query is broad syllabus, paper list, or chapter count, clear chapter number
  const isListOrSyllabus = /(?:তালিকা|list|সিলেবাস|syllabus|কয়টা|কয়টা|সবগুলো|অধ্যায়গুলো|অধ্যায়ের\s*নাম|1st\s*paper|2nd\s*paper|১ম\s*পত্র|২য়\s*পত্র)/i.test(userMessage);
  if (isListOrSyllabus) {
    activeChNum = null;
  }

  // Sanity check chapter numbers against subject limits
  if (activeChNum) {
    const cNum = parseInt(String(activeChNum).replace(/[০-৯]/g, d => ({ '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' }[d] || d)), 10);
    const sid = String(subjectId || "").toLowerCase();
    if (sid.includes("phys") && cNum > 21) activeChNum = null;
    else if (sid.includes("chem") && cNum > 10) activeChNum = null;
    else if (sid.includes("math") && cNum > 20) activeChNum = null;
    else if (sid.includes("ict") && cNum > 6) activeChNum = null;
    else if (sid.includes("bio") && cNum > 24) activeChNum = null;
  }

  // If the model only emitted a short tag or minimal text (< 15 chars), synthesize rich pedagogical reasoning
  if (cleanText.length < 15) {
    const sid = String(subjectId || "").toLowerCase();
    const isFirstPaper = /(?:1st|১ম|প্রথম|first)\s*(?:paper|পত্র)?/i.test(userMessage);
    const isSecondPaper = /(?:2nd|২য়|দ্বিতীয়|second)\s*(?:paper|পত্র)?/i.test(userMessage);
    const paperStr = isFirstPaper ? "১ম পত্রের" : (isSecondPaper ? "২য় পত্রের" : "");

    if (isListOrSyllabus) {
      if (sid.includes("phys") || sid.includes("পদার্থ")) {
        cleanText = `শিক্ষার্থী এইচএসসি পদার্থবিজ্ঞান ${paperStr ? paperStr + ' ' : ''}অধ্যায়গুলোর অনুমোদিত তালিকা জানতে চেয়েছে। এনসিটিবি কারিকুলাম অনুযায়ী নির্ভুল অধ্যায় তালিকা প্রস্তুত করছি।`;
      } else if (sid.includes("chem") || sid.includes("রসায়ন") || sid.includes("রসায়ন")) {
        cleanText = `শিক্ষার্থী এইচএসসি রসায়ন ${paperStr ? paperStr + ' ' : ''}অধ্যায় বিন্যাস জানতে চেয়েছে। এনসিটিবি কারিকুলাম ও বোর্ড প্রশ্নের আলোকে পূর্ণ তালিকা প্রস্তুত করছি।`;
      } else if (sid.includes("math") || sid.includes("গণিত")) {
        cleanText = `শিক্ষার্থী এইচএসসি উচ্চতর গণিত ${paperStr ? paperStr + ' ' : ''}অধ্যায় তালিকা জানতে চেয়েছে। বোর্ড অনুমোদিত সিলেবাস অনুযায়ী অধ্যায় ক্রম যাচাই করছি।`;
      } else if (sid.includes("bio") || sid.includes("জীব")) {
        cleanText = `শিক্ষার্থী এইচএসসি জীববিজ্ঞান ${paperStr ? paperStr + ' ' : ''}অধ্যায় তালিকা জানতে চেয়েছে। উদ্ভিদবিজ্ঞান ও প্রাণিবিজ্ঞানের কারিকুলাম অনুযায়ী তালিকা প্রস্তুত করছি।`;
      } else if (sid.includes("ict") || sid.includes("তথ্য")) {
        cleanText = `শিক্ষার্থী এইচএসসি তথ্য ও যোগাযোগ প্রযুক্তি বিষয়ের অধ্যায় বিন্যাস জানতে চেয়েছে। এনসিটিবি সিলেবাসের ৬টি অধ্যায় গুছিয়ে প্রস্তুত করছি।`;
      } else {
        cleanText = `শিক্ষার্থীর অনুরোধ অনুযায়ী অ্যাকাডেমিক সিলেবাস ও পাঠ্যক্রমের অফিশিয়াল অধ্যায় বিন্যাস যাচাই করছি।`;
      }
    } else {
      const getOrdinal = (nStr) => {
        const n = parseInt(String(nStr).replace(/[০-৯]/g, d => ({ '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' }[d] || d)), 10);
        if (n === 1) return '১ম';
        if (n === 2) return '২য়';
        if (n === 3) return '৩য়';
        if (n === 4) return '৪র্থ';
        if (n === 5) return '৫ম';
        if (n === 6) return '৬ষ্ঠ';
        if (n >= 7 && n <= 10) return `${toBnDigits(n)}ম`;
        return n ? `${toBnDigits(n)}তম` : '';
      };
      const chStr = activeChNum ? `${getOrdinal(activeChNum)} অধ্যায়` : 'সংশ্লিষ্ট অধ্যায়';
      if (sid.includes("phys") || sid.includes("পদার্থ")) {
        cleanText = `শিক্ষার্থীর অনুরোধটি এইচএসসি পদার্থবিজ্ঞানের ${chStr}-এর ধারণাগত সমস্যার সাথে সম্পর্কিত। মুখস্থের বদলে ভৌত তাৎপর্য, সূত্র ও বাস্তবসম্মত উদাহরণের মাধ্যমে স্পষ্ট ধারণা তুলে ধরছি।`;
      } else if (sid.includes("chem") || sid.includes("রসায়ন") || sid.includes("রসায়ন")) {
        cleanText = `শিক্ষার্থীর অনুরোধটি এইচএসসি রসায়নের ${chStr}-এর গুরুত্বপূর্ণ বিক্রিয়া ও কাঠামোগত ধারণার সাথে সম্পর্কিত। বিজ্ঞানসম্মত যুক্তি ও এনসিটিবি কারিকুলাম বজায় রেখে বিশদ পরিকল্পনা করছি।`;
      } else if (sid.includes("math") || sid.includes("গণিত")) {
        cleanText = `শিক্ষার্থীর অনুরোধটি এইচএসসি উচ্চতর গণিতের ${chStr}-এর গাণিতিক সমস্যার সাথে সম্পর্কিত। সূত্রের নিখুঁত প্রয়োগ ও বোর্ড পরীক্ষার স্ট্যান্ডার্ড নিয়ম অনুযায়ী ধাপে ধাপে সমাধান প্রস্তুত করছি।`;
      } else if (sid.includes("bio") || sid.includes("জীব")) {
        cleanText = `শিক্ষার্থীর অনুরোধটি এইচএসসি জীববিজ্ঞানের ${chStr}-এর শারীরবৃত্তীয় বিষয়ের সাথে সম্পর্কিত। বৈজ্ঞানিক সংজ্ঞা ও কাঠামোগত ধারণা সহজ ও প্রাঞ্জল ভাষায় উপস্থাপন করছি।`;
      } else if (sid.includes("ict") || sid.includes("তথ্য")) {
        cleanText = `শিক্ষার্থীর অনুরোধটি এইচএসসি তথ্য ও যোগাযোগ প্রযুক্তি (ICT) বিষয়ের ${chStr}-এর ব্যবহারিক ও প্রযুক্তিগত বিষয়ের সাথে সম্পর্কিত। বোর্ডের মানবণ্টন বজায় রেখে পরিষ্কার বিশ্লেষণ সাজিয়ে নিচ্ছি।`;
      } else if (sid.includes("bangla") || sid.includes("বাংলা")) {
        cleanText = `শিক্ষার্থীর অনুরোধটি এইচএসসি বাংলা সাহিত্য ও ব্যাকরণের ${chStr}-এর মূল ভাবের সাথে সম্পর্কিত। পাঠ্যবইয়ের গভীর বোধ ও প্রমিত ভাষায় উত্তর তৈরি করছি।`;
      } else if (sid.includes("eng") || sid.includes("ইংরেজি")) {
        cleanText = `শিক্ষার্থীর প্রশ্নটি এইচএসসি ইংরেজি ভাষার প্রায়োগিক নিয়ম ও পাঠ্যক্রমের সাথে সম্পর্কিত। নিয়ম ও প্রেক্ষাপট স্পষ্ট করে দিচ্ছি।`;
      } else {
        cleanText = `শিক্ষার্থীর অ্যাকাডেমিক প্রশ্নটির বিষয়বস্তু বিশ্লেষণ করছি। এনসিটিবি পাঠ্যক্রম অনুযায়ী মুখস্থের বদলে বাস্তব উদাহরণ ও স্পষ্ট যুক্তি দিয়ে বিষয়টির গভীর বোধ তৈরি করাই আমার মূল লক্ষ্য।`;
      }
    }
  }

  const tagStr = `[বিষয়: ${activeSubj}${activeChNum ? `, অধ্যায়: ${toBnDigits(activeChNum)}` : ''}]`;
  return `${cleanText} ${tagStr}`;
}

export async function runAgenticConversation(userMessage, onEvent, options = {}) {
  const startTime = performance.now();
  const pastHistory = options.history || [];

  const mergeUrl = process.env.MERGE_API_URL || ENV.MERGE_API_URL;
  const mergeKey = process.env.MERGE_API_KEY || ENV.MERGE_API_KEY;
  const modelName = process.env.MODEL_NAME || ENV.MODEL_NAME;

  // 1. Reconcile and activate the 4-Tier Memory State (Working Memory, Episodic Ledger, Directives)
  const memoryReconciliation = MemoryManager.reconcile(userMessage, pastHistory, options.state);
  let state = memoryReconciliation.state;
  const isAnswering = memoryReconciliation.isAnswering;
  const isMetaDebate = memoryReconciliation.isMetaDebate;
  // 1b. Dynamic Corpus & Database Fallback Check (Checks all 114 chapters and 50,855 questions)
  const isBroadSyllabus = /(?:সবগুলো|সব|shob|sob|all)\s*(?:অধ্যায়|অধ্যায়|চ্যাপ্টার|chapter|পাঠ)|(?:অধ্যায়গুলো|অধ্যায়গুলো|অধ্যায়ের\s*তালিকা|অধ্যায়\s*তালিকা|অধ্যায়গুলোর\s*নাম|তালিকা|\blist\b|সিলেবাস|syllabus)/i.test(userMessage) ||
    /(?:1st|2nd|১ম|২য়|প্রথম|দ্বিতীয়|first|second)\s*(?:paper|পত্র)?\s*(?:er\s*)?(?:list|তালিকা|অধ্যায়|chapter|নাম|বই)/i.test(userMessage);
  const mentionsCurrentSubj = state.subject_name && (userMessage.includes(state.subject_name) || (state.subject_id && userMessage.toLowerCase().includes(state.subject_id.replace(/^ssc_/, ''))));

  if (isBroadSyllabus) {
    state.chapter_num = null;
    state.chapter_name = null;
    state.active_question = null;
  }

  // 2. Classify Intent via Orchestrator Decision Router (Big Boss Router) early to protect conversational flow
  const classifiedIntent = classifyIntent(userMessage, state, isAnswering);

  // Check if query is an explicit subject shift vs. a contextual continuation ("ei oddhai theke", "arekta mcq", etc.)
  const explicitSubjInMsg = normalizeSubject(userMessage);
  const detectedSubjFromMsg = detectSubjectAndChapterFromQuery(userMessage, state.subject_id);
  const isExplicitSubjChange = Boolean(explicitSubjInMsg || (detectedSubjFromMsg?.subject_id && detectedSubjFromMsg.subject_id !== state.subject_id));

  // 2b. System 1: TypeSafe Jev-1.13 Pre-Flight Decision Router
  let jevDecision = null;
  const isMergeGateway = (ENV.AI_GATEWAY === "merge");

  const isSimilarReq = /এই\s*টাইপের|অনুরূপ|similar|একই\s*সূত্রের|আরেকটি\s*প্রশ্ন|আরেকটা\s*প্রশ্ন|আরেকটা\s*mcq|আরেকটি\s*mcq|আরেকটা\s*cq|আরেকটি\s*cq|এইরকম\s*আরেক/i.test(userMessage);
  const isMcqReq = /mcq|কুইজ|quiz|বহুনির্বাচন|নৈর্ব্যক্তিক|1\s*mcq|one\s*mcq|ekta\s*mcq|একটা\s*mcq|একটি\s*mcq|show\s*1\s*mcq/i.test(userMessage);
  const isCqReq = /cq|সৃজনশীল|উদ্দীপক|1\s*cq|one\s*cq|ekta\s*cq|একটা\s*cq|একটি\s*cq/i.test(userMessage);
  const isPatReq = /মাস্টার\s*টাইপ|পরীক্ষকের\s*ফাঁদ|অধ্যায়ের\s*টাইপ|ব্লুপ্রিন্ট|chapter\s*pattern/i.test(userMessage);
  const requiresQuestionTool = isSimilarReq || isMcqReq || isCqReq || isPatReq;

  if (isMergeGateway && !isAnswering && !isMetaDebate) {
    try {
      jevDecision = await routeStudentIntentWithJev(userMessage, state);
      if (jevDecision?.success && jevDecision.actionConfidence >= 0.50) {
        if (jevDecision.subject && jevDecision.subject !== 'none_general') {
          const canonical = normalizeSubject(jevDecision.subject) || jevDecision.subject;
          if (!state.subject_id || isExplicitSubjChange) {
            state.subject_id = canonical;
            state.subject_name = SUBJECT_DISPLAY_NAMES[canonical] || canonical;
          }
        }
      }
    } catch (err) {
      console.warn("[Runner] Jev pre-flight routing error:", err.message);
    }
  }

  const isContextualContinuation = !isExplicitSubjChange && Boolean(
    state.subject_id && (
      /(?:ei\s*(?:odddhai|oddhai|odday|chapter|ch)|এই\s*অধ্যায়|এই\s*অধ্যায়|এই\s*চ্যাপ্টার|এখান\s*থেকে|এখানকার|এর\s*পরের|আরেকটা|আরেকটি|আরও|আরো|next|পরের|অনুরূপ|same|একই)/i.test(userMessage) ||
      /(?:1st|2nd|১ম|২য়|প্রথম|দ্বিতীয়|first|second)\s*(?:paper|পত্র)?/i.test(userMessage) ||
      /(?:তালিকা|list|সিলেবাস|syllabus|কয়টা|কয়টা|সবগুলো|অধ্যায়গুলো|অধ্যায়ের\s*নাম)/i.test(userMessage) ||
      /(?:mcq|cq|quiz|কুইজ|বহুনির্বাচন|নৈর্ব্যক্তিক|প্রশ্ন|পরীক্ষা|টেস্ট|test|exam)/i.test(userMessage)
    )
  );

  if (!isMetaDebate && !isAnswering && !isBroadSyllabus && !isContextualContinuation && classifiedIntent !== INTENT_TYPES.GREETING) {
    try {
      // 1. Autonomous concept detection from query (covers both cross-subject and intra-subject chapter shifts)
      const queryConcept = detectSubjectAndChapterFromQuery(userMessage, state.subject_id);
      if (queryConcept?.subject_id) {
        const explicitSubjMention = normalizeSubject(userMessage);
        const hasChapterMention = /(?:অধ্যায়|অধ্যায়|chapter|ch)\s*([০-৯0-9]+)/i.test(userMessage);

        if (queryConcept.subject_id !== state.subject_id) {
          state.subject_id = queryConcept.subject_id;
          state.subject_name = SUBJECT_DISPLAY_NAMES[queryConcept.subject_id] || queryConcept.subject_id;
          state.chapter_num = queryConcept.chapter_num ? String(queryConcept.chapter_num) : null;
          state.chapter_name = queryConcept.chapter_name || null;
          state.active_question = null;
        } else if (explicitSubjMention && !hasChapterMention && !queryConcept.chapter_num) {
          // User re-focused or mentioned subject without chapter -> strictly clear chapter!
          state.chapter_num = null;
          state.chapter_name = null;
          state.active_question = null;
        } else if (queryConcept.chapter_num && String(queryConcept.chapter_num) !== state.chapter_num) {
          state.chapter_num = String(queryConcept.chapter_num);
          state.chapter_name = queryConcept.chapter_name || state.chapter_name;
          state.active_question = null;
        }
      } else {
        const explicitSubj = normalizeSubject(userMessage);
        if (explicitSubj) {
          state.subject_id = explicitSubj;
          state.subject_name = SUBJECT_DISPLAY_NAMES[explicitSubj] || explicitSubj;
          // Strictly NEVER auto-select a chapter if user only named the subject!
          const hasChapterMention = /(?:অধ্যায়|অধ্যায়|chapter|ch)\s*([০-৯0-9]+)/i.test(userMessage);
          state.chapter_num = hasChapterMention ? findChapterNumByKeywords(userMessage, explicitSubj) : null;
          state.chapter_name = null;
          state.active_question = null;
        } else {
          const targetSubj = state.subject_id || null;
          const dbChapterMatch = await findChapterCached(userMessage, targetSubj, null);
          if (dbChapterMatch && dbChapterMatch.subject_id) {
            // NEVER switch subject via fuzzy chapter match unless user explicitly specified another subject!
            if (!state.subject_id || dbChapterMatch.subject_id === state.subject_id) {
              state.subject_id = dbChapterMatch.subject_id;
              state.subject_name = SUBJECT_DISPLAY_NAMES[dbChapterMatch.subject_id] || dbChapterMatch.subject_id;
              state.chapter_num = String(dbChapterMatch.order_num);
              state.chapter_name = dbChapterMatch.name;
              state.active_question = null;
            }
          }
        }
      }
    } catch (e) {
      console.warn("[Runner] Dynamic DB chapter lookup error:", e);
    }
  }

  // Immediately notify client of subject or chapter switch before token 1 streams
  const subjectChanged = options.state && state.subject_id && state.subject_id !== options.state.subject_id;
  const chapterChanged = options.state && state.chapter_num !== options.state.chapter_num;
  if (subjectChanged || chapterChanged) {
    await onEvent({ type: "state_sync", state });
  }

  const activeSubject = state.subject_id;
  const activeChapter = state.chapter_num;

  const isAuditReview = classifiedIntent === INTENT_TYPES.EXAM_AUDIT_REVIEW;
  const isGreeting = (classifiedIntent === INTENT_TYPES.GREETING || jevDecision?.action === 'general_chitchat');
  const isConceptExplanation = !isGreeting && !isAnswering && !isMetaDebate && (
    jevDecision?.action === 'explain_concept' ||
    (jevDecision?.action !== 'fetch_quiz' && jevDecision?.action !== 'similar_question' && classifiedIntent === INTENT_TYPES.GENERAL)
  );

  // Build high-efficiency input history: dynamically scoped for zero token waste
  const inputHistory = [];
  const activeSubjBn = state.subject_name || SUBJECT_DISPLAY_NAMES[activeSubject] || "চলমান বিষয়";
  const chDisplay = activeChapter ? `অধ্যায় ${activeChapter}` : "";

  if (isGreeting) {
    inputHistory.push({
      type: "message",
      role: "system",
      content: activeSubject ?
        `You are "বোধ" (BODH), premier autonomous academic AI tutor for SSC & HSC students in Bangladesh. Respond warmly and concisely in Bengali (1-2 sentences). Welcome the student back to their '${activeSubjBn}' study session. Do NOT emit <thought> tags.` :
        `You are "বোধ" (BODH), premier autonomous academic AI tutor for SSC & HSC students in Bangladesh. Respond warmly and concisely in Bengali (1-2 sentences). Introduce yourself and invite the student to study any science, math, or humanities topic. Do NOT emit <thought> tags.`
    });
  } else if (isConceptExplanation) {
    // Ultra-lean, high-efficiency concept explanation prompt (cuts 90%+ of input tokens!)
    inputHistory.push({
      type: "message",
      role: "system",
      content: `You are "বোধ" (BODH), premier autonomous academic AI tutor for SSC & HSC students in Bangladesh.
Current Subject: '${activeSubjBn}' ${chDisplay}.
PEDAGOGICAL DIRECTIVE:
1. Deliver a direct, crystal-clear, and pedagogically rich academic explanation of the student's question in natural, authentic Bengali.
2. Focus on conceptual depth, intuitive real-life examples, and official NCTB syllabus accuracy.
3. Format math/chemical formulas using LaTeX ($...$, $$...$$).
4. Do NOT output <thought> tags unless complex multi-step mathematical derivation is required.
5. NEVER ask "তুমি কোন বিষয় পড়তে চাও?" or refuse to answer. Answer the concept directly and fully!`
    });
  } else {
    // Standard system prompt for complex multi-tool queries or exams
    inputHistory.push({
      type: "message",
      role: "system",
      content: SYSTEM_PROMPT
    });

    const episodicLedger = MemoryManager.generateEpisodicLedger(state);
    if (episodicLedger) {
      inputHistory.push({
        type: "message",
        role: "system",
        content: episodicLedger
      });
    }

    if (activeSubject) {
      inputHistory.push({
        type: "message",
        role: "system",
        content: `ACTIVE ACADEMIC CONTEXT: Currently active session subject is '${activeSubjBn}' (${activeSubject}) [${chDisplay || "সম্পূর্ণ পাঠ্যক্রম"}].
DYNAMIC MULTI-DISCIPLINARY SSC ACADEMIC ROUTING:
1. You are "বোধ" (BODH), premier autonomous academic AI tutor for SSC subjects.
2. If the student asks a complex question or switches to another subject: you may reflect in an initial <thought>...</thought> ending with [বিষয়: <বিষয়_নাম>, অধ্যায়: <অধ্যায়_নম্বর>].
3. For simple facts, direct questions, or quick queries: answer directly without <thought>.
4. ABSOLUTE PROHIBITION: Never ask "তুমি কোন বিষয় পড়তে চাও?" or refuse to answer. Answer the concept directly and fully!`
      });
    }

    if (isMetaDebate) {
      inputHistory.push({
        type: "message",
        role: "system",
        content: `CRITICAL DIRECTIVE (ZERO META-DEBATE & IMMEDIATE PIVOT):
1. DO NOT DEFEND YOURSELF: No excuses or debate.
2. Give a warm, humble 1-line pivot acknowledgment stating that you are staying with ${activeSubjBn} ${chDisplay}.
3. IMMEDIATELY RETURN TO THE ACADEMIC TASK: Provide an authentic question or proceed with ${activeSubjBn} ${chDisplay}.`
      });
    }

    if (isAnswering) {
      const toBnAns = { 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ', '1': '১', '2': '২', '3': '৩', '4': '৪' };
      const rawMatch = userMessage.trim().match(/[ক-ঘa-dA-D১-৪]/i);
      const userChoice = rawMatch ? (toBnAns[rawMatch[0].toLowerCase()] || rawMatch[0]) : userMessage.trim();
      const correctCode = state.active_question?.answer_code || "";
      const isCorrect = correctCode && (userChoice === correctCode || (userChoice === '১' && correctCode === 'ক') || (userChoice === '২' && correctCode === 'খ') || (userChoice === '৩' && correctCode === 'গ') || (userChoice === '৪' && correctCode === 'ঘ'));

      state = MemoryManager.recordAnswerEvaluation(state, userChoice, isCorrect);
      await onEvent({ type: "state_sync", state });

      inputHistory.push({
        type: "message",
        role: "system",
        content: `IMPORTANT ACADEMIC DIRECTIVE (QUIZ EVALUATION & GRADING): The student answered '${userChoice}'.
Correct answer code is: '${correctCode}'. Student's answer is: ${isCorrect ? "CORRECT (সঠিক)" : "INCORRECT (ভুল)"}.
1. STRICT EVALUATION ONLY: Praise warmly if correct (1 line), then provide 2-3 line clear scientific reason. If incorrect, explain gently why with the scientific principle and state the right option.
2. Current Quiz Streak: ${state.quiz_metrics.streak}, Total Score: ${state.quiz_metrics.correct}/${state.quiz_metrics.attempted}.
3. End with an encouraging 1-line invite for the next challenge.`
      });
    }

    // Conditional pedagogical thinking — ONLY when complex reasoning is needed
    inputHistory.push({
      type: "message",
      role: "system",
      content: `চিন্তাভাবনার নির্দেশনা (<thought>):
উত্তরের শুরুতে <thought>...</thought> ট্যাগ কেবল তখনই ব্যবহার করবে যখন গভীর চিন্তা বা শিক্ষাদান পরিকল্পনার প্রয়োজন রয়েছে:
১. যখন প্রয়োজন: জটিল অ্যাকাডেমিক সমস্যা, গাণিতিক সমাধান, গভীর বৈজ্ঞানিক ব্যাখ্যা, নতুন বিষয় নির্ধারণ বা বহুধাপবিশিষ্ট ব্যাখ্যার ক্ষেত্রে—উত্তরের শুরুতে সংক্ষেপে ২-৩ বাক্যে <thought>...</thought> ট্যাগে পরিকল্পনা ও শেষে [বিষয়: <বিষয়>, অধ্যায়: <অধ্যায়>] লিখবে।
২. যখন প্রয়োজন নেই: সাধারণ কুশলবিনিময়, সহজ সরাসরি তথ্যভিত্তিক প্রশ্ন (যেমন: "পানির সংকেত কী?"), কুইজের উত্তর (ক/খ/গ/ঘ) বা সাধারণ প্রশ্নে কোনো <thought> ট্যাগ লিখবে না; সরাসরি প্রমিত বাংলায় দ্রুত উত্তর দেবে।

উদাহরণ (যখন চিন্তা প্রয়োজন):
<thought>শিক্ষার্থী এসএসসি পদার্থবিজ্ঞানের ২য় অধ্যায় (গতি)-এর সমীকরণ জানতে চেয়েছে। মুখস্থের বদলে ৪টি মৌলিক সমীকরণ ও প্রতিটি প্রতীকের অর্থ বুঝিয়ে দিচ্ছি। [বিষয়: পদার্থবিজ্ঞান, অধ্যায়: ২]</thought>

মূল উত্তরের ভেতরে কোনো <thought> ট্যাগ রাখবে না।`
    });
  }

  // Token & Structure Optimization: Prune history (strip historical thoughts, preserve last 4 clean turns for concepts, 8 for exams)
  const prunedHistory = pruneHistoryForContext(pastHistory, isConceptExplanation ? 4 : 8);
  for (const item of prunedHistory) {
    inputHistory.push(item);
  }

  // Add current user message
  inputHistory.push({
    type: "message",
    role: "user",
    content: userMessage
  });

  const executedToolsLog = [];
  let firstTokenTime = null;
  let finalResponseContent = "";

  // Cumulative Token & Cost Telemetry Tracker (Across all ReAct steps)
  let cumulativeInputTokens = 0;
  let cumulativeOutputTokens = 0;
  let cumulativeTotalTokens = 0;
  let cumulativeCostUsd = 0;
  let cumulativeGatewayLatencyMs = 0;
  let detectedModelUsed = modelName;
  let detectedVendorUsed = "openai";

  const MAX_STEPS = 4;
  let currentStep = 0;

  if (isAuditReview) {
    const activeSubjBn = state.subject_name || SUBJECT_DISPLAY_NAMES[activeSubject] || "চলমান বিষয়";
    inputHistory.push({
      type: "message",
      role: "system",
      content: `EXAM COMPLETION & 1-ON-1 CONCEPT CLEARING DIRECTIVE:
The student has just completed an exam and returned to chat for feedback and 1-on-1 tutoring!
1. STRICT ZERO TOOL CALLS: DO NOT call any tool. All question details and scores are already in the user's prompt.
2. MANDATORY MARKDOWN TABLE FORMAT: Present the "📊 ফলাফল বিশ্লেষণ" section as a clean, elegant Markdown Table (DO NOT use bullet points for the metrics!). Format:
# 📊 ফলাফল বিশ্লেষণ

| মেট্রিক | বিবরণ |
| :--- | :--- |
| **বিষয় ও অধ্যায়** | [বিষয়] ([অধ্যায়/পরীক্ষা]) |
| **মোট প্রশ্ন** | [সংখ্যা]টি 📝 |
| **সঠিক উত্তর** | [সংখ্যা]টি ✅ |
| **ভুল উত্তর** | [সংখ্যা]টি ❌ |
| **বাদ দেওয়া প্রশ্ন** | [সংখ্যা]টি ⏳ |
| **সাফল্যের হার** | [হার]% 📈 |

3. Follow the table with:
- 💡 **সংক্ষিপ্ত মূল্যায়ন**: ভুলের ধরণ নিয়ে ১-২টি চমৎকার অ্যাকাডেমিক পর্যবেক্ষণ এবং আত্মবিশ্বাস বৃদ্ধির বার্তা।
- 🎯 **১-অন-১ কনসেপ্ট সমাধান অফার**:
  সুনির্দিষ্টভাবে বলো: "ভুল হওয়া প্রতিটি প্রশ্নের সঠিক উত্তর, বৈজ্ঞানিক ব্যাখ্যা এবং অনুরূপ বোর্ড প্রশ্ন অনুশীলন করতে প্রস্তুত থাকলে **'হ্যাঁ, প্রথম প্রশ্ন থেকে শুরু করো'** বলো!"
4. Keep the output clean, structured, and engaging.`
    });
  }

  reactLoop: while (currentStep < MAX_STEPS) {
    currentStep++;

    let stepUsage = null;
    let stepRouting = null;

    // Zero-Tool Scoping: If Jev, greeting, or concept router confirmed no database question tool is needed,
    // ELIMINATE all tool definition schemas (saves 1,200+ tokens on every turn)!
    const skipTools = Boolean(
      isGreeting ||
      isConceptExplanation ||
      (jevDecision?.success && (jevDecision.action === 'general_chitchat' || jevDecision.action === 'explain_concept'))
    );

    // Dynamic Focused Tool Scoping (Only send necessary tool schemas on step 1, 0 tool overhead on step 2+)
    const activeTools = (!skipTools && currentStep === 1) ? (getScopedTools(classifiedIntent) || AGENT_TOOLS) : undefined;

    // High-Efficiency Input Payload:
    // On Step 1: Send master prompt, state, and user prompt with scoped tools.
    // On Step 2+: Swap in lightweight synthesis prompt and recent tool results (cuts 75% input tokens from re-transmission).
    let stepInputMessages = inputHistory;
    if (currentStep > 1) {
      const activeSubjBn = state.subject_name || SUBJECT_DISPLAY_NAMES[activeSubject] || "চলমান বিষয়";
      const chDisplay = activeChapter ? `অধ্যায় ${activeChapter}` : "সম্পূর্ণ বিষয়";
      stepInputMessages = [
        {
          type: "message",
          role: "system",
          content: `You are "বোধ" (BODH), Bangladesh's premier autonomous academic intelligence and expert tutor for SSC students.
ACTIVE ACADEMIC SUBJECT: '${activeSubjBn}' (${activeSubject || "এসএসসি"}) - ${chDisplay}.
CRITICAL DIRECTIVES:
- The active subject is ALREADY selected as '${activeSubjBn}'. STRICTLY NEVER ask the student "তুমি কোন বিষয়ের প্রশ্ন চাও?" or list available subjects!
- The authentic questions are ALREADY RETRIEVED in the tool results! STRICTLY NEVER claim "প্রশ্নপত্র পাওয়া যাচ্ছে না" or "আসল প্রশ্নপত্র এখনো নির্ভরযোগ্যভাবে পাওয়া যাচ্ছে না" or apologize! Present the retrieved authentic questions immediately and directly!
- If the student asked for all questions / full paper / full exam ('সব দাও', '২৫টা', 'full exam', 'বোর্ড প্রশ্নপত্র', or after get_board_exam_questions with full_exam):
  * The full authentic question set is ALREADY loaded into the student's interactive exam environment.
  * STRICTLY NEVER output or dump individual questions or options (যেমন: প্রশ্ন ১, প্রশ্ন ২, ক, খ, গ, ঘ) in your chat text!
  * Write ONLY a warm, concise academic introduction (1-2 sentences in authentic Bengali) stating the board and year, total questions, and time limit (e.g. "ঢাকা বোর্ড ২০২৬ এর পূর্ণাঙ্গ ২৫টি সাধারণ গণিত বহুনির্বাচনি প্রশ্ন (MCQ) প্রস্তুত করা হয়েছে। নির্ধারিত সময় ২৫ মিনিট।").
  * Invite the student to click the 'পরীক্ষা শুরু করো' card below to start their timed board exam.
- Directly teach and present the authentic questions and academic content from the tool results for '${activeSubjBn}'.
- Teach with deep intuition, step-by-step clarity, and real-life analogies like an authoritative yet empathetic master tutor.
- Present data cleanly (tables, bullet points, bold highlights) for effortless readability.
- When presenting an authentic MCQ, quiz, or similar question from tool results:
  1. ALWAYS include the authentic board tag at the top: [বোর্ড: <বোর্ডের নাম>]
  2. Present the authentic question stem and 4 options (ক, খ, গ, ঘ).
  3. STRICTLY NEVER reveal or explain the correct answer in this turn! Encourage the student to think and select their answer first.
  4. ALWAYS append [ans: <ক/খ/গ/ঘ>] and [qid: <question_id>] at the very end.
- When presenting an authentic CQ:
  1. ALWAYS include [বোর্ড: <বোর্ডের নাম>] at the top.
  2. Present the authentic stem and 4 clear parts (ক, খ, গ, ঘ).
- Never emit <thought> tags in this final response.
- Do not mention internal tools, database, or RAG.
- Maintain 100% NCTB syllabus accuracy, KaTeX for math ($v = u + at$, $pH < 7$), and clean markdown formatting.`
        },
        {
          type: "message",
          role: "user",
          content: userMessage
        },
        ...inputHistory.slice(-3)
      ];
    }

    const aiApiUrl = isMergeGateway ? (process.env.MERGE_API_URL || ENV.MERGE_API_URL) : ENV.AI_API_URL;
    const aiApiKey = isMergeGateway ? (process.env.MERGE_API_KEY || ENV.MERGE_API_KEY) : ENV.AI_API_KEY;

    let requestPayload;
    if (isMergeGateway) {
      requestPayload = {
        input: stepInputMessages,
        model: modelName,
        vendor: "openai",
        stream: true,
        max_tokens: getMaxTokensForIntent(classifiedIntent),
        include_routing_metadata: true
      };
      if (activeTools && activeTools.length > 0) {
        requestPayload.tools = activeTools;
        requestPayload.tool_choice = "auto";
      }
    } else {
      // Standard OpenAI / xkiro payload
      requestPayload = {
        model: modelName,
        messages: stepInputMessages.map(m => {
          let text = "";
          if (typeof m.content === "string") {
            text = m.content;
          } else if (Array.isArray(m.content)) {
            text = m.content.map(c => {
              if (c.type === "text") return c.text;
              if (c.type === "tool_result") return `[অফিশিয়াল ডেটাবেজ/টুল ফলাফল]:\n${typeof c.content === "string" ? c.content : JSON.stringify(c.content)}`;
              if (c.type === "tool_use") return `[টুল অনুসন্ধান]: ${c.name} (${JSON.stringify(c.input)})`;
              return JSON.stringify(c);
            }).join("\n\n");
          } else {
            text = JSON.stringify(m.content || "");
          }
          return {
            role: m.role || "user",
            content: text
          };
        }),
        stream: true,
        max_tokens: getMaxTokensForIntent(classifiedIntent)
      };
      if (activeTools && activeTools.length > 0) {
        requestPayload.tools = activeTools;
        if (currentStep === 1 && requiresQuestionTool) {
          requestPayload.tool_choice = "required";
        }
      }
    }

    let res;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      attempts++;
      try {
        res = await fetch(aiApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${aiApiKey}`
          },
          body: JSON.stringify(requestPayload)
        });

        if (res.ok) break;

        const status = res.status;
        const errText = await res.text();
        if ((status === 502 || status === 503 || status === 504 || status === 429 || status === 520) && attempts < maxAttempts) {
          console.warn(`[AI Gateway] Transient ${status} error, retrying attempt ${attempts + 1}/${maxAttempts}...`);
          await new Promise(r => setTimeout(r, attempts * 1500));
          continue;
        }
        throw new Error(`AI Gateway Error ${status}: ${errText}`);
      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        console.warn(`[AI Gateway] Network/gateway error (${err.message}), retrying attempt ${attempts + 1}/${maxAttempts}...`);
        await new Promise(r => setTimeout(r, attempts * 1500));
      }
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let toolCall = null;
    let toolCallAcc = null;
    let stepContent = "";
    let thoughtState = "pending"; // "pending" | "inside" | "none"
    let streamEmittedLength = 0;
    let streamEmittedThoughtLength = 0;
    let thoughtDoneEmitted = false;
    let syncedSubjectFromStream = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        if (raw === "[DONE]") {
          try { reader.cancel(); } catch (e) {}
          break;
        }

        try {
          const parsed = JSON.parse(raw);
          if (parsed.usage) {
            stepUsage = parsed.usage;
          }
          if (parsed.routing) {
            stepRouting = parsed.routing;
          }

          // 1. OpenAI-compatible streaming format (xkiro, OpenAI, vLLM, etc.)
          const delta = parsed.choices?.[0]?.delta;
          if (delta) {
            if (delta.content) {
              stepContent += delta.content;
            }
            if (delta.tool_calls && Array.isArray(delta.tool_calls)) {
              for (const tc of delta.tool_calls) {
                if (!toolCallAcc) {
                  toolCallAcc = {
                    id: tc.id || `call_${Date.now()}`,
                    name: tc.function?.name || "",
                    argumentsStr: ""
                  };
                }
                if (tc.function?.name && !toolCallAcc.name) {
                  toolCallAcc.name = tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCallAcc.argumentsStr += tc.function.arguments;
                }
              }
            }
          }

          // 2. Merge Gateway proprietary streaming format
          const content = parsed.output?.[0]?.content;
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === "tool_use") {
                toolCall = item;
              } else if (item.type === "text" && item.text) {
                stepContent = item.text;
              }
            }
          }

          if (stepContent) {
            // Continuously inspect full text for thought intent to update subject in real time
            if (!syncedSubjectFromStream && classifiedIntent !== INTENT_TYPES.GREETING && !isContextualContinuation) {
              const aiDecisions = extractAiAcademicIntent(stepContent);
              if (aiDecisions?.subject) {
                const userHasChapterOrTopic = /(?:অধ্যায়|অধ্যায়|chapter|ch)\s*([০-৯0-9]+)/i.test(userMessage) || Boolean(detectSubjectAndChapterFromQuery(userMessage, aiDecisions.subject)?.chapter_num);
                if (aiDecisions.subject !== state.subject_id) {
                  syncedSubjectFromStream = true;
                  state.subject_id = aiDecisions.subject;
                  state.subject_name = SUBJECT_DISPLAY_NAMES[aiDecisions.subject] || aiDecisions.subject;
                  if (aiDecisions.chapter && !isBroadSyllabus && userHasChapterOrTopic) {
                    state.chapter_num = aiDecisions.chapter;
                  } else {
                    state.chapter_num = null;
                    state.chapter_name = null;
                  }
                  await onEvent({ type: "state_sync", state });
                } else if (aiDecisions.chapter && !isBroadSyllabus && userHasChapterOrTopic && aiDecisions.chapter !== state.chapter_num) {
                  syncedSubjectFromStream = true;
                  state.chapter_num = aiDecisions.chapter;
                  await onEvent({ type: "state_sync", state });
                }
              }
            }

                const trimmedStart = stepContent.trimStart();
                const startsWithTag = trimmedStart.startsWith("<");
                const openThoughtMatch = stepContent.match(/<[\s]*(?:thought|thinking)[\s]*>/i);
                const closeThoughtMatch = stepContent.match(/<[\s]*\/[\s]*(?:thought|thinking)[\s]*>/i);

                // 1. If actively streaming inside unclosed thought block
                if (startsWithTag && !closeThoughtMatch) {
                  if (openThoughtMatch) {
                    const rawAfterOpen = stepContent.slice(openThoughtMatch.index + openThoughtMatch[0].length);
                    const curThought = rawAfterOpen.replace(/<\/?[\s]*(?:thought|thinking)?[^>]*$/i, '');
                    if (curThought.length > streamEmittedThoughtLength) {
                      const delta = curThought.slice(streamEmittedThoughtLength);
                      streamEmittedThoughtLength = curThought.length;
                      if (delta) {
                        await onEvent({
                          type: "thought_delta",
                          delta,
                          thought: curThought
                        });
                      }
                    }
                  }
                  // CRITICAL: NEVER emit content_delta while waiting for thought to close!
                  continue;
                }

                // 2. Thought tag just closed
                if (closeThoughtMatch && !thoughtDoneEmitted) {
                  thoughtDoneEmitted = true;
                  const thoughtInner = openThoughtMatch
                    ? stepContent.slice(openThoughtMatch.index + openThoughtMatch[0].length, closeThoughtMatch.index).trim()
                    : stepContent.slice(0, closeThoughtMatch.index).replace(/^<[\s]*(?:thought|thinking)[\s]*>/i, '').trim();
                  const professionalT = formatProfessionalThought(thoughtInner, state.subject_id, state.chapter_num, userMessage);
                  await onEvent({
                    type: "thought_done",
                    thought: professionalT
                  });
                } else if (!startsWithTag && !thoughtDoneEmitted) {
                  // Direct answer without thought tag from model: do NOT synthesize fake thoughts!
                  // Stream response immediately without thought overhead.
                  thoughtDoneEmitted = true;
                }

                // 3. Extract answer strictly AFTER the closing thought tag
                let answerSlice = "";
                if (closeThoughtMatch) {
                  answerSlice = stepContent.slice(closeThoughtMatch.index + closeThoughtMatch[0].length).trimStart();
                } else if (!startsWithTag && thoughtDoneEmitted) {
                  answerSlice = stepContent.trimStart();
                }

                if (answerSlice) {
                  const cleanSoFar = stripInternalThoughts(answerSlice).replace(/^\n+/, '');
                  if (cleanSoFar.length > streamEmittedLength) {
                    const delta = cleanSoFar.slice(streamEmittedLength);
                    streamEmittedLength = cleanSoFar.length;
                    if (delta && !(currentStep === 1 && requiresQuestionTool)) {
                      if (!firstTokenTime) {
                        firstTokenTime = Math.round(performance.now() - startTime);
                      }
                      await onEvent({
                        type: "content_delta",
                        delta
                      });
                    }
                  }
                }
              }
            } catch (e) {}
          }
        }

    // If toolCall was not directly set by Merge Gateway, assemble from OpenAI/xkiro toolCallAcc
    if (!toolCall && toolCallAcc && toolCallAcc.name) {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolCallAcc.argumentsStr || "{}");
      } catch (err) {
        console.warn("[AgentLoop] Failed to parse tool arguments JSON:", toolCallAcc.argumentsStr);
      }
      toolCall = {
        type: "tool_use",
        id: toolCallAcc.id,
        name: toolCallAcc.name,
        input: parsedArgs
      };
    }

    // Ensure thought_done is always emitted for every turn even if closed without tag
    if (!thoughtDoneEmitted) {
      const thoughtMatch = stepContent.match(/<[\s]*(?:thought|thinking)[\s]*>([\s\S]*?)(?:<[\s]*\/[\s]*(?:thought|thinking)[\s]*>|$)/i);
      const rawT = thoughtMatch ? thoughtMatch[1].trim() : "";
      const professionalT = formatProfessionalThought(rawT, state.subject_id, state.chapter_num, userMessage);
      thoughtDoneEmitted = true;
      await onEvent({
        type: "thought_done",
        thought: professionalT
      });
    }

    // Capture exact token usage and cost for this step from Merge Gateway or OpenAI
    const stepIn = (typeof stepUsage?.input_tokens === "number")
      ? stepUsage.input_tokens
      : Math.round(JSON.stringify(requestPayload.input || requestPayload.messages || "").length / 4);
    const stepOut = (typeof stepUsage?.output_tokens === "number")
      ? stepUsage.output_tokens
      : Math.round(stepContent.length / 4);
    const stepTotal = (typeof stepUsage?.total_tokens === "number")
      ? stepUsage.total_tokens
      : (stepIn + stepOut);

    const gatewayReportedCost = (typeof stepUsage?.cost === "number" && stepUsage.cost > 0)
      ? stepUsage.cost
      : ((typeof stepRouting?.cost_usd === "number" && stepRouting.cost_usd > 0)
        ? stepRouting.cost_usd
        : null);

    const stepCost = calculateStepCost({
      inputTokens: stepIn,
      outputTokens: stepOut,
      gatewayCostUsd: gatewayReportedCost,
      model: stepRouting?.model_used || modelName
    });

    const stepGatewayLat = stepRouting?.latency?.total_ms || 0;

    cumulativeInputTokens += stepIn;
    cumulativeOutputTokens += stepOut;
    cumulativeTotalTokens += stepTotal;
    cumulativeCostUsd += stepCost;
    cumulativeGatewayLatencyMs += stepGatewayLat;
    if (stepRouting?.model_used) detectedModelUsed = stepRouting.model_used;
    if (stepRouting?.vendor_used) detectedVendorUsed = stepRouting.vendor_used;

    // CASE A: Model provided direct response text (No tool called in this step)
    if (!toolCall) {
      const cleanAnswer = stepContent ? stepContent.replace(/<[\s]*thought[\s]*>[\s\S]*?(?:<[\s]*\/[\s]*thought[\s]*>|$)/gi, "").trim() : "";
      // If pre-fetched question exists or cleanAnswer is present, don't synthesize tool calls
      if (!cleanAnswer && currentStep < MAX_STEPS) {
        console.warn(`[AgentLoop] Step ${currentStep} emitted thought without answer or tool. Continuing to generate complete answer...`);
        inputHistory.push({
          type: "message",
          role: "assistant",
          content: stepContent
        });
        inputHistory.push({
          type: "message",
          role: "user",
          content: "এখন কোনো <thought> ট্যাগ ছাড়া সরাসরি শিক্ষার্থীর প্রশ্নের পূর্ণাঙ্গ উত্তর বাংলায় সুন্দরভাবে বুঝিয়ে দাও।"
        });
        continue reactLoop;
      }

      if (stepContent && /<[\s]*thought[\s]*>/i.test(stepContent) && !/<[\s]*\/[\s]*thought[\s]*>/i.test(stepContent)) {
        stepContent += "</thought>\n\n";
      }
      const thoughtMatch = stepContent.match(/<[\s]*thought[\s]*>([\s\S]*?)(?:<[\s]*\/[\s]*thought[\s]*>|$)/i);
      if (thoughtMatch && classifiedIntent !== INTENT_TYPES.GREETING && !isContextualContinuation) {
        const aiDecisions = extractAiAcademicIntent(thoughtMatch[1]);
        if (aiDecisions?.subject && aiDecisions.subject !== state.subject_id) {
          state.subject_id = aiDecisions.subject;
          state.subject_name = SUBJECT_DISPLAY_NAMES[aiDecisions.subject] || aiDecisions.subject;
          if (aiDecisions.chapter) state.chapter_num = aiDecisions.chapter;
          await onEvent({ type: "state_sync", state });
        }
      }
      finalResponseContent = stripInternalThoughts(stepContent).trim();
      break reactLoop;
    }

    // CASE B: Model autonomously invoked a tool! (Think -> Act -> Observe)
    const toolName = toolCall.name;
    const toolArgs = toolCall.input || {};
    const callId = toolCall.id || `call_${Date.now()}`;

    // Auto-inject or enforce active subject/chapter when contextual continuation
    if ((!toolArgs.subject || isContextualContinuation) && activeSubject) {
      toolArgs.subject = activeSubject;
    }
    if ((!toolArgs.chapter || isContextualContinuation) && activeChapter) {
      toolArgs.chapter = activeChapter;
    }

    // Auto-inject full_exam mode and count if student asked for all questions
    if (toolName === "get_board_exam_questions") {
      const isFull = /সব|সকল|full|সবগুলো|পূর্ণাঙ্গ|পুরো|25|২৫|sob/i.test(userMessage);
      if (isFull) {
        if (!toolArgs.mode) toolArgs.mode = "full_exam";
        if (!toolArgs.count || toolArgs.count < 25) toolArgs.count = 25;
      }
    }

    if (!stepContent) {
      const intentText = toolArgs.academic_intent || getToolHumanLabel(toolName, toolArgs) || "প্রাসঙ্গিক তথ্য ও প্রশ্ন অনুসন্ধান করছি...";
      stepContent = `<thought>${intentText}</thought>`;
    }

    if (stepContent && /<[\s]*thought[\s]*>/i.test(stepContent) && !/<[\s]*\/[\s]*thought[\s]*>/i.test(stepContent)) {
      stepContent += "</thought>\n\n";
    }

    const thoughtMatch = stepContent.match(/<[\s]*(?:thought|thinking)[\s]*>([\s\S]*?)(?:<[\s]*\/[\s]*(?:thought|thinking)[\s]*>|$)/i);
    const rawT = thoughtMatch ? thoughtMatch[1].trim() : (toolArgs.academic_intent || stepContent);
    const professionalT = formatProfessionalThought(rawT, state.subject_id, state.chapter_num, userMessage);

    await onEvent({
      type: "thought_done",
      thought: professionalT
    });

    // 1. Tool Start Event
    await onEvent({
      type: "tool_start",
      tool: toolName,
      args: toolArgs,
      label: getToolHumanLabel(toolName, toolArgs),
      intent: professionalT
    });

    // 2. Execute Tool against Live DB with parameter auto-healing
    const dbStart = performance.now();
    const rawResult = await executeAgentTool(toolName, toolArgs, state);
    const toolDurationMs = Math.round(performance.now() - dbStart);
    executedToolsLog.push({ tool: toolName, args: toolArgs, durationMs: toolDurationMs, result: rawResult });

    // 3. Tool Done Event
    await onEvent({
      type: "tool_done",
      tool: toolName,
      args: toolArgs,
      durationMs: toolDurationMs,
      result: rawResult,
      title: getToolCompletedTitle(toolName, toolArgs, rawResult),
      summary: getToolSummary(toolName, rawResult)
    });

    await onEvent({
      type: "generating_start"
    });

    // 4. Compact tool result for optimal token efficiency
    const compacted = compactToolResult(toolName, rawResult, toolArgs);

    // Update Academic Working Memory
    state = MemoryManager.updateAfterToolExecution(state, toolName, toolArgs, rawResult);
    await onEvent({ type: "state_sync", state });

    const toolCallObj = {
      type: "tool_use",
      id: callId,
      name: toolName,
      input: toolArgs
    };

    inputHistory.push({
      type: "message",
      role: "assistant",
      content: stepContent
        ? [{ type: "text", text: stepContent }, toolCallObj]
        : [toolCallObj]
    });
    inputHistory.push({
      type: "message",
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: callId,
          content: JSON.stringify(compacted)
        }
      ]
    });

    // Explicit directive for answer synthesis step
    let synthesisDirective = "টুল থেকে অফিশিয়াল তথ্য সংগৃহীত হয়েছে। কোনো <thought> ট্যাগ ব্যবহার করবে না। সরাসরি প্রথম শব্দ থেকেই শিক্ষার্থীর প্রশ্নের পূর্ণাঙ্গ উত্তর বাংলায় আকর্ষণীয় ও গোছানোভাবে লেখা শুরু করো।";
    if (compacted && compacted.mode === "exam_launcher") {
      synthesisDirective = `শিক্ষার্থী বহুনির্বাচনী পরীক্ষা/মক টেস্ট চেয়েছে। চ্যাটে ভুলেও কোনো প্রশ্ন, অপশন (ক, খ, গ, ঘ) বা প্রশ্নের তালিকা লিখবে না! মাত্র ১-২ বাক্যে সংক্ষিপ্ত উৎসাহব্যঞ্জক ভূমিকা দাও (যেমন: "তোমার জন্য ${compacted.subject}-এর ${compacted.total_questions}টি প্রশ্নের একটি মূল্যায়ন পরীক্ষা প্রস্তুত করা হয়েছে। নিচের বাটনে ক্লিক করে পরীক্ষা শুরু করতে পারো:") এবং নিচে অবিকল [exam_launcher: {"total": ${compacted.total_questions}, "subject": "${compacted.subject}", "chapter": "${compacted.chapter}"}] ট্যাগটি দাও। ফ্রন্টএন্ড নিজে থেকেই সমস্ত প্রশ্ন ইন্টারেক্টিভ এক্সাম মোডালে লোড করবে।`;
    }
    inputHistory.push({
      type: "message",
      role: "system",
      content: synthesisDirective
    });
  }

  const totalLatency = Math.round(performance.now() - startTime);
  const tokenTelemetry = calculateTokenTelemetry(inputHistory, getScopedTools(classifiedIntent));

  // Compute Baseline Cost and Net Savings
  const baselineCostUsd = calculateBaselineCost(cumulativeOutputTokens, detectedModelUsed);
  const costSavedUsd = Math.max(0, +(baselineCostUsd - cumulativeCostUsd).toFixed(6));
  const savingsPercent = baselineCostUsd > 0
    ? Math.min(95, Math.round((costSavedUsd / baselineCostUsd) * 100))
    : tokenTelemetry.savings_percent;

  const costBdt = +(cumulativeCostUsd * USD_TO_BDT_RATE).toFixed(6);

  recordGatewayCall({
    inputTokens: cumulativeInputTokens,
    outputTokens: cumulativeOutputTokens,
    totalTokens: cumulativeTotalTokens,
    costUsd: cumulativeCostUsd,
    costSavedUsd
  });

  // Deduct demo user credits (1 credit per 1k tokens, strict whole integers, never 0.5)
  const creditTelemetry = globalCreditManager.deductCredits(cumulativeTotalTokens);

  const gatewayTelemetry = {
    provider: "Merge.dev AI Gateway",
    model: detectedModelUsed,
    vendor: detectedVendorUsed,
    input_tokens: cumulativeInputTokens,
    output_tokens: cumulativeOutputTokens,
    total_tokens: cumulativeTotalTokens,
    cost_usd: +cumulativeCostUsd.toFixed(6),
    cost_bdt: costBdt,
    cost_formatted_usd: formatCostUsd(cumulativeCostUsd),
    cost_formatted_bdt: formatCostBdt(costBdt),
    baseline_cost_usd: +baselineCostUsd.toFixed(6),
    cost_saved_usd: costSavedUsd,
    savings_percent: savingsPercent,
    gateway_latency_ms: Math.round(cumulativeGatewayLatencyMs),
    steps_count: currentStep
  };

  // Post-response Subject State Reconciliation:
  // If the agent clearly transitions subject (e.g. "এখন থেকে আমরা এসএসসি পদার্থবিজ্ঞান পড়ব" or "আমরা পদার্থবিজ্ঞানে চলে এসেছি")
  if (finalResponseContent) {
    const switchMatch = finalResponseContent.match(/(?:এখন থেকে আমরা|আমরা এখন|সেশনটি এখন|চলে এসেছি|এটি মূলত এসএসসি|এটি এসএসসি|বিষয়টি এসএসসি)\s*(?:এসএসসি\s*)?([^\s,।—\n]+)/i);
    if (switchMatch) {
      const declaredSubj = normalizeSubject(switchMatch[1]);
      if (declaredSubj && declaredSubj !== state.subject_id) {
        state.subject_id = declaredSubj;
        state.subject_name = SUBJECT_DISPLAY_NAMES[declaredSubj] || declaredSubj;
        if (!state.chapter_num) {
          state.chapter_num = findChapterNumByKeywords(finalResponseContent, declaredSubj);
        }
      }
    }

    // Safety Net: Inspect generated answer content for dominant academic subject concepts/formulas
    const contentDetection = detectSubjectFromAcademicContent(finalResponseContent, state.subject_id);
    if (contentDetection && contentDetection.subject_id && contentDetection.subject_id !== state.subject_id) {
      state.subject_id = contentDetection.subject_id;
      state.subject_name = SUBJECT_DISPLAY_NAMES[contentDetection.subject_id] || contentDetection.subject_id;
      if (contentDetection.chapter_num) {
        state.chapter_num = contentDetection.chapter_num;
        state.chapter_name = contentDetection.chapter_name || state.chapter_name;
      }
    }
  }

  await onEvent({
    type: "done",
    content: finalResponseContent,
    toolCalls: executedToolsLog,
    latencyMs: totalLatency,
    ttft: firstTokenTime,
    tokenTelemetry,
    gatewayTelemetry,
    creditTelemetry,
    credits: creditTelemetry,
    state
  });
  return;
}
