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

  // Check quality of database matches (cosine similarity 55%+ indicates high conceptual match in dense embeddings)
  const candidateMatches = (res.similar || []).map(q => {
    const qArchetype = detectCognitiveArchetype(q.question_text, [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean), subjId || q.subject_id);
    const scoreNum = parseInt(q.similarity_score) || 0;
    const sameArchetype = qArchetype.type === archetype.type;
    return {
      ...q,
      scoreNum,
      sameArchetype,
      detectedArchetype: qArchetype
    };
  });

  // Sort candidate matches: prioritize matching cognitive archetype, then highest similarity score
  candidateMatches.sort((a, b) => {
    if (a.sameArchetype && !b.sameArchetype) return -1;
    if (!a.sameArchetype && b.sameArchetype) return 1;
    return b.scoreNum - a.scoreNum;
  });

  const topMatches = candidateMatches.filter(q => q.scoreNum >= 55);
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
    similar_type_questions: candidateMatches.map(q => ({
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
      ? `শিক্ষার্থীকে প্রথমে পরিষ্কার জানাও যে এই প্রশ্নটি কোন মাস্টার টাইপে পড়ে (${archetype.title})। তারপর ডেটাবেসের শীর্ষ অনুরূপ প্রশ্নটি (প্রথমটি) অবিকল উপস্থাপন করো। প্রশ্ন উপস্থাপন করার পর দেখিয়ে দাও পরীক্ষক কীভাবে পদার্থ, বিক্রিয়া বা সংখ্যা ঘুরিয়ে (Examiner Twist) একই কগনিটিভ টাইপ প্রয়োগ করেছে। প্রশ্ন দেওয়ার সময় সঠিক উত্তর বা ব্যাখ্যা সম্পূর্ণ গোপন রাখবে, শুধুমাত্র প্রশ্ন, বোর্ড ট্যাগ ও অপশন উপস্থাপন করবে!`
      : `এই প্রশ্নের মাস্টার টাইপ হলো: ${archetype.title} (${archetype.description})। ডেটাবেসে যদি হুবহু একই জটিল সূত্রের কোনো প্রশ্ন না থাকে, তবে মূল প্রশ্নের কগনিটিভ ডেরিভেশন কাঠামো (Cognitive Flow ও সমীকরণ চেইন) শতভাগ অক্ষুণ্ণ রেখে শুধু সংখ্যা বা পদার্থের নাম বদলে শিক্ষার্থীকে সমমানের একটি খাঁটি প্রশ্ন প্রদান করো। ভুলেও ১-ধাপের সহজ সূত্রে নেমে যাবে না! প্রথমে শুধু প্রশ্ন ও অপশন দেবে, উত্তর দেবে না!`
  };
}
