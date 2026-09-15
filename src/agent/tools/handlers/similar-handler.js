// Tool Handler: find_similar_type_questions
import { getSimilarQuestionsByVector } from "../../../core/db/queries/vector.js";
import { normalizeSubject } from "../../../config/subject-map.js";
import { formatTag } from "../../../config/tag-map.js";

export async function handleFindSimilarQuestions(args) {
  const subjId = normalizeSubject(args.subject);
  const qText = args.query_text || args.question_text || args.query || args.topic || args.question || "";
  const qId = args.question_id || args.id || null;
  const res = await getSimilarQuestionsByVector({
    questionId: qId,
    queryText: qText,
    subjectId: subjId,
    limit: args.limit || 3
  });

  if (!res.seed) {
    return {
      error: "অনুরূপ প্রশ্ন অনুসন্ধানের জন্য প্রাসঙ্গিক কোনো বীজ প্রশ্ন পাওয়া যায়নি। দয়া করে প্রশ্নের আইডি বা মূল বিষয় উল্লেখ করো।"
    };
  }

  return {
    mode: "vector_similarity_match",
    model: "kazalbrur/bangla-embed-e5-small (1024-d)",
    target_concept: res.seed.question_text.slice(0, 100),
    seed_question: {
      id: res.seed.id,
      question: res.seed.question_text,
      board: formatTag(res.seed.tags),
      raw_tag: res.seed.tags,
      options: [res.seed.option_a, res.seed.option_b, res.seed.option_c, res.seed.option_d].filter(Boolean),
      answer: res.seed.answer
    },
    similar_type_questions: res.similar.map(q => ({
      id: q.id,
      similarity_score: q.similarity_score,
      board: formatTag(q.tags),
      raw_tag: q.tags,
      question: q.question_text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
      answer: q.answer,
      solution: q.solution
    })),
    mentor_instructions: "শিক্ষার্থীকে প্রথমে জানাও যে এই প্রশ্নটি কোন মূল সূত্রে এবং কোন মাস্টার টাইপে পড়ে। তারপর ভেক্টর সার্চ থেকে পাওয়া অন্য বোর্ডের অনুরূপ প্রশ্নটি উপস্থাপন করো। দেখাও যে পরীক্ষক কীভাবে সংখ্যা বা ভাষা ঘুরিয়ে একই টাইপের প্রশ্ন অন্য বোর্ডে দিয়েছে।"
  };
}
