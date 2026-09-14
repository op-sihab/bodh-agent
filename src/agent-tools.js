// Tool definitions and execution handlers for BODH AI (বোধ)
import { executeRawSql, getSimilarQuestionsByVector } from "./db.js";
import { appCache } from "./cache.js";

const TAG_MAP = {
  "DB": "ঢাকা বোর্ড", "DHAKA": "ঢাকা বোর্ড",
  "Ctg.B": "চট্টগ্রাম বোর্ড", "CTG.B": "চট্টগ্রাম বোর্ড", "CTG": "চট্টগ্রাম বোর্ড", "CHITTAGONG": "চট্টগ্রাম বোর্ড", "CTG B": "চট্টগ্রাম বোর্ড",
  "CB": "কুমিল্লা বোর্ড", "COMILLA": "কুমিল্লা বোর্ড", "CUMILLA": "কুমিল্লা বোর্ড", "COM B": "কুমিল্লা বোর্ড",
  "RB": "রাজশাহী বোর্ড", "RAJSHAHI": "রাজশাহী বোর্ড", "RAJ B": "রাজশাহী বোর্ড",
  "SB": "সিলেট বোর্ড", "SYLHET": "সিলেট বোর্ড", "SYL B": "সিলেট বোর্ড",
  "JB": "যশোর বোর্ড", "JESSORE": "যশোর বোর্ড", "JASHORE": "যশোর বোর্ড", "JES B": "যশোর বোর্ড",
  "BB": "বরিশাল বোর্ড", "BARISAL": "বরিশাল বোর্ড", "BARISHAL": "বরিশাল বোর্ড", "BAR B": "বরিশাল বোর্ড",
  "Din.B": "দিনাজপুর বোর্ড", "DIN.B": "দিনাজপুর বোর্ড", "DIN": "দিনাজপুর বোর্ড", "DINAJPUR": "দিনাজপুর বোর্ড", "DIN B": "দিনাজপুর বোর্ড",
  "MB": "ময়মনসিংহ বোর্ড", "MYMENSINGH": "ময়মনসিংহ বোর্ড", "MYM B": "ময়মনসিংহ বোর্ড",
  "Madrasa": "মাদ্রাসা বোর্ড", "MADRASA": "মাদ্রাসা বোর্ড", "MAD": "মাদ্রাসা বোর্ড", "MADRASHA": "মাদ্রাসা বোর্ড", "MADRASHA B": "মাদ্রাসা বোর্ড", "DAKHIL": "দাখিল মাদ্রাসা বোর্ড",
  "TEC": "কারিগরি বোর্ড", "BTEB": "কারিগরি বোর্ড",
  "All.B": "সকল বোর্ড", "ALL.B": "সকল বোর্ড", "ALL": "সকল বোর্ড", "ALL B": "সকল বোর্ড",
  "RCC": "রাজশাহী ক্যাডেট কলেজ",
  "JCC": "ঝিনাইদহ ক্যাডেট কলেজ",
  "MCC": "মির্জাপুর ক্যাডেট কলেজ",
  "PCC": "পাবনা ক্যাডেট কলেজ",
  "FCC": "ফৌজদারহাট ক্যাডেট কলেজ",
  "SCC": "সিলেট ক্যাডেট কলেজ",
  "BCC": "বরিশাল ক্যাডেট কলেজ", "CCR": "বরিশাল ক্যাডেট কলেজ",
  "MGCC": "ময়মনসিংহ গার্লস ক্যাডেট কলেজ",
  "FGCC": "ফেনী গার্লস ক্যাডেট কলেজ",
  "JGCC": "জয়পুরহাট গার্লস ক্যাডেট কলেজ",
  "RUMC": "রাজউক উত্তরা মডেল কলেজ",
  "DRMC": "ঢাকা রেসিডেনসিয়াল মডেল কলেজ",
  "VNSC": "ভিকারুননিসা নূন স্কুল ও কলেজ",
  "ISCM": "আইডিয়াল স্কুল অ্যান্ড কলেজ",
  "ACC": "আদমজী ক্যান্টনমেন্ট কলেজ",
  "BNMPC": "বীরশ্রেষ্ঠ নূর মোহাম্মদ পাবলিক কলেজ",
  "SJHSS": "সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয়",
  "RCPC": "রাজশাহী কলেজিয়েট স্কুল",
  "CPSCR": "ক্যান্টনমেন্ট পাবলিক স্কুল ও কলেজ",
  "BCPC": "বান্দরবান ক্যান্টনমেন্ট পাবলিক কলেজ",
  "MCPC": "মিরপুর ক্যান্টনমেন্ট পাবলিক স্কুল ও কলেজ",
  "BNSC": "বাংলাদেশ নৌবাহিনী স্কুল ও কলেজ",
  "BNCP": "ক্যান্টনমেন্ট পাবলিক স্কুল ও কলেজ",
  "GLHSD": "সরকারি করোনেশন / ল্যাবরেটরি হাই স্কুল",
  "NISD": "ন্যাশনাল আইডিয়াল স্কুল",
  "MHSC": "মিরপুর ক্যান্টনমেন্ট পাবলিক স্কুল",
  "CSC": "ক্যান্টনমেন্ট পাবলিক স্কুল",
  "HC": "হলি ক্রস কলেজ",
  "RCS": "রাজশাহী কলেজিয়েট স্কুল"
};

const TAG_MAP_UPPER = Object.fromEntries(
  Object.entries(TAG_MAP).map(([k, v]) => [k.toUpperCase(), v])
);

const BN_DIGITS = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
export const toBengaliNumber = (s) => String(s).replace(/[0-9]/g, d => BN_DIGITS[d] || d);

