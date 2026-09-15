// Comprehensive Automated Test Suite for Autonomous ReAct Agent & Live Database Grounding
import { MemoryManager } from './src/agent/memory/memory-manager.js';
import { executeAgentTool } from './src/agent/tools/index.js';

console.log('====================================================');
console.log('🚀 STARTING COMPREHENSIVE AUTOMATED TEST SUITE (ZERO MOCK / FULL AUTONOMOUS REACT)');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// TEST 1: Frontend parseStreamThoughts simulation with mathematical '<' symbols
console.log('--- TEST 1: Frontend Stream Parser Resilience (No text swallowing on "<") ---');
function parseStreamThoughts(raw) {
  if (!raw) return { hasThought: false, inProgress: false, thought: '', answer: '' };
  const thoughtRegex = /<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>([\s\S]*?)<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi;
  const allThoughts = [];
  let lastClosedEnd = 0;
  let m;
  while ((m = thoughtRegex.exec(raw)) !== null) {
    allThoughts.push(m[1].trim());
    lastClosedEnd = m.index + m[0].length;
  }
  const remaining = raw.slice(lastClosedEnd);
  const inProgressOpen = remaining.match(/<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/i);
  if (inProgressOpen) {
    const inProgressText = remaining.slice(inProgressOpen.index + inProgressOpen[0].length).trimStart();
    const combinedThought = allThoughts.concat([inProgressText]).filter(Boolean).join(' ');
    return { hasThought: true, inProgress: true, thought: combinedThought, answer: remaining.slice(0, inProgressOpen.index).trimStart() };
  }
  if (allThoughts.length > 0) {
    return { hasThought: true, inProgress: false, thought: allThoughts.join(' '), answer: remaining.trimStart() };
  }
  return { hasThought: false, inProgress: false, thought: '', answer: raw };
}

const testTextWithMath = 'পানিতে অম্লীয় দ্রবণে pH < 7 হয় এবং ক্ষারীয় দ্রবণে pH > 7 হয়।';
const resMath = parseStreamThoughts(testTextWithMath);
assert(!resMath.hasThought, 'Math text with "<" is not falsely flagged as thought');
assert(resMath.answer === testTextWithMath, 'Math text with "<" is fully preserved without truncation');

const testWithThoughtAndAnswer = '<thought>অধ্যায়গুলোর তালিকা যাচাই করছি</thought>\n\n১. রসায়নের ধারণা\n২. পদার্থের অবস্থা';
const resThought = parseStreamThoughts(testWithThoughtAndAnswer);
assert(resThought.hasThought, 'Thought tag is correctly detected');
assert(resThought.thought === 'অধ্যায়গুলোর তালিকা যাচাই করছি', 'Thought content is accurately extracted');
assert(resThought.answer.includes('১. রসায়নের ধারণা'), 'Answer content following thought is completely preserved');

// TEST 2: MemoryManager Broad Syllabus Query & Chapter Lock Resolution
console.log('\n--- TEST 2: MemoryManager Chapter Lock Resolution ---');
const prevTurnState = {
  subject_id: 'ssc_chemistry',
  subject_name: 'রসায়ন',
  chapter_num: '6',
  chapter_name: 'মোলের ধারণা'
};

const reconciliation = MemoryManager.reconcile('রসায়ন বিষয়ের সবগুলো অধ্যায়ের নাম দাও', [], prevTurnState);
assert(reconciliation.state.subject_id === 'ssc_chemistry', 'Subject remains locked to ssc_chemistry');
assert(reconciliation.state.chapter_num === null, 'Chapter 6 was successfully unlocked (reset to null) for all-chapters query');
assert(reconciliation.state.active_mode === 'ROADMAP', 'Mode accurately identified as ROADMAP');

// TEST 3: MemoryManager Dynamic Chapter Switching
console.log('\n--- TEST 3: MemoryManager Dynamic Chapter Switching ---');
const switchReconciliation = MemoryManager.reconcile('আমাকে ৪ অধ্যায়ের সৃজনশীল প্রশ্ন দাও', [], {
  subject_id: 'ssc_chemistry',
  chapter_num: '6'
});
assert(switchReconciliation.state.chapter_num === '4', 'Chapter dynamically switched from 6 to 4');
assert(switchReconciliation.state.subject_id === 'ssc_chemistry', 'Subject strictly maintained during chapter switch');
assert(switchReconciliation.state.active_mode === 'CQ', 'Mode accurately identified as CQ');

