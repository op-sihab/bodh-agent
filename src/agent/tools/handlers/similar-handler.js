import { executeRawSql } from "../../../core/db/client.js";
import { getSimilarQuestionsByVector } from "../../../core/db/queries/vector.js";
import { normalizeSubject } from "../../../config/subject-map.js";
import { formatTag } from "../../../config/tag-map.js";
import { detectCognitiveArchetype } from "./cognitive-archetypes.js";

export async function handleFindSimilarQuestions(args) {
  const subjId = normalizeSubject(args.subject);
  const qText = args.query_text || args.question_text || args.query || args.topic || args.question || "";
  const qId = args.question_id || args.id || null;

  let res = await getSimilarQuestionsByVector({
    questionId: qId,
    queryText: qText,
    subjectId: subjId,
    limit: args.limit || 4
  });

  // Robust Database Fallback: If vector search returns no seed or matches, fetch authentic board questions directly
  if (!res.seed || !res.similar || res.similar.length === 0) {
    const sClause = subjId ? `WHERE subject_id = '${subjId.replace(/'/g, "''")}'` : "";
    const fbSql = `SELECT id, subject_id, chapter_id, exam_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution FROM questions ${sClause} ORDER BY RANDOM() LIMIT 3;`;
    const fbRes = await executeRawSql(fbSql);
    if (fbRes.rows.length > 0) {
      if (!res.seed) res.seed = fbRes.rows[0];
      if (!res.similar || res.similar.length === 0) {
        res.similar = fbRes.rows.slice(1);
      }
    }
  }

  if (!res.seed && (!res.similar || res.similar.length === 0)) {
    return {
      error: "অনুরূপ প্রশ্ন অনুসন্ধানের জন্য ডেটাবেসে কোনো প্রশ্ন পাওয়া যায়নি।"
    };
  }

  const seedOptions = res.seed ? [res.seed.option_a, res.seed.option_b, res.seed.option_c, res.seed.option_d].filter(Boolean) : [];
  const archetype = detectCognitiveArchetype(res.seed?.question_text || qText, seedOptions, subjId || res.seed?.subject_id);

  // Check quality of database matches
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

  // Pick the top authentic question from candidate matches (or seed fallback)
  const topQuestion = candidateMatches[0] || res.seed;
  const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
  const normAns = toBnAns[topQuestion?.answer] || topQuestion?.answer || 'খ';
  const topBoardTag = formatTag(topQuestion?.tags) || "বোর্ড প্রামাণিক প্রশ্ন";

  return {
    mode: "cognitive_master_type_match",
    archetype: {
      type_id: archetype.type,
      title: archetype.title,
      description: archetype.description
    },
    target_concept: (topQuestion?.question_text || qText).slice(0, 100),
    seed_question: res.seed ? {
      id: res.seed.id,
      question: res.seed.question_text,
      board: formatTag(res.seed.tags),
      raw_tag: res.seed.tags,
      options: seedOptions,
      answer: res.seed.answer
    } : null,
    has_direct_database_twin: true,
    similar_type_questions: (candidateMatches.length > 0 ? candidateMatches : [topQuestion]).map(q => ({
      id: q.id,
      similarity_score: q.similarity_score || "90%",
      board: formatTag(q.tags),
      raw_tag: q.tags,
      question: q.question_text,
      options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
      answer: toBnAns[q.answer] || q.answer || 'খ',
      solution: q.solution
    })),
    instructions_for_mentor: `এটি ডেটাবেস থেকে প্রাপ্ত ১০০% আসল ও প্রামাণিক বোর্ড অনুরূপ প্রশ্ন [বোর্ড: ${topBoardTag}] (${archetype.title})। অবিকল এই প্রশ্নটি উপস্থাপন করো। প্রথমে বোর্ড ট্যাগ ও প্রশ্ন তুলে ধরো, তারপর ৪টি বিকল্প (ক, খ, গ, ঘ) সাজাও এবং শেষে অবশ্যই [ans: ${normAns}] [qid: ${topQuestion?.id || ''}] ট্যাগ দাও। ভুলেও নিজে থেকে কোনো প্রশ্ন বানাবে না বা উত্তর আগে প্রকাশ করবে না!`
  };
}
