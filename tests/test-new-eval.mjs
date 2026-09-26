// New Comprehensive Verification Test for Subject-Lock & Token-Optimization
// Tests greeting token burn, subject lock persistence, and authentic board question routing.
import { classifyIntent, getScopedTools, INTENT_TYPES, getMaxTokensForIntent } from './src/agent/loop/router.js';
import { runAgenticConversation } from './src/agent/loop/runner.js';

let totalTests = 0;
let passedTests = 0;

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

console.log('====================================================');
console.log('🧪 RUNNING NEW SYSTEM EVALUATION: SUBJECT PERSISTENCE & TOKEN TELEMETRY');
console.log('====================================================\n');

// 1. UNIT TEST: Router Greeting Detection
console.log('--- TEST GROUP 1: Fast Intent Classification & 0-Tool Scoping ---');
const greetings = ['hi', 'hello', 'hey', 'হাই', 'হ্যালো', 'সালাম', 'আসসালামু আলাইকুম', 'kemon acho', 'hi bodh', 'হ্যালো ভাই'];
for (const g of greetings) {
  const intent = classifyIntent(g);
  assert(intent === INTENT_TYPES.GREETING, `Greeting '${g}' classified as INTENT_TYPES.GREETING`);
  const tools = getScopedTools(intent);
  assert(tools === undefined, `Greeting '${g}' has ZERO tool overhead (undefined)`);
}

const boardReqs = ['bby dhaka board er qs dew', 'dhaka board er question', 'ঢাকা বোর্ডের প্রশ্ন দাও', 'চট্টগ্রাম বোর্ডের mcq'];
for (const b of boardReqs) {
  const intent = classifyIntent(b);
  assert(intent === INTENT_TYPES.BOARD_QUESTIONS, `Board query '${b}' classified as BOARD_QUESTIONS`);
  const tools = getScopedTools(intent);
  assert(tools && tools.length > 0, `Board query '${b}' has scoped tool schemas`);
}

// 2. LIVE AGENT TEST: Greeting with Active Chemistry (Zero Subject Confusion & Low Token Burn)
console.log('\n--- TEST GROUP 2: Live Agent Greeting with Active Chemistry (⚗️ রসায়ন) ---');
let chemGreetingTokens = 0;
let chemGreetingText = '';
let chemToolsCalled = [];

await runAgenticConversation(
  'hi',
  async (event) => {
    if (event.type === 'tool_start') {
      chemToolsCalled.push(event.tool);
    }
    if (event.type === 'content_delta') {
      chemGreetingText += event.delta;
    }
    if (event.type === 'done') {
      chemGreetingTokens = event.gatewayTelemetry?.total_tokens || 0;
    }
  },
  {
    state: { subject_id: 'ssc_chemistry', subject_name: 'রসায়ন' },
    history: []
  }
);

console.log(`\n  [Chemistry Greeting Output]:\n  ${chemGreetingText.trim()}`);
console.log(`  [Total Tokens Consumed]: ${chemGreetingTokens}`);
console.log(`  [Tools Called]: ${chemToolsCalled.length === 0 ? 'None (0 tools)' : chemToolsCalled.join(', ')}`);

assert(chemToolsCalled.length === 0, 'Zero tools called during simple greeting');
assert(chemGreetingTokens > 0 && chemGreetingTokens < 800, `Token consumption (${chemGreetingTokens}) is drastically lower than old 2526 tokens`);
assert(!chemGreetingText.includes('কোন বিষয়'), 'Output does NOT ask "কোন বিষয়"');
assert(!chemGreetingText.includes('অধ্যায় বা বিষয়'), 'Output does NOT ask "অধ্যায় বা বিষয়"');
assert(chemGreetingText.includes('রসায়ন'), 'Output recognizes and mentions the active subject "রসায়ন"');

// 3. LIVE AGENT TEST: Board Questions with Active Physics (⚡ পদার্থবিজ্ঞান)
console.log('\n--- TEST GROUP 3: Live Agent Board Question with Active Physics (⚡ পদার্থবিজ্ঞান) ---');
let physBoardText = '';
let physToolsCalled = [];
let physToolArgs = null;

await runAgenticConversation(
  'bby dhaka board er qs dew',
  async (event) => {
    if (event.type === 'tool_start') {
      physToolsCalled.push(event.tool);
      physToolArgs = event.args;
    }
    if (event.type === 'content_delta') {
      physBoardText += event.delta;
    }
  },
  {
    state: { subject_id: 'ssc_physics', subject_name: 'পদার্থবিজ্ঞান' },
    history: []
  }
);

console.log(`\n  [Physics Board Output Snippet]:\n  ${physBoardText.trim().slice(0, 300)}...`);
console.log(`  [Tools Called]: ${physToolsCalled.join(', ')}`);

assert(physToolsCalled.includes('get_board_exam_questions'), 'get_board_exam_questions tool was executed');
assert(physToolArgs?.subject === 'ssc_physics' || physToolArgs?.subject === 'পদার্থবিজ্ঞান', `Tool argument subject was set as Physics ('ssc_physics' or 'পদার্থবিজ্ঞান') (got: ${physToolArgs?.subject})`);
assert(!physBoardText.includes('তুমি কোন বিষয়ের প্রশ্ন চাও'), 'Does NOT ask "তুমি কোন বিষয়ের প্রশ্ন চাও"');
assert(!physBoardText.includes('বিষয় লিখে দাও'), 'Does NOT ask student to specify subject');

