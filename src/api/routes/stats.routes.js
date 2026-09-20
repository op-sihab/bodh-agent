// Health, Gateway Metrics & Cache Stats Routes
import { Hono } from "hono";
import { appCache } from "../../core/cache.js";
import { ENV } from "../../config/env.js";
import { getGatewayGlobalStats } from "../../agent/loop/gateway-metrics.js";
import { globalCreditManager } from "../../agent/loop/credit-manager.js";

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
    gateway: getGatewayGlobalStats(),
    credits: globalCreditManager.getStatus(),
    timestamp: new Date().toISOString()
  });
});

statsRoutes.get("/gateway/stats", (c) => {
  return c.json(getGatewayGlobalStats());
});

statsRoutes.get("/credit/status", (c) => {
  return c.json(globalCreditManager.getStatus());
});

statsRoutes.post("/credit/reset", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const amount = typeof body.amount === "number" ? body.amount : (parseInt(body.amount, 10) >= 0 ? parseInt(body.amount, 10) : 500);
  return c.json(globalCreditManager.resetCredits(amount));
});
