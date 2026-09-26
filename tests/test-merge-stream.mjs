const url = "https://api-gateway.merge.dev/v1/responses";
const apiKey = "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";

async function testStream() {
  const payload = {
    input: [
      {
        type: "message",
        role: "system",
        content: "You are a concise Bengali study assistant."
      },
      {
        type: "message",
        role: "user",
        content: "এসএসসি সাধারণ গণিতে মোট ১৭টি অধ্যায় আছে কি? এক লাইনে বলো।"
      }
    ],
    stream: true,
    include_routing_metadata: true,
    model: "openai/gpt-5.6-luna"
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
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
        if (raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw);
          console.log("Chunk type:", parsed.type || parsed.object, JSON.stringify(parsed).slice(0, 150));
        } catch(e) {}
      }
    }
  }
}

testStream().catch(console.error);
