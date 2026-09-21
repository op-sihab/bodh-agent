// Tool Result Compaction & Context Minimization
import { formatTag } from "../../config/tag-map.js";
import { SUBJECT_DISPLAY_NAMES } from "../../config/subject-map.js";

export function compactToolResult(toolName, rawResult, toolArgs = {}) {
  if (!rawResult) return { status: "empty" };

  switch (toolName) {
    case "get_mcq_quiz": {
      if (rawResult.status === "ai_generation_fallback" || !rawResult.quiz || rawResult.quiz.length === 0) {
        const topic = rawResult.requested_topic || toolArgs?.topic || toolArgs?.query || toolArgs?.chapter || "অনুরোধকৃত টপিক";
        const isHscIct = /html|css|web\s*design|c\s*programming|প্রোগ্রামিং|অ্যালগরিদম|ফ্লোচার্ট/i.test(topic);
        const syllabusNote = isHscIct 
          ? " (নোট: এই টপিকটি মূলত এইচএসসি আইসিটি সিলেবাসের অন্তর্ভুক্ত, তবে শিক্ষার্থীর অনুশীলনের জন্য শিক্ষার্থীকেন্দ্রীক গভীর বিশ্লেষণসহ তৈরি করো)"
          : "";
        return {
          status: "ai_generation_fallback",
          topic: topic,
          message: `ডেটাবেসে '${topic}' সম্পর্কিত প্রামাণিক প্রশ্ন পাওয়া যায়নি। শিক্ষক হিসেবে গভীর বিশ্লেষণধর্মী এআই বহুনির্বাচনী প্রশ্ন তৈরি করো।`,
          mentor_guide: `উপস্থাপনার নিয়ম (এআই অ্যানালাইটিক্যাল প্রশ্ন): ডেটাবেসে '${topic}' সম্পর্কিত প্রশ্ন নেই। শিক্ষার্থীকে কোনো অজুহাত বা 'প্রশ্ন পাইনি' না বলে শিক্ষক হিসেবে উক্ত বিষয়ের ওপর গভীর বিশ্লেষণধর্মী ১টি মানসম্মত MCQ (প্রাসঙ্গিক কোড/উদ্দীপক/লজিক্যাল সিনারিওসহ) তৈরি করো।${syllabusNote}\n` +
            `১. শুরুতে আলাদা লাইনে ট্যাগ দাও: [উৎস: এআই অ্যানালাইটিক্যাল প্রশ্ন | টপিক: ${topic}]\n` +
            `২. উদ্দীপক/প্রশ্ন এবং ৪টি অপশন ((ক), (খ), (গ), (ঘ)) স্পষ্ট তুলে ধরবে।\n` +
            `৩. শিক্ষার্থী অপশন নির্বাচন করার আগে উত্তর ও ব্যাখ্যা প্রকাশ করবে না।\n` +
            `৪. মেসেজের একদম শেষে [ans: <সঠিক_বাংলা_অক্ষর>] [qid: ai_gen_${Date.now().toString(36)}] ট্যাগটি অবশ্যই দেবে যাতে লাইভ কুইজ ইন্টারঅ্যাকশন কাজ করে।`
        };
      }

      const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };

      // MULTI-QUESTION / MOCK TEST MODE (> 1 MCQs)
      if (rawResult.quiz.length > 1) {
        const total = rawResult.quiz.length;
        const chDisplay = rawResult.actual_chapter?.display || rawResult.actual_chapter?.name || toolArgs?.chapter || "সম্পূর্ণ বই";
        const subjName = SUBJECT_DISPLAY_NAMES[rawResult.subject] || rawResult.subject || "এসএসসি প্রস্তুতি";

        return {
          mode: "exam_launcher",
          total_questions: total,
          subject: subjName,
          chapter: chDisplay,
          mentor_guide: `উপস্থাপনার নিয়ম (মাল্টিপল বহুনির্বাচনী / লাইভ মক টেস্ট): শিক্ষার্থী ${total}টি বহুনির্বাচনী প্রশ্ন চেয়েছে। চ্যাটে প্রশ্নগুলোর তালিকা বড় করে লিখবে না! মাত্র ১-২ বাক্যে সংক্ষিপ্ত উৎসাহব্যঞ্জক ভূমিকা দাও এবং নিচে [exam_launcher: {"total": ${total}, "subject": "${subjName}", "chapter": "${chDisplay}"}] ট্যাগটি অবিকল রাখবে। ফ্রন্টএন্ড নিজে থেকেই সুন্দর লাইভ টেস্ট কার্ড ও মোডাল রেন্ডার করবে যাতে ক্লিক করে শিক্ষার্থী পরীক্ষা শুরু করতে পারে।`
        };
      }

      // SINGLE QUESTION PRACTICE MODE (= 1 MCQ)
      const q = rawResult.quiz[0];
      const rawAns = q?.answer || '';
      const normAns = toBnAns[rawAns] || rawAns || 'ক';
      const bTag = q?.formatted_source || formatTag(q?.tags) || "বোর্ড প্রামাণিক প্রশ্ন";
      const qId = q?.id || '';

      return {
        id: qId,
        chapter: rawResult.actual_chapter?.display || rawResult.actual_chapter?.name || toolArgs?.chapter || "",
        board: bTag,
        question: q?.question_text,
        options: {
          "ক": q?.option_a,
          "খ": q?.option_b,
          "গ": q?.option_c,
          "ঘ": q?.option_d
        },
        answer_code: normAns,
        mentor_guide: `উপস্থাপনার নিয়ম: প্রথমে ১ বাক্যে স্বাভাবিক বাংলায় ভূমিকা দাও। প্রশ্নের শুরুতে আলাদা লাইনে [বোর্ড: ${bTag}] উল্লেখ করবে। এরপর প্রশ্ন এবং ৪টি বিকল্প (ক, খ, গ, ঘ) তুলে ধরবে। শিক্ষার্থী উত্তর দেওয়ার আগে ভুলেও উত্তর বা ব্যাখ্যা লিখবে না! মেসেজের একদম শেষে অবিকল [ans: ${normAns}] [qid: ${qId}] ট্যাগ দুটি দেবে।`
      };
    }

    case "get_creative_question": {
      if (rawResult.status === "ai_generation_fallback" || (!rawResult.stem && !rawResult.question_text)) {
        const topic = rawResult.requested_topic || toolArgs?.topic || toolArgs?.query || toolArgs?.chapter || "অনুরোধকৃত টপিক";
        return {
          status: "ai_generation_fallback",
          topic: topic,
          message: `ডেটাবেসে '${topic}' সম্পর্কিত সৃজনশীল প্রশ্ন পাওয়া যায়নি। শিক্ষক হিসেবে মানসম্মত উদ্দীপক ও ৪ স্তরের সৃজনশীল প্রশ্ন তৈরি করো।`,
          mentor_guide: `উপস্থাপনার নিয়ম (এআই অ্যানালাইটিক্যাল সৃজনশীল): ডেটাবেসে '${topic}' এর সরাসরি সৃজনশীল প্রশ্ন নেই। একজন বিশেষজ্ঞ শিক্ষক হিসেবে উক্ত টপিকের ওপর ১টি সম্পূর্ণ মানসম্মত উদ্দীপক ও ৪ স্তরবিশিষ্ট (ক: জ্ঞানমূলক ১, খ: অনুধাবনমূলক ২, গ: প্রয়োগমূলক ৩, ঘ: উচ্চতর দক্ষতামূলক ৪) সৃজনশীল প্রশ্ন তৈরি করে দাও।\n` +
            `১. শুরুতে ট্যাগ দাও: [উৎস: এআই অ্যানালাইটিক্যাল সৃজনশীল | টপিক: ${topic}]\n` +
            `২. উদ্দীপক ও ক, খ, গ, ঘ স্পষ্টভাবে উপস্থাপন করো।`
        };
      }
      const ch = rawResult.actual_chapter?.display || rawResult.actual_chapter?.name || rawResult.chapter_name || toolArgs?.chapter || "";
      const bTag = rawResult.board_tag || rawResult.formatted_source || formatTag(rawResult.raw_tag || rawResult.tags) || "বোর্ড প্রামাণিক প্রশ্ন";
      const qId = rawResult.id || rawResult.qid || '';

      return {
        id: qId,
        chapter: ch,
        board: bTag,
        stem: rawResult.stem || rawResult.question_text,
        part_ka: rawResult.part_ka,
        part_kha: rawResult.part_kha,
        part_ga: rawResult.part_ga,
        part_gha: rawResult.part_gha,
        mentor_guide: `উপস্থাপনার নিয়ম: মার্জিত অ্যাকাডেমিক কথনে শিরোনামে অধ্যায় এবং শুরুতে [বোর্ড: ${bTag}] উল্লেখ করবে। উদ্দীপক এবং ক, খ, গ, ঘ অংশের প্রশ্ন ও নম্বর বণ্টন উল্লেখ করে সুন্দর মার্কডাউনে উপস্থাপন করো। শেষে [qid: ${qId}] দেবে।`
      };
    }

    case "get_subject_chapters": {
      return {
        subject: rawResult.subject,
        total_chapters: rawResult.total_chapters,
        divisions: rawResult.divisions,
        numbered_chapters: rawResult.numbered_chapters
      };
    }

    case "check_board_frequency": {
      return {
        topic: rawResult.topic || toolArgs.topic,
        total_questions: rawResult.total_questions,
        frequency_summary: rawResult.frequency_analysis || `${rawResult.topic} বিগত বছরগুলোতে মোট ${rawResult.total_questions} বার এসেছে।`
      };
    }

    case "get_board_exam_questions": {
      const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
      const isFull = Boolean(rawResult.is_full_exam) || (rawResult.sample_mcq?.length >= 10);
      return {
        board: rawResult.board || toolArgs.board_name,
        year: rawResult.year,
        subject: rawResult.subject,
        is_full_exam: isFull,
        total_mcqs: rawResult.sample_mcq?.length || 0,
        status: isFull ? "all_authentic_questions_loaded_in_exam_card" : "retrieved",
        sample_preview: rawResult.sample_mcq?.[0] ? {
          question: rawResult.sample_mcq[0].question_text,
          board: rawResult.sample_mcq[0].formatted_source || rawResult.sample_mcq[0].tags
        } : null,
        mcq: isFull ? undefined : rawResult.sample_mcq?.map(q => ({
          id: q.id,
          question: q.question_text,
          options: {
            "ক": q.option_a,
            "খ": q.option_b,
            "গ": q.option_c,
            "ঘ": q.option_d
          },
          answer: toBnAns[q.answer] || q.answer,
          board: q.formatted_source || q.tags
        })),
        cq: rawResult.sample_cq ? {
          id: rawResult.sample_cq.id,
          stem: rawResult.sample_cq.question_text,
          parts: {
            "ক": rawResult.sample_cq.option_a,
            "খ": rawResult.sample_cq.option_b,
            "গ": rawResult.sample_cq.option_c,
            "ঘ": rawResult.sample_cq.option_d
          },
          board: rawResult.sample_cq.formatted_source || rawResult.sample_cq.tags
        } : null
      };
    }

    case "get_chapter_importance_ranking": {
      const topList = rawResult.top_priority_chapters_with_board_breakdown || rawResult.topTierWithBoardDetails || [];
      return {
        subject: rawResult.subject,
        most_important_chapter: rawResult.most_important_chapter,
        top_priority_chapters: topList.slice(0, 4).map(c => ({
          chapter: `অধ্যায় ${c.chapter_number}: ${c.chapter_name}`,
          appearances: c.total_board_appearances
        }))
      };
    }

    case "find_similar_type_questions": {
      const q = rawResult.similar_type_questions?.[0];
      const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
      const rawAns = q?.answer || '';
      const normAns = toBnAns[rawAns] || rawAns || 'ক';
      const bTag = formatTag(q?.board || q?.raw_tag) || "বোর্ড প্রামাণিক প্রশ্ন";
      const qId = q?.id || '';

      return {
        id: qId,
        chapter: rawResult.chapter_name || toolArgs?.chapter || "",
        board: bTag,
        question: q?.question,
        options: {
          "ক": q?.options?.[0],
          "খ": q?.options?.[1],
          "গ": q?.options?.[2],
          "ঘ": q?.options?.[3]
        },
        answer_code: normAns,
        mentor_guide: `উপস্থাপনার নিয়ম: এটি আসল বোর্ড ডেটাবেসের অনুরূপ প্রশ্ন। প্রথমে ১ বাক্যে আগের টাইপের সাথে মিল রেখে সংক্ষিপ্ত দিকনির্দেশনামূলক ভূমিকা দাও। প্রশ্নের শুরুতে আলাদা লাইনে [বোর্ড: ${bTag}] উল্লেখ করবে। এরপর প্রশ্ন ও ৪টি বিকল্প (ক, খ, গ, ঘ) তুলে ধরো। শিক্ষার্থী চেষ্টা করার আগে ভুলেও উত্তর বা ব্যাখ্যা প্রকাশ করবে না! মেসেজের শেষে অবিকল [ans: ${normAns}] [qid: ${qId}] ট্যাগ দুটি দেবে।`
      };
    }

    case "analyze_chapter_patterns": {
      return {
        chapter: rawResult.chapter_name,
        total_questions: rawResult.total_questions_in_database,
        patterns: rawResult.patterns
      };
    }

    case "search_question_bank": {
      return {
        query: rawResult.search_query,
        total_found: rawResult.total_found,
        results: (rawResult.results || []).slice(0, 3).map(r => ({
          question: r.question_text,
          answer: r.answer,
          board: formatTag(r.tags)
        }))
      };
    }

    case "query_question_database_sql": {
      return {
        success: rawResult.success,
        total_matching_rows: rawResult.total_matching_rows,
        rows: (rawResult.rows || []).slice(0, 5)
      };
    }

    default:
      return rawResult;
  }
}