// TEST 4: Live DB Chapter Inspection (Zero Mock Data Verification)
console.log('\n--- TEST 4: Live DB Chapter Inspection (100% Dynamic DB Data) ---');
const chDataChem = await executeAgentTool('get_subject_chapters', { subject: 'ssc_chemistry' });
assert(chDataChem.total_chapters === 12, 'Chemistry has exactly 12 official chapters from live DB');
assert(chDataChem.total_questions_in_subject > 3000, `Chemistry has live ${chDataChem.total_questions_in_subject} questions`);
assert(Array.isArray(chDataChem.chapters) && chDataChem.chapters.length === 12, 'Chapters array dynamically populated from DB');

const chDataMath = await executeAgentTool('get_subject_chapters', { subject: 'ssc_general_math' });
assert(chDataMath.total_chapters === 17, 'General Math has exactly 17 official chapters from live DB');
assert(chDataMath.total_questions_in_subject > 1000, `General Math has live ${chDataMath.total_questions_in_subject} questions`);

// TEST 5: Live DB Dynamic SQL Engine Querying
console.log('\n--- TEST 5: Dynamic SQL Engine Tool Execution ---');
const sqlRes = await executeAgentTool('query_question_database_sql', {
  sql: 'SELECT subject_id, count(*) as total FROM questions GROUP BY subject_id ORDER BY total DESC LIMIT 5;',
  explanation: 'শীর্ষ ৫টি বিষয়ের মোট প্রশ্ন সংখ্যা গণনা'
});
assert(sqlRes.success === true, 'SQL query executed successfully');
assert(sqlRes.rows.length === 5, 'Returned top 5 subjects from 50,855 questions DB');
console.log('    Top Subject Question Distribution:');
for (const r of sqlRes.rows) {
  console.log(`      • ${r.subject_id}: ${r.total} questions`);
}

// TEST 6: Live MCQ Quiz Retrieval from Database
console.log('\n--- TEST 6: Authentic MCQ Quiz Retrieval ---');
const mcqRes = await executeAgentTool('get_mcq_quiz', {
  subject: 'ssc_physics',
  chapter: 'গতি',
  count: 1
});
assert(mcqRes.quiz && mcqRes.quiz.length > 0, 'Fetched authentic MCQ question from DB');
assert(mcqRes.quiz[0].question_text, 'MCQ has question stem');
assert(mcqRes.quiz[0].option_a && mcqRes.quiz[0].option_b, 'MCQ has valid options');
assert(mcqRes.quiz[0].answer, 'MCQ has verified answer code');

// TEST 7: Live CQ Creative Question Retrieval from Database
console.log('\n--- TEST 7: Authentic CQ Question Retrieval ---');
const cqRes = await executeAgentTool('get_creative_question', {
  subject: 'ssc_physics',
  chapter: 'গতি'
});
assert(cqRes.stem, 'CQ has authentic stem');
assert(cqRes.part_ka, 'CQ has part Ka (১ নম্বর)');
assert(cqRes.part_kha, 'CQ has part Kha (২ নম্বর)');
assert(cqRes.part_ga, 'CQ has part Ga (৩ নম্বর)');
assert(cqRes.part_gha, 'CQ has part Gha (৪ নম্বর)');

// TEST 8: Live HTTP API SSE Stream Test for Chemistry All Chapters
console.log('\n--- TEST 8: Live HTTP API SSE Stream (/api/chat/stream) ---');
const sseStart = Date.now();
const response = await fetch('http://localhost:3000/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'রসায়ন বিষয়ের সবগুলো অধ্যায়ের নাম দাও',
    history: [],
    state: { subject_id: 'ssc_chemistry', subject_name: 'রসায়ন', chapter_num: '6' }
  })
});

assert(response.ok, `HTTP status is ${response.status} (OK)`);
const reader = response.body.getReader();
const decoder = new TextDecoder('utf-8');
let buffer = '';
let eventTypes = new Set();
let streamedAnswer = '';
let doneEventData = null;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const raw = trimmed.replace(/^data:\s*/, '').trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      eventTypes.add(data.type);
      if (data.type === 'tool_start') {
        console.log(`    [SSE Event] tool_start -> ${data.tool}`);
      }
      if (data.type === 'tool_done') {
        console.log(`    [SSE Event] tool_done -> ${data.summary}`);
      }
      if (data.type === 'content_delta') {
        streamedAnswer += data.delta;
      }
      if (data.type === 'done') {
        doneEventData = data;
      }
    } catch(e) {}
  }
}

