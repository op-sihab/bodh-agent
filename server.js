// BODH AI (বোধ) - Senior Production HTTP Server Entrypoint
import { serve } from "@hono/node-server";
import { createApp } from "./src/api/app.js";
import { ENV } from "./src/config/env.js";

const app = createApp();
const PORT = process.env.PORT || ENV.PORT || 3000;

console.log(`🚀 BODH AI (বোধ) starting on port ${PORT}...`);
serve({
  fetch: app.fetch,
  port: PORT
});
console.log(`✨ BODH AI (বোধ) ready at http://localhost:${PORT}`);
