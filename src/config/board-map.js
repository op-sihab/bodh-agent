// Education Board Normalization Mapping
export const BOARD_MAP = {
  "ঢাকা": "DB", "dhaka": "DB", "db": "DB",
  "চট্টগ্রাম": "Ctg.B", "chittagong": "Ctg.B", "ctg": "Ctg.B",
  "রাজশাহী": "RB", "rajshahi": "RB", "rb": "RB",
  "কুমিল্লা": "CB", "comilla": "CB", "cumilla": "CB", "cb": "CB",
  "সিলেট": "SB", "sylhet": "SB", "sb": "SB",
  "যশোর": "JB", "jessore": "JB", "jashore": "JB", "jb": "JB",
  "বরিশাল": "BB", "barisal": "BB", "barishal": "BB", "bb": "BB",
  "দিনাজপুর": "Din.B", "dinajpur": "Din.B", "din": "Din.B",
  "ময়মনসিংহ": "MB", "mymensingh": "MB", "mb": "MB",
  "ক্যাডেট": "CC", "cadet": "CC", "cc": "CC",
  "রাজউক": "RUMC", "rajuk": "RUMC", "rumc": "RUMC",
  "রেসিডেনসিয়াল": "DRMC", "drmc": "DRMC",
  "নূর মোহাম্মদ": "BNMPC", "bnmpc": "BNMPC",
  "ভিকারুননিসা": "VNSC", "vnsc": "VNSC",
  "আইডিয়াল": "ISCM", "ideal": "ISCM",
  "সেন্ট জোসেফ": "SJHSS", "joseph": "SJHSS"
};

export function normalizeBoard(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (
    s === "random" || s === "any" || s === "all" || s === "jekono" ||
    s === "যেকোনো" || s === "যে কোনো" || s.includes("যেকোনো") ||
    s.includes("jekono") || s.includes("random")
  ) {
    return "RANDOM";
  }
  for (const [k, v] of Object.entries(BOARD_MAP)) {
    if (s.includes(k.toLowerCase())) return v;
  }
  return null;
}
