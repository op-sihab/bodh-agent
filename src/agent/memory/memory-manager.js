import { normalizeSubject, SUBJECT_DISPLAY_NAMES, toBnDigits } from "../../config/subject-map.js";
import { extractChapterNum, findChapterNumByKeywords } from "../../config/chapter-map.js";
import { formatTag } from "../../config/tag-map.js";
import { createInitialState } from "./state.js";

export class MemoryManager {
  static reconcile(userMessage, pastHistory = [], incomingState = null) {
    const state = incomingState && typeof incomingState === "object"
      ? createInitialState(incomingState)
      : createInitialState();

    const cleanMsg = (userMessage || "").trim();

    const isMetaDebate = /(?:kobe|কবে|kiser|কিসের|koi|কই|kothay|কোথায়|keno|কেন)\s*(?:bollam|chaicilam|cheye|dekhte|vitti|ভিত্তি|dekhso|bolle|boltesile)|(?:vul|ভুল)\s*bolso|besi\s*bujo|বেশি\s*বোঝ|faltu|ফালতু|to\s*boli\s*nai|তো\s*বলি\s*নাই|চাই\s*নাই|chai\s*nai/i.test(cleanMsg);
    const isSubjectRejection = /(?:na|না|নাই|নি|not|no)\b/i.test(cleanMsg) && !/(?:porbo|পড়ব|start|dao|দাও)/i.test(cleanMsg);
    const isQuestioningSubject = /(?:kobe|কবে|kiser|কিসের|koi|কই|kothay|কোথায়|keno|কেন)\b/i.test(cleanMsg);

    const hasActiveMcq = Boolean(state.active_question && state.active_question.type === "mcq" && state.active_question.status === "PENDING");
    const isAnswerPattern = /^(?:আমার\s*উত্তর\s*[:ঃ]?\s*\(?([ক-ঘa-dA-D১-৪])\)?|[ক-ঘa-dA-D১-৪]$|^\(?([ক-ঘa-dA-D১-৪])\)$|^উত্তর\s*[:ঃ]?\s*\(?([ক-ঘa-dA-D১-৪])\)?|^ans\s*[:ঃ]?\s*\(?([ক-ঘa-dA-D১-৪])\)?|^amar\s*(?:uttor|ans)\s*[:ঃ]?\s*\(?([ক-ঘa-dA-D১-৪])\)?)/i.test(cleanMsg) ||
      (hasActiveMcq && /^(?:হবে\s*[ক-ঘa-d]|[ক-ঘa-d]\s*হবে|mone\s*hoy\s*[ক-ঘa-d]|মনে\s*হয়\s*[ক-ঘa-d])/i.test(cleanMsg));

    const isAnswering = Boolean(hasActiveMcq && isAnswerPattern);

    if (!state.subject_id || !state.chapter_num) {
      for (const turn of pastHistory.slice().reverse()) {
        const text = typeof turn.content === "string" ? turn.content : "";
        if (!state.subject_id) {
          const s = normalizeSubject(text);
          if (s) {
            state.subject_id = s;
            state.subject_name = SUBJECT_DISPLAY_NAMES[s] || s;
          }
        }
        if (!state.chapter_num) {
          const ch = findChapterNumByKeywords(text, state.subject_id);
          if (ch) state.chapter_num = ch;
        }
        if (state.subject_id && state.chapter_num) break;
      }
    }

    if (!isMetaDebate && !isSubjectRejection && !isQuestioningSubject && !isAnswering) {
      const explicitSubject = normalizeSubject(cleanMsg);
      if (explicitSubject && explicitSubject !== state.subject_id) {
        state.subject_id = explicitSubject;
        state.subject_name = SUBJECT_DISPLAY_NAMES[explicitSubject] || explicitSubject;
        state.chapter_num = null;
        state.chapter_name = null;
        state.active_question = null;
      }
    }

    // Broad Syllabus / All Chapters query -> Unlock chapter so agent can cover the entire subject syllabus
    const isBroadSyllabusQuery = /(?:সবগুলো|সব|shob|sob|all)\s*(?:অধ্যায়|অধ্যায়|চ্যাপ্টার|chapter|পাঠ)|(?:অধ্যায়গুলো|অধ্যায়গুলো|অধ্যায়ের\s*তালিকা|অধ্যায়\s*তালিকা|অধ্যায়গুলোর\s*নাম|তালিকা|সিলেবাস|syllabus|সূচিপত্র|রোডম্যাপ|কমন|৮০\/২০)/i.test(cleanMsg);

    if (!isMetaDebate && !isAnswering) {
      if (isBroadSyllabusQuery) {
        state.chapter_num = null;
        state.chapter_name = null;
        state.active_question = null;
      } else {
        const explicitChapter = findChapterNumByKeywords(cleanMsg, state.subject_id);
        if (explicitChapter) {
          if (state.chapter_num !== explicitChapter) {
            state.chapter_name = null;
            state.active_question = null;
          }
          state.chapter_num = explicitChapter;
        }
      }
    }

    if (isAnswering) {
      state.active_mode = "QUIZ_EVALUATION";
    } else if (/mcq|কুইজ|quiz|নৈর্ব্যক্তিক/i.test(cleanMsg)) {
      state.active_mode = "QUIZ";
    } else if (/cq|সৃজনশীল|উদ্দীপক/i.test(cleanMsg)) {
      state.active_mode = "CQ";
    } else if (isBroadSyllabusQuery || /রোডম্যাপ|কমন|৮০\/২০|80\/20|গুরুত্বপূর্ণ/i.test(cleanMsg)) {
      state.active_mode = "ROADMAP";
    }

    state.last_updated = Date.now();
    return {
      state,
      isAnswering,
      isMetaDebate
    };
  }