export const formatTag = (tagStr) => {
  if (!tagStr) return "";
  return tagStr
    .split(",")
    .map(single => {
      const clean = single.trim().replace(/^['"-]+|['"-]+$/g, '');
      const match = clean.match(/^([A-Za-z.\s]+?)\s*[-'"]*\s*(\d{2,4})?$/i);
      if (match) {
        const rawCode = match[1].trim().toUpperCase();
        const cleanCode = rawCode.replace(/\.+$/, '');
        const yr = match[2];
        const boardName = TAG_MAP_UPPER[rawCode] || TAG_MAP_UPPER[cleanCode] || match[1].trim();
        if (yr) {
          const fullYr = yr.length === 2 ? (parseInt(yr, 10) > 70 ? `19${yr}` : `20${yr}`) : yr;
          return `${boardName} ${toBengaliNumber(fullYr)}`;
        }
        return boardName;
      }
      return clean;
    })
    .filter(Boolean)
    .join(", ");
};

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
  if (s === "random" || s === "any" || s === "all" || s === "jekono" || s === "যেকোনো" || s === "যে কোনো" || s.includes("যেকোনো") || s.includes("jekono") || s.includes("random")) {
    return "RANDOM";
  }
  for (const [k, v] of Object.entries(BOARD_MAP)) {
    if (s.includes(k.toLowerCase())) return v;
  }
  return null;
}

export function normalizeSubject(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === "ssc_bangla_2nd" || s.includes("bangla_2") || s.includes("bangla 2") || s.includes("bangla-2") || s.includes("বাংলা ২") || s.includes("বাংলা ২য়") || s.includes("বাংলা ২য়") || s.includes("ব্যাকরণ") || s.includes("byakoron")) return "ssc_bangla_2nd";
  if (s === "ssc_english_2nd" || s.includes("english_2") || s.includes("english 2") || s.includes("english-2") || s.includes("eng 2") || s.includes("eng_2") || s.includes("ইংরেজি ২") || s.includes("ইংরেজি ২য়") || s.includes("ইংরেজি ২য়") || s.includes("grammar")) return "ssc_english_2nd";
  if (s === "ssc_bangla_1st" || s.includes("goddo") || s.includes("gotto") || s.includes("গদ্য") || s.includes("kobita") || s.includes("কবিতা") || s.includes("sahitto") || s.includes("সাহিত্য") || s.includes("সহপাঠ") || s.includes("sohopath") || s.includes("bangla") || s.includes("বাংলা")) return "ssc_bangla_1st";
  if (s === "ssc_english_1st" || s.includes("english") || s.includes("ইংরেজি") || s.includes("eng")) return "ssc_english_1st";
  if (s.includes("higher") || s.includes("উচ্চতর") || s.includes("হায়ার") || s.includes("hm")) return "ssc_higher_math";
  if (s.includes("math") || s.includes("গণিত") || s.includes("গনিত") || s.includes("gm")) return "ssc_general_math";
  if (s.includes("phys") || s.includes("পদার্থ")) return "ssc_physics";
  if (s.includes("chem") || s.includes("রসায়ন") || s.includes("রসায়ন")) return "ssc_chemistry";
  if (s.includes("bio") || s.includes("জীববিজ্ঞান") || s.includes("বায়োলজি")) return "ssc_biology";
  if (s.includes("ict") || s.includes("তথ্য") || s.includes("আইসিটি")) return "ssc_ict";
  if (s.includes("bgs") || s.includes("সমাজ") || s.includes("বাংলাদেশ ও বিশ্ব") || s.includes("বিজিএস")) return "ssc_bgs";
  if (s.includes("islam") || s.includes("ধর্ম") || s.includes("ইসলাম")) return "ssc_islam";
  if (s.includes("hindu") || s.includes("হিন্দু")) return "ssc_hindu";
  if (s.includes("agri") || s.includes("কৃষি")) return "ssc_agriculture";
  return null;
}

const BN_TO_EN_DIGITS = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
const BENGALI_ORDINALS = {
  "১ম": 1, "২য়": 2, "২য়": 2, "৩য়": 3, "৩য়": 3, "৪র্থ": 4, "৫ম": 5, "৬ষ্ঠ": 6, "৭ম": 7, "৮ম": 8, "৯ম": 9, "১০ম": 10,
  "১১শ": 11, "১২শ": 12, "১৩শ": 13, "১৪শ": 14, "১৫শ": 15, "১৬শ": 16, "১৭শ": 17,
  "প্রথম": 1, "দ্বিতীয়": 2, "দ্বিতীয়": 2, "তৃতীয়": 3, "তৃতীয়": 3, "চতুর্থ": 4, "পঞ্চম": 5, "ষষ্ঠ": 6, "সপ্তম": 7, "অষ্টম": 8, "নবম": 9, "দশম": 10,
  "একাদশ": 11, "দ্বাদশ": 12, "ত্রয়োদশ": 13, "ত্রয়োদশ": 13, "চতুর্দশ": 14, "পঞ্চদশ": 15, "ষোড়শ": 16, "ষোড়শ": 16, "সপ্তদশ": 17
};

export function extractChapterNum(raw) {
  if (!raw) return null;
  const norm = String(raw).normalize('NFC').toLowerCase();

  // 1. Check Bengali words like 'একাদশ', 'দশম', '১১শ'
  for (const [word, num] of Object.entries(BENGALI_ORDINALS)) {
    const re = new RegExp(`(?:^|\\s)${word}(?:\\s|$)`, 'i');
    if (re.test(norm)) return String(num);
  }

  // 2. Check digits with 'ch', 'chapter', 'অধ্যায়', 'অধ্যায়'
  const converted = norm.replace(/[০-৯]/g, d => BN_TO_EN_DIGITS[d] || d);
  const m = converted.match(/(?:অধ্যায়|অধ্যায়|chapter|ch)\s*(\d{1,2})/i) || 
            converted.match(/(?:^|\s)(\d{1,2})\s*(?:নং|তম|শ|ম|র্থ|st|nd|rd|th)?\s*(?:অধ্যায়|অধ্যায়|chapter|ch)/i) ||
            converted.match(/(?:^|\s)(?:অধ্যায়|অধ্যায়|chapter|ch)?\s*(\d{1,2})\b/i);
  if (m) {
    const num = parseInt(m[1], 10);
    if (num >= 1 && num <= 25) return String(num);
  }

  return null;
}

export function normalizeTopic(raw) {
  if (!raw) return "";
  const t = String(raw).toLowerCase().trim();
  const TOPIC_MAP = {
    "goti": "গতি",
    "motion": "গতি",
    "bol": "বল",
    "force": "বল",
    "kaj": "কাজ, ক্ষমতা ও শক্তি",
    "power": "কাজ, ক্ষমতা ও শক্তি",
    "energy": "কাজ, ক্ষমতা ও শক্তি",
    "chap": "পদার্থের অবস্থা ও চাপ",
    "pressure": "পদার্থের অবস্থা ও চাপ",
    "tap": "বস্তুর ওপর তাপের প্রভাব",
    "heat": "বস্তুর ওপর তাপের প্রভাব",
    "torongo": "তরঙ্গ ও শব্দ",
    "sound": "তরঙ্গ ও শব্দ",
    "wave": "তরঙ্গ ও শব্দ",
    "alor protifolon": "আলোর প্রতিফলন",
    "reflection": "আলোর প্রতিফলন",
    "alor protisoron": "আলোর প্রতিসরণ",
    "refraction": "আলোর প্রতিসরণ",
    "sthir bidyut": "স্থির বিদ্যুৎ",
    "chol bidyut": "চল বিদ্যুৎ",
    "trikonmiti": "ত্রিকোণমিতি",
    "trigonometry": "ত্রিকোণমিতি",
    "porimiti": "পরিমিতি",
    "mensuration": "পরিমিতি",
    "porisongkhan": "পরিসংখ্যান",
    "statistics": "পরিসংখ্যান",
    "set": "সেট ও ফাংশন",
    "dhara": "সসীম ধারা",
    "series": "সসীম ধারা",
    "porjoy saroni": "পর্যায় সারণী",
    "periodic table": "পর্যায় সারণী",
    "moler dharona": "মোলের ধারণা",
    "kosh": "কোষ"
  };
  for (const [k, v] of Object.entries(TOPIC_MAP)) {
    if (t.includes(k)) return v;
  }
  return raw;
}

export function parseYearFilter(rawYear) {
  if (!rawYear) return [];
  const bnToEn = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  const str = String(rawYear).replace(/[০-৯]/g, d => bnToEn[d]).trim();

  // 1. Check for range: e.g. "2020-2025", "2020 - 2025", "2020 to 2025", "20-25", "2020-25", "২০২০-২০২৫", "2020 থেকে 2025"
  const rangeMatch = str.match(/(?:20)?(\d{2})\s*(?:-|to|থেকে|পর্যন্ত|–|—)\s*(?:20)?(\d{2})/i);
  if (rangeMatch) {
    let start = parseInt(rangeMatch[1], 10);
    let end = parseInt(rangeMatch[2], 10);
    if (start > end) [start, end] = [end, start];
    const years = [];
    for (let y = start; y <= end; y++) {
      years.push(String(y).padStart(2, '0'));
    }
    return years;
  }

  // 2. Individual 4-digit or 2-digit years: e.g. "2024", "24", "2021, 2023"
  const matches = str.match(/(?:20)?(\d{2})/g);
  if (matches) {
    const list = matches.map(m => {
      const stripped = m.replace(/^20/, '');
      return stripped.length === 2 ? stripped : String(m).slice(-2);
    });
    return [...new Set(list)];
  }

  return [];
}

export function buildYearSqlConditions(boardTag, years) {
  if (!years || years.length === 0) {
    if (boardTag && boardTag !== "RANDOM") {
      return `tags LIKE '%${boardTag}%'`;
    }
    return `tags != '' AND tags IS NOT NULL`;
  }

  if (boardTag && boardTag !== "RANDOM") {
    const sub = years.map(y => `(tags LIKE '%${boardTag} ${y}%' OR (tags LIKE '%${boardTag}%' AND tags LIKE '% ${y}%'))`);
    return `(${sub.join(" OR ")})`;
  } else {
    const sub = years.map(y => `tags LIKE '% ${y}%'`);
    return `(${sub.join(" OR ")})`;
  }
}

export const CHAPTER_CONCEPTS_MAP = {
  ssc_biology: {
    "1": ["জীবন পাঠ", "শ্রেণিবিন্যাস", "দ্বিপদ", "লিনিয়াস", "হুইটটেকার", "প্রোটিস্টা", "মনেরা", "ফানজাই", "প্ল্যান্টি", "অ্যানিম্যালিয়া", "হায়ারার্কি", "আইসিজেডএন", "আইসিবিএন"],
    "2": ["জীবকোষ", "টিস্যু", "মাইটোকন্ড্রিয়া", "প্লাস্টিড", "গলগি", "রাইবোজোম", "লাইসোজোম", "কোষঝিল্লি", "কোষপ্রাচীর", "জাইলেম", "ফ্লোয়েম", "প্যারেনকাইমা", "কোলেনকাইমা", "স্ক্লেরেনকাইমা", "মৌলিক টিস্যু"],
    "3": ["কোষ বিভাজন", "মাইটোসিস", "মিয়োসিস", "অ্যামাইটোসিস", "প্রোফেজ", "মেটাফেজ", "অ্যানাফেজ", "টেলোফেজ", "ক্রসিং ওভার", "স্পিন্ডল"],
    "4": ["জীবনীশক্তি", "সালোকসংশ্লেষণ", "শ্বসন", "এটিপি", "ATP", "ক্যালভিন", "ক্রেবস চক্র", "গ্লাইকোলাইসিস", "ফার্মেন্টেশন", "সবাত", "অবাত", "ক্লোরোফিল"],
    "5": ["খাদ্য", "পুষ্টি", "পরিপাক", "পাকস্থলী", "যকৃৎ", "অগ্ন্যাশয়", "ক্ষুদ্রান্ত্র", "বৃহদান্ত্র", "ভিটামিন", "খনিজ", "এনজাইম", "বিএমআই", "BMI", "ক্যালোরি", "দাঁত", "আন্ত্রিক রস"],
    "6": ["জীবে পরিবহন", "রক্ত", "হৃদপিণ্ড", "ধমনী", "শিরা", "রক্তরস", "লোহিত", "শ্বেত", "অনুচক্রিকা", "হিমোগ্লোবিন", "রক্তচাপ", "প্রস্বেদন", "ট্রান্সপিরেশন", "লসিকা", "কৈশিক"],
    "7": ["গ্যাসীয় বিনিময়", "শ্বসনতন্ত্র", "ফুসফুস", "অ্যালভিওলাস", "ব্রঙ্কাস", "ব্রঙ্কাইটিস", "ট্রাকিয়া", "হাঁপানি", "নিউমোনিয়া", "অক্সিজেন", "কার্বন ডাই-অক্সাইড"],
    "8": ["রেচন", "বৃক্ক", "নেফ্রন", "ইউরেটার", "মূত্রথলি", "ডায়ালাইসিস", "গ্লোমেরুলাস", "রেনাল", "ইউরিয়া", "ইউরিক"],
    "9": ["দৃঢ়তা প্রদান", "চলন", "কঙ্কাল", "অস্থি", "তরুণাস্থি", "সাইনোভিয়াল", "অস্টিওপোরোসিস", "লিগামেন্ট", "টেনডন", "ঐচ্ছিক", "অনৈচ্ছিক"],
    "10": ["সমন্বয়", "নিউরন", "সিন্যাপস", "মস্তিষ্ক", "হরমোন", "থাইরয়েড", "পিটুইটারি", "অক্সিন", "জিব্বেরেলিন", "অ্যাড্রেনালিন", "স্নায়ু"],
    "11": ["জীবের প্রজনন", "প্রজনন", "পরাগায়ন", "পুংকেশর", "গর্ভাশয়", "পরাগধানী", "নিষেক", "অমরা", "ভ্রূণ", "ফুল", "পুংস্তবক", "স্ত্রীস্তবক", "গর্ভমুণ্ড"],
    "12": ["জীবের বংশগতি", "বিবর্তন", "বংশগতি", "ডিএনএ", "আরএনএ", "DNA", "RNA", "জিন", "ক্রোমোজোম", "মেন্ডেল", "ডারউইন", "থ্যালাসেমিয়া", "বর্ণান্ধতা", "মিউটেশন"],
    "13": ["জীবের পরিবেশ", "বাস্তুতন্ত্র", "উৎপাদক", "খাদক", "বিয়োজক", "খাদ্যশিকল", "খাদ্যজাল", "ট্রফিক", "শক্তি পিরামিড", "মিথোজীবিতা", "সিমবায়োসিস", "অ্যান্টিবায়োসিস", "পরজীবী খাদ্যশিকল"],
    "14": ["জীবপ্রযুক্তি", "টিস্যু কালচার", "রিকম্বিন্যান্ট", "প্লাজমিড", "রেস্ট্রিকশন", "জিএমও", "GMO", "ইনসুলিন", "জিন প্রকৌশল"]
  },
  ssc_physics: {
    "1": ["ভৌত রাশি", "পরিমাপ", "ভার্নিয়ার", "স্ক্রু গজ", "স্লাইড ক্যালিপার্স", "মাত্রা", "পিচ", "লঘিষ্ট গণনা"],
    "2": ["গতি", "ত্বরণ", "বেগ", "দ্রুতি", "সরণ", "মন্দন", "প্রাস", "পরন্ত বস্তু"],
    "3": ["বল", "নিউটনের সূত্র", "ভরবেগ", "ঘর্ষণ", "জড়তা", "ভরবেগের সংরক্ষণ", "ক্রিয়া-প্রতিক্রিয়া"],
    "4": ["কাজ", "ক্ষমতা", "শক্তি", "গতিশক্তি", "বিভবশক্তি", "কর্মদক্ষতা", "জুল", "ওয়াট"],
    "5": ["পদার্থের অবস্থা", "চাপ", "প্যাসকেল", "আর্কিমিডিস", "প্লবতা", "ঘনত্ব", "বায়ুমণ্ডলীয় চাপ", "ব্যারোমিটার", "পীড়ন", "বিকৃতি"],
    "6": ["বস্তুর ওপর তাপের প্রভাব", "তাপমাত্রা", "ফারেনহাইট", "সেলসিয়াস", "আপেক্ষিক তাপ", "তাপধারণ ক্ষমতা", "প্রসারণ", "সুপ্ততাপ", "ক্যালোরিমিতি"],
    "7": ["তরঙ্গ", "শব্দ", "তরঙ্গদৈর্ঘ্য", "কম্পাঙ্ক", "পর্যায়কাল", "প্রতিধ্বনি", "শ্রাব্যতার সীমা"],
    "8": ["আলোর প্রতিফলন", "দর্পণ", "অবতল", "উত্তল", "ফোকাস দূরত্ব", "বক্রতার ব্যাসার্ধ", "বিম্ব", "প্রতিবিম্ব"],
    "9": ["আলোর প্রতিসরণ", "প্রতিসরাঙ্ক", "ক্রান্তি কোণ", "সংকট কোণ", "পূর্ণ অভ্যন্তরীণ প্রতিফলন", "লেন্স", "ডায়োপ্টার", "দৃষ্টির ত্রুটি"],
    "10": ["স্থির বিদ্যুৎ", "কুলম্বের সূত্র", "তড়িৎ তীব্রতা", "তড়িৎ বিভব", "আধান", "ধারক", "চার্জ"],
    "11": ["চল বিদ্যুৎ", "ওহমের সূত্র", "রোধ", "তুল্য রোধ", "বর্তনী", "তড়িৎ প্রবাহ", "তড়িৎ ক্ষমতা", "তড়িচ্চালক শক্তি", "আপেক্ষিক রোধ"],
    "12": ["বিদ্যুতের চৌম্বক ক্রিয়া", "চৌম্বক ক্ষেত্র", "সোলেনয়েড", "মোটর", "জেনারেটর", "ট্রান্সফরমার", "তড়িৎচৌম্বক আবেশ", "ফ্যারাডের সূত্র"],
    "13": ["আধুনিক পদার্থবিজ্ঞান", "ইলেকট্রনিক্স", "তেজস্ক্রিয়তা", "অর্ধায়ু", "সেমিকন্ডাক্টর", "ডায়োড", "ট্রানজিস্টর", "আইসি", "অ্যানালগ", "ডিজিটাল"],
    "14": ["জীবন বাঁচাতে পদার্থবিজ্ঞান", "এক্স-রে", "সিটি স্ক্যান", "এমআরআই", "MRI", "আল্ট্রাসনোগ্রাফি", "ইসিজি", "ECG", "রেডিওথেরাপি"]
  },
  ssc_chemistry: {
    "1": ["রসায়নের ধারণা", "রসায়ন পাঠ", "ল্যাবরেটরি", "হ্যাজার্ড প্রতীক"],
    "2": ["পদার্থের অবস্থা", "কণার গতিতত্ত্ব", "ব্যাপন", "নিঃসরণ", "ঊর্ধ্বপাতন", "গলনাঙ্ক", "স্ফুটনাঙ্ক", "শীতলীকরণ"],
    "3": ["পদার্থের গঠন", "পরমাণু", "প্রোটন", "নিউট্রন", "ইলেকট্রন বিন্যাস", "আইসোটোপ", "বোর মডেল", "রাদারফোর্ড", "আপেক্ষিক পারমাণবিক ভর"],
    "4": ["পর্যায় সারণি", "পর্যায়", "গ্রুপ", "ক্ষার ধাতু", "মৃৎক্ষার ধাতু", "হ্যালোজেন", "নিষ্ক্রিয় গ্যাস", "আয়নীকরণ শক্তি", "তড়িৎ ঋণাত্মকতা", "ইলেকট্রন আসক্তি"],
    "5": ["রাসায়নিক বন্ধন", "যোজ্যতা", "যোজনী", "আয়নিক বন্ধন", "সমযোজী বন্ধন", "ধাতব বন্ধন", "অষ্টক নিয়ম", "ক্যাটায়ন", "অ্যানায়ন"],
    "6": ["মোলের ধারণা", "রাসায়নিক গণনা", "মোল", "অ্যাভোগাড্রো", "মোলার দ্রবণ", "মোলারিটি", "লিমিটিং বিক্রিয়ক", "শতকরা সংযুতি", "স্থূল সংকেত", "আণবিক সংকেত"],
    "7": ["রাসায়নিক বিক্রিয়া", "জারণ", "বিজারণ", "রেডক্স", "সংযোজন", "বিযোজন", "প্রতিস্থাপন", "দহন", "তাপোৎপাদী", "তাপহারী", "লা-শাতেলিয়ার"],
    "8": ["রসায়ন ও শক্তি", "তড়িৎ রাসায়নিক কোষ", "গ্যালভানিক কোষ", "ড্রাই সেল", "লবণ সেতু", "অ্যানোড", "ক্যাথোড", "তড়িৎ বিশ্লেষণ"],
    "9": ["অ্যাসিড-ক্ষারক সমতা", "অ্যাসিড", "ক্ষার", "ক্ষারক", "pH", "নির্দেশক", "প্রশমন বিক্রিয়া", "লবণ"],
    "10": ["খনিজ সম্পদঃ ধাতু-অধাতু", "খনিজ সম্পদ: ধাতু-অধাতু", "খনিজ সম্পদ ধাতু অধাতু", "ধাতু-অধাতু", "ধাতু নিষ্কাশন", "আকরিক", "খনিজ", "ক্ষয়রোধ", "মরিচা"],
    "11": ["খনিজ সম্পদঃ জীবাশ্ম", "খনিজ সম্পদ: জীবাশ্ম", "খনিজ সম্পদ জীবাশ্ম", "জীবাশ্ম", "জীবাশ্ম জ্বালানি", "হাইড্রোকার্বন", "অ্যালকেন", "অ্যালকিন", "অ্যালকাইন", "অ্যালকোহল", "অ্যালডিহাইড", "জৈব অ্যাসিড", "পলিমার", "প্লাস্টিক"],
    "12": ["আমাদের জীবনে রসায়ন", "বেকিং পাউডার", "ভিনেগার", "ব্লিচিং পাউডার", "সাবান", "ডিটারজেন্ট", "টয়লেট ক্লিনার"]
  },
  ssc_general_math: {
    "1": ["বাস্তব সংখ্যা", "মূলদ", "অমূলদ", "আবৃত দশমিক", "ভগ্নাংশ"],
    "2": ["সেট", "ফাংশন", "ডোমেন", "রেঞ্জ", "সার্বিক সেট", "শক্তি সেট", "ভেনচিত্র"],
    "3": ["বীজগণিতীয় রাশি", "উৎপাদক", "বর্গ", "ঘন", "লঘিষ্ঠকরণ"],
    "4": ["সূচক", "লগারিদম", "সূচকীয় সমীকরণ", "লগ"],
    "5": ["এক চলকবিশিষ্ট সমীকরণ", "ঘাত", "মূল", "সমাধান সেট"],
    "6": ["রেখা", "কোণ", "ত্রিভুজ", "সমকোণী", "সমদ্বিবাহু", "পিথাগোরাস"],
    "7": ["ব্যবহারিক জ্যামিতি", "ত্রিভুজ অঙ্কন", "চতুর্ভুজ অঙ্কন", "সম্পাদ্য"],
    "8": ["বৃত্ত", "স্পর্শক", "কেন্দ্রস্থ কোণ", "বৃত্তস্থ কোণ", "উপপাদ্য", "বৃত্তস্থ চতুর্ভুজ"],
    "9": ["ত্রিকোণমিতিক অনুপাত", "sin", "cos", "tan", "ত্রিকোণমিতি", "অভেদাবলী"],
    "10": ["দূরত্ব ও উচ্চতা", "উন্নতি কোণ", "অবনতি কোণ"],
    "11": ["বীজগাণিতিক অনুপাত", "সমানুপাত", "যোজন-বিয়োজন"],
    "12": ["দুই চলকবিশিষ্ট সরল সহসমীকরণ", "প্রতিস্থাপন", "অপনয়ন", "আর্যভট্ট", "বজ্রগুণন"],
    "13": ["সসীম ধারা", "সমান্তর ধারা", "গুণোত্তর ধারা", "পদসংখ্যা", "সমষ্টি"],
    "14": ["অনুপাত", "সদৃশতা", "প্রতিসমতা"],
    "15": ["ক্ষেত্রফল সম্পর্কিত ক্ষেত্র ও পরিমাপ", "ত্রিভুজের ক্ষেত্রফল", "সামান্তরিকের ক্ষেত্রফল"],
    "16": ["পরিমিতি", "বেলন", "সিলিন্ডার", "গোলক", "ঘনক", "চতুর্ভুজ", "বহুভুজ", "বৃত্তাংশ"],
    "17": ["পরিসংখ্যান", "গড়", "মধ্যক", "প্রচুরক", "অজিব রেখা", "আয়তলেখ", "ক্রমযোজিত"]
  },
  ssc_higher_math: {
    "1": ["সেট", "ফাংশন", "ডোমেন", "রেঞ্জ", "এক-এক ফাংশন", "সার্বিক ফাংশন", "বিপরীত ফাংশন"],
    "2": ["বীজগণিতীয় রাশি", "বহুপদী", "ভাগশেষ উপপাদ্য", "উৎপাদক উপপাদ্য", "আংশিক ভগ্নাংশ", "চক্র-ক্রমিক"],
    "3": ["জ্যামিতি", "অ্যাপোলোনিয়াস", "টলেমি", "ব্রহ্মগুপ্ত", "লম্ব অভিক্ষেপ"],
    "4": ["জ্যামিতিক অঙ্কন", "সম্পাদ্য"],
    "5": ["সমীকরণ", "দ্বিঘাত সমীকরণ", "মূলের প্রকৃতি", "নিশ্চায়ক", "পৃথায়ক"],
    "6": ["অসমতা", "পরমমান", "অসমতার সমাধান"],
    "7": ["অসীম ধারা", "অনন্ত গুণোত্তর ধারা", "অসীমতক সমষ্টি", "পুনরাবৃত্ত"],
    "8": ["ত্রিকোণমিতি", "রেডিয়ান", "বৃত্তচাপ", "কোণের পরিমাপ", "ত্রিকোণমিতিক অভেদ"],
    "9": ["সূচকীয়", "লগারিদমীয় ফাংশন", "প্রাকৃতিক লগ"],
    "10": ["দ্বিপদী বিস্তৃতি", "প্যাসকেলের ত্রিভুজ", "মধ্যপদ", "সহগ"],
    "11": ["স্থানাঙ্ক জ্যামিতি", "দূরত্ব", "ঢাল", "ত্রিভুজের ক্ষেত্রফল", "সরলরেখার সমীকরণ"],
    "12": ["সমতলীয় ভেক্টর", "স্কেলার", "ভেক্টর যোগ", "একক ভেক্টর", "অবস্থান ভেক্টর"],
    "13": ["ঘন জ্যামিতি", "আয়তাকার ঘনবস্তু", "কোনক", "গোলক", "প্রিজম", "পিরামিড"],
    "14": ["সম্ভাবনা", "Probability", "নমুনা ক্ষেত্র", "ঘটনা", "মার্বেল", "মুদ্রা", "ছক্কা"]
  }
};

export function getChapterConceptKeywords(subjId, chNum) {
  if (!subjId || !chNum) return [];
  const numStr = String(chNum);
  const concepts = CHAPTER_CONCEPTS_MAP[subjId]?.[numStr] || [];
  return concepts;
}

export function extractChapterKeywords(rawT, matchedChapterInfo, subjId) {
  let chapterKeywords = [];
  if (!rawT) return chapterKeywords;

  const normT = normalizeTopic(rawT);
  const candidateNames = [normT, matchedChapterInfo?.name].filter(Boolean);
  const stopWords = new Set([
    'অধ্যায়', 'অধ্যায়', 'chapter', 'theke', 'থেকে', 'er', 'এর', 'দাও', 'dao', 'ekta', 'akta', 'কুইজ', 'quiz',
    'ওপর', 'উপর', 'জন্য', 'পর', 'প্রভাব', 'কোন', 'কোনটি', 'বল', 'কি', 'কিভাবে', 'কী', 'নিচের', 'নিচে'
  ]);

  for (const name of candidateNames) {
    const cleanName = name.replace(/\s+ও\s+/g, ' ');
    const words = cleanName.split(/[\s,–—\-:;।?!/&()+]+/).map(w => w.trim()).filter(w => 
      w.length >= 3 && 
      !/^\d+$/.test(w) && 
      !/^[০-৯]+$/.test(w) && 
      !stopWords.has(w.toLowerCase())
    );
    chapterKeywords.push(...words);
  }
  const chNum = matchedChapterInfo?.order_num || extractChapterNum(rawT);
  const extraConcepts = getChapterConceptKeywords(subjId, chNum);
  if (extraConcepts && extraConcepts.length > 0) {
    chapterKeywords.push(...extraConcepts);
  }
  return [...new Set(chapterKeywords)];
}

export const RECENT_YEAR_ORDER_BY = `
  ORDER BY 
    CASE 
      WHEN tags LIKE '% 26%' THEN 1 
      WHEN tags LIKE '% 25%' THEN 2 
      WHEN tags LIKE '% 24%' THEN 3 
      WHEN tags LIKE '% 23%' THEN 4 
      WHEN tags LIKE '% 22%' THEN 5 
      WHEN tags LIKE '% 21%' THEN 6 
      WHEN tags LIKE '% 20%' THEN 7 
      WHEN tags LIKE '% 19%' THEN 8 
      WHEN tags LIKE '% 18%' THEN 9 
      ELSE 10 
    END ASC, 
    RANDOM()
`;

let cachedChapters = null;

export async function getAllChaptersCached() {
  if (cachedChapters && cachedChapters.length > 0) return cachedChapters;
  const fromCache = appCache.get("all_nctb_chapters");
  if (fromCache && fromCache.length > 0) {
    cachedChapters = fromCache;
    return cachedChapters;
  }
  try {
    const res = await executeRawSql("SELECT id, subject_id, name, order_num FROM chapters ORDER BY subject_id, CAST(order_num AS INTEGER) ASC;");
    if (res.rows && res.rows.length > 0) {
      cachedChapters = res.rows;
      appCache.set("all_nctb_chapters", cachedChapters, 3600);
    }
  } catch (e) {
    console.error("Failed to load chapters cache:", e.message);
  }
  return cachedChapters || [];
}

// Background preload
getAllChaptersCached().catch(() => {});

export const DISCRIMINATOR_RULES = {
  // --- CHEMISTRY ---
  // Ch 10: খনিজ সম্পদঃ ধাতু-অধাতু vs Ch 11: খনিজ সম্পদঃ জীবাশ্ম
  "ch_0051": {
    positives: ["ধাতু", "অধাতু", "নিষ্কাশন", "আকরিক", "মরিচা", "ক্ষয়রোধ", "হেমাটাইট", "বক্সাইট", "ক্যালামাইন", "গ্যালেনা", "সিন্নাবার", "ধাতব", "খনিজ মল", "ঝালাই", "খনিজ সম্পদ ধাতু অধাতু"],
    negatives: ["জীবাশ্ম", "হাইড্রোকার্বন", "অ্যালকেন", "অ্যালকিন", "অ্যালকাইন", "পলিমার", "জৈব এসিড", "জৈব যৌগ", "ইথানল", "ইথানয়িক", "পেট্রোলিয়াম", "প্লাস্টিক", "ইউরিয়া"]
  },
  "ch_0052": {
    positives: ["জীবাশ্ম", "হাইড্রোকার্বন", "অ্যালকেন", "অ্যালকিন", "অ্যালকাইন", "পলিমার", "প্লাস্টিক", "জৈব এসিড", "জৈব যৌগ", "ইথানল", "ইথানয়িক", "পেট্রোলিয়াম", "কয়লা", "প্রাকৃতিক গ্যাস", "ফ্যাটি এসিড", "মনোমার", "ডিকার্বক্সিলেশন", "খনিজ সম্পদ জীবাশ্ম"],
    negatives: ["ধাতু", "অধাতু", "নিষ্কাশন", "আকরিক", "ক্ষয়রোধ", "মরিচা", "হেমাটাইট", "বক্সাইট", "ক্যালামাইন", "সিন্নাবার", "গ্যালেনা"]
  },
  // Ch 2: পদার্থের অবস্থা vs Ch 3: পদার্থের গঠন
  "ch_0042": {
    positives: ["অবস্থা", "কণার গতিতত্ত্ব", "ব্যাপন", "নিঃসরণ", "গলনাঙ্ক", "স্ফুটনাঙ্ক", "ঊর্ধ্বপাতন", "শীতলীকরণ"],
    negatives: ["পরমাণু", "প্রোটন", "নিউট্রন", "ইলেকট্রন বিন্যাস", "আইসোটোপ", "রাদারফোর্ড", "বোর মডেল", "আপেক্ষিক পারমাণবিক ভর"]
  },
  "ch_0044": {
    positives: ["গঠন", "পরমাণু", "প্রোটন", "নিউট্রন", "ইলেকট্রন বিন্যাস", "আইসোটোপ", "রাদারফোর্ড", "বোর মডেল", "আপেক্ষিক পারমাণবিক ভর", "কোয়ান্টাম", "শক্তিস্তর"],
    negatives: ["ব্যাপন", "নিঃসরণ", "গলনাঙ্ক", "স্ফুটনাঙ্ক", "ঊর্ধ্বপাতন"]
  },

  // --- PHYSICS ---
  // Ch 8: আলোর প্রতিফলন vs Ch 9: আলোর প্রতিসরণ
  "ch_0008": {
    positives: ["প্রতিফলন", "দর্পণ", "অবতল দর্পণ", "উত্তল দর্পণ", "বিম্ব", "প্রতিবিম্ব", "বক্রতার ব্যাসার্ধ", "ফোকাস দূরত্ব", "দর্পণে"],
    negatives: ["প্রতিসরণ", "লেন্স", "প্রতিসরাঙ্ক", "সংকট কোণ", "ক্রান্তি কোণ", "পূর্ণ অভ্যন্তরীণ প্রতিফলন", "ডায়োপ্টার", "মরীচিকা"]
  },
  "ch_0009": {
    positives: ["প্রতিসরণ", "লেন্স", "প্রতিসরাঙ্ক", "সংকট কোণ", "ক্রান্তি কোণ", "পূর্ণ অভ্যন্তরীণ প্রতিফলন", "ডায়োপ্টার", "মরীচিকা", "উত্তল লেন্স", "অবতল লেন্স", "দৃষ্টির ত্রুটি", "মায়োপিয়া"],
    negatives: ["প্রতিফলন", "দর্পণ", "অবতল দর্পণ", "উত্তল দর্পণ"]
  },
  // Ch 10: স্থির বিদ্যুৎ vs Ch 11: চল বিদ্যুৎ
  "ch_0010": {
    positives: ["স্থির বিদ্যুৎ", "স্থিরতড়িৎ", "কুলম্ব", "তড়িৎ আবেশ", "ইলেকট্রোস্কোপ", "তড়িৎ তীব্রতা", "আধান", "ধারক", "ধারকত্ব", "তড়িৎ বিভব"],
    negatives: ["চল বিদ্যুৎ", "চলতড়িৎ", "ওহম", "রোধ", "তুল্য রোধ", "বর্তনী", "সার্কিট", "অ্যামিটার", "ভোল্টমিটার", "আপেক্ষিক রোধ"]
  },
  "ch_0011": {
    positives: ["চল বিদ্যুৎ", "চলতড়িৎ", "ওহম", "রোধ", "তুল্য রোধ", "বর্তনী", "সার্কিট", "তড়িৎ প্রবাহ", "তড়িৎ ক্ষমতা", "আপেক্ষিক রোধ", "ফিউজ", "অ্যামিটার", "ভোল্টমিটার", "রোধের সূত্র"],
    negatives: ["স্থির বিদ্যুৎ", "স্থিরতড়িৎ", "কুলম্ব", "ইলেকট্রোস্কোপ", "তড়িৎ আবেশ"]
  },
  // Ch 2: গতি vs Ch 3: বল
  "ch_0002": {
    positives: ["গতি", "ত্বরণ", "বেগ", "দ্রুতি", "সরণ", "মন্দন", "প্রাস", "পরন্ত বস্তু", "গতির সমীকরণ"],
    negatives: ["ঘর্ষণ", "জড়তা", "ভরবেগের সংরক্ষণ", "ক্রিয়া প্রতিক্রিয়া"]
  },
  "ch_0003": {
    positives: ["বল", "নিউটনের সূত্র", "ভরবেগ", "ঘর্ষণ", "জড়তা", "ভরবেগের সংরক্ষণ", "ক্রিয়া প্রতিক্রিয়া", "নিউটনের ৩য় সূত্র"],
    negatives: ["পরন্ত বস্তু", "প্রাস"]
  },

  // --- BIOLOGY ---
  "ch_0029": {
    positives: ["টিস্যু", "মাইটোকন্ড্রিয়া", "প্লাস্টিড", "গলগি", "রাইবোজোম", "লাইসোজোম", "জাইলেম", "ফ্লোয়েম", "প্যারেনকাইমা", "কোলেনকাইমা", "স্ক্লেরেনকাইমা"],
    negatives: ["কোষ বিভাজন", "মাইটোসিস", "মিয়োসিস", "অ্যামাইটোসিস", "প্রোফেজ", "মেটাফেজ", "অ্যানাফেজ", "টেলোফেজ", "ক্রসিং ওভার"]
  },
  "ch_0030": {
    positives: ["কোষ বিভাজন", "মাইটোসিস", "মিয়োসিস", "অ্যামাইটোসিস", "প্রোফেজ", "মেটাফেজ", "অ্যানাফেজ", "টেলোফেজ", "ক্রসিং ওভার", "স্পিন্ডল তন্তু"],
    negatives: ["জাইলেম", "ফ্লোয়েম", "প্যারেনকাইমা", "কোলেনকাইমা", "স্ক্লেরেনকাইমা"]
  },
  "ch_0031": {
    positives: ["জীবনীশক্তি", "সালোকসংশ্লেষণ", "শ্বসন", "এটিপি", "ATP", "ক্যালভিন চক্র", "ক্রেবস চক্র", "গ্লাইকোলাইসিস", "ফার্মেন্টেশন", "ক্লোরোফিল", "হ্যাস ও স্ল্যাক"],
    negatives: ["পরিপাক", "পাকস্থলী", "যকৃৎ", "অগ্ন্যাশয়", "বিএমআই", "BMI"]
  },
  "ch_0032": {
    positives: ["খাদ্য", "পুষ্টি", "পরিপাক", "পাকস্থলী", "যকৃৎ", "অগ্ন্যাশয়", "ক্ষুদ্রান্ত্র", "বৃহদান্ত্র", "ভিটামিন", "বিএমআই", "BMI", "ক্যালোরি", "দাঁত", "আন্ত্রিক রস"],
    negatives: ["সালোকসংশ্লেষণ", "ক্যালভিন চক্র", "গ্লাইকোলাইসিস", "ক্রেবস চক্র"]
  },
  "ch_0033": {
    positives: ["জীবে পরিবহণ", "রক্ত", "হৃদপিণ্ড", "ধমনী", "শিরা", "রক্তরস", "লোহিত", "শ্বেত", "অনুচক্রিকা", "হিমোগ্লোবিন", "রক্তচাপ", "প্রস্বেদন"],
    negatives: ["রেচন", "বৃক্ক", "নেফ্রন", "ইউরেটার", "মূত্রথলি", "ডায়ালাইসিস", "গ্লোমেরুলাস"]
  },
  "ch_0035": {
    positives: ["রেচন", "বৃক্ক", "নেফ্রন", "ইউরেটার", "মূত্রথলি", "ডায়ালাইসিস", "গ্লোমেরুলাস", "রেনাল", "ইউরিয়া", "ইউরিক এসিড"],
    negatives: ["রক্তরস", "হিমোগ্লোবিন", "প্রস্বেদন", "হৃদপিণ্ড"]
  },

  // --- BGS ---
  "ch_0082": {
    positives: ["নদ নদী", "পদ্মা", "মেঘনা", "যমুনা", "প্রাকৃতিক সম্পদ", "পানি সম্পদ", "নদী"],
    negatives: ["পুঁজিবাদ", "সমাজতন্ত্র", "জিডিপি", "GDP", "মাথাপিছু আয়"]
  },
  "ch_0087": {
    positives: ["জাতীয় সম্পদ", "অর্থনৈতিক ব্যবস্থা", "পুঁজিবাদী", "সমাজতান্ত্রিক", "মিশ্র অর্থব্যবস্থা", "ইসলামী অর্থব্যবস্থা", "সম্পদের বণ্টন"],
    negatives: ["নদ নদী", "জিডিপি", "GDP", "মাথাপিছু আয়", "অর্থনৈতিক নির্দেশক"]
  },
  "ch_0088": {
    positives: ["অর্থনৈতিক নির্দেশক", "জিডিপি", "GDP", "GNP", "মাথাপিছু আয়", "জাতীয় আয়", "অর্থনীতির প্রকৃতি"],
    negatives: ["নদ নদী", "পানি সম্পদ", "পুঁজিবাদী", "সমাজতান্ত্রিক"]
  }
};

export async function findChapterCached(rawTopicOrCh, subjId = null) {
  if (!rawTopicOrCh) return null;
  const all = await getAllChaptersCached();
  if (!all.length) return null;

  // Clean and normalize strings: unify Bengali visarga (ঃ), colon (:), dashes, commas into spaces
  const normalizeClean = (str) => {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .normalize('NFC')
      .replace(/[০-৯]/g, d => BN_TO_EN_DIGITS[d] || d)
      .replace(/[\u0982\u0983:;,\–\—\-_।/\\()\[\]{}'"`?*!+~@#$%^&=|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Extract all available textual signals from string or object
  let fullContext = "";
  let targetSubj = subjId;

  if (typeof rawTopicOrCh === "object" && rawTopicOrCh !== null) {
    const parts = [
      rawTopicOrCh.chapter,
      rawTopicOrCh.topic,
      rawTopicOrCh.query,
      rawTopicOrCh.userMessage
    ].filter(Boolean);
    fullContext = parts.join(" ");
    targetSubj = rawTopicOrCh.subject || subjId || normalizeSubject(fullContext);
  } else {
    fullContext = String(rawTopicOrCh);
    targetSubj = subjId || normalizeSubject(fullContext);
  }

  const rawClean = normalizeClean(fullContext);
  const extractedNum = extractChapterNum(fullContext);

  let bestMatch = null;
  let highestScore = -99999;

  for (const c of all) {
    let score = 0;
    const normChName = normalizeClean(c.name);
    const chNum = parseInt(c.order_num, 10);
    const isSameSubj = targetSubj && c.subject_id === targetSubj;

    // 1. Exact normalized name match (Punctuation Invariant)
    if (rawClean === normChName) {
      score += 3500;
    } else if (rawClean.includes(normChName)) {
      score += 2500 + (normChName.length * 10);
    } else if (normChName.includes(rawClean) && rawClean.length >= 4) {
      score += 1800 + (rawClean.length * 10);
    }

    // 2. Explicit chapter number match
    if (extractedNum && chNum === parseInt(extractedNum, 10)) {
      if (isSameSubj) {
        score += 2200;
      } else {
        score += 600;
      }
    }

    // 3. Concept Map matching
    const concepts = CHAPTER_CONCEPTS_MAP[c.subject_id]?.[String(c.order_num)] || [];
    for (const con of concepts) {
      const normCon = normalizeClean(con);
      if (normCon.length >= 2 && rawClean.includes(normCon)) {
        score += 800;
      }
    }

    // 4. Discriminator and Anti-Collision Rules
    const rules = DISCRIMINATOR_RULES[c.id];
    if (rules) {
      for (const pos of rules.positives) {
        if (rawClean.includes(normalizeClean(pos))) {
          score += 1000;
        }
      }
      for (const neg of rules.negatives) {
        if (rawClean.includes(normalizeClean(neg))) {
          score -= 2500; // Mutual exclusion penalty
        }
      }
    }

    // 5. Token overlap
    const chTokens = normChName.split(' ').filter(t => t.length >= 2);
    const queryTokens = rawClean.split(' ').filter(t => t.length >= 2);
    for (const qt of queryTokens) {
      if (chTokens.includes(qt)) {
        score += 80;
      }
    }

    // 6. Subject Alignment Bonus
    if (isSameSubj) {
      score += 120;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = c;
    }
  }

  // If match confidence is solid, return chapter
  if (bestMatch && highestScore >= 300) {
    return bestMatch;
  }

  return null;
}


export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_subject_chapters",
      description: "Get the official NCTB chapter list, total number of chapters, and question counts for any SSC subject (e.g. Chemistry, Physics, Biology, General Math, Higher Math, Bangla). Use this whenever the student asks for chapters, chapter count, or syllabus of a subject.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject ID or name, e.g. 'ssc_general_math', 'ssc_physics', 'ssc_higher_math', 'ssc_chemistry', 'ssc_biology', 'ssc_bangla_1st'"
          }
        },
        required: ["subject"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_board_frequency",
      description: "Check how many times a topic or formula appeared across recent board exams (2024-2026), past board exams (2016-2022), and top cadet/model colleges.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "Topic keyword in Bengali, e.g. 'গতি', 'বল', 'মহাকর্ষ', 'ত্রিকোণমিতি'"
          }
        },
        required: ["topic"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_board_exam_questions",
      description: "Fetch questions from specific board exams (e.g. Dhaka Board 2024/2026, Chittagong Board) or search board questions.",
      parameters: {
        type: "object",
        properties: {
          board_name: {
            type: "string",
            description: "Name of the board in Bengali, e.g. 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী'"
          },
          year: {
            type: "string",
            description: "Optional exam year like '২০২৪', '২০২৬', '২০২৫'"
          },
          subject: {
            type: "string",
            description: "Optional subject filter"
          }
        },
        required: ["board_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_creative_question",
      description: "Fetch an authentic Creative Question (সৃজনশীল প্রশ্ন / CQ) with উদ্দীপক (stem) and questions (ক, খ, গ, ঘ). Supports filtering by board (ঢাকা, চট্টগ্রাম, রাজশাহী ইত্যাদি), exam year (2026, 2025, 2024, 2023), subject, topic, and difficulty.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject ID like 'ssc_physics', 'ssc_general_math', 'ssc_higher_math', 'ssc_chemistry', 'ssc_biology', 'ssc_bangla_1st'"
          },
          topic: {
            type: "string",
            description: "Topic keyword in Bengali, e.g. 'বেগ-সময় লেখচিত্র', 'মুক্তভাবে পড়ন্ত বস্তু'"
          },
          chapter: {
            type: "string",
            description: "Chapter name or number, e.g. 'গতি', 'বল', 'কাজ, ক্ষমতা ও শক্তি', 'আলোর প্রতিফলন', 'সেট ও ফাংশন', 'অধ্যায় ২'"
          },
          board: {
            type: "string",
            description: "Board or college name, e.g. 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'কুমিল্লা', 'সিলেট', 'ক্যাডেট কলেজ' বা 'random' / 'any' (শিক্ষার্থী যদি নির্দিষ্ট বোর্ড না বলে বা বলে 'যেকোনো বোর্ডের দাও' / 'random board' / 'tmi ekta deo jekono' / 'any board', তবে 'random' পাস করবে যাতে ডেটাবেস থেকে যেকোনো বোর্ডের আসল প্রশ্ন সিলেক্ট হয়)"
          },
          year: {
            type: "string",
            description: "Exam year or year range, e.g. '2026', '2025', '2024', '2020-2025', '২০২০-২০২৫'"
          },
          difficulty: {
            type: "string",
            enum: ["hard", "medium", "easy"],
            description: "Difficulty level: 'hard' (উচ্চতর দক্ষতা CQ_4 ও ক্যাডেট কলেজ), 'medium' (বোর্ড স্ট্যান্ডার্ড ও প্রয়োগমূলক CQ_3), 'easy' (জ্ঞান ও অনুধাবনমূলক)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_mcq_quiz",
      description: "Get authentic board MCQ questions from real past board exams and recent test papers. Supports chapter-based questions ('গতি', 'পর্যায় সারণী', 'সেট ও ফাংশন' ইত্যাদি) and filtering by board, year, subject, and difficulty. Also supports fetching a random board question across all boards when student asks for 'যেকোনো বোর্ডের দাও', 'tmi ekta deo jekono', 'random board qus' etc.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject ID like 'ssc_physics', 'ssc_general_math', 'ssc_bangla_1st', 'ssc_chemistry', 'ssc_biology'"
          },
          chapter: {
            type: "string",
            description: "Chapter name or number, e.g. 'গতি', 'বল', 'কাজ ক্ষমতা ও শক্তি', 'সেট ও ফাংশন', 'ত্রিকোণমিতি', 'অধ্যায় ৩'"
          },
          topic: {
            type: "string",
            description: "Topic keyword in Bengali, e.g. 'ত্বরণ', 'ওহমের সূত্র', 'কপোতাক্ষ নদ'"
          },
          board: {
            type: "string",
            description: "Board or college name, e.g. 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'কুমিল্লা', 'সিলেট', 'ক্যাডেট কলেজ' বা 'random' / 'any' (শিক্ষার্থী যদি নির্দিষ্ট বোর্ড না বলে বা বলে 'যেকোনো বোর্ডের দাও' / 'random board' / 'tmi ekta deo jekono' / 'any board', তবে 'random' পাস করবে যাতে ডেটাবেস থেকে যেকোনো বোর্ডের আসল প্রশ্ন সিলেক্ট হয়)"
          },
          year: {
            type: "string",
            description: "Exam year or year range, e.g. '2026', '2025', '2024', '2020-2025', '২০২০-২০২৫'"
          },
          difficulty: {
            type: "string",
            enum: ["hard", "medium", "easy"],
            description: "Difficulty level: 'hard' (বহুপদী সমাপ্তিসূচক i, ii, iii বা ক্যাডেট টেস্ট), 'medium' (স্ট্যান্ডার্ড বোর্ড), 'easy' (বেসিক সূত্র বা সংজ্ঞা)"
          },
          count: {
            type: "number",
            description: "Number of MCQs (default 1 to 3)"
          },
          mode: {
            type: "string",
            enum: ["practice", "mock_test"],
            description: "Mode: 'practice' (default: provides question, options, correct answer and full explanation) or 'mock_test' (interactive test mode: provides question and options without revealing answer immediately, asking student to choose)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_chapter_importance_ranking",
      description: "Get 100% real database-backed importance ranking and question frequency breakdown for all chapters in a subject based on actual board and test exam questions. Use when the student asks which chapters are most important, how to prioritize study, or the recommended order of chapters to read.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject ID or name like 'ssc_physics', 'ssc_general_math', 'ssc_higher_math', 'ssc_chemistry', 'ssc_biology'"
          }
        },
        required: ["subject"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_question_bank",
      description: "Search across the entire 50,855 questions database by any formula, keyword, literary poem/story, or concept (e.g. 'F=ma', 'ওহমের সূত্র', 'কপোতাক্ষ নদ', 'বহুপদী', 'তুল্যরোধ', 'ক্লোরোপ্লাস্ট', 'পর্যায় সারণী', 'দ্বিঘাত সমীকরণ'). Filter by subject, board, year, or question type.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keyword, formula, or concept"
          },
          subject: {
            type: "string",
            description: "Optional subject name or ID (physics, chemistry, general math, higher math, biology, bangla 1st, bangla 2nd, english, ict, bgs, islam, agriculture)"
          },
          board: {
            type: "string",
            description: "Optional board or college name (e.g. ঢাকা, চট্টগ্রাম, রাজশাহী, ক্যাডেট)"
          },
          year: {
            type: "string",
            description: "Optional exam year or year range (e.g. 2026, 2025, 2024, 2020-2025, '২০২০-২০২৫')"
          },
          type: {
            type: "string",
            enum: ["MCQ", "CQ", "ALL"],
            description: "Filter question type: 'MCQ' (বহুনির্বাচনী), 'CQ' (সৃজনশীল), or 'ALL' (default)"
          },
          limit: {
            type: "number",
            description: "Number of questions to return (default 2, max 5)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_similar_type_questions",
      description: "Uses 1024-dimensional semantic vector embeddings (kazalbrur/bangla-embed-e5-small) to instantly find questions of the EXACT SAME type, pattern, and formula from other boards with changed numbers, reversed variables, or scenario twists. Use when student asks for 'এই টাইপের আরেকটা প্রশ্ন দাও', 'একই সূত্রের অন্য বোর্ডের প্রশ্ন দেখাও', or after solving/failing a question to practice similar variations.",
      parameters: {
        type: "object",
        properties: {
          question_id: {
            type: "string",
            description: "Target question ID (e.g. 'q_035046') if available from previous context"
          },
          query_text: {
            type: "string",
            description: "The question text, formula, or concept (e.g. 'মুক্তভাবে পড়ন্ত বস্তুর দূরত্ব', 'ওহমের সূত্রে কোনটি স্থির থাকে', 'h ∝ t²')"
          },
          subject: {
            type: "string",
            description: "Subject name or ID, e.g. 'ssc_physics', 'ssc_general_math'"
          },
          limit: {
            type: "number",
            description: "Number of similar questions to return (default 3, max 5)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_chapter_patterns",
      description: "Deep Type-Based Question Pattern Analysis (টাইপভিত্তিক প্রশ্ন প্যাটার্ন বিশ্লেষণ). Analyzes an entire chapter across 10 years of board exams, grouping 300+ questions into 4-6 Master Types. For each type, provides: 1) Master Concept & Core Formula, 2) Board Frequency & Repeat Trend, 3) How Examiners Twist/Spin the question (Examiner Traps), 4) Real Board Examples, 5) 10-Second Shortcut Trick. Use whenever student asks for chapter patterns, types, blueprint, or shortcuts (e.g. 'গতির টাইপগুলো বুঝিয়ে দাও', 'ত্রিকোণমিতির কমন প্যাটার্ন কী কী?').",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject name (e.g. 'পদার্থবিজ্ঞান', 'সাধারণ গণিত', 'রসায়ন', 'উচ্চতর গণিত')"
          },
          chapter: {
            type: "string",
            description: "Chapter name or number (e.g. 'গতি', 'বল', 'কাজ ক্ষমতা ও শক্তি', 'ত্রিকোণমিতি', 'পরিসংখ্যান')"
          }
        },
        required: ["subject", "chapter"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "query_question_database_sql",
      description: "Execute custom dynamic read-only SQL (SELECT queries) directly against the 50,855-question Turso LibSQL database. Use this tool whenever the student asks an ad-hoc, complex, cross-board, statistical, or comparative question that standard tools cannot answer (e.g. '২০২৪-২০২৬ সালে ত্বরণ নিয়ে কতটি বহুপদী প্রশ্ন এসেছে?', 'কোন বোর্ডে কাজ ও শক্তি থেকে সবচেয়ে বেশি প্রশ্ন এসেছে?', 'ক্যাডেট কলেজের প্রশ্নগুলোর প্যাটার্ন কেমন?').\n\nAVAILABLE TABLES & EXACT SCHEMA:\n1. questions (id, subject_id, exam_id, chapter_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution)\n   - tags: Format is '[Board/College] [Year]' e.g. 'DB 26', 'RB 25', 'CB 24', 'Din B 23', 'RCC 25', 'RUMC 24', or comma-separated 'GLHSD 24,JB 23,DIN.B 20'. For year 2024-2026, use (tags LIKE '% 24%' OR tags LIKE '% 25%' OR tags LIKE '% 26%').\n   - type: Values in DB are 'MCQ', 'CQ_4', 'CQ_3', 'WRITTEN'. Note: বহুপদী সমাপ্তিসূচক প্রশ্ন are in type = 'MCQ' and contain 'নিচের কোনটি সঠিক' or 'i.' in question_text.\n   - subject_id: 'ssc_physics', 'ssc_general_math', 'ssc_higher_math', 'ssc_chemistry', 'ssc_biology', 'ssc_ict', 'ssc_bangla_1st', 'ssc_bangla_2nd', 'ssc_english_1st', 'ssc_english_2nd', 'ssc_bgs', 'ssc_islam'\n2. subjects (id, name, slug, category)\n3. chapters (id, subject_id, name, order_num)\n4. exams (id, subject_id, name, q_count, duration, tags)\n5. chapter_types (id, subject_id, chapter_id, type_no, type_name, core_concept, core_formula, examiner_traps, shortcut_trick, frequency_count)\n6. question_patterns (question_id, type_id, spin_style, cognitive_level)\n7. question_vectors (qid, emb) [1024-dim vector blob, supports vector_distance_cos(a, b)]\n\nRULES:\n- Only read-only queries (SELECT / WITH) are allowed. Destructive queries (DROP/DELETE/UPDATE/INSERT/ALTER) will be rejected.\n- Always include a reasonable LIMIT (e.g. LIMIT 15) to keep context fast and clean.",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "The SQLite/LibSQL SELECT query to execute against the database."
          },
          explanation: {
            type: "string",
            description: "A brief 1-line reason/explanation in Bengali or English for why this query is being executed."
          }
        },
        required: ["sql"]
      }
    }
  }
];