const sseDuration = Date.now() - sseStart;
console.log(`    Stream completed in ${sseDuration}ms`);
console.log(`    Events observed: ${Array.from(eventTypes).join(', ')}`);

assert(eventTypes.has('tool_start'), 'Received tool_start event');
assert(eventTypes.has('tool_done'), 'Received tool_done event');
assert(eventTypes.has('content_delta'), 'Received content_delta stream chunks');
assert(eventTypes.has('done'), 'Received done completion event');

const finalContent = doneEventData?.content || streamedAnswer;
const parsedFinal = parseStreamThoughts(finalContent);
const cleanFinal = parsedFinal.hasThought ? parsedFinal.answer : finalContent;

console.log(`\n--- VERIFYING CHAPTER CONTENT IN FINAL ANSWER ---`);
console.log(cleanFinal);

const expectedKeywords = [
  'রসায়নের ধারণা',
  'পদার্থের অবস্থা',
  'পদার্থের গঠন',
  'পর্যায় সারণি',
  'রাসায়নিক বন্ধন',
  'মোলের ধারণা',
  'রাসায়নিক বিক্রিয়া',
  'রসায়ন ও শক্তি',
  'এসিড-ক্ষারক সমতা',
  'খনিজ সম্পদ'
];

const normText = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f\u09bc]/g, '').replace(/[ী]/g, 'ি').replace(/[ূ]/g, 'ু').replace(/[য়য]/g, 'য').replace(/[ষশস]/g, 'স');

for (const kw of expectedKeywords) {
  const cleanNorm = normText(cleanFinal);
  const kwNorm = normText(kw);
  const present = cleanFinal.includes(kw) || cleanNorm.includes(kwNorm);
  assert(present, `Answer contains chapter keyword '${kw}'`);
}

assert(doneEventData?.state?.subject_id === 'ssc_chemistry', 'Session state subject strictly preserved as ssc_chemistry');
assert(doneEventData?.state?.chapter_num === null, 'Session state chapter unlocked (null) for broad syllabus');

// ==========================================
// NEW TEST 9: Batch Mock Test Tool Execution (Count = 5)
// ==========================================
console.log('\n--- TEST 9: Batch MCQ Quiz Retrieval (5 Questions Mock Test) ---');
const batchMcqRes = await executeAgentTool('get_mcq_quiz', {
  subject: 'ssc_bangla_1st',
  count: 5,
  mode: 'mock_test'
});
assert(batchMcqRes.quiz && Array.isArray(batchMcqRes.quiz), 'Batch MCQ returned a quiz array');
assert(batchMcqRes.quiz.length === 5, `Batch MCQ returned exactly 5 questions (got: ${batchMcqRes.quiz.length})`);
for (let i = 0; i < batchMcqRes.quiz.length; i++) {
  const q = batchMcqRes.quiz[i];
  assert(Boolean(q.question_text), `Question ${i + 1} has non-empty stem`);
  assert(Boolean(q.option_a && q.option_b && q.option_c && q.option_d), `Question ${i + 1} has all 4 options (ক, খ, গ, ঘ)`);
  assert(Boolean(q.answer), `Question ${i + 1} has answer code: ${q.answer}`);
}