  static preserveStructuredContent(content, maxChars = 900) {
    if (typeof content !== "string") return "";
    let clean = content.replace(/<[\s]*(?:thought|thinking)[\s]*>[\s\S]*?<[\s]*\/[\s]*(?:thought|thinking)[\s]*>/gi, '').trim();

    if (clean.length <= maxChars) return clean;

    const hasAnsTag = /\[ans:\s*[ক-ঘa-d]\]/i.test(clean);
    const hasOptions = /\(ক\)[\s\S]*?\(ঘ\)/i.test(clean);

    if (hasAnsTag || hasOptions) {
      if (clean.length > 1500) {
        return clean.slice(0, 1400) + "\n...";
      }
      return clean;
    }

    const truncated = clean.slice(0, maxChars);
    const lastDoubleNewline = truncated.lastIndexOf("\n\n");
    if (lastDoubleNewline > maxChars * 0.6) {
      return truncated.slice(0, lastDoubleNewline) + "\n\n...";
    }
    return truncated + "...";
  }

  static generateEpisodicLedger(state) {
    if (!state) return "";
    const items = [];

    const subjDisplay = state.subject_name || (state.subject_id ? SUBJECT_DISPLAY_NAMES[state.subject_id] : "");
    const chDisplay = state.chapter_num ? ("অধ্যায় " + toBnDigits(state.chapter_num) + (state.chapter_name ? " (" + state.chapter_name + ")" : "")) : "";

    if (subjDisplay) {
      items.push("সক্রিয় বিষয়: " + subjDisplay + (chDisplay ? ", " + chDisplay : ""));
    }

    if (state.quiz_metrics && state.quiz_metrics.attempted > 0) {
      items.push("কুইজ অগ্রগতি: মোট " + toBnDigits(state.quiz_metrics.attempted) + "টি প্রশ্নের মধ্যে " + toBnDigits(state.quiz_metrics.correct) + "টি সঠিক (স্ট্রিক: " + toBnDigits(state.quiz_metrics.streak) + ", লেভেল: " + state.quiz_metrics.current_difficulty + ")");
    }

    if (Array.isArray(state.episodic_events) && state.episodic_events.length > 0) {
      const recentEvents = state.episodic_events.slice(-3).map(e => e.summary).join(" | ");
      items.push("সাম্প্রতিক ইতিহাস: " + recentEvents);
    }

    if (state.active_question && state.active_question.status === "PENDING") {
      items.push("চলমান অমীমাংসিত প্রশ্ন: [" + (state.active_question.board_tag || "বোর্ড প্রশ্ন") + "] সঠিক উত্তর কোড: [ans: " + (state.active_question.answer_code || "?") + "]");
    }

    if (items.length === 0) return "";

    return "ACADEMIC WORKING MEMORY & EPISODIC LEDGER:\n" + items.map(i => "• " + i).join("\n");
  }

