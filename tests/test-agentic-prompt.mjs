const MERGE_API_URL = "https://api-gateway.merge.dev/v1/responses";
const MERGE_API_KEY = "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";
const MODEL_NAME = "openai/gpt-5.6-luna";

const SYSTEM_PROMPT = `
তুমি "প্রাইম" — একজন অত্যন্ত বুদ্ধিমান, বাস্তববাদী ও প্রো-অ্যাক্টিভ (Proactive) একাডেমিক মেন্টর ও বড় ভাইয়া।
তোমার ভেতরে কোনো রোবোটিক ভাব থাকবে না। তুমি স্বাভাবিক মানুষের মতো ভাববে: "স্টুডেন্ট এই কথাটা কেন জিজ্ঞেস করল? তার আসল সমস্যা কোথায় এবং আমি কীভাবে তাকে এক ধাপ এগিয়ে নিয়ে যেতে পারি?"

তোমার এজেন্টিক উত্তরের ফ্রেমওয়ার্ক (Agentic 3-Step Flow):
১. 【সরাসরি সঠিক তথ্য】: কোনো ভণিতা ছাড়া প্রথম লাইনেই আসল তথ্যটি দাও।
২. 【এক্সাম ইনসাইট】: ডাটাবেসের প্রেক্ষাপটে ১-২ লাইনে জানিয়ে দাও এটা কেন জরুরি (যেমন: কোন অধ্যায় থেকে বেশি প্রশ্ন আসে, বা বোর্ডে এটার গুরুত্ব কেমন)।
৩. 【প্রো-অ্যাক্টিভ নেক্সট মুভ】: থেমে যাবে না! স্টুডেন্টকে পরবর্তী ধাপে এগিয়ে নেওয়ার জন্য স্পষ্ট ১-২টি বিকল্প বা অ্যাকশন অফার করো।

নির্দেশনা:
- ভাষা হবে অত্যন্ত সাবলীল, প্রাঞ্জল ও গতিশীল বাংলা।
- কোনো কৃত্রিম বড় ভূমিকা বা মুখস্থ ডায়লগ দেবে না।
`;

async function testPrompt(userQuery, ragData) {
  console.log(`\n================================`);
  console.log(`Testing Query: "${userQuery}"`);
  console.log(`================================`);

  const payload = {
    input: [
      {
        type: "message",
        role: "system",
        content: `${SYSTEM_PROMPT}\n\n[DATABASE CONTEXT / RAG DATA]:\n${ragData}`
      },
      {
        type: "message",
        role: "user",
        content: userQuery
      }
    ],
    stream: false,
    include_routing_metadata: true,
    model: MODEL_NAME
  };

  const res = await fetch(MERGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MERGE_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  const text = data.output?.[0]?.content?.[0]?.text;
  console.log(text);
}

async function main() {
  await testPrompt(
    "গনিত এ কয়টা অধ্যায় আছে?",
    "【সাধারণ গণিত সিলেবাস ও অধ্যায় তথ্য】\nমোট অধ্যায়: ১৭টি।\nঅধ্যায়সমূহ: বাস্তব সংখ্যা, সেট ও ফাংশন, বীজগাণিতিক রাশি, ব্যবহারিক জ্যামিতি, সূচক ও লগারিদম, এক চলকবিশিষ্ট সমীকরণ, ত্রিকোণমিতিক অনুপাত, রেখা কোণ ও ত্রিভুজ, বৃত্ত, দূরত্ব ও উচ্চতা, বীজগাণিতিক অনুপাত, সরল সহসমীকরণ, সসীম ধারা, অনুপাত ও প্রতিসমতা, ক্ষেত্রফল সম্পর্কিত উপপাদ্য, পরিমিতি, পরিসংখ্যান।"
  );

  await testPrompt(
    "গতির প্রশ্ন বোর্ডে কয়বার আসছে?",
    "【বোর্ড পুনরাবৃত্তি পরিসংখ্যান (Frequency Analysis)】\nটপিক: 'গতি'\nআমাদের ডাটাবেসে মোট প্রশ্ন সংখ্যা: ৫৬২টি।\nবোর্ড ট্যাগসমূহ: RCC 25 (14 বার), BNMPC 25 (8 বার), SB 25 (7 বার), CTG.B 19 (7 বার)"
  );
}

main().catch(console.error);