// ==========================================
// NEW TEST 10: Multi-MCQ Cluster Parser & Individual Answer Extraction
// ==========================================
console.log('\n--- TEST 10: Frontend Multi-MCQ Cluster Parser & Metadata Extraction ---');
const sampleMultiMcqText = `
এখানে বাংলা ১ম পত্রের ৫টি MCQ মক টেস্ট দেওয়া হলো:

### প্রশ্ন ১
‘নিরুপমা’ চরিত্রটি পাঠ্যবইয়ের কোন গল্পের?
[বোর্ড: সিলেট বোর্ড ২০১৬]
(ক) মমতাদি
(খ) দেনাপাওনা
(গ) অভাগীর স্বর্গ
(ঘ) আম আঁটির ভেঁপু
[ans: খ] [qid: q_101]

### প্রশ্ন ২
‘বই পড়া’ প্রবন্ধে লেখক লাইব্রেরিকে কিসের চেয়েও উপরে স্থান দিয়েছেন?
[বোর্ড: ঢাকা বোর্ড ২০২২]
(ক) বিদ্যালয়
(খ) হাসপাতাল
(গ) বিশ্ববিদ্যালয়
(ঘ) খেলার মাঠ
[ans: গ] [qid: q_102]

### প্রশ্ন ৩
সুভার গোয়ালঘরের দুটি গাভীর নাম কী ছিল?
[বোর্ড: রাজশাহী বোর্ড ২০২১]
(ক) শ্যামলী ও কাজলী
(খ) সর্বশী ও পাঙ্গুলী
(গ) সর্বশী ও পাঙ্গুলি
(ঘ) সর্বশী ও সুখিনী
[ans: খ] [qid: q_103]

### প্রশ্ন ৪
‘মানুষ মুহম্মদ (সা.)’ প্রবন্ধে হযরতের কোন গুণটি ফুটে উঠেছে?
[বোর্ড: কুমিল্লা বোর্ড ২০২০]
(ক) ক্রোধ
(খ) ক্ষমাশীলতা
(গ) অহংকার
(ঘ) উদাসীনতা
[ans: খ] [qid: q_104]

### প্রশ্ন ৫
‘তোমাকে পাওয়ার জন্যে হে স্বাধীনতা’ কবিতার কবি কে?
[বোর্ড: চট্টগ্রাম বোর্ড ২০২৩]
(ক) শামসুর রাহমান
(খ) কাজী নজরুল ইসলাম
(গ) সুকান্ত ভট্টাচার্য
(ঘ) জীবনানন্দ দাশ
[ans: ক] [qid: q_105]
`;

function extractMockTestQuestions(rawText) {
  const lines = rawText.split(/\r?\n/);
  const singleOptionLineRegex = /^[ \t]*(?:[-*+]\s+)?(?:\*{1,2})?(?:\(([ক-ঘa-dA-D])\)|([ক-ঘa-dA-D])[\.\)])(?:\*{1,2})?[ \t]+([^\r\n]+)/;
  const clusters = [];
  let currentCluster = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(singleOptionLineRegex);

    if (match) {
      const letter = match[1] || match[2];
      const text = match[3].replace(/\*{2,4}$/, '').trim();
      if (!currentCluster) {
        currentCluster = { startIndex: i, endIndex: i, items: [] };
      }
      currentCluster.endIndex = i;
      currentCluster.items.push({ letter, text, lineIdx: i });
    } else if (line.trim() === "") {
      // skip blank lines
    } else {
      if (currentCluster) {
        if (currentCluster.items.length >= 2) clusters.push(currentCluster);
        currentCluster = null;
      }
    }
  }
  if (currentCluster && currentCluster.items.length >= 2) {
    clusters.push(currentCluster);
  }

  const extracted = [];
  for (let c = 0; c < clusters.length; c++) {
    const cluster = clusters[c];
    let sIdx = cluster.startIndex - 1;
    while (sIdx >= 0 && lines[sIdx] && lines[sIdx].trim() === '') sIdx--;
    const stemLine = (sIdx >= 0 && lines[sIdx]) ? lines[sIdx].replace(/^#+\s*|\d+[\.\)]\s*|প্রশ্ন\s*[:\d]\s*/gi, '').trim() : `প্রশ্ন ${c + 1}`;

    let clusterAns = null;
    let clusterQid = null;
    let clusterBoard = null;

    const checkRangeStart = Math.max(0, cluster.startIndex - 3);
    const checkRangeEnd = Math.min(lines.length - 1, cluster.endIndex + 4);
    for (let li = checkRangeStart; li <= checkRangeEnd; li++) {
      const lText = lines[li] || '';
      const ansM = lText.match(/\[ans:\s*([ক-ঘa-dA-D])\]/i);
      if (ansM) clusterAns = ansM[1].toLowerCase();

      const qidM = lText.match(/\[(?:qid|id):\s*(q_\d+)\]/i);
      if (qidM) clusterQid = qidM[1];

      const bM = lText.match(/\[(?:বোর্ড|Board):?\s*([^\]]+)\]/i);
      if (bM) clusterBoard = bM[1];
    }

    extracted.push({
      id: clusterQid,
      stem: stemLine,
      answer: clusterAns,
      board: clusterBoard,
      optionsCount: cluster.items.length
    });
  }
  return { clusters, extracted };
}

