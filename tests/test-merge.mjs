const url = "https://api-gateway.merge.dev/v1/responses";
const apiKey = "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";

async function main() {
  const payload = {
    input: [
      {
        type: "message",
        role: "user",
        content: "বলো তো পদার্থবিজ্ঞানে কয়টা অধ্যায় আছে?"
      }
    ],
    stream: false,
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
  const data = await res.text();
  console.log("Response:", data);
}

main().catch(console.error);
