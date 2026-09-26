import { runAgenticConversation } from "./src/agent-loop.js";

async function debug() {
  console.log("Starting runAgenticConversation...");
  await runAgenticConversation("গনিত এ কয়টা অধ্যায় আছে?", (event) => {
    console.log("EVENT:", event.type, event.content ? event.content.slice(0, 100) : "");
  });
  console.log("Finished runAgenticConversation.");
}

debug().catch(console.error);