// 4. LIVE AGENT TEST: Full 2026 Dhaka Board Math Exam Set (25 MCQs)
console.log('\n--- TEST GROUP 4: Full 2026 Dhaka Board Math Exam (qs gula sob dew to) ---');
const mathPrompt = 'dhaka baord 2026সাধারণ গণিত qs gula sob dew to';
const mathIntent = classifyIntent(mathPrompt);
assert(mathIntent === INTENT_TYPES.BOARD_QUESTIONS, `Query with typo ('baord') and combined text classified as BOARD_QUESTIONS`);

let mathBoardText = '';
let mathToolsCalled = [];
let mathToolArgs = null;
let mathToolResults = [];

await runAgenticConversation(
  mathPrompt,
  async (event) => {
    if (event.type === 'tool_start') {
      mathToolsCalled.push(event.tool);
      mathToolArgs = event.args;
    }
    if (event.type === 'tool_done') {
      mathToolResults.push(event.result);
    }
    if (event.type === 'content_delta') {
      mathBoardText += event.delta;
    }
  },
  {
    state: { subject_id: 'ssc_general_math', subject_name: 'সাধারণ গণিত' },
    history: []
  }
);

console.log(`\n  [Tools Called]: ${mathToolsCalled.join(', ')}`);
console.log(`  [Tool Args]:`, JSON.stringify(mathToolArgs));
const sampleMcqs = mathToolResults.find(r => r?.sample_mcq)?.sample_mcq || [];
console.log(`  [Background Loaded MCQs]: ${sampleMcqs.length} MCQs ready for exam`);
console.log(`  [Agent Response]:\n  ${mathBoardText.trim()}`);

assert(mathToolsCalled.includes('get_board_exam_questions'), 'get_board_exam_questions was executed for full exam query');
assert(mathToolArgs?.mode === 'full_exam' || mathToolArgs?.count >= 20, 'Tool was invoked in full_exam mode or count >= 20');
assert(!mathBoardText.includes('পাওয়া যাচ্ছে না'), 'Does NOT claim question paper is not available');
assert(!mathBoardText.includes('বানানো প্রশ্ন'), 'Does NOT claim question is fabricated/unavailable');
assert(sampleMcqs.length >= 25, `Retrieved full authentic 25-30 question set from database in background (${sampleMcqs.length} MCQs loaded)`);

// --- TEST GROUP 5: Exam Completion Report & Debrief (0 Tools & Rich Structured Feedback) ---
console.log('\n--- TEST GROUP 5: Exam Completion Report & Debrief (0 Tools & Rich Structured Feedback) ---');
const examReportPrompt = `পরীক্ষা সমাপ্তি ও ফলাফল রিপোর্ট:
বিষয়: রসায়ন (ঢাকা বোর্ড ২০২৬ পূর্ণাঙ্গ প্রশ্নপত্র)
মোট প্রশ্ন: ২৫টি | সঠিক হয়েছে: ০টি | ভুল হয়েছে: ২টি | বাদ দেওয়া হয়েছে: ২৩টি

ভুল হওয়া প্রশ্নসমূহ:
- প্রশ্ন ১: "10 g CaCO3-এর মোল সংখ্যা কত?" | আমার উত্তর: (খ), সঠিক উত্তর: (ক)
- প্রশ্ন ২: "কোন যৌগে আর্গনের ইলেকট্রন বিন্যাস বিদ্যমান?" | আমার উত্তর: (ক), সঠিক উত্তর: (খ)

আমি পরীক্ষা শেষ করে চ্যাটে ফিরে এসেছি। অনুগ্রহ করে আমার রেজাল্ট রিপোর্ট দাও এবং বলো আমি কি একটা একটা করে ভুলগুলো ক্লিয়ার করতে চাই কিনা।`;

const auditIntent = classifyIntent(examReportPrompt);
assert(auditIntent === INTENT_TYPES.EXAM_AUDIT_REVIEW, `Exam report classified as INTENT_TYPES.EXAM_AUDIT_REVIEW (got: ${auditIntent})`);
const auditTools = getScopedTools(auditIntent);
assert(auditTools === undefined, 'Exam audit review has ZERO tools overhead (undefined)');

let auditToolsCalled = [];
let auditResponseText = '';

await runAgenticConversation(
  examReportPrompt,
  async (event) => {
    if (event.type === 'tool_start') {
      auditToolsCalled.push(event.tool);
    }
    if (event.type === 'content_delta') {
      auditResponseText += event.delta;
    }
  },
  {
    state: { subject_id: 'ssc_chemistry', subject_name: 'রসায়ন' },
    history: []
  }
);

console.log(`\n  [Tools Called During Audit]: ${auditToolsCalled.join(', ') || 'None (0 tools)'}`);
console.log(`  [Audit Response Snippet]:\n  ${auditResponseText.trim().slice(0, 350)}...`);

assert(auditToolsCalled.length === 0, 'ZERO tools called during exam result debrief (No unwanted question fetches!)');
assert(auditResponseText.includes('ফলাফল') || auditResponseText.includes('রসায়ন'), 'Output addresses exam results');
assert(/📊|🎯|💡|❌|📈/.test(auditResponseText), 'Output includes rich structured emojis as requested');
assert(auditResponseText.includes('|') && auditResponseText.includes('---'), 'Output presents result analysis as a Markdown table');

console.log('\n====================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
console.log('====================================================\n');

