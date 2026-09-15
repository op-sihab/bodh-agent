// Static UI and Asset Routes
import { Hono } from "hono";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Find project root directory relative to this file (../../..)
const projectRoot = path.resolve(__dirname, "../../..");

export const staticRoutes = new Hono();

// 1. Web Test UI
staticRoutes.get("/", (c) => {
  const htmlPath = path.join(projectRoot, "public", "index.html");
  if (fs.existsSync(htmlPath)) {
    return c.html(fs.readFileSync(htmlPath, "utf-8"));
  }
  return c.text("BODH AI (Autonomous Academic Intelligence) running!");
});

// 2. Static Assets (SVG Icons & Logos)
staticRoutes.get("/assets/:file", (c) => {
  const fileName = c.req.param("file");
  const filePath = path.join(projectRoot, "public", "assets", fileName);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeMap = {
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".webp": "image/webp",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".js": "application/javascript",
      ".css": "text/css"
    };
    const mime = mimeMap[ext] || "application/octet-stream";
    return c.body(fs.readFileSync(filePath), 200, { "Content-Type": mime });
  }
  return c.notFound();
});