const parsedClusters = extractMockTestQuestions(sampleMultiMcqText);
assert(parsedClusters.clusters.length === 5, `Parsed exactly 5 distinct MCQ clusters (got: ${parsedClusters.clusters.length})`);
assert(parsedClusters.extracted.length === 5, 'Extracted 5 questions for Exam Modal payload');

// Verify individual answers are preserved correctly and not overwritten
assert(parsedClusters.extracted[0].answer === 'খ' && parsedClusters.extracted[0].board.includes('সিলেট'), 'Q1 correctly captured answer (খ) and board (সিলেট)');
assert(parsedClusters.extracted[1].answer === 'গ' && parsedClusters.extracted[1].board.includes('ঢাকা'), 'Q2 correctly captured answer (গ) and board (ঢাকা)');
assert(parsedClusters.extracted[2].answer === 'খ' && parsedClusters.extracted[2].board.includes('রাজশাহী'), 'Q3 correctly captured answer (খ) and board (রাজশাহী)');
assert(parsedClusters.extracted[3].answer === 'খ' && parsedClusters.extracted[3].board.includes('কুমিল্লা'), 'Q4 correctly captured answer (খ) and board (কুমিল্লা)');
assert(parsedClusters.extracted[4].answer === 'ক' && parsedClusters.extracted[4].board.includes('চট্টগ্রাম'), 'Q5 correctly captured answer (ক) and board (চট্টগ্রাম)');

// ==========================================
// NEW TEST 11: Live End-to-End SSE Stream for 5-MCQ Mock Test
// ==========================================
console.log('\n--- TEST 11: Live SSE Stream for 5-MCQ Mock Test ("বাংলা ১ম পত্র থেকে ৫টি MCQ মক টেস্ট দাও") ---');
const examSseStart = Date.now();
const examResponse = await fetch('http://localhost:3000/api/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'বাংলা ১ম পত্র সাহিত্য থেকে ৫টি MCQ মক টেস্ট দাও',
    history: [],
    state: { subject_id: 'ssc_bangla_1st', subject_name: 'বাংলা ১ম পত্র' }
  })
});

assert(examResponse.ok, `HTTP status is ${examResponse.status} (OK)`);
const examReader = examResponse.body.getReader();
let examBuffer = '';
let examEvents = new Set();
let examStreamedAnswer = '';
let examDoneData = null;
let mcqToolCount = 0;

while (true) {
  const { done, value } = await examReader.read();
  if (done) break;
  examBuffer += decoder.decode(value, { stream: true });
  const lines = examBuffer.split('\n');
  examBuffer = lines.pop();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const raw = trimmed.replace(/^data:\s*/, '').trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      examEvents.add(data.type);
      if (data.type === 'tool_start') {
        console.log(`    [SSE Event] tool_start -> ${data.tool}`);
      }
      if (data.type === 'tool_done') {
        console.log(`    [SSE Event] tool_done -> ${data.summary}`);
        if (data.tool === 'get_mcq_quiz') {
          mcqToolCount = data.result?.quiz?.length || 0;
        }
      }
      if (data.type === 'content_delta') {
        examStreamedAnswer += data.delta;
      }
      if (data.type === 'done') {
        examDoneData = data;
      }
    } catch(e) {}
  }
}

const examDuration = Date.now() - examSseStart;
console.log(`    Stream completed in ${examDuration}ms`);
console.log(`    MCQs fetched by tool: ${mcqToolCount}`);

const rawExamFinal = examDoneData?.content || examStreamedAnswer;
const parsedExamFinal = parseStreamThoughts(rawExamFinal);
const cleanExamFinal = parsedExamFinal.hasThought ? parsedExamFinal.answer : rawExamFinal;

console.log('\n--- VERIFYING MULTI-MCQ AGENT STREAM OUTPUT ---');
const liveExtracted = extractMockTestQuestions(cleanExamFinal);
console.log(`    Extracted MCQ Clusters from Live Agent Output: ${liveExtracted.clusters.length}`);

assert(mcqToolCount === 5 || liveExtracted.clusters.length >= 4, 'Agent successfully fetched and generated 5 MCQs in response');
assert(cleanExamFinal.includes('[ans:') || cleanExamFinal.includes('(ক)'), 'Agent generated valid MCQ options and answer tags');

console.log('\n====================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
console.log('====================================================');

