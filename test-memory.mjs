const MERGE_API_URL = "https://api-gateway.merge.dev/v1/responses";
const MERGE_API_KEY = "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";

async function testMemory() {
  const history = [
    { type: "message", role: "system", content: "You are a smart Bengali study mentor." },
    { type: "message", role: "user", content: "গনিত এ কয়টা অধ্যায় আছে?" },
    { type: "message", role: "assistant", content: "সাধারণ গণিতে ১৭টি অধ্যায় আছে। যেমন বাস্তব সংখ্যা, সেট ও ফাংশন, বীজগাণিতিক রাশি ইত্যাদি।" },
    { type: "message", role: "user", content: "এটার ৩ নম্বর অধ্যায়ে কী কী সূত্র আছে?" }
  ];

  console.log("Testing memory with follow-up question...");
  const res = await fetch(MERGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MERGE_API_KEY}`
    },
    body: JSON.stringify({
      input: history,
      stream: false,
      model: "openai/gpt-5.6-luna"
    })
  });

  const data = await res.json();
  console.log("Response:", data.output?.[0]?.content?.[0]?.text);
}

testMemory().catch(console.error);
