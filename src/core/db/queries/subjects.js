// Subject and Chapter Database Queries
import { executeRawSql } from "../client.js";
import { appCache } from "../../cache.js";

// 1. Get All Subjects
export async function getSubjects() {
  const cacheKey = "db:subjects";
  const cached = appCache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true, durationMs: 0 };

  const { rows, durationMs } = await executeRawSql("SELECT id, name, slug, category FROM subjects ORDER BY name ASC;");
  appCache.set(cacheKey, rows, 3600);
  return { data: rows, fromCache: false, durationMs };
}

// 2. Get Chapters by Subject ID
export async function getChapters(subjectId = null) {
  const cacheKey = `db:chapters:${subjectId || "all"}`;
  const cached = appCache.get(cacheKey);
  if (cached) return { data: cached, fromCache: true, durationMs: 0 };

  const sql = subjectId
    ? `SELECT id, subject_id, name, order_num FROM chapters WHERE subject_id = '${subjectId.replace(/'/g, "''")}' ORDER BY CAST(order_num AS INTEGER) ASC;`
    : `SELECT id, subject_id, name, order_num FROM chapters ORDER BY subject_id, CAST(order_num AS INTEGER) ASC;`;

  const { rows, durationMs } = await executeRawSql(sql);
  appCache.set(cacheKey, rows, 1800);
  return { data: rows, fromCache: false, durationMs };
}
