const url = "https://api.fireworks.ai/inference/v1/chat/completions";
const apiKey = "fw_FvExFEpV6HujJDKnuS86Fp";

const modelsToTest = [
  "accounts/fireworks/models/deepseek-v3",
  "accounts/fireworks/models/deepseek-r1",
  "accounts/fireworks/models/deepseek-v4p1-flash"
];

async function main() {
  for (const model of modelsToTest) {
    console.log(`\nTesting: ${model}`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 150,
        messages: [{ role: "user", content: "হাই, কেমন আছো? বাংলায় এক বাক্যে বলো।" }]
      })
    });
    console.log("Status:", res.status);
    const body = await res.text();
    console.log("Output:", body.slice(0, 350));
    if (res.ok) {
      console.log(`>>> SUCCESS with ${model} <<<`);
      break;
    }
  }
}

main().catch(console.error);
