// Turso LibSQL Database Client via Pipeline API
import { ENV } from "../../config/env.js";

export async function executeRawSql(sql) {
  const startTime = performance.now();
  const url = process.env.TURSO_DATABASE_URL || ENV.TURSO_URL;
  const token = process.env.TURSO_AUTH_TOKEN || ENV.TURSO_TOKEN;

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

  const durationMs = Math.round(performance.now() - startTime);
  return { rows, durationMs };
}
