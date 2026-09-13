import { streamLunaRag } from "./src/luna-rag.js";

// Let's test how agentic prompt responds to "গনিত এ কয়টা অধ্যায় আছে?"
const testQuery = "গনিত এ কয়টা অধ্যায় আছে?";
console.log("Testing query:", testQuery);

async function run() {
  await streamLunaRag(testQuery, (chunk) => {
    if (chunk.type === "content") {
      process.stdout.write(chunk.delta);
    }
    if (chunk.type === "done") {
      console.log("\n\nDone in", chunk.latencyMs, "ms");
    }
  });
}

run().catch(console.error);
