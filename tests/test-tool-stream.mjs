const MERGE_API_URL = "https://api-gateway.merge.dev/v1/responses";
const MERGE_API_KEY = "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";

async function testStreamingAfterTool() {
  const inputWithToolResult = [
    { type: "message", role: "system", content: "You are a concise Bengali study tutor." },
    { type: "message", role: "user", content: "গনিত এ কয়টা অধ্যায় আছে?" },
    {
      type: "message",
      role: "assistant",
      content: [{ type: "tool_use", id: "call_1", name: "get_subject_chapters", input: { subject: "ssc_general_math" } }]
    },
    {
      type: "message",
      role: "user",
      content: [{
        type: "tool_result",
        tool_use_id: "call_1",
        content: JSON.stringify({
          subject: "সাধারণ গণিত",
          total_chapters: 17,
          chapters: ["১. বাস্তব সংখ্যা", "২. সেট ও ফাংশন", "৩. বীজগাণিতিক রাশি"]
        })
      }]
    }
  ];

  console.log("Sending stream request after tool result...");
  const res = await fetch(MERGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MERGE_API_KEY}`
    },
    body: JSON.stringify({
      input: inputWithToolResult,
      stream: true,
      model: "openai/gpt-5.6-luna"
    })
  });

  console.log("Status:", res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value);
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw);
          const deltaText = parsed.output?.[0]?.content?.[0]?.text;
          if (deltaText) {
            process.stdout.write(deltaText);
          }
        } catch(e) {}
      }
    }
  }
  console.log("\n--- Streaming Complete ---");
}

testStreamingAfterTool().catch(console.error);