// Automatically equip all agent tools with academic_intent for authentic AI thinking
for (const t of AGENT_TOOLS) {
  if (t.function?.parameters?.properties) {
    t.function.parameters.properties.academic_intent = {
      type: "string",
      description: "বাধ্যতামূলক: বাংলায় ১-২ বাক্যে তোমার সুনির্দিষ্ট অ্যাকাডেমিক উদ্দেশ্য ও চিন্তাভাবনা (যেমন: কোন বিষয়ের কোন অধ্যায়/টপিক নিয়ে কাজ করছ এবং পরীক্ষকের উদ্দেশ্য কী)"
    };
  }
}

// Execute a single tool call dynamically
export async function executeAgentTool(toolName, args) {
  switch (toolName) {
    case "get_subject_chapters": {
      const subj = normalizeSubject(args.subject) || args.subject || "ssc_general_math";
      const cacheKey = `tool:get_subject_chapters:${subj}`;
      const cached = appCache.get(cacheKey);
      if (cached) return cached;

      const sql = `
        SELECT c.id, c.name, c.order_num, COUNT(q.id) as question_count 
        FROM chapters c 
        LEFT JOIN questions q ON c.id = q.chapter_id 
        WHERE c.subject_id = '${subj}' 
        GROUP BY c.id, c.name, c.order_num 
        ORDER BY CAST(c.order_num AS INTEGER) ASC;
      `;
      const res = await executeRawSql(sql);
      const subjNameRes = await executeRawSql(`SELECT name FROM subjects WHERE id = '${subj}' LIMIT 1;`);
      const subjectName = subjNameRes.rows[0]?.name || subj;

      const bnDigits = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
      const toBn = (n) => String(n).replace(/[0-9]/g, d => bnDigits[d] || d);

      const numberedChapters = res.rows.map(r => {
        const ord = r.order_num ? `অধ্যায় ${toBn(r.order_num)}: ` : "";
        const cnt = parseInt(r.question_count) || 0;
        return `${ord}${r.name} (${toBn(cnt)}টি প্রশ্ন)`;
      });

      // Rich syllabus breakdown for Bangla 1st Paper
      if (subj === "ssc_bangla_1st") {
        return {
          subject: "বাংলা ১ম পত্র (সাহিত্য কণিকা ও সহপাঠ)",
          total_chapters: 3,
          divisions: {
            "গদ্য অংশ (মূল পাঠ্যবইয়ে মোট ১৫টি গদ্য)": [
              "১. শুভা — রবীন্দ্রনাথ ঠাকুর",
              "২. বই পড়া — প্রমথ চৌধুরী",
              "৩. অভাগীর স্বর্গ — শরৎচন্দ্র চট্টোপাধ্যায়",
              "৪. পল্লীসাহিত্য — মুহম্মদ শহীদুল্লাহ",
              "৫. আম-আঁটির ভেঁপু — বিভূতিভূষণ বন্দ্যোপাধ্যায়",
              "৬. মানুষ মুহম্মদ (স.) — মোহাম্মদ ওয়াজেদ আলী",
              "৭. নিমগাছ — বনফুল",
              "৮. শিক্ষা ও মনুষ্যত্ব — মোতাহের হোসেন চৌধুরী",
              "৯. প্রবাস বন্ধু — সৈয়দ মুজতবা আলী",
              "১০. ৭১-এর দিনগুলি — জাহানারা ইমাম",
              "১১. সাহিত্যের রূপ ও রীতি — হায়াৎ মামুদ",
              "১২. নিয়তি — হুমায়ূন আহমেদ",
              "১৩. উপেক্ষিত শক্তির উদ্বোধন — কাজী নজরুল ইসলাম",
              "১৪. একাত্তরের দিনগুলি — জাহানারা ইমাম",
              "১৫. পয়লা বৈশাখ — কবীর চৌধুরী"
            ],
            "কবিতা অংশ (মূল পাঠ্যবইয়ে মোট ১৫টি কবিতা)": [
              "১. বঙ্গবাণী — আবদুল হাকিম",
              "২. কপোতাক্ষ নদ — মাইকেল মধুসূদন দত্ত",
              "৩. জীবন-সঙ্গীত — হেমচন্দ্র বন্দ্যোপাধ্যায়",
              "৪. জুতা আবিষ্কার — রবীন্দ্রনাথ ঠাকুর",
              "৫. ঝিঙে ফুল — কাজী নজরুল ইসলাম",
              "৬. প্রাণ — রবীন্দ্রনাথ ঠাকুর",
              "৭. পল্লীজননী — জসীম উদ্‌দীন",
              "৮. রানার — সুকান্ত ভট্টাচার্য",
              "৯. তোমাকে পাওয়ার জন্য হে স্বাধীনতা — শামসুর রাহমান",
              "১০. আমার পরিচয় — সৈয়দ শামসুল হক",
              "১১. স্বাধীনতা এ শব্দটি কীভাবে আমাদের হলো — নির্মলেন্দু গুণ",
              "১২. সাহসী জননী বাংলা — কামাল চৌধুরী",
              "১৩. সেইদিন এই মাঠ — জীবনানন্দ দাশ",
              "১৪. আশা — সিকান্দার আবু জাফর",
              "১৫. বৃষ্টি — রবীন্দ্রনাথ ঠাকুর"
            ],
            "সহপাঠ অংশ (উপন্যাস ও নাটক)": [
              "উপন্যাস: 'কাকতাড়ুয়া' — সেলিনা হোসেন",
              "নাটক: 'বহিপীর' — সৈয়দ ওয়ালীউল্লাহ"
            ]
          },
          numbered_chapters: [
            "অধ্যায় ১: গদ্য অংশ (মূল বইয়ে ১৫টি গদ্য/প্রবন্ধ, শর্ট সিলেবাসে ১০-১১টি)",
            "অধ্যায় ২: কবিতা অংশ (মূল বইয়ে ১৫টি কবিতা)",
            "অধ্যায় ৩: বাংলা সহপাঠ (উপন্যাস 'কাকতাড়ুয়া' ও নাটক 'বহিপীর')"
          ],
          total_questions_in_subject: res.rows.reduce((sum, r) => sum + (parseInt(r.question_count) || 0), 0),
          instructions_for_mentor: "শিক্ষার্থী গদ্য বা কবিতা জানতে চাইলে স্পষ্ট করে বলবে: মূল পাঠ্যবইয়ে মোট ১৫টি গদ্য (শর্ট সিলেবাসে সাধারণত ১০ বা ১১টি) এবং ১৫টি কবিতা আছে। একই সাথে পুরো ১৫টি গদ্যের (বা কবিতার) নাম লেখকসহ সুন্দর বুলেট তালিকায় একবারে উপস্থাপন করবে যাতে শিক্ষার্থীকে আর পুনরায় জিজ্ঞাসা করতে না হয়। ভুলেও ৪টি বা ভুল কোনো সংখ্যা বলবে না।"
        };
      }

      // Bangla 2nd Paper breakdown
      if (subj === "ssc_bangla_2nd") {
        return {
          subject: "বাংলা ২য় পত্র (ব্যাকরণ ও নির্মিতি)",
          total_chapters: 2,
          divisions: {
            "ব্যাকরণ অংশ (৩০ নম্বর)": [
              "১. ধ্বনিতত্ত্ব ও বর্ণ",
              "২. সন্ধি ও ধ্বনির পরিবর্তন",
              "৩. ণ-ত্ব ও ষ-ত্ব বিধান",
              "৪. শব্দ প্রকরণ ও পদাশ্রিত নির্দেশক",
              "৫. সমাস ও উপসর্গ",
              "৬. প্রত্যয় ও পদ প্রকরণ",
              "৭. বাক্য প্রকরণ ও বাচ্য",
              "৮. বিরাম চিহ্ন বা যতিচিহ্ন",
              "৯. প্রবাদ-প্রবচন ও বাগধারা",
              "১০. বিপরীতার্থক শব্দ ও সমার্থক শব্দ"
            ],
            "নির্মিতি অংশ (৭০ নম্বর)": [
              "১. অনুচ্ছেদ রচনা",
              "২. পত্র ও দরখাস্ত লিখন",
              "৩. সারাংশ ও সারমর্ম লিখন",
              "৪. ভাব-সম্প্রসারণ",
              "৫. প্রতিবেদন প্রণয়ন",
              "৬. প্রবন্ধ / রচনা লিখন"
            ]
          },
          numbered_chapters: [
            "বিভাগ ১: ব্যাকরণ অংশ (মোট ৩০ নম্বরের বহুনির্বাচনী/প্রশ্ন)",
            "বিভাগ ২: নির্মিতি অংশ (মোট ৭০ নম্বরের বর্ণনামূলক অংশ)"
          ],
          total_questions_in_subject: res.rows.reduce((sum, r) => sum + (parseInt(r.question_count) || 0), 0),
          instructions_for_mentor: "বাংলা ২য় পত্রে ব্যাকরণ (৩০ নম্বর) ও নির্মিতি (৭০ নম্বর) — এই দুটি প্রধান অংশ রয়েছে। সুন্দর বুলেট আকারে উপস্থাপন করো।"
        };
      }

      // ICT breakdown
      if (subj === "ssc_ict") {
        return {
          subject: "তথ্য ও যোগাযোগ প্রযুক্তি (ICT)",
          total_chapters: 6,
          numbered_chapters: [
            "অধ্যায় ১: তথ্য ও যোগাযোগ প্রযুক্তি এবং আমাদের বাংলাদেশ",
            "অধ্যায় ২: কম্পিউটার ও কম্পিউটার ব্যবহারকারীর নিরাপত্তা",
            "অধ্যায় ৩: আমার শিক্ষায় ইন্টারনেট",
            "অধ্যায় ৪: আমার লেখালেখি ও হিসাব",
            "অধ্যায় ৫: মাল্টিমিডিয়া ও গ্রাফিক্স",
            "অধ্যায় ৬: ডেটাবেস-এর ব্যবহার"
          ],
          total_questions_in_subject: 2026,
          instructions_for_mentor: "আইসিটিতে মূল পাঠ্যবইয়ে মোট ৬টি অধ্যায় রয়েছে। অধ্যায়গুলোর নাম সুন্দর বুলেট আকারে উপস্থাপন করো।"
        };
      }

      // English 1st Paper breakdown
      if (subj === "ssc_english_1st") {
        return {
          subject: "English 1st Paper (English For Today)",
          total_chapters: 2,
          divisions: {
            "Part A: Reading Test (50 Marks)": [
              "1. Seen Passage 1 (Multiple Choice Questions & Answering Questions)",
              "2. Seen Passage 2 (Gap Filling without clues)",
              "3. Information Transfer / Cloze test with clues",
              "4. Summarizing",
              "5. Matching sentences"
            ],
            "Part B: Writing Test (50 Marks)": [
              "1. Writing a Paragraph",
              "2. Completing a Story",
              "3. Describing Graphs / Charts",
              "4. Writing Informal Letter / Email",
              "5. Writing Dialogue"
            ]
          },
          numbered_chapters: [
            "Part A: Reading Test (Total 50 marks)",
            "Part B: Guided Writing Test (Total 50 marks)"
          ],
          total_questions_in_subject: 1017,
          instructions_for_mentor: "English 1st Paper consists of Part A: Reading Test (50 marks) and Part B: Writing Test (50 marks). Present the breakdown in clean markdown bullets."
        };
      }

      // English 2nd Paper breakdown
      if (subj === "ssc_english_2nd") {
        return {
          subject: "English 2nd Paper (Grammar & Composition)",
          total_chapters: 2,
          divisions: {
            "Part A: Grammar (60 Marks)": [
              "1. Gap filling activities with clues (prepositions, articles, parts of speech)",
              "2. Gap filling activities without clues",
              "3. Substitution Table",
              "4. Right form of verbs",
              "5. Narrative Style / Direct and Indirect Speech",
              "6. Changing Sentences (Voice, Degree, Affirmative to Negative, Simple-Complex-Compound)",
              "7. Completing Sentences (Conditionals, Infinitives, Gerunds)",
              "8. Use of Suffix and Prefix",
              "9. Tag Questions",
              "10. Sentence Connectors / Linkers",
              "11. Punctuation and Capitalization"
            ],
            "Part B: Composition (40 Marks)": [
              "1. Writing CV with Cover Letter",
              "2. Formal Letter / Complaint Letter / Notice",
              "3. Writing Paragraph"
            ]
          },
          numbered_chapters: [
            "Part A: Grammar (11 items, total 60 marks)",
            "Part B: Composition (3 items, total 40 marks)"
          ],
          total_questions_in_subject: 1616,
          instructions_for_mentor: "English 2nd Paper consists of Part A: Grammar (60 marks, 11 grammar topics) and Part B: Composition (40 marks). Present all topics clearly."
        };
      }

      const finalRes = {
        subject: subjectName,
        total_chapters: res.rows.length,
        total_questions_in_subject: res.rows.reduce((sum, r) => sum + (parseInt(r.question_count) || 0), 0),
        numbered_chapters: numberedChapters,
        instructions_for_mentor: "উত্তর দেওয়ার সময় অধ্যায়গুলো সুন্দরভাবে নম্বর ও বুলেট তালিকা আকারে উপস্থাপন করো।"
      };
      appCache.set(cacheKey, finalRes, 3600);
      return finalRes;
    }

    case "check_board_frequency": {
      const topic = (args.topic || "").replace(/'/g, "''").trim();
      
      // Check if topic matches an official chapter
      const matchedChapter = await findChapterCached({ topic, chapter: topic, subject: args.subject }, args.subject);
      const whereClause = matchedChapter 
        ? `(chapter_id = '${matchedChapter.id}' OR question_text LIKE '%${topic}%')`
        : `question_text LIKE '%${topic}%'`;

      const countRes = await executeRawSql(`SELECT COUNT(*) as c FROM questions WHERE ${whereClause};`);
      const total = parseInt(countRes.rows[0]?.c || 0);

      const tagsRes = await executeRawSql(`SELECT tags, COUNT(*) as c FROM questions WHERE ${whereClause} AND tags IS NOT NULL AND tags != '' GROUP BY tags ORDER BY c DESC LIMIT 25;`);

      const recentBoards = [];
      const pastBoards = [];
      const topColleges = [];

      for (const row of tagsRes.rows) {
        const t = row.tags;
        const count = parseInt(row.c);
        const formatted = `${formatTag(t)} (${toBengaliNumber(count)} বার এসেছে)`;
        
        const isCollege = t.includes("CC") || t.includes("BNMPC") || t.includes("RUMC") || t.includes("SJHSS") || t.includes("RCPC") || t.includes("ACC") || t.includes("VNSC") || t.includes("ISCM") || t.includes("DRMC");
        const isRecent = t.includes("24") || t.includes("25") || t.includes("26") || t.includes("23");

        if (isCollege) {
          if (topColleges.length < 5) topColleges.push(formatted);
        } else if (isRecent) {
          if (recentBoards.length < 5) recentBoards.push(formatted);
        } else {
          if (pastBoards.length < 5) pastBoards.push(formatted);
        }
      }

      // Dynamically extract recurring concepts and examiner traps from database
      let recurringConcepts = [];
      let examinerTraps = [];

      if (matchedChapter) {
        const typesRes = await executeRawSql(`SELECT type_name, core_concept, core_formula, examiner_traps FROM chapter_types WHERE chapter_id = '${matchedChapter.id}' LIMIT 3;`);
        if (typesRes.rows.length > 0) {
          recurringConcepts = typesRes.rows.map(t => `${t.type_name}${t.core_formula ? ' (' + t.core_formula + ')' : ''}`);
          examinerTraps = typesRes.rows.filter(t => t.examiner_traps).map(t => `${t.type_name}: ${t.examiner_traps}`);
        }
      }

      if (recurringConcepts.length === 0) {
        // Query sample questions for live recurring patterns
        const samplePatternsRes = await executeRawSql(`SELECT question_text FROM questions WHERE ${whereClause} AND question_text != '' AND (tags LIKE '%25%' OR tags LIKE '%24%' OR tags LIKE '%23%' OR tags LIKE '%DB%') LIMIT 3;`);
        if (samplePatternsRes.rows.length > 0) {
          recurringConcepts = samplePatternsRes.rows.map(q => {
            const clean = (q.question_text || "").replace(/\n+/g, " ").slice(0, 90).trim();
            return clean.length === 90 ? `${clean}...` : clean;
          });
        }
      }

      return {
        topic,
        chapter_identified: matchedChapter ? matchedChapter.name : null,
        total_questions: total,
        importance_rating: total > 200 ? "⭐⭐⭐ (টপ প্রায়োরিটি / মাস্ট-রিড অধ্যায়)" : total > 80 ? "⭐⭐ (গুরুত্বপূর্ণ অধ্যায়)" : "⭐ (বেসিক অধ্যায়)",
        recent_board_appearances: recentBoards,
        past_board_appearances: pastBoards,
        top_cadet_and_model_colleges: topColleges,
        frequent_topic_patterns: recurringConcepts.length > 0 ? recurringConcepts : undefined,
        examiner_traps_identified: examinerTraps.length > 0 ? examinerTraps : undefined
      };
    }

    case "get_board_exam_questions": {
      const bName = args.board_name || "ঢাকা";
      const bCode = normalizeBoard(bName) || "DB";

      let yrCode = null;
      if (args.year) {
        const yStr = String(args.year).replace(/[^0-9]/g, '');
        yrCode = yStr.length === 4 ? yStr.slice(2) : yStr;
      }

      let qWhere = [`tags LIKE '%${bCode}%'`, `question_text != ''`];
      if (yrCode) {
        qWhere.push(`(tags LIKE '%${bCode} ${yrCode}%' OR tags LIKE '%${yrCode}%')`);
      }

      const mcqRes = await executeRawSql(`SELECT question_text, option_a, option_b, option_c, option_d, answer, tags, subject_id FROM questions WHERE ${qWhere.join(" AND ")} AND type = 'MCQ' AND answer != '' LIMIT 25;`);
      if (mcqRes.rows.length > 2) {
        mcqRes.rows = mcqRes.rows.sort(() => Math.random() - 0.5).slice(0, 2);
      }
      const cqRes = await executeRawSql(`SELECT question_text, option_a, option_b, option_c, option_d, tags, subject_id FROM questions WHERE ${qWhere.join(" AND ")} AND type IN ('CQ_4', 'CQ_3', 'CQ_N') LIMIT 25;`);
      if (cqRes.rows.length > 1) {
        cqRes.rows = [cqRes.rows[Math.floor(Math.random() * cqRes.rows.length)]];
      }

      return {
        board: bName,
        year: args.year || "সকল বছর",
        sample_mcq: mcqRes.rows.map(r => ({ ...r, formatted_source: formatTag(r.tags), all_board_tags: r.tags })),
        sample_cq: cqRes.rows[0] ? { ...cqRes.rows[0], formatted_source: formatTag(cqRes.rows[0].tags), all_board_tags: cqRes.rows[0].tags } : null,
        instructions_for_mentor: "শিক্ষার্থীকে এই বোর্ডের ও নির্দিষ্ট সালের প্রশ্ন ও অপশন উপস্থাপন করো। যদি প্রশ্নটি একাধিক বোর্ডে বা কলেজে এসে থাকে তবে [বোর্ড: " + (mcqRes.rows[0]?.tags || bCode) + "] উল্লেখ করবে।"
      };
    }

    case "get_creative_question": {
      let subjId = normalizeSubject(args.subject);

      const matchedChapterInfo = await findChapterCached(args, subjId);
      const rawT = [args.chapter, args.topic, args.query].filter(Boolean).join(" ");
      if (matchedChapterInfo && matchedChapterInfo.subject_id) {
        subjId = matchedChapterInfo.subject_id;
      }
      const matchedCqChapterId = matchedChapterInfo ? matchedChapterInfo.id : null;

      // Board filter
      const boardTag = normalizeBoard(args.board);

      // Year filter (supports ranges like '2020-2025')
      const years = parseYearFilter(args.year);

      // Difficulty level
      const diff = args.difficulty || (args.board ? "standard" : "hard");

      // Extract search keywords for this chapter/topic
      const chapterKeywords = extractChapterKeywords(rawT, matchedChapterInfo, subjId);

      // Two-Tier Chapter Lookup:
      // Tier 1: If verified chapter ID matched, strictly query that chapter first!
      let chapterConditionSql = matchedCqChapterId ? `chapter_id = '${matchedCqChapterId}'` : "";
      if (!chapterConditionSql && chapterKeywords.length > 0) {
        const kwSql = chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
        chapterConditionSql = `(${kwSql})`;
      }

      // In-Memory Question Pool Cache for ultra-fast instant 0ms responses!
      const yrKey = years.length > 0 ? years.join('_') : 'all';
      const poolKey = `cq_pool:${subjId || 'any'}:${matchedCqChapterId || 'none'}:${boardTag || 'none'}:${yrKey}:${diff}`;
      let qRows = appCache.get(poolKey);
      console.log(`[CQ Tool] poolKey="${poolKey}", cacheHit=${Boolean(qRows && qRows.length)}`);

      if (!qRows || qRows.length === 0) {
        const baseConditions = [`type IN ('CQ_4', 'CQ_3', 'CQ_N')`, `(question_text != '' OR question_html != '' OR option_c != '')`];
        if (subjId) baseConditions.push(`subject_id = '${subjId}'`);
        if (chapterConditionSql) baseConditions.push(chapterConditionSql);

        let whereClauses = [...baseConditions];

        if (years.length > 0) {
          whereClauses.push(buildYearSqlConditions(boardTag, years));
        } else if (boardTag && boardTag !== "RANDOM") {
          whereClauses.push(`tags LIKE '%${boardTag}%'`);
        } else {
          whereClauses.push(`tags != '' AND tags IS NOT NULL`);
        }

        if (diff === "hard") {
          if (!boardTag || boardTag === "RANDOM") {
            whereClauses.push(`(type = 'CQ_4' OR tags LIKE '%RCC%' OR tags LIKE '%MCC%' OR tags LIKE '%RUMC%' OR tags LIKE '%DRMC%')`);
          } else {
            whereClauses.push(`(type = 'CQ_4' OR option_d != '')`);
          }
        } else if (diff === "medium") {
          whereClauses.push(`type IN ('CQ_3', 'CQ_4')`);
        }

        // Fast query with recent-year priority!
        let sql = `
          SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
          FROM questions
          WHERE ${whereClauses.join(" AND ")}
          ${RECENT_YEAR_ORDER_BY}
          LIMIT 80;
        `;
        let res = await executeRawSql(sql);

        // Fallback 1: If board + year was too strict, try requested years across ANY board first!
        if (res.rows.length === 0 && boardTag && boardTag !== "RANDOM" && years.length > 0) {
          const yrAllBoards = buildYearSqlConditions(null, years);
          const fb1 = [...baseConditions, yrAllBoards];
          sql = `
            SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
            FROM questions
            WHERE ${fb1.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        // Fallback 2: If still empty, try board without year restriction
        if (res.rows.length === 0 && boardTag && boardTag !== "RANDOM") {
          const fb2 = [...baseConditions, `tags LIKE '%${boardTag}%'`];
          sql = `
            SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
            FROM questions
            WHERE ${fb2.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        // Fallback 3: Any authentic question in this chapter
        if (res.rows.length === 0) {
          const fb3 = [...baseConditions, `tags != '' AND tags IS NOT NULL`];
          sql = `
            SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
            FROM questions
            WHERE ${fb3.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        // Fallback 3.5: If verified chapter ID had 0 questions, check unmapped questions using concepts
        if (res.rows.length === 0 && chapterKeywords.length > 0) {
          const kwSql = chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
          const fbUnmapped = [`type IN ('CQ_4', 'CQ_3', 'CQ_N')`, `(question_text != '' OR question_html != '' OR option_c != '')`, `(chapter_id NOT LIKE 'ch_%' AND (${kwSql}))`];
          if (subjId) fbUnmapped.push(`subject_id = '${subjId}'`);
          let fbUnmappedWhere = [...fbUnmapped];
          if (boardTag && boardTag !== "RANDOM") {
            fbUnmappedWhere.push(`tags LIKE '%${boardTag}%'`);
          } else {
            fbUnmappedWhere.push(`tags != '' AND tags IS NOT NULL`);
          }
          sql = `
            SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
            FROM questions
            WHERE ${fbUnmappedWhere.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        // Fallback 4: General subject fallback ONLY IF user did not specify chapter/topic
        if (res.rows.length === 0 && !rawT) {
          const fb4 = [`type IN ('CQ_4', 'CQ_3', 'CQ_N')`, `(question_text != '' OR question_html != '' OR option_c != '')`];
          if (subjId) fb4.push(`subject_id = '${subjId}'`);
          sql = `
            SELECT id, question_text, question_html, option_a, option_b, option_c, option_d, tags, type, chapter_id, subject_id
            FROM questions
            WHERE ${fb4.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        qRows = res.rows;
        if (qRows && qRows.length > 0) {
          appCache.set(poolKey, qRows, 600);
        }
      }

      // Sample prioritizing the most recent available years in qRows
      const topCqSlice = qRows ? qRows.slice(0, Math.min(qRows.length, 6)) : [];
      const q = topCqSlice.length > 0 ? topCqSlice[Math.floor(Math.random() * topCqSlice.length)] : null;
      if (!q) return { error: "কোনো সৃজনশীল প্রশ্ন পাওয়া যায়নি" };

      const bnDigits = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
      const toBnDigits = s => String(s || '').replace(/[0-9]/g, d => bnDigits[d] || d);
      const allChapters = await getAllChaptersCached();
      const chObj = allChapters.find(c => c.id === q.chapter_id);
      const chName = chObj?.name || matchedChapterInfo?.name || "";
      const chOrder = chObj?.order_num || matchedChapterInfo?.order_num || "";
      const chapterDisplay = chName ? `অধ্যায় ${toBnDigits(chOrder)}: ${chName}` : "বোর্ড সৃজনশীল প্রশ্ন";

      return {
        question_id: q.id,
        actual_chapter: {
          id: q.chapter_id,
          order_num: chOrder,
          name: chName,
          display: chapterDisplay
        },
        difficulty_level: diff === "hard" ? "কঠিন / অ্যাডভান্সড (উচ্চতর দক্ষতা)" : diff === "medium" ? "মাঝারি (বোর্ড স্ট্যান্ডার্ড)" : "সহজ (বেসিক)",
        board_tag: formatTag(q.tags),
        raw_tag: q.tags,
        stem: q.question_text || q.question_html || "নিচের উদ্দীপকটি লক্ষ করো এবং সংশ্লিষ্ট প্রশ্নগুলোর উত্তর দাও:",
        part_ka: q.option_a || "জ্ঞানমূলক প্রশ্ন",
        part_kha: q.option_b || "অনুধাবনমূলক প্রশ্ন",
        part_ga: q.option_c || "প্রয়োগমূলক প্রশ্ন (৩ নম্বর)",
        part_gha: q.option_d || "উচ্চতর দক্ষতা (৪ নম্বর)",
        examiner_marking_guide: {
          part_ka: "জ্ঞানমূলক (১ নম্বর): ভূমিকা ছাড়া সরাসরি ১ লাইনে সঠিক সংজ্ঞা লিখলে পুরো ১ নম্বর পাওয়া যাবে।",
          part_kha: "অনুধাবনমূলক (২ নম্বর): স্পষ্ট ২টি আলাদা প্যারায় লিখতে হবে। ১ম প্যারায় মূল উত্তর (১ লাইন), ২য় প্যারায় ৩-৪ লাইনে কারণ বা ব্যাখ্যা।",
          part_ga: "প্রয়োগমূলক (৩ নম্বর): দেওয়া আছে তথ্য -> সূত্র -> মান বসানো -> হিসাব -> এককসহ উত্তর। (সতর্কতা: একক না দিলে স্যার ১ নম্বর কেটে নেন!)",
          part_gha: "উচ্চতর দক্ষতা (৪ নম্বর): গাণিতিক প্রমাণ বা যৌক্তিক বিশ্লেষণের পর স্পষ্ট সিদ্ধান্তমূলক সমাপনী বাক্য (যেমন: 'অতএব উদ্দীপকের উক্তিটি সঠিক') লেখা বাধ্যতামূলক।"
        },
        instructions_for_mentor: `সৃজনশীল প্রশ্ন উপস্থাপনের সময় শিরোনামে এই প্রশ্নের আসল অধ্যায় [${chapterDisplay}] এবং বোর্ড/কলেজ ট্যাগ [${formatTag(q.tags)}] স্পষ্টভাবে উল্লেখ করবে। ভুলেও ভুল বা অন্য কোনো অধ্যায়ের নাম লিখবে না! সৃজনশীল প্রশ্ন কুইজ নয়, তাই কোনো অপশন নির্বাচন করতে বলবে না—বরং শিক্ষার্থীকে উদ্দীপক পড়ে ক, খ, গ, ঘ সমাধান করতে বলবে।`
      };
    }

    case "get_mcq_quiz": {
      let subjId = normalizeSubject(args.subject);
      const isMockTest = args.mode === "mock_test";
      const count = Math.min(parseInt(args.count) || (isMockTest ? 1 : 2), 5);

      const boardTag = normalizeBoard(args.board);

      // Year matching (supports ranges like '2020-2025')
      const years = parseYearFilter(args.year);

      const matchedChapterInfo = await findChapterCached(args, subjId);
      const rawT = [args.chapter, args.topic, args.query].filter(Boolean).join(" ");
      if (matchedChapterInfo && matchedChapterInfo.subject_id) {
        subjId = matchedChapterInfo.subject_id;
      }
      const matchedMcqChapterId = matchedChapterInfo ? matchedChapterInfo.id : null;

      // Extract search keywords for this chapter/topic
      const chapterKeywords = extractChapterKeywords(rawT, matchedChapterInfo, subjId);

      // Two-Tier Chapter Lookup:
      // Tier 1: If verified chapter ID matched, strictly query that chapter first!
      let chapterConditionSql = matchedMcqChapterId ? `chapter_id = '${matchedMcqChapterId}'` : "";
      if (!chapterConditionSql && chapterKeywords.length > 0) {
        const kwSql = chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
        chapterConditionSql = `(${kwSql})`;
      }

      const diff = args.difficulty || "medium";

      // In-Memory Question Pool Cache for ultra-fast instant 0ms responses!
      const yrKey = years.length > 0 ? years.join('_') : 'all';
      const poolKey = `mcq_pool:${subjId || 'any'}:${matchedMcqChapterId || 'none'}:${boardTag || 'none'}:${yrKey}:${diff}`;
      let qRows = appCache.get(poolKey);

      if (!qRows || qRows.length === 0) {
        const baseConditions = [`question_text != ''`, `answer != ''`, `type = 'MCQ'`];
        if (subjId) baseConditions.push(`subject_id = '${subjId}'`);
        if (chapterConditionSql) baseConditions.push(chapterConditionSql);

        let whereClauses = [...baseConditions];

        if (years.length > 0) {
          whereClauses.push(buildYearSqlConditions(boardTag, years));
        } else if (boardTag && boardTag !== "RANDOM") {
          whereClauses.push(`tags LIKE '%${boardTag}%'`);
        } else {
          // Strictly prioritize authentic questions with actual board/college tags!
          whereClauses.push(`tags != '' AND tags IS NOT NULL`);
        }

        if (diff === "hard") {
          whereClauses.push(`(tags LIKE '%CC%' OR tags LIKE '%RUMC%' OR tags LIKE '%DRMC%' OR tags LIKE '%SJHSS%' OR question_text LIKE '%নিচের কোনটি সঠিক%' OR question_text LIKE '%i.%')`);
        } else if (diff === "easy") {
          whereClauses.push(`question_text NOT LIKE '%নিচের কোনটি সঠিক%' AND LENGTH(question_text) < 100`);
        }

        // Fast join-free query with recent-year priority!
        let sql = `
          SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
          FROM questions
          WHERE ${whereClauses.join(" AND ")}
          ${RECENT_YEAR_ORDER_BY}
          LIMIT 80;
        `;
        let res = await executeRawSql(sql);

        // Fallback 1: If board + year was too restrictive, try requested years across ANY authentic board first!
        if (res.rows.length === 0 && boardTag && boardTag !== "RANDOM" && years.length > 0) {
          const yrAllBoards = buildYearSqlConditions(null, years);
          const fbWhere1 = [...baseConditions, yrAllBoards];
          sql = `
            SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
            FROM questions
            WHERE ${fbWhere1.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        // Fallback 2: Try board without year restriction
        if (res.rows.length === 0 && boardTag && boardTag !== "RANDOM") {
          const fbWhere2 = [...baseConditions, `tags LIKE '%${boardTag}%'`];
          sql = `
            SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
            FROM questions
            WHERE ${fbWhere2.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        // Fallback 3: If this specific board has no questions in this chapter, try without board filter (get any authentic board question)
        if (res.rows.length === 0) {
          const fbWhere3 = [...baseConditions, `tags != '' AND tags IS NOT NULL`];
          sql = `
            SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
            FROM questions
            WHERE ${fbWhere3.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        // Fallback 3.5: If verified chapter had 0 questions, check unmapped questions using concepts
        if (res.rows.length === 0 && chapterKeywords.length > 0) {
          const kwSql = chapterKeywords.map(k => `question_text LIKE '%${k.replace(/'/g, "''")}%'`).join(' OR ');
          const fbUnmapped = [`question_text != ''`, `answer != ''`, `type = 'MCQ'`, `(chapter_id NOT LIKE 'ch_%' AND (${kwSql}))`];
          if (subjId) fbUnmapped.push(`subject_id = '${subjId}'`);
          let fbUnmappedWhere = [...fbUnmapped];
          if (boardTag && boardTag !== "RANDOM") {
            fbUnmappedWhere.push(`tags LIKE '%${boardTag}%'`);
          } else {
            fbUnmappedWhere.push(`tags != '' AND tags IS NOT NULL`);
          }
          sql = `
            SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
            FROM questions
            WHERE ${fbUnmappedWhere.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        // Fallback 4: General subject fallback ONLY IF user did not specify chapter/topic
        if (res.rows.length === 0 && !rawT) {
          const fbWhere4 = [`question_text != ''`, `answer != ''`, `type = 'MCQ'`];
          if (subjId) fbWhere4.push(`subject_id = '${subjId}'`);
          if (boardTag && boardTag !== "RANDOM") fbWhere4.push(`tags LIKE '%${boardTag}%'`);
          sql = `
            SELECT id, question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id, chapter_id
            FROM questions
            WHERE ${fbWhere4.join(" AND ")}
            ${RECENT_YEAR_ORDER_BY}
            LIMIT 80;
          `;
          res = await executeRawSql(sql);
        }

        qRows = res.rows;
        if (qRows && qRows.length > 0) {
          appCache.set(poolKey, qRows, 600);
        }
      }

      // Sample prioritizing the most recent available years in qRows
      const topSlice = qRows ? qRows.slice(0, Math.max(count * 4, 8)) : [];
      let sampled = topSlice.length > 0 ? [...topSlice].sort(() => Math.random() - 0.5).slice(0, count) : [];
      let res = { rows: sampled };

      if (!res.rows || res.rows.length === 0) {
        return {
          subject: subjId || "all",
          quiz: [],
          status: "not_found",
          message: "নির্দিষ্ট অধ্যায়ে কোনো বহুনির্বাচনী প্রশ্ন পাওয়া যায়নি।"
        };
      }

      const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
      const rawAns = res.rows[0]?.answer || '';
      const normAns = toBnAns[rawAns] || rawAns || 'খ';

      const bnDigits = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
      const toBnDigits = s => String(s || '').replace(/[0-9]/g, d => bnDigits[d] || d);
      const allChapters = await getAllChaptersCached();
      const chObj = allChapters.find(c => c.id === (res.rows[0]?.chapter_id || matchedMcqChapterId));
      const chName = chObj?.name || matchedChapterInfo?.name || "";
      const chOrder = chObj?.order_num || matchedChapterInfo?.order_num || "";
      const chapterDisplay = chName ? `অধ্যায় ${toBnDigits(chOrder)}: ${chName}` : "";

      const qTag = res.rows[0]?.tags || "";
      const hasMatchedBoard = boardTag ? qTag.includes(boardTag) : true;
      const boardWarning = (!hasMatchedBoard && boardTag)
        ? ` (সতর্কতা: শিক্ষার্থী ${args.board} বোর্ডের প্রশ্ন চেয়েছিল, ডেটাবেসে এই অধ্যায়ের ${formatTag(qTag)} প্রশ্ন পাওয়ায় তা দেওয়া হয়েছে। শিক্ষার্থীকে বলবে: "${args.board} বোর্ডের সমমানের চমৎকার একটি বোর্ড প্রশ্ন দিচ্ছি...")`
        : "";

      return {
        subject: subjId || "all",
        actual_chapter: {
          id: res.rows[0]?.chapter_id || matchedMcqChapterId,
          order_num: chOrder,
          name: chName,
          display: chapterDisplay
        },
        board: args.board || "all",
        year: args.year || "all",
        mode: isMockTest ? "mock_test" : "practice",
        difficulty: args.difficulty || "standard",
        quiz: res.rows.map(r => ({
          ...r,
          chapter_name: r.chapter_name,
          chapter_order: r.chapter_order,
          formatted_source: formatTag(r.tags),
          all_board_tags: formatTag(r.tags) || r.tags
        })),
        instructions_for_mentor: "কুইজ মোড: প্রশ্ন, বোর্ড রেফারেন্স [বোর্ড: " + (formatTag(res.rows[0]?.tags) || "বোর্ড স্ট্যান্ডার্ড") + "] ও ৪টি অপশন (ক, খ, গ, ঘ) উপস্থাপন করো। অপশনের শেষে ব্র্যাকেটে [ans: " + normAns + "] লিখবে। ভুলেও 'যেকোনো একটি অপশন নির্বাচন করো' লিখবে না। এই মেসেজে কোনো ব্যাখ্যা বা সঠিক উত্তর টেক্সটে লিখবে না, যাতে কুইজ স্পয়েল না হয়। শিক্ষার্থী অপশন ক্লিক করলে স্বয়ংক্রিয়ভাবে পরবর্তী মেসেজে তুমি পূর্ণাঙ্গ ব্যাখ্যা ও মূল্যায়ন দেবে।" + boardWarning
      };
    }

    case "get_chapter_importance_ranking": {
      const subj = normalizeSubject(args.subject) || args.subject || "ssc_physics";

      const sql = `SELECT c.id, c.name, c.order_num, COUNT(q.id) as q_count FROM chapters c LEFT JOIN questions q ON c.id = q.chapter_id WHERE c.subject_id = '${subj}' GROUP BY c.id, c.name, c.order_num ORDER BY CAST(q_count AS INTEGER) DESC;`;
      const res = await executeRawSql(sql);
      const subjNameRes = await executeRawSql(`SELECT name FROM subjects WHERE id = '${subj}' LIMIT 1;`);
      const subjectName = subjNameRes.rows[0]?.name || subj;

      const bnDigits = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
      const toBn = (n) => String(n).replace(/[0-9]/g, d => bnDigits[d] || d);

      const topTierWithBoardDetails = [];
      const mediumTier = [];
      const foundationTier = [];

      const rows = res.rows;
      const totalQuestionsAnalyzed = rows.reduce((sum, r) => sum + (parseInt(r.q_count) || 0), 0);

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const count = parseInt(r.q_count || 0);

        if (i < 4) {
          // Query real specific board appearances for top priority chapters
          const tagsRes = await executeRawSql(`SELECT tags, COUNT(*) as c FROM questions WHERE chapter_id = '${r.id}' AND tags IS NOT NULL AND tags != '' GROUP BY tags ORDER BY c DESC LIMIT 6;`);
          const boards = tagsRes.rows.map(t => `${formatTag(t.tags)} (${toBengaliNumber(t.c)} বার)`);
          
          topTierWithBoardDetails.push({
            chapter_name: r.name,
            chapter_number: toBn(r.order_num || i + 1),
            total_board_appearances: `${toBn(count)} বার`,
            specific_boards_and_colleges: boards
          });
        } else if (i < 8) {
          mediumTier.push(`অধ্যায় ${toBn(r.order_num || i + 1)}: ${r.name} (বিগত বোর্ডগুলোতে প্রায় ${toBn(count)} বার এসেছে)`);
        } else {
          foundationTier.push(`অধ্যায় ${toBn(r.order_num || i + 1)}: ${r.name} (বিগত বোর্ডগুলোতে প্রায় ${toBn(count)} বার এসেছে)`);
        }
      }

      // Universal dynamic 80/20 high-yield analysis from live database counts
      const top4Count = rows.slice(0, 4).reduce((sum, r) => sum + (parseInt(r.q_count) || 0), 0);
      const top4Percent = totalQuestionsAnalyzed > 0 ? Math.round((top4Count / totalQuestionsAnalyzed) * 100) : 0;

      const highYieldStrategy = {
        core_message: `${subjectName}-এ মোট ${toBn(totalQuestionsAnalyzed)}টি বোর্ড/কলেজ প্রশ্নের মধ্যে শীর্ষ ৪টি অধ্যায় থেকেই এসেছে প্রায় ${toBn(top4Percent)}% প্রশ্ন! এই অধ্যায়গুলো সম্পূর্ণ আয়ত্ত করলে পরীক্ষায় সর্বাধিক নম্বর নিশ্চিত করা সম্ভব।`,
        must_master_chapters: rows.slice(0, 4).map(r => `অধ্যায় ${toBn(r.order_num || '')}: ${r.name} (${toBn(r.q_count)}টি প্রশ্ন)`),
        strategy_recommendation: "পরীক্ষায় পূর্ণ নম্বর কমন পেতে সবার আগে এই শীর্ষ অধ্যায়গুলোর CQ ও ট্রিকি MCQ আয়ত্ত করো, এরপর মাঝারি প্রায়োরিটির অধ্যায়গুলোতে যাও।"
      };

      return {
        subject: subjectName,
        total_chapters_analyzed: rows.length,
        total_questions_analyzed: totalQuestionsAnalyzed,
        most_important_chapter: rows[0]?.name,
        high_yield_strategy: highYieldStrategy,
        top_priority_chapters_with_board_breakdown: topTierWithBoardDetails,
        medium_priority_chapters: mediumTier,
        foundation_chapters: foundationTier,
        instructions_for_mentor: "কমন পাওয়ার কৌশল ও গুরুত্ব সংক্রান্ত প্রশ্নের ক্ষেত্রে ওপরের ডেটা-ভিত্তিক 'high_yield_strategy' ও শীর্ষ অধ্যায়গুলোর বাস্তব বোর্ড পরিসংখ্যান সুন্দর ও পরিষ্কারভাবে উপস্থাপন করো।"
      };
    }

    case "search_question_bank": {
      const query = (args.query || "").replace(/'/g, "''").trim();
      if (!query) return { error: "অনুসন্ধানের জন্য কোনো কীওয়ার্ড বা সূত্র দেওয়া হয়নি" };

      const subjId = normalizeSubject(args.subject);
      const boardTag = normalizeBoard(args.board);
      const years = parseYearFilter(args.year);

      const whereClauses = [
        `(question_text LIKE '%${query}%' OR solution LIKE '%${query}%')`
      ];

      if (subjId) whereClauses.push(`subject_id = '${subjId}'`);

      if (years.length > 0) {
        whereClauses.push(buildYearSqlConditions(boardTag, years));
      } else if (boardTag && boardTag !== "RANDOM") {
        whereClauses.push(`tags LIKE '%${boardTag}%'`);
      }

      if (args.type === "MCQ") {
        whereClauses.push(`type IN ('MCQ', 'MCQ_N')`);
      } else if (args.type === "CQ") {
        whereClauses.push(`type IN ('CQ_4', 'CQ_3', 'CQ_N')`);
      }

      const limit = Math.min(parseInt(args.limit) || 2, 5);
      let sql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, solution, tags, type, subject_id FROM questions WHERE ${whereClauses.join(" AND ")} ${RECENT_YEAR_ORDER_BY} LIMIT ${Math.max(limit * 5, 25)};`;
      let res = await executeRawSql(sql);

      // Fallback if combination is too strict
      if (res.rows.length === 0) {
        const fallbackSql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, solution, tags, type, subject_id FROM questions WHERE (question_text LIKE '%${query}%' OR solution LIKE '%${query}%') ${RECENT_YEAR_ORDER_BY} LIMIT ${Math.max(limit * 5, 25)};`;
        res = await executeRawSql(fallbackSql);
      }

      // Prioritize top recent slice
      const topSearchSlice = res.rows.slice(0, Math.max(limit * 3, limit));
      if (topSearchSlice.length > limit) {
        res.rows = topSearchSlice.sort(() => Math.random() - 0.5).slice(0, limit);
      } else {
        res.rows = topSearchSlice;
      }

      return {
        search_query: query,
        total_found: res.rows.length,
        results: res.rows.map(r => ({
          type: r.type,
          stem_or_question: r.question_text,
          option_a: r.option_a,
          option_b: r.option_b,
          option_c: r.option_c,
          option_d: r.option_d,
          answer: r.answer,
          solution: r.solution,
          exam_source: formatTag(r.tags),
          raw_tag: r.tags
        })),
        mentor_instructions: "প্রাপ্ত আসল প্রশ্ন ও সমাধান নির্ভুলভাবে উপস্থাপন করো। শিক্ষার্থীকে প্রাসঙ্গিক সূত্র ও সমাধান পদ্ধতি প্রাঞ্জলভাবে বুঝিয়ে দাও।"
      };
    }

    case "find_similar_type_questions": {
      const subjId = normalizeSubject(args.subject);
      const qText = args.query_text || args.question_text || args.query || args.topic || args.question || "";
      const qId = args.question_id || args.id || null;
      const res = await getSimilarQuestionsByVector({
        questionId: qId,
        queryText: qText,
        subjectId: subjId,
        limit: args.limit || 3
      });

      if (!res.seed) {
        return {
          error: "অনুরূপ প্রশ্ন অনুসন্ধানের জন্য প্রাসঙ্গিক কোনো বীজ প্রশ্ন পাওয়া যায়নি। দয়া করে প্রশ্নের আইডি বা মূল বিষয় উল্লেখ করো।"
        };
      }

      return {
        mode: "vector_similarity_match",
        model: "kazalbrur/bangla-embed-e5-small (1024-d)",
        target_concept: res.seed.question_text.slice(0, 100),
        seed_question: {
          id: res.seed.id,
          question: res.seed.question_text,
          board: formatTag(res.seed.tags),
          raw_tag: res.seed.tags,
          options: [res.seed.option_a, res.seed.option_b, res.seed.option_c, res.seed.option_d].filter(Boolean),
          answer: res.seed.answer
        },
        similar_type_questions: res.similar.map(q => ({
          id: q.id,
          similarity_score: q.similarity_score,
          board: formatTag(q.tags),
          raw_tag: q.tags,
          question: q.question_text,
          options: [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean),
          answer: q.answer,
          solution: q.solution
        })),
        mentor_instructions: "শিক্ষার্থীকে প্রথমে জানাও যে এই প্রশ্নটি কোন মূল সূত্রে এবং কোন মাস্টার টাইপে পড়ে। তারপর ভেক্টর সার্চ থেকে পাওয়া অন্য বোর্ডের অনুরূপ প্রশ্নটি উপস্থাপন করো। দেখাও যে পরীক্ষক কীভাবে সংখ্যা বা ভাষা ঘুরিয়ে একই টাইপের প্রশ্ন অন্য বোর্ডে দিয়েছে।"
      };
    }

    case "analyze_chapter_patterns": {
      let subjId = normalizeSubject(args.subject) || "ssc_physics";
      const chapter = await findChapterCached({ chapter: args.chapter, subject: subjId }, subjId);
      if (chapter && chapter.subject_id) {
        subjId = chapter.subject_id;
      }
      const chapIdClause = chapter ? `AND chapter_id = '${chapter.id}'` : "";

      // Count total questions in chapter
      const countRes = await executeRawSql(`SELECT COUNT(*) as total FROM questions WHERE subject_id = '${subjId}' ${chapIdClause};`);
      const totalQ = parseInt(countRes.rows[0]?.total) || 0;

      // Sample representative questions from this chapter
      const sampleRes = await executeRawSql(`
        SELECT id, tags, type, question_text, option_a, option_b, option_c, option_d, answer, solution
        FROM questions
        WHERE subject_id = '${subjId}' ${chapIdClause} AND question_text IS NOT NULL AND question_text != ''
        LIMIT 50;
      `);
      if (sampleRes.rows.length > 15) {
        sampleRes.rows = sampleRes.rows.sort(() => Math.random() - 0.5).slice(0, 15);
      }

      // Check if pre-analyzed master types exist in chapter_types table
      let masterTypes = [];
      if (chapter) {
        const typesRes = await executeRawSql(`
          SELECT type_no, type_name, core_concept, core_formula, examiner_traps, shortcut_trick, frequency_count 
          FROM chapter_types 
          WHERE chapter_id = '${chapter.id}' 
          ORDER BY type_no ASC;
        `);
        masterTypes = typesRes.rows;
      }

      // Top contributing boards
      const tagsRes = await executeRawSql(`
        SELECT tags, COUNT(*) as c 
        FROM questions 
        WHERE subject_id = '${subjId}' ${chapIdClause} AND tags IS NOT NULL AND tags != ''
        GROUP BY tags 
        ORDER BY c DESC 
        LIMIT 6;
      `);

      return {
        subject: args.subject,
        chapter_name: chapter ? chapter.name : args.chapter,
        total_questions_in_database: totalQ,
        has_precomputed_master_types: masterTypes.length > 0,
        master_types_breakdown: masterTypes.length > 0 ? masterTypes.map(m => ({
          type_number: `টাইপ-${m.type_no}`,
          name: m.type_name,
          concept: m.core_concept,
          formula: m.core_formula,
          examiner_traps: m.examiner_traps,
          shortcut: m.shortcut_trick,
          question_count_in_db: `${m.frequency_count}টি প্রশ্ন`
        })) : null,
        top_contributing_boards_and_colleges: tagsRes.rows.map(r => `${formatTag(r.tags)} (${r.c}টি প্রশ্ন)`),
        sample_questions_pool: sampleRes.rows.map(r => ({
          id: r.id,
          tag: formatTag(r.tags),
          type: r.type,
          q: r.question_text.slice(0, 120),
          ans: r.answer
        })),
        pattern_analysis_framework: {
          master_goal: "শিক্ষার্থীকে এই অধ্যায়ের ৪-৬টি মূল মাস্টার টাইপে ভেঙে বুঝিয়ে দেওয়া।",
          structure_per_type: [
            "১. টাইপ পরিচিতি ও মাদার কনসেপ্ট",
            "২. মূল সূত্র (LaTeX)",
            "৩. পরীক্ষক যেভাবে প্রশ্ন ঘোরায় (Spin/Trap Pattern: সংখ্যা পরিবর্তন, অনুপাত, উল্টো মান, গ্রাফ)",
            "৪. বিগত বোর্ডের বাস্তব প্রশ্ন ও ট্রিক",
            "৫. ১০ সেকেন্ডের শর্টকাট সমাধান"
          ]
        },
        mentor_instructions: "শিক্ষার্থীকে পুরো অধ্যায়ের মাস্টার টাইপগুলোর একটি সুবিন্যস্ত ব্লুপ্রিন্ট দাও। প্রতিটি টাইপের সাথে আসল বোর্ড রেফারেন্স ও পরীক্ষকের ঘোরানোর প্যাটার্ন স্পষ্ট করে বুঝিয়ে দাও যাতে শিক্ষার্থী এই অধ্যায়ের যেকোনো প্রশ্ন নির্ভুলভাবে চিনতে পারে।"
      };
    }

    case "query_question_database_sql": {
      const rawSql = args.sql || "";
      const purpose = args.explanation || "";

      // 1. Clean query
      const cleaned = rawSql.trim().replace(/^--.*$/gm, '').trim();
      const lower = cleaned.toLowerCase();

      if (!cleaned) {
        return {
          success: false,
          error: "কোনো SQL কোয়েরি দেওয়া হয়নি। অনুগ্রহ করে একটি বৈধ SELECT কোয়েরি প্রদান করুন।"
        };
      }

      // 2. Strict Read-Only Guardrail
      if (!lower.startsWith("select") && !lower.startsWith("with") && !lower.startsWith("pragma") && !lower.startsWith("explain")) {
        return {
          success: false,
          error: "নিরাপত্তার স্বার্থে শুধুমাত্র রিড-অনলি (SELECT / WITH) এসকিউএল কুয়েরি অনুমোদিত। ডেটাবেসের কোনো তথ্য পরিবর্তন, সংযোজন বা মোছা যাবে না।"
        };
      }

      // 3. Destructive Keywords Guardrail
      const forbidden = ["drop ", "delete ", "update ", "insert ", "alter ", "truncate ", "create ", "replace ", "attach ", "detach "];
      for (const keyword of forbidden) {
        if (lower.includes(keyword)) {
          return {
            success: false,
            error: `নিরাপত্তা সতর্কতা: '${keyword.trim()}' কমান্ড ডেটাবেসে সম্পূর্ণ নিষিদ্ধ। শুধুমাত্র তথ্য অনুসন্ধানের জন্য SELECT কুয়েরি ব্যবহার করো।`
          };
        }
      }

      try {
        const t0 = performance.now();
        const res = await executeRawSql(cleaned);
        const durationMs = Math.round(performance.now() - t0);

        // Limit results to maximum 20 rows to keep LLM context clean & fast
        const totalRows = res.rows ? res.rows.length : 0;
        const cappedRows = res.rows ? res.rows.slice(0, 20) : [];

        // Enrich rows with human-readable board tags if tags column present
        const enrichedRows = cappedRows.map(row => {
          if (row.tags && typeof row.tags === "string") {
            return {
              ...row,
              board_formatted: formatTag(row.tags)
            };
          }
          return row;
        });

        return {
          success: true,
          purpose,
          executed_sql: cleaned,
          duration_ms: durationMs,
          total_matching_rows: totalRows,
          returned_rows_count: enrichedRows.length,
          columns: res.columns || (enrichedRows[0] ? Object.keys(enrichedRows[0]) : []),
          rows: enrichedRows,
          notice: totalRows > 20 ? `মোট ${totalRows}টি ফলাফল পাওয়া গেছে। প্রথম ২০টি সারি এখানে দেখানো হলো।` : null
        };
      } catch (err) {
        return {
          success: false,
          error: `SQL Execution Error: ${err.message}`,
          attempted_sql: cleaned,
          hint: "এসকিউএল সিনট্যাক্স বা টেবিলের কলামের নাম পুনরায় যাচাই করে সঠিক কুয়েরি রান করো। questions টেবিলের প্রধান কলাম: id, subject_id, chapter_id, type, tags, question_text, option_a, option_b, option_c, option_d, answer, solution"
        };
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

export async function prewarmQuestionPools() {
  try {
    const targets = [
      { tool: "get_creative_question", args: { subject: "ssc_chemistry", chapter: "12", difficulty: "hard" } },
      { tool: "get_creative_question", args: { subject: "ssc_chemistry", chapter: "12", difficulty: "medium" } },
      { tool: "get_creative_question", args: { subject: "ssc_physics", chapter: "2", difficulty: "hard" } },
      { tool: "get_mcq_quiz", args: { subject: "ssc_chemistry", chapter: "12", count: 1 } },
      { tool: "get_mcq_quiz", args: { subject: "ssc_physics", chapter: "1", count: 1 } }
    ];
    for (const t of targets) {
      await executeAgentTool(t.tool, t.args).catch(() => {});
    }
  } catch (e) {}
}

let isPrewarmed = false;
export function triggerPrewarm(ctx = null) {
  if (isPrewarmed) return;
  isPrewarmed = true;
  if (ctx?.waitUntil) {
    ctx.waitUntil(prewarmQuestionPools().catch(() => {}));
  } else {
    prewarmQuestionPools().catch(() => {});
  }
}
