// Tool Result Compaction & Context Minimization
import { formatTag } from "../../config/tag-map.js";

export function compactToolResult(toolName, rawResult, toolArgs = {}) {
  if (!rawResult) return { status: "empty" };

  switch (toolName) {
    case "get_mcq_quiz": {
      if (!rawResult.quiz || rawResult.quiz.length === 0) {
        return {
          status: "not_found",
          message: "নির্দিষ্ট অধ্যায়ে কোনো বহুনির্বাচনী প্রশ্ন পাওয়া যায়নি। শিক্ষার্থীকে আন্তরিকভাবে বিষয় বা অন্য কোনো অধ্যায় উল্লেখ করতে বলো।"
        };
      }

      const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };

      // MULTI-QUESTION / MOCK TEST MODE (> 1 MCQs)
      if (rawResult.quiz.length > 1) {
        const total = rawResult.quiz.length;
        const chDisplay = rawResult.actual_chapter?.display || rawResult.actual_chapter?.name || toolArgs?.chapter || "অধ্যায়";
        const subjName = rawResult.subject || "এসএসসি";

        return {
          mode: "exam_launcher",
          total_questions: total,
          subject: subjName,
          chapter: chDisplay,
          mentor_guide: `উপস্থাপনার নিয়ম (মাল্টিপল বহুনির্বাচনী / লাইভ মক টেস্ট): শিক্ষার্থী ${total}টি বহুনির্বাচনী প্রশ্ন চেয়েছে। চ্যাটে প্রশ্নগুলোর তালিকা বড় করে লিখবে না! মাত্র ১-২ বাক্যে বড় ভাইয়াসুলভ উৎসাহী ভূমিকা দাও এবং নিচে [exam_launcher: {"total": ${total}, "subject": "${subjName}", "chapter": "${chDisplay}"}] ট্যাগটি অবিকল রাখবে। ফ্রন্টএন্ড নিজে থেকেই সুন্দর লাইভ টেস্ট কার্ড ও মোডাল রেন্ডার করবে যাতে ক্লিক করে শিক্ষার্থী পরীক্ষা শুরু করতে পারে।`
        };
      }

      // SINGLE QUESTION PRACTICE MODE (= 1 MCQ)
      const q = rawResult.quiz[0];
      const rawAns = q?.answer || '';
      const normAns = toBnAns[rawAns] || rawAns || 'ক';
      const bTag = q?.formatted_source || formatTag(q?.tags) || "বোর্ড প্রামাণিক প্রশ্ন";

      return {
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
        mentor_guide: `উপস্থাপনার নিয়ম: কোনো <...> বা কাল্পনিক ট্যাগ লিখবে না। প্রথমে ১ বাক্যে স্বাভাবিক বাংলায় ভূমিকা দাও (যেমন: '${bTag}-এর একটি গুরুত্বপূর্ণ বহুনির্বাচনী প্রশ্ন নিচে দেওয়া হলো—')। প্রশ্নের নিচে আলাদা লাইনে [বোর্ড: ${bTag}] উল্লেখ করবে। এরপর প্রশ্ন, ৪টি অপশন এবং শেষে [ans: ${normAns}] দেবে। ভুলেও সরাসরি উত্তর বা ব্যাখ্যা লিখবে না যাতে কুইজ স্পয়েল না হয়।`
      };
    }

    case "get_creative_question": {
      if (!rawResult.stem && !rawResult.question_text) {
        return {
          status: "not_found",
          message: "নির্দিষ্ট অধ্যায়ে কোনো সৃজনশীল প্রশ্ন পাওয়া যায়নি।"
        };
      }
      const ch = rawResult.actual_chapter?.display || rawResult.actual_chapter?.name || rawResult.chapter_name || toolArgs?.chapter || "";
      const bTag = rawResult.board_tag || rawResult.formatted_source || formatTag(rawResult.raw_tag || rawResult.tags) || "বোর্ড প্রামাণিক প্রশ্ন";

      return {
        chapter: ch,
        board: bTag,
        stem: rawResult.stem || rawResult.question_text,
        part_ka: rawResult.part_ka,
        part_kha: rawResult.part_kha,
        part_ga: rawResult.part_ga,
        part_gha: rawResult.part_gha,
        mentor_guide: `উপস্থাপনার নিয়ম: মার্জিত ও প্রাতিষ্ঠানিক অ্যাকাডেমিক কথনে শিরোনামে অধ্যায় এবং [বোর্ড: ${bTag}] উল্লেখ করবে। উদ্দীপক এবং ক, খ, গ, ঘ অংশের প্রশ্ন ও নম্বর বণ্টন উল্লেখ করে সুন্দর মার্কডাউনে উপস্থাপন করো। ভুলেও 'আসল প্রশ্ন', 'আসল CQ' বা কোনো কাল্পনিক ট্যাগ লিখবে না।`
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
      return {
        board: rawResult.board || toolArgs.board_name,
        available_exam_sets: rawResult.available_exam_sets?.slice(0, 3),
        total_sets: rawResult.available_exam_sets?.length || 0
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
      const bTag = formatTag(q?.board || q?.raw_tag) || "বোর্ড স্ট্যান্ডার্ড";

      return {
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
        mentor_guide: `অনুরূপ প্রশ্ন: বড় ভাইয়াসুলভ কথনে আগের প্রশ্নের মূল টাইপ ও সূত্রের সাথে এই প্রশ্নের মিল ধরিয়ে দাও। শেষে [ans: ${normAns}] দেবে।`
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
