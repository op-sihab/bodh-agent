// Vector Similarity Search (টাইপভিত্তিক অনুরূপ প্রশ্ন অনুসন্ধান)
import { executeRawSql } from "../client.js";
import { appCache } from "../../cache.js";

export async function getSimilarQuestionsByVector({ questionId, queryText, subjectId, limit = 4 } = {}) {
  let targetId = questionId ? String(questionId).trim() : null;

  // If questionId not directly valid, find seed question via queryText
  if (!targetId || !targetId.startsWith('q_')) {
    let cleanKw = (queryText || "").replace(/'/g, "''").trim();
    if (!cleanKw) return { seed: null, similar: [] };

    let seed = null;
    // 1. Try direct substring match
    const conds = [`question_text LIKE '%${cleanKw}%'`];
    if (subjectId) conds.push(`subject_id = '${subjectId.replace(/'/g, "''")}'`);
    const exactRes = await executeRawSql(`SELECT id, subject_id, chapter_id, tags, question_text FROM questions WHERE ${conds.join(' AND ')} LIMIT 1;`);
    if (exactRes.rows.length) {
      seed = exactRes.rows[0];
    } else {
      // 2. Filter stop words & use significant keywords
      const stopWords = ['এই', 'প্রশ্নের', 'অনুরূপ', 'টাইপের', 'আরেকটি', 'বোর্ড', 'প্রশ্ন', 'দাও', 'করলে', 'কত', 'কোনটি', 'হলে', 'নিচের'];
      const words = cleanKw.split(/[\s,\.\?\!\:\-\(\)\[\]]+/).filter(w => w.length >= 3 && !stopWords.includes(w));
      if (words.length > 0) {
        const wordConds = words.slice(0, 3).map(w => `question_text LIKE '%${w}%'`);
        if (subjectId) wordConds.push(`subject_id = '${subjectId.replace(/'/g, "''")}'`);
        const kwRes = await executeRawSql(`SELECT id, subject_id, chapter_id, tags, question_text FROM questions WHERE ${wordConds.join(' AND ')} LIMIT 1;`);
        if (kwRes.rows.length) seed = kwRes.rows[0];
      }
    }

    if (!seed) {
      // 3. Fallback: search by first significant keyword
      const words = cleanKw.split(/[\s,\.\?\!\:\-\(\)\[\]]+/).filter(w => w.length >= 4);
      for (const w of words) {
        const sRes = await executeRawSql(`SELECT id, subject_id, chapter_id, tags, question_text FROM questions WHERE question_text LIKE '%${w}%' LIMIT 1;`);
        if (sRes.rows.length) {
          seed = sRes.rows[0];
          break;
        }
      }
    }

    if (!seed) return { seed: null, similar: [] };
    targetId = seed.id;
  }

  // Check cache for this targetId
  const cacheKey = `vec_sim:${targetId}:${subjectId || 'all'}:${limit}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { ...cached, fromCache: true, durationMs: 0 };

  const t0 = performance.now();
  // Get seed question
  const seedRes = await executeRawSql(`SELECT id, subject_id, chapter_id, tags, question_text, option_a, option_b, option_c, option_d, answer, solution FROM questions WHERE id = '${targetId}';`);
  const seedQ = seedRes.rows[0];
  if (!seedQ) return { seed: null, similar: [] };

  const subj = subjectId || seedQ.subject_id;
  const subjClause = subj ? `AND qs.subject_id = '${subj.replace(/'/g, "''")}'` : "";

  // Vector distance query using Turso's native vector_distance_cos
  const count = Math.min(Math.max(parseInt(limit) || 3, 1), 6);
  const sql = `
    SELECT q.qid, vector_distance_cos(q.emb, (SELECT emb FROM question_vectors WHERE qid = '${targetId}')) as dist
    FROM question_vectors q
    JOIN questions qs ON q.qid = qs.id
    WHERE q.qid != '${targetId}' ${subjClause}
    ORDER BY dist ASC
    LIMIT ${count};
  `;

  const vecRes = await executeRawSql(sql);
  if (!vecRes.rows.length) {
    const res = { seed: seedQ, similar: [] };
    appCache.set(cacheKey, res, 1800);
    return { ...res, fromCache: false, durationMs: Math.round(performance.now() - t0) };
  }

  const qids = vecRes.rows.map(r => `'${r.qid}'`).join(',');
  const qDetails = await executeRawSql(`
    SELECT id, subject_id, chapter_id, exam_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution
    FROM questions
    WHERE id IN (${qids});
  `);

  const similar = qDetails.rows.map(q => {
    const distInfo = vecRes.rows.find(s => s.qid === q.id);
    const cosDist = distInfo ? parseFloat(distInfo.dist) : 0.5;
    const similarityScore = Math.max(0, Math.min(100, Math.round((1 - cosDist) * 100)));
    return {
      ...q,
      similarity_score: `${similarityScore}%`
    };
  });

  const result = { seed: seedQ, similar };
  appCache.set(cacheKey, result, 1800);
  return { ...result, fromCache: false, durationMs: Math.round(performance.now() - t0) };
}
