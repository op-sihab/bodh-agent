// Static UI and Asset Routes
import { Hono } from "hono";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Find project root directory relative to this file (../../..)
const projectRoot = path.resolve(__dirname, "../../..");

export const staticRoutes = new Hono();

const mimeMap = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json"
};

function serveFile(subDir, fileName, c) {
  // Prevent directory traversal
  const safeName = path.basename(fileName);
  const filePath = path.join(projectRoot, "public", subDir, safeName);
  if (fs.existsSync(filePath)) {
    const ext = path.extname(safeName).toLowerCase();
    const mime = mimeMap[ext] || "application/octet-stream";
    return c.body(fs.readFileSync(filePath), 200, { "Content-Type": mime });
  }
  return c.notFound();
}

// 1. Web Test UI
staticRoutes.get("/", (c) => {
  const htmlPath = path.join(projectRoot, "public", "index.html");
  if (fs.existsSync(htmlPath)) {
    return c.html(fs.readFileSync(htmlPath, "utf-8"));
  }
  return c.text("BODH AI (Autonomous Academic Intelligence) running!");
});

// 2. Static Assets (SVG Icons & Logos)
staticRoutes.get("/assets/:file", (c) => serveFile("assets", c.req.param("file"), c));

// 3. Static CSS Modules
staticRoutes.get("/css/:file", (c) => serveFile("css", c.req.param("file"), c));

// 4. Static JS Modules
staticRoutes.get("/js/:file", (c) => serveFile("js", c.req.param("file"), c));

