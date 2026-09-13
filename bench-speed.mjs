const url = "https://api.fireworks.ai/inference/v1/chat/completions";
const apiKey = "fw_FvExFEpV6HujJDKnuS86Fp";

async function test(label, extraParams = {}) {
  console.time(label);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "accounts/fireworks/models/deepseek-v4p1-flash",
      max_tokens: 400,
      messages: [
        { role: "system", content: "You are an expert tutor. Answer directly in Bengali without unnecessary preamble." },
        { role: "user", content: "গতির প্রধান তিনটি সমীকরণ বাংলায় লিখো।" }
      ],
      ...extraParams
    })
  });
  const data = await res.json();
  console.timeEnd(label);
  const choice = data.choices?.[0]?.message;
  console.log("Reasoning length:", choice?.reasoning_content?.length || 0);
  console.log("Answer preview:", choice?.content?.slice(0, 150));
}

async function run() {
  await test("Default Flash");
  await test("With reasoning effort none/low", { reasoning_effort: "low" });
}

run();
