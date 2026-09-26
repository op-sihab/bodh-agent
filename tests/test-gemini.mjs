// Interactive Terminal Chat: Gemini + Cloudflare Worker MCQ Tutor
import readline from "node:readline";

const WORKER_URL = "https://mcq-ai-tutor-api.ms-sihab-543.workers.dev/api/chat";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("\n========================================================");
console.log("🎓 MCQ AI Tutor — Live Cloudflare Edge Terminal Chat");
console.log("========================================================");
console.log("টিপস: আপনি বাংলায় যেকোনো প্রশ্ন করতে পারেন, যেমন:");
console.log("• 'গতির প্রশ্ন বোর্ডে কয়বার আসছে?'");
console.log("• 'ঢাকা বোর্ডের প্রশ্ন দেখাও'");
console.log("• 'আমাকে একটা সৃজনশীল প্রশ্ন দাও'");
console.log("• 'exit' লিখলে বন্ধ হবে।\n");

function promptUser() {
  rl.question("স্টুডেন্ট: ", async (question) => {
    const trimmed = question.trim();
    if (trimmed.toLowerCase() === "exit") {
      rl.close();
      return;
    }

    if (!trimmed) {
      promptUser();
      return;
    }

    try {
      const start = performance.now();
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed })
      });
      const data = await res.json();
      const duration = Math.round(performance.now() - start);

      console.log(`\n👨‍🏫 মেন্টর ভাইয়া [${duration}ms ${data.fromCache ? '⚡Cached' : '🌐Edge'}]:`);
      console.log(data.reply);
      console.log("\n--------------------------------------------------------\n");
    } catch (err) {
      console.error("\nত্রুটি:", err.message, "\n");
    }

    promptUser();
  });
}

promptUser();
