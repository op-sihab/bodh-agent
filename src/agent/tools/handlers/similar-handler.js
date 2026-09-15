import { getSimilarQuestionsByVector } from "../../../core/db/queries/vector.js";
import { normalizeSubject } from "../../../config/subject-map.js";
import { formatTag } from "../../../config/tag-map.js";
import { detectCognitiveArchetype } from "./cognitive-archetypes.js";

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

  const seedOptions = [res.seed.option_a, res.seed.option_b, res.seed.option_c, res.seed.option_d].filter(Boolean);
  const archetype = detectCognitiveArchetype(res.seed.question_text, seedOptions, subjId || res.seed.subject_id);

  // Check quality of database matches
  const topMatches = (res.similar || []).filter(q => {
    const scoreNum = parseInt(q.similarity_score) || 0;
    return scoreNum >= 65;
  });

  const hasDirectDatabaseTwin = topMatches.length > 0;

  return {
    mode: "cognitive_master_type_match",
    archetype: {
      type_id: archetype.type,
      title: archetype.title,
      description: archetype.description
    },
    target_concept: res.seed.question_text.slice(0, 100),
    seed_question: {
      id: res.seed.id,
      question: res.seed.question_text,
      board: formatTag(res.seed.tags),
      raw_tag: res.seed.tags,
      options: seedOptions,
      answer: res.seed.answer
    },
    has_direct_database_twin: hasDirectDatabaseTwin,
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
    mentor_instructions: hasDirectDatabaseTwin
      ? `শিক্ষার্থীকে প্রথমে জানাও যে এই প্রশ্নটি কোন মাস্টার টাইপে পড়ে (${archetype.title})। তারপর ডেটাবেসের অন্য বোর্ডের আসল অনুরূপ প্রশ্নটি উপস্থাপন করো। দেখিয়ে দাও পরীক্ষক কীভাবে সংখ্যা বা ভাষা ঘুরিয়ে (Examiner Twist) একই টাইপ দিয়েছে।`
      : `এই প্রশ্নের মাস্টার টাইপ হলো: ${archetype.title}। ডেটাবেসে যদি হুবহু একই জটিল সূত্রের কোনো প্রশ্ন না থাকে, তবে মূল প্রশ্নের গাণিতিক ও কগনিটিভ ডেরিভেশন কাঠামো (যেমন একই সূত্র বা লজিক্যাল চেইন) অক্ষুণ্ণ রেখে শুধু সংখ্যা বা পদার্থের নাম বদলে শিক্ষার্থীকে সমমানের একটি খাঁটি প্রশ্ন প্রদান করো। প্রথমে শুধু প্রশ্ন দেবে, উত্তর দেবে না!`
  };
}
