const url = "https://api.fireworks.ai/inference/v1/chat/completions";
const apiKey = "fw_FvExFEpV6HujJDKnuS86Fp";

async function testStream() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "accounts/fireworks/models/deepseek-v4p1-flash",
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: "You are a helpful Bengali physics teacher." },
        { role: "user", content: "অভিকর্ষজ ত্বরণ g এর মান ঢাকায় কত এবং কেন?" }
      ]
    })
  });

  console.log("Stream status:", res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let totalText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const json = JSON.parse(line.substring(6));
          const delta = json.choices?.[0]?.delta;
          if (delta?.reasoning_content) {
            process.stdout.write(`[THINK: ${delta.reasoning_content}]`);
          }
          if (delta?.content) {
            process.stdout.write(delta.content);
            totalText += delta.content;
          }
        } catch (e) {}
      }
    }
  }
  console.log("\n--- Stream Finished ---");
}

testStream().catch(console.error);
