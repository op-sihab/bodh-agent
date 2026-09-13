const url = "https://api-gateway.merge.dev/v1/responses";
const apiKey = "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";

async function testToolReturn() {
  const tools = [
    {
      type: "function",
      function: {
        name: "get_subject_chapters",
        description: "Get chapters for a subject",
        parameters: {
          type: "object",
          properties: { subject: { type: "string" } },
          required: ["subject"]
        }
      }
    }
  ];

  // Let's test Format A: OpenAI standard (role: tool, tool_call_id)
  const inputOpenAI = [
    { type: "message", role: "user", content: "গনিত এ কয়টা অধ্যায় আছে?" },
    {
      type: "message",
      role: "assistant",
      content: [{ type: "tool_use", id: "call_123", name: "get_subject_chapters", input: { subject: "ssc_general_math" } }]
    },
    {
      type: "message",
      role: "tool",
      tool_call_id: "call_123",
      content: JSON.stringify({ total_chapters: 17, chapters: ["বাস্তব সংখ্যা", "সেট ও ফাংশন", "বীজগাণিতিক রাশি"] })
    }
  ];

  console.log("Testing Format A (role: tool)...");
  let res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ input: inputOpenAI, tools, model: "openai/gpt-5.6-luna" })
  });
  console.log("Format A status:", res.status);
  let text = await res.text();
  console.log("Format A response:", text.slice(0, 300));

  if (!res.ok) {
    // Let's test Format B: Anthropic/Merge standard (type: tool_result)
    const inputAnthropic = [
      { type: "message", role: "user", content: "গনিত এ কয়টা অধ্যায় আছে?" },
      {
        type: "message",
        role: "assistant",
        content: [{ type: "tool_use", id: "call_123", name: "get_subject_chapters", input: { subject: "ssc_general_math" } }]
      },
      {
        type: "message",
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "call_123", content: JSON.stringify({ total_chapters: 17 }) }]
      }
    ];
    console.log("\nTesting Format B (type: tool_result)...");
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ input: inputAnthropic, tools, model: "openai/gpt-5.6-luna" })
    });
    console.log("Format B status:", res.status);
    text = await res.text();
    console.log("Format B response:", text.slice(0, 300));
  }
}

testToolReturn().catch(console.error);
