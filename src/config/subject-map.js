// HSC Academic Subject Map & Database Resolver
// Pure model-driven architecture: clean mapping to SQLite database entities

export const HSC_SUBJECTS = {
  hsc_physics: {
    key: "hsc_physics",
    name: "পদার্থবিজ্ঞান",
    dbIds: ["phys_1", "phys_2"]
  },
  hsc_chemistry: {
    key: "hsc_chemistry",
    name: "রসায়ন",
    dbIds: ["chem_1", "chem_2"]
  },
  hsc_math: {
    key: "hsc_math",
    name: "উচ্চতর গণিত",
    dbIds: ["math_1", "math_2"]
  },
  hsc_biology: {
    key: "hsc_biology",
    name: "জীববিজ্ঞান",
    dbIds: ["bio_1", "bio_2"]
  },
  hsc_ict: {
    key: "hsc_ict",
    name: "তথ্য ও যোগাযোগ প্রযুক্তি",
    dbIds: ["ict"]
  },
  hsc_bangla: {
    key: "hsc_bangla",
    name: "বাংলা",
    dbIds: ["bangla_1", "KJ8CZWa7zU", "4bM6-nK47k"]
  },
  hsc_english: {
    key: "hsc_english",
    name: "ইংরেজি",
    dbIds: ["fIt1mZ0AW1", "JtLdMQGSi3", "r7dj8eEqhG", "InnRLd", "6vXYtS"]
  },
  hsc_accounting: {
    key: "hsc_accounting",
    name: "হিসাববিজ্ঞান",
    dbIds: ["accountingxx_1", "accounting_2"]
  },
  hsc_economics: {
    key: "hsc_economics",
    name: "অর্থনীতি",
    dbIds: ["economics_1", "economics_2"]
  },
  hsc_management: {
    key: "hsc_management",
    name: "ব্যবসায় সংগঠন ও ব্যবস্থাপনা",
    dbIds: ["management_1", "management_2"]
  },
  hsc_finance: {
    key: "hsc_finance",
    name: "ফিন্যান্স ও ব্যাংকিং",
    dbIds: ["finance_2"]
  }
};

// Subject display names for UI & prompts
export const SUBJECT_DISPLAY_NAMES = Object.fromEntries(
  Object.entries(HSC_SUBJECTS).map(([k, v]) => [k, v.name])
);

// Bengali digit formatter
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function toBnDigits(num) {
  if (num === undefined || num === null) return "";
  return String(num).replace(/[0-9]/g, d => BN_DIGITS[d] || d);
}

// Clean canonical subject resolver (trusts Jev & LLM classification without fragile regex ladders)
const DIRECT_LOOKUP = {
  physics: "hsc_physics",
  phys: "hsc_physics",
  পদার্থবিজ্ঞান: "hsc_physics",
  পদার্থ: "hsc_physics",
  chemistry: "hsc_chemistry",
  chem: "hsc_chemistry",
  রসায়ন: "hsc_chemistry",
  রসায়ন: "hsc_chemistry",
  math: "hsc_math",
  higher_math: "hsc_math",
  গণিত: "hsc_math",
  biology: "hsc_biology",
  bio: "hsc_biology",
  জীববিজ্ঞান: "hsc_biology",
  ict: "hsc_ict",
  তথ্য: "hsc_ict",
  bangla: "hsc_bangla",
  বাংলা: "hsc_bangla",
  english: "hsc_english",
  ইংরেজি: "hsc_english",
  accounting: "hsc_accounting",
  হিসাববিজ্ঞান: "hsc_accounting",
  economics: "hsc_economics",
  অর্থনীতি: "hsc_economics",
  management: "hsc_management",
  ব্যবস্থাপনা: "hsc_management",
  finance: "hsc_finance",
  ফিন্যান্স: "hsc_finance"
};

export function normalizeSubject(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim().replace(/^ssc_/, "hsc_");

  if (HSC_SUBJECTS[s]) return s;

  // Direct dictionary check
  if (DIRECT_LOOKUP[s]) return DIRECT_LOOKUP[s];

  // Simple token scan
  for (const [key, canonical] of Object.entries(DIRECT_LOOKUP)) {
    if (s.includes(key)) return canonical;
  }

  return null;
}

/**
 * Maps canonical subject IDs to actual DB questions.subject_id values
 */
export function getDbSubjectList(subjectId) {
  if (!subjectId) return [];
  const canonical = normalizeSubject(subjectId) || subjectId;
  const entry = HSC_SUBJECTS[canonical];
  if (entry) return entry.dbIds;

  const s = String(subjectId).toLowerCase();
  for (const [key, data] of Object.entries(HSC_SUBJECTS)) {
    if (s.includes(key.replace("hsc_", ""))) return data.dbIds;
  }
  return [subjectId];
}

export function buildDbSubjectCondition(subjectId, column = "subject_id") {
  const list = getDbSubjectList(subjectId);
  if (!list || list.length === 0) return "";
  if (list.length === 1) return `${column} = '${list[0]}'`;
  return `${column} IN (${list.map(s => `'${s}'`).join(", ")})`;
}
