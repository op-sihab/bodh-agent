// BODH Database Client — Dual Engine: Ultra-Fast Local SQLite Master (299k questions) + Turso Fallback
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { ENV } from "../../config/env.js";

const localDbPath = path.resolve(process.cwd(), "database", "hsc_master.db");
let localDb = null;

try {
  if (fs.existsSync(localDbPath)) {
    localDb = new DatabaseSync(localDbPath);
    localDb.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
    console.log("⚡ [BODH Database] Local HSC SQLite Master Online (299,432 Questions)");
  }
} catch (e) {
  console.warn("⚠️ [BODH Database] Failed to initialize local SQLite, using cloud fallback:", e.message);
}

export async function executeRawSql(sql) {
  const startTime = performance.now();

  // 1. Try Local SQLite First (sub-millisecond latency, zero cloud quota limits)
  if (localDb && !sql.includes("vector_distance_cos")) {
    try {
      const trimmed = sql.trim();
      if (trimmed.toUpperCase().startsWith("SELECT") || trimmed.toUpperCase().startsWith("PRAGMA")) {
        const rows = localDb.prepare(trimmed).all();
        const durationMs = Math.max(1, Math.round(performance.now() - startTime));
        return { rows, durationMs, source: "local_sqlite" };
      } else {
        localDb.exec(trimmed);
        const durationMs = Math.max(1, Math.round(performance.now() - startTime));
        return { rows: [], durationMs, source: "local_sqlite" };
      }
    } catch (localErr) {
      console.warn(`[Local SQLite] Query failed (${localErr.message}), falling back to remote...`);
    }
  }

  // 2. Cloud Fallback (Turso LibSQL)
  const primaryUrl = process.env.TURSO_DATABASE_URL || ENV.TURSO_URL;
  const primaryToken = process.env.TURSO_AUTH_TOKEN || ENV.TURSO_TOKEN;
  const fallbackUrl = "https://mcq-db-primekeeper.aws-ap-south-1.turso.io/v2/pipeline";
  const fallbackToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxOTE3MjgsImlkIjoiMDFhMDkwMzAtMDgwMS03OGI1LWFjZDUtMzUyNDEzYzgwYzVlIiwia2lkIjoiVXJNT2ZOeG1ERlRQNk5pNS1CSHlTZ0tZYWVrdmVZQi1lTGx6RW92c1picyIsInJpZCI6IjMxNTlkN2YzLTg5NTAtNDc1Yi05OTZhLWE2OWJkODg4ZWViMSJ9.SJMGIVf60N0QNFYaEkgph3BEAblDo0IrvKpyns6uJOUvWccx4xFvexuAgOYo5FSpyaP1RMACzEkg03Q1jNdUCg";

  async function queryDb(url, token) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql } },
          { type: "close" }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Turso HTTP ${response.status}: ${err}`);
    }

    const data = await response.json();
    const res = data.results?.[0];
    if (!res || res.type === "error") {
      throw new Error(res?.error?.message || "Unknown database error");
    }

    const result = res.response.result;
    const cols = result.cols.map(c => c.name);
    const rows = result.rows.map(r => {
      const obj = {};
      r.forEach((val, i) => {
        obj[cols[i]] = val.value;
      });
      return obj;
    });
    return rows;
  }

  let rows;
  try {
    rows = await queryDb(primaryUrl, primaryToken);
  } catch (err) {
    if (primaryUrl !== fallbackUrl && (err.message.includes("blocked") || err.message.includes("forbidden") || err.message.includes("HTTP"))) {
      console.warn(`[Turso Client] Primary cluster unavailable (${err.message}). Switched to standby cluster automatically.`);
      rows = await queryDb(fallbackUrl, fallbackToken);
    } else {
      throw err;
    }
  }

  const durationMs = Math.round(performance.now() - startTime);
  return { rows, durationMs, source: "turso" };
}
