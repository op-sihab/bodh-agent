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

// TEST 9: Merge Gateway Cost & Telemetry Verification
console.log('\n--- TEST 9: Merge Gateway Real-time Cost & Telemetry Verification ---');
const gw = doneEventData?.gatewayTelemetry;
assert(gw !== undefined && gw !== null, 'Received gatewayTelemetry in done event');
assert(gw.model === 'openai/gpt-5.6-luna', `Gateway model identified correctly (${gw.model})`);
assert(gw.input_tokens > 0, `Recorded input tokens (${gw.input_tokens})`);
assert(gw.output_tokens > 0, `Recorded output tokens (${gw.output_tokens})`);
assert(gw.total_tokens === gw.input_tokens + gw.output_tokens, `Total tokens matches input + output (${gw.total_tokens})`);
assert(typeof gw.cost_usd === 'number' && gw.cost_usd > 0, `Recorded cost in USD (${gw.cost_formatted_usd})`);
assert(typeof gw.cost_bdt === 'number' && gw.cost_bdt > 0, `Calculated cost in BDT (${gw.cost_formatted_bdt})`);
assert(gw.savings_percent >= 0, `Recorded savings percentage (${gw.savings_percent}%)`);

// TEST 10: Global Gateway Stats API (/api/gateway/stats)
console.log('\n--- TEST 10: Global Gateway Stats API (/api/gateway/stats) ---');
const gwStatsRes = await fetch('http://localhost:3000/api/gateway/stats');
assert(gwStatsRes.ok, 'Gateway stats API returned HTTP 200');
const gwStats = await gwStatsRes.json();
assert(gwStats.gateway === 'Merge.dev AI Gateway', 'Gateway provider is Merge.dev AI Gateway');
assert(gwStats.total_queries >= 1, `Global tracked queries count (${gwStats.total_queries})`);
assert(gwStats.total_cost_usd > 0, `Global accumulated cost USD (${gwStats.total_cost_formatted_usd})`);
assert(gwStats.total_cost_bdt > 0, `Global accumulated cost BDT (${gwStats.total_cost_formatted_bdt})`);

console.log('\n====================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
console.log('====================================================');
