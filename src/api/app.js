// Main Application Builder & Route Composition
import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.middleware.js";
import { timingMiddleware } from "./middleware/timing.middleware.js";
import { staticRoutes } from "./routes/static.routes.js";
import { statsRoutes } from "./routes/stats.routes.js";
import { chatRoutes } from "./routes/chat.routes.js";
import { academicRoutes } from "./routes/academic.routes.js";

export function createApp() {
  const app = new Hono();

  // 1. Global Middleware
  app.use("*", corsMiddleware());
  app.use("*", timingMiddleware);

  // 2. Mount Static UI & Assets
  app.route("/", staticRoutes);

  // 3. Mount API Routes under /api prefix
  app.route("/api", statsRoutes);
  app.route("/api", chatRoutes);
  app.route("/api", academicRoutes);

  return app;
}
