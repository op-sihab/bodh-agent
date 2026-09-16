// Multi-turn Autonomous ReAct Agent Execution Loop with Tool Calling & Token Streaming
import { AGENT_TOOLS, executeAgentTool } from "../tools/index.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { SUBJECT_DISPLAY_NAMES, toBnDigits } from "../../config/subject-map.js";
import { ENV } from "../../config/env.js";
import { SYSTEM_PROMPT } from "../prompts/system-prompt.js";
import { compactToolResult } from "./compaction.js";
import { classifyIntent, getScopedTools, pruneHistoryForContext, getMaxTokensForIntent, calculateTokenTelemetry, INTENT_TYPES } from "./router.js";
import { calculateStepCost, calculateBaselineCost, formatCostUsd, formatCostBdt, recordGatewayCall, USD_TO_BDT_RATE } from "./gateway-metrics.js";

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

  // 2. Classify Intent via Orchestrator Decision Router (Big Boss Router)
  const classifiedIntent = classifyIntent(userMessage, state, isAnswering);
  const activeSubject = state.subject_id;
  const activeChapter = state.chapter_num;

  // Build input history with high-density system prompt, memory blocks, and pruned past turns
  const inputHistory = [
    { type: "message", role: "system", content: SYSTEM_PROMPT }
  ];

  // Inject Working Memory State Snapshot & Episodic Ledger
  const episodicLedger = MemoryManager.generateEpisodicLedger(state);
  if (episodicLedger) {
    inputHistory.push({
      type: "message",
      role: "system",
      content: episodicLedger
    });
  }

  // Token & Structure Optimization: Prune history (strip historical thoughts, limit to recent 4 clean turns)
  const prunedHistory = pruneHistoryForContext(pastHistory, 4);
  for (const item of prunedHistory) {
    inputHistory.push(item);
  }

  // Always inject Active Academic Subject Lock Directive when an active subject is established
  if (activeSubject) {
    const chDisplay = activeChapter ? `অধ্যায় ${activeChapter}` : "সম্পূর্ণ পাঠ্যক্রম/সিলেবাস";
    inputHistory.push({
      type: "message",
      role: "system",
      content: `ACTIVE ACADEMIC CONTEXT: Subject is '${activeSubject}' (${chDisplay}).
STRICT ACADEMIC PERSISTENCE DIRECTIVE:
1. You are actively tutoring the student in '${activeSubject}'.
2. DO NOT change or switch to any other subject based on ambiguous words, typos, short comments, or Banglish slang.
3. You may ONLY change subjects if the student explicitly writes the name of a new subject.
4. The active chapter context is ${chDisplay}. If the student asks about the whole syllabus or a different chapter in ${activeSubject}, answer freely for ${activeSubject}.
5. Keep all focus strictly anchored on '${activeSubject}'.`
    });
  }

  if (isMetaDebate) {
    const activeSubjBn = state.subject_name || SUBJECT_DISPLAY_NAMES[activeSubject] || "চলমান বিষয়";
    const chDisplay = activeChapter ? `অধ্যায় ${activeChapter}` : "";
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

    // Record answer evaluation in state and sync
    state = MemoryManager.recordAnswerEvaluation(state, userChoice, isCorrect);
    await onEvent({ type: "state_sync", state });

    inputHistory.push({
      type: "message",
      role: "system",
      content: `IMPORTANT ACADEMIC DIRECTIVE (QUIZ EVALUATION & GRADING): The student answered '${userChoice}'.
Correct answer code is: '${correctCode}'. Student's answer is: ${isCorrect ? "CORRECT (সঠিক)" : "INCORRECT (ভুল)"}.
1. STRICT EVALUATION ONLY: Praise warmly if correct (1 line), then provide 2-3 line clear scientific reason. If incorrect, explain gently why with the scientific principle and state the right option.
2. ZERO CHAPTER/SYLLABUS DOUBT & ZERO APOLOGY: Never criticize the question or claim wrong chapter or apologize. The question is 100% verified.
3. Current Quiz Streak: ${state.quiz_metrics.streak}, Total Score: ${state.quiz_metrics.correct}/${state.quiz_metrics.attempted}.
4. End with an encouraging 1-line invite for the next challenge.`
    });
  }

  // Reinforce continuous pedagogical step-by-step thinking for every turn
  inputHistory.push({
    type: "message",
    role: "system",
    content: "বাধ্যতামূলক আচরণবিধি: কোনো টুল কল করার প্রয়োজন হলে বা সরাসরি উত্তর দেওয়ার সময় উত্তরের শুরুতে <thought>...</thought> ট্যাগের ভেতরে বাংলায় ১-২ বাক্যে তোমার সুনির্দিষ্ট অ্যাকাডেমিক চিন্তা প্রকাশ করবে। মূল উত্তরের কোনো বাক্যে ভুলেও কোনো কাল্পনিক ট্যাগ বা ব্র্যাকেট (যেমন <...>) লিখবে না—সরাসরি মার্জিত বাংলায় উত্তর লিখবে।"
  });

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

  reactLoop: while (currentStep < MAX_STEPS) {
    currentStep++;

    let stepUsage = null;
    let stepRouting = null;

    // Dynamic Focused Tool Scoping (Only send necessary tool schemas on step 1, 0 tool overhead on step 2+)
    const activeTools = (currentStep === 1) ? getScopedTools(classifiedIntent) : undefined;

    const requestPayload = {
      input: inputHistory,
      model: modelName,
      vendor: "openai",
      stream: true,
      max_tokens: getMaxTokensForIntent(classifiedIntent),
      include_routing_metadata: true
    };
    if (activeTools && activeTools.length > 0) {
      requestPayload.tools = activeTools;
    }

    const res = await fetch(mergeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mergeKey}`
      },
      body: JSON.stringify(requestPayload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Merge Gateway Error ${res.status}: ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let toolCall = null;
    let stepContent = "";
    let inLeadingThought = currentStep > 1;
    let streamEmittedLength = 0;

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
          const content = parsed.output?.[0]?.content;
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === "tool_use") {
                toolCall = item;
              } else if (item.type === "text" && item.text) {
                stepContent = item.text;

                if (inLeadingThought) {
                  const trimmedStart = stepContent.trimStart();
                  if (/^<\s*(?:thought|thinking)/i.test(trimmedStart)) {
                    const closeMatch = stepContent.match(/<[\s]*\/[\s]*(?:thought|thinking)[\s]*>([\s\S]*)$/i);
                    if (closeMatch) {
                      inLeadingThought = false;
                      const answerPortion = closeMatch[1].replace(/^\n+/, '');
                      streamEmittedLength = stepContent.length;
                      if (answerPortion) {
                        if (!firstTokenTime) firstTokenTime = Math.round(performance.now() - startTime);
                        await onEvent({ type: "content_delta", delta: answerPortion });
                      }
                    }
                  } else {
                    inLeadingThought = false;
                  }
                }

                if (!inLeadingThought && item.text.length > streamEmittedLength) {
                  const delta = item.text.slice(streamEmittedLength);
                  streamEmittedLength = item.text.length;
                  if (delta) {
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
          }
        } catch (e) {}
      }
    }

    // Capture exact token usage and cost for this step from Merge Gateway
    const stepIn = (typeof stepUsage?.input_tokens === "number")
      ? stepUsage.input_tokens
      : Math.round(JSON.stringify(requestPayload.input).length / 4);
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
      
      if (!cleanAnswer && currentStep < MAX_STEPS) {
        // Ensure any unclosed thought is properly closed in the stream
        if (stepContent && /<[\s]*thought[\s]*>/i.test(stepContent) && !/<[\s]*\/[\s]*thought[\s]*>/i.test(stepContent)) {
          await onEvent({ type: "content_delta", delta: "</thought>\n\n" });
          stepContent += "</thought>\n\n";
        }
        await onEvent({ type: "thought_done", thought: stepContent });

        const isMcqRequest = /mcq|কুইজ|quiz|বহুনির্বাচন|নৈর্ব্যক্তিক|1\s*mcq|one\s*mcq|ekta\s*mcq|একটা\s*mcq|একটি\s*mcq|show\s*1\s*mcq/i.test(userMessage);
        const isCqRequest = /cq|সৃজনশীল|উদ্দীপক|1\s*cq|one\s*cq|ekta\s*cq|একটা\s*cq|একটি\s*cq/i.test(userMessage);
        const isSimilarRequest = /এই\s*টাইপের\s*আরেক|অনুরূপ\s*প্রশ্ন|similar\s*type|একই\s*সূত্রের/i.test(userMessage);
        const isPatternRequest = /মাস্টার\s*টাইপ|পরীক্ষকের\s*ফাঁদ|অধ্যায়ের\s*টাইপ|ব্লুপ্রিন্ট|chapter\s*pattern/i.test(userMessage);

        if (isSimilarRequest) {
          const targetQ = state.active_question || state.last_served_question;
          const idMatch = userMessage.match(/\[ID:\s*(q_\d+)\]/i);
          const qId = idMatch ? idMatch[1] : (targetQ?.id || undefined);
          toolCall = {
            id: `call_${Date.now()}`,
            name: "find_similar_type_questions",
            input: {
              subject: activeSubject || undefined,
              question_id: qId,
              query_text: targetQ?.question || targetQ?.stem || userMessage,
              academic_intent: "শিক্ষার্থীর অনুরোধ অনুযায়ী ভেক্টর সার্চ ব্যবহার করে একই সূত্রের অনুরূপ প্রশ্ন অনুসন্ধান করছি..."
            }
          };
        } else if (isPatternRequest) {
          toolCall = {
            id: `call_${Date.now()}`,
            name: "analyze_chapter_patterns",
            input: {
              subject: activeSubject || "পদার্থবিজ্ঞান",
              chapter: activeChapter ? String(activeChapter) : (state.chapter_name || "গতি"),
              academic_intent: "শিক্ষার্থীর অনুরোধ অনুযায়ী অধ্যায়ের বিগত বোর্ড প্রশ্নের মাস্টার টাইপ ও পরীক্ষকের ফাঁদ বিশ্লেষণ করছি..."
            }
          };
        } else if (isMcqRequest) {
          toolCall = {
            id: `call_${Date.now()}`,
            name: "get_mcq_quiz",
            input: {
              subject: activeSubject || undefined,
              chapter: activeChapter || undefined,
              query: userMessage,
              academic_intent: stepContent ? stepContent.replace(/<\/?thought>/gi, '').trim() : "শিক্ষার্থীর অনুরোধ অনুযায়ী বোর্ড বহুনির্বাচনী প্রশ্ন অনুসন্ধান করছি..."
            }
          };
        } else if (isCqRequest) {
          toolCall = {
            id: `call_${Date.now()}`,
            name: "get_creative_question",
            input: {
              subject: activeSubject || undefined,
              chapter: activeChapter || undefined,
              query: userMessage,
              academic_intent: stepContent ? stepContent.replace(/<\/?thought>/gi, '').trim() : "শিক্ষার্থীর অনুরোধ অনুযায়ী বোর্ড সৃজনশীল প্রশ্ন অনুসন্ধান করছি..."
            }
          };
        } else {
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
      } else {
        if (stepContent && /<[\s]*thought[\s]*>/i.test(stepContent) && !/<[\s]*\/[\s]*thought[\s]*>/i.test(stepContent)) {
          await onEvent({ type: "content_delta", delta: "</thought>\n\n" });
          stepContent += "</thought>\n\n";
        }
        finalResponseContent = stepContent;
        break reactLoop;
      }
    }

    // Intercept: If student explicitly asks for similar/identical type question, force find_similar_type_questions
    const isSimilarRequest = /এই\s*টাইপের\s*আরেক|অনুরূপ\s*প্রশ্ন|similar\s*type|একই\s*সূত্রের/i.test(userMessage);
    if (isSimilarRequest && toolCall && (toolCall.name === "get_mcq_quiz" || toolCall.name === "get_creative_question")) {
      const targetQ = state.active_question || state.last_served_question;
      const idMatch = userMessage.match(/\[ID:\s*(q_\d+)\]/i);
      const qId = idMatch ? idMatch[1] : (targetQ?.id || undefined);
      toolCall = {
        id: toolCall.id || `call_${Date.now()}`,
        name: "find_similar_type_questions",
        input: {
          subject: activeSubject || targetQ?.subject_id || undefined,
          question_id: qId,
          query_text: targetQ?.question || targetQ?.stem || userMessage,
          academic_intent: "শিক্ষার্থীর অনুরোধ অনুযায়ী ভেক্টর সার্চ ও মাস্টার টাইপ ব্লুপ্রিন্ট ব্যবহার করে একই সূত্রের অনুরূপ প্রশ্ন অনুসন্ধান করছি..."
        }
      };
    }

    // CASE B: Model autonomously invoked a tool! (Think -> Act -> Observe)
    const toolName = toolCall.name;
    const toolArgs = toolCall.input || {};
    const callId = toolCall.id || `call_${Date.now()}`;

    if (!stepContent) {
      const intentText = toolArgs.academic_intent || getToolHumanLabel(toolName, toolArgs) || "প্রাসঙ্গিক তথ্য ও প্রশ্ন অনুসন্ধান করছি...";
      stepContent = `<thought>${intentText}</thought>`;
    }

    if (stepContent && /<[\s]*thought[\s]*>/i.test(stepContent) && !/<[\s]*\/[\s]*thought[\s]*>/i.test(stepContent)) {
      stepContent += "</thought>\n\n";
    }

    await onEvent({
      type: "thought_done",
      thought: stepContent.replace(/<\/?[\s]*(?:thought|thinking)[\s]*>/gi, '').trim()
    });

    // 1. Tool Start Event
    await onEvent({
      type: "tool_start",
      tool: toolName,
      args: toolArgs,
      label: getToolHumanLabel(toolName, toolArgs),
      intent: stepContent.replace(/<\/?[\s]*(?:thought|thinking)[\s]*>/gi, '').trim()
    });

    // 2. Execute Tool against Live DB
    const dbStart = performance.now();
    const rawResult = await executeAgentTool(toolName, toolArgs);
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

    // Explicit directive for answer synthesis step to prevent secondary unclosed thought tags
    inputHistory.push({
      type: "message",
      role: "system",
      content: "টুল থেকে অফিশিয়াল তথ্য সংগৃহীত হয়েছে। কোনো <thought> ট্যাগ ব্যবহার করবে না। সরাসরি প্রথম শব্দ থেকেই শিক্ষার্থীর প্রশ্নের পূর্ণাঙ্গ উত্তর বাংলায় আকর্ষণীয় ও গোছানোভাবে লেখা শুরু করো।"
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

  await onEvent({
    type: "done",
    content: finalResponseContent,
    toolCalls: executedToolsLog,
    latencyMs: totalLatency,
    ttft: firstTokenTime,
    tokenTelemetry,
    gatewayTelemetry,
    state
  });
  return;
}
