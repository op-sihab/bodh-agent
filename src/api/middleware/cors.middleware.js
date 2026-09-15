// CORS Middleware
import { cors } from "hono/cors";

export function corsMiddleware() {
  return cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  });
}
