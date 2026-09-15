// Health & Cache Stats Routes
import { Hono } from "hono";
import { appCache } from "../../core/cache.js";
import { ENV } from "../../config/env.js";

export const statsRoutes = new Hono();

statsRoutes.get("/stats", (c) => {
  return c.json({
    status: "online",
    name: ENV.APP_NAME,
    tagline: ENV.APP_TAGLINE,
    mode: ENV.APP_MODE,
    model: `${ENV.MODEL_NAME} (Merge.dev Gateway)`,
    database: "Turso LibSQL (AWS ap-south-1 Mumbai)",
    cache: appCache.getStats(),
    timestamp: new Date().toISOString()
  });
});
