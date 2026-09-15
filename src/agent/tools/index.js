// Unified Agent Tools Layer
export { AGENT_TOOLS } from "./definitions.js";
export { executeAgentTool, prewarmQuestionPools, triggerPrewarm } from "./executor.js";
export { getAllChaptersCached, findChapterCached } from "./helpers.js";

// Re-export normalizers and config helpers for backward compatibility
export {
  TAG_MAP,
  TAG_MAP_UPPER,
  BN_DIGITS,
  toBengaliNumber,
  formatTag
} from "../../config/tag-map.js";

export {
  BOARD_MAP,
  normalizeBoard
} from "../../config/board-map.js";

export {
  normalizeSubject,
  SUBJECT_DISPLAY_NAMES,
  toBnDigits
} from "../../config/subject-map.js";

export {
  extractChapterNum,
  normalizeTopic,
  parseYearFilter,
  buildYearSqlConditions,
  CHAPTER_CONCEPTS_MAP,
  getChapterConceptKeywords,
  extractChapterKeywords,
  RECENT_YEAR_ORDER_BY,
  normalizeAcademicString
} from "../../config/chapter-map.js";