  static updateAfterToolExecution(state, toolName, toolArgs, toolResult) {
    if (!state || !toolResult) return state;

    if (toolName === "get_mcq_quiz") {
      const q = toolResult.quiz?.[0];
      if (q && q.question_text) {
        const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
        const normAns = toBnAns[q.answer] || q.answer || 'ক';
        const bTag = q.formatted_source || formatTag(q.tags) || "বোর্ড প্রামাণিক প্রশ্ন";
        const chName = toolResult.actual_chapter?.display || toolResult.actual_chapter?.name || toolArgs?.chapter || state.chapter_name || "";

        state.active_question = {
          type: "mcq",
          stem: q.question_text,
          options: {
            "ক": q.option_a,
            "খ": q.option_b,
            "গ": q.option_c,
            "ঘ": q.option_d
          },
          answer_code: normAns,
          board_tag: bTag,
          status: "PENDING",
          timestamp: Date.now()
        };

        if (chName && !state.chapter_name) {
          state.chapter_name = chName;
        }
        state.active_mode = "QUIZ";
      }
    } else if (toolName === "get_creative_question") {
      const stem = toolResult.stem || toolResult.question_text;
      if (stem) {
        const bTag = toolResult.board_tag || toolResult.formatted_source || formatTag(toolResult.raw_tag || toolResult.tags) || "বোর্ড সৃজনশীল প্রশ্ন";
        const chName = toolResult.actual_chapter?.display || toolResult.actual_chapter?.name || toolResult.chapter_name || toolArgs?.chapter || state.chapter_name || "";

        state.active_question = {
          type: "cq",
          stem,
          part_ka: toolResult.part_ka,
          part_kha: toolResult.part_kha,
          part_ga: toolResult.part_ga,
          part_gha: toolResult.part_gha,
          board_tag: bTag,
          status: "PENDING",
          timestamp: Date.now()
        };

        if (chName && !state.chapter_name) {
          state.chapter_name = chName;
        }
        state.active_mode = "CQ";
      }
    }

    state.last_updated = Date.now();
    return state;
  }

  static recordAnswerEvaluation(state, studentAnswer, isCorrect, explanationSummary = "") {
    if (!state) return state;

    if (!state.quiz_metrics) {
      state.quiz_metrics = { attempted: 0, correct: 0, streak: 0, current_difficulty: "medium" };
    }

    state.quiz_metrics.attempted += 1;
    if (isCorrect) {
      state.quiz_metrics.correct += 1;
      state.quiz_metrics.streak += 1;
      if (state.quiz_metrics.streak >= 2) {
        state.quiz_metrics.current_difficulty = "hard";
      }
    } else {
      state.quiz_metrics.streak = 0;
      state.quiz_metrics.current_difficulty = "medium";
    }

    const qStem = state.active_question?.stem ? state.active_question.stem.slice(0, 30) + "..." : "MCQ";
    const eventSummary = 'প্রশ্ন: "' + qStem + '" | উত্তর: ' + studentAnswer + ' (' + (isCorrect ? "সঠিক" : "ভুল") + ')';

    if (!Array.isArray(state.episodic_events)) {
      state.episodic_events = [];
    }
    state.episodic_events.push({
      timestamp: Date.now(),
      summary: eventSummary,
      is_correct: isCorrect
    });

    if (state.episodic_events.length > 8) {
      state.episodic_events = state.episodic_events.slice(-8);
    }

    if (state.active_question) {
      state.active_question.status = "ANSWERED";
    }

    state.last_updated = Date.now();
    return state;
  }
}
