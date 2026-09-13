// Tool definitions and execution handlers for BODH AI (বোধ)
import { executeRawSql, getSimilarQuestionsByVector } from "./db.js";

const TAG_MAP = {
  "DB": "ঢাকা বোর্ড",
  "Ctg.B": "চট্টগ্রাম বোর্ড",
  "CTG.B": "চট্টগ্রাম বোর্ড",
  "CB": "কুমিল্লা বোর্ড",
  "RB": "রাজশাহী বোর্ড",
  "SB": "সিলেট বোর্ড",
  "JB": "যশোর বোর্ড",
  "BB": "বরিশাল বোর্ড",
  "Din.B": "দিনাজপুর বোর্ড",
  "DIN.B": "দিনাজপুর বোর্ড",
  "MB": "ময়মনসিংহ বোর্ড",
  "RCC": "রাজশাহী ক্যাডেট কলেজ",
  "JCC": "ঝিনাইদহ ক্যাডেট কলেজ",
  "FGCC": "ফেনী গার্লস ক্যাডেট কলেজ",
  "BNMPC": "বীরশ্রেষ্ঠ নূর মোহাম্মদ পাবলিক কলেজ",
  "RUMC": "রাজউক উত্তরা মডেল কলেজ",
  "MCC": "মির্জাপুর ক্যাডেট কলেজ",
  "MGCC": "ময়মনসিংহ গার্লস ক্যাডেট কলেজ",
  "JGCC": "জয়পুরহাট গার্লস ক্যাডেট কলেজ",
  "SCC": "সিলেট ক্যাডেট কলেজ",
  "ACC": "আদমজী ক্যান্টনমেন্ট কলেজ",
  "VNSC": "ভিকারুননিসা নূন স্কুল ও কলেজ",
  "ISCM": "আইডিয়াল স্কুল অ্যান্ড কলেজ, মতিঝিল",
  "DRMC": "ঢাকা রেসিডেনসিয়াল মডেল কলেজ",
  "SJHSS": "সেন্ট জোসেফ উচ্চ মাধ্যমিক বিদ্যালয়",
  "RCPC": "রাজশাহী কলেজিয়েট স্কুল",
  "Madrasa": "মাদ্রাসা বোর্ড"
};

const BN_DIGITS = {'0':'০','1':'১','2':'২','3':'৩','4':'৪','5':'৫','6':'৬','7':'৭','8':'৮','9':'৯'};
export const toBengaliNumber = (s) => String(s).replace(/[0-9]/g, d => BN_DIGITS[d] || d);

export const formatTag = (tagStr) => {
  if (!tagStr) return "";
  for (const [k, v] of Object.entries(TAG_MAP)) {
    if (tagStr.startsWith(k)) {
      const yr = tagStr.replace(k, "").trim();
      const fullYr = yr.length === 2 ? `20${yr}` : yr;
      return `${v} (${toBengaliNumber(fullYr)})`;
    }
  }
  return tagStr;
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


export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_subject_chapters",
      description: "Get the total number of chapters and full chapter list for any SSC subject. CRITICAL: Do NOT call this tool if the subject or chapter list was already discussed, or if the user is asking a follow-up question like 'বলো কী কী', 'কোনগুলো', 'সবগুলোর নাম বলো'!",
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
            description: "Board or college name, e.g. 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'কুমিল্লা', 'সিলেট', 'ক্যাডেট কলেজ'"
          },
          year: {
            type: "string",
            description: "Exam year, e.g. '2026', '2025', '2024', '2023', '2022'"
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
      description: "Get authentic board MCQ questions from real past board exams and recent test papers. Supports chapter-based questions ('গতি', 'পর্যায় সারণী', 'সেট ও ফাংশন' ইত্যাদি) and filtering by board, year, subject, and difficulty.",
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
            description: "Board or college name, e.g. 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'কুমিল্লা', 'সিলেট', 'ক্যাডেট কলেজ'"
          },
          year: {
            type: "string",
            description: "Exam year, e.g. '2026', '2025', '2024', '2023', '2022'"
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
            description: "Optional exam year (e.g. 2026, 2025, 2024, 2023)"
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

// Execute a single tool call dynamically
export async function executeAgentTool(toolName, args) {
  switch (toolName) {
    case "get_subject_chapters": {
      const subj = normalizeSubject(args.subject) || args.subject || "ssc_general_math";

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

      return {
        subject: subjectName,
        total_chapters: res.rows.length,
        total_questions_in_subject: res.rows.reduce((sum, r) => sum + (parseInt(r.question_count) || 0), 0),
        numbered_chapters: numberedChapters,
        instructions_for_mentor: "উত্তর দেওয়ার সময় অধ্যায়গুলো সুন্দরভাবে নম্বর ও বুলেট তালিকা আকারে উপস্থাপন করো।"
      };
    }

    case "check_board_frequency": {
      const topic = (args.topic || "").replace(/'/g, "''").trim();
      
      // Check if topic matches an official chapter
      const chRes = await executeRawSql(`SELECT id, name, subject_id FROM chapters WHERE name LIKE '%${topic}%' LIMIT 1;`);
      const matchedChapter = chRes.rows[0];
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

      const mcqRes = await executeRawSql(`SELECT question_text, option_a, option_b, option_c, option_d, answer, tags, subject_id FROM questions WHERE ${qWhere.join(" AND ")} AND type = 'MCQ' AND answer != '' ORDER BY RANDOM() LIMIT 2;`);
      const cqRes = await executeRawSql(`SELECT question_text, option_a, option_b, option_c, option_d, tags, subject_id FROM questions WHERE ${qWhere.join(" AND ")} AND type IN ('CQ_4', 'CQ_3', 'CQ_N') ORDER BY RANDOM() LIMIT 1;`);

      // Merge all board occurrences for mcq
      for (const r of mcqRes.rows) {
        try {
          const esc = r.question_text.replace(/'/g, "''");
          const allOccurrences = await executeRawSql(`SELECT tags FROM questions WHERE question_text = '${esc}' AND tags != '' LIMIT 15;`);
          const mergedTags = [...new Set(allOccurrences.rows.flatMap(x => (x.tags || '').split(',').map(t => t.trim())).filter(Boolean))];
          if (mergedTags.length > 0) r.tags = mergedTags.join(', ');
        } catch(e) {}
      }

      if (cqRes.rows[0]) {
        try {
          const esc = cqRes.rows[0].question_text.replace(/'/g, "''");
          const allOccurrences = await executeRawSql(`SELECT tags FROM questions WHERE question_text = '${esc}' AND tags != '' LIMIT 15;`);
          const mergedTags = [...new Set(allOccurrences.rows.flatMap(x => (x.tags || '').split(',').map(t => t.trim())).filter(Boolean))];
          if (mergedTags.length > 0) cqRes.rows[0].tags = mergedTags.join(', ');
        } catch(e) {}
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
      const subjId = normalizeSubject(args.subject);
      const whereClauses = [`type IN ('CQ_4', 'CQ_3', 'CQ_N')`, `question_text != ''`];
      if (subjId) whereClauses.push(`subject_id = '${subjId}'`);

      // Topic / chapter filter
      let matchedCqChapterId = null;
      if (args.topic || args.chapter) {
        const rawT = args.chapter || args.topic;
        const t = normalizeTopic(rawT).replace(/'/g, "''").trim();
        const chRes = await executeRawSql(`SELECT id FROM chapters WHERE (name LIKE '%${t}%' OR order_num = '${t}') ${subjId ? `AND subject_id = '${subjId}'` : ''} LIMIT 1;`);
        if (chRes.rows[0]) {
          matchedCqChapterId = chRes.rows[0].id;
          whereClauses.push(`(chapter_id = '${chRes.rows[0].id}' OR question_text LIKE '%${t}%')`);
        } else {
          whereClauses.push(`question_text LIKE '%${t}%'`);
        }
      }

      // Board filter
      const boardTag = normalizeBoard(args.board);

      // Year filter
      let yrCode = null;
      if (args.year) {
        const yStr = String(args.year).replace(/[^0-9]/g, '');
        yrCode = yStr.length === 4 ? yStr.slice(2) : yStr;
      }

      if (boardTag && yrCode) {
        whereClauses.push(`(tags LIKE '%${boardTag} ${yrCode}%' OR (tags LIKE '%${boardTag}%' AND tags LIKE '%${yrCode}%'))`);
      } else if (boardTag) {
        whereClauses.push(`tags LIKE '%${boardTag}%'`);
      } else if (yrCode) {
        whereClauses.push(`tags LIKE '%${yrCode}%'`);
      }

      // Difficulty level
      const diff = args.difficulty || (args.board ? "standard" : "hard");
      if (diff === "hard") {
        if (!boardTag) {
          whereClauses.push(`(type = 'CQ_4' OR tags LIKE '%RCC%' OR tags LIKE '%MCC%' OR tags LIKE '%RUMC%' OR tags LIKE '%DRMC%')`);
        } else {
          whereClauses.push(`(type = 'CQ_4' OR option_d != '')`);
        }
      } else if (diff === "medium") {
        whereClauses.push(`type IN ('CQ_3', 'CQ_4')`);
      }

      let sql = `SELECT question_text, option_a, option_b, option_c, option_d, tags, type FROM questions WHERE ${whereClauses.join(" AND ")} ORDER BY RANDOM() LIMIT 1;`;
      let res = await executeRawSql(sql);

      // Fallback if combination is too restrictive
      if (!res.rows[0]) {
        const fallbackWhere = [`type IN ('CQ_4', 'CQ_3', 'CQ_N')`, `question_text != ''`];
        if (matchedCqChapterId) fallbackWhere.push(`chapter_id = '${matchedCqChapterId}'`);
        else if (subjId) fallbackWhere.push(`subject_id = '${subjId}'`);
        if (boardTag && !matchedCqChapterId) fallbackWhere.push(`tags LIKE '%${boardTag}%'`);
        sql = `SELECT question_text, option_a, option_b, option_c, option_d, tags, type FROM questions WHERE ${fallbackWhere.join(" AND ")} ORDER BY RANDOM() LIMIT 1;`;
        res = await executeRawSql(sql);
      }

      const q = res.rows[0];
      if (!q) return { error: "কোনো সৃজনশীল প্রশ্ন পাওয়া যায়নি" };

      return {
        difficulty_level: diff === "hard" ? "কঠিন / অ্যাডভান্সড (উচ্চতর দক্ষতা)" : diff === "medium" ? "মাঝারি (বোর্ড স্ট্যান্ডার্ড)" : "সহজ (বেসিক)",
        board_tag: formatTag(q.tags),
        raw_tag: q.tags,
        stem: q.question_text,
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
        mentor_guidance: "শিক্ষার্থীকে উদ্দীপক এবং প্রতিটি অংশ (বিশেষ করে গ ও ঘ) সমাধানের গাণিতিক বা ধারণাগত ধাপগুলো বুঝিয়ে দাও এবং পরীক্ষকের নম্বর দেওয়ার নিয়মগুলো মনে করিয়ে দাও।"
      };
    }

    case "get_mcq_quiz": {
      const subjId = normalizeSubject(args.subject);
      const isMockTest = args.mode === "mock_test";
      const count = Math.min(parseInt(args.count) || (isMockTest ? 1 : 2), 5);
      const whereClauses = [`question_text != ''`, `answer != ''`];
      if (subjId) whereClauses.push(`subject_id = '${subjId}'`);

      const boardTag = normalizeBoard(args.board);

      // Year matching
      let yrCode = null;
      if (args.year) {
        const yStr = String(args.year).replace(/[^0-9]/g, '');
        yrCode = yStr.length === 4 ? yStr.slice(2) : yStr;
      }

      if (boardTag && yrCode) {
        whereClauses.push(`(tags LIKE '%${boardTag} ${yrCode}%' OR (tags LIKE '%${boardTag}%' AND tags LIKE '%${yrCode}%'))`);
      } else if (boardTag) {
        whereClauses.push(`tags LIKE '%${boardTag}%'`);
      } else if (yrCode) {
        whereClauses.push(`tags LIKE '%${yrCode}%'`);
      }

      let matchedMcqChapterId = null;
      if (args.topic || args.chapter) {
        const rawT = args.chapter || args.topic;
        const t = normalizeTopic(rawT).replace(/'/g, "''").trim();
        const chRes = await executeRawSql(`SELECT id FROM chapters WHERE (name LIKE '%${t}%' OR order_num = '${t}') ${subjId ? `AND subject_id = '${subjId}'` : ''} LIMIT 1;`);
        if (chRes.rows[0]) {
          matchedMcqChapterId = chRes.rows[0].id;
          whereClauses.push(`chapter_id = '${chRes.rows[0].id}'`);
        } else {
          whereClauses.push(`question_text LIKE '%${t}%'`);
        }
      }

      if (args.difficulty === "hard") {
        whereClauses.push(`(type = 'MCQ_N' OR tags LIKE '%CC%' OR tags LIKE '%RUMC%' OR tags LIKE '%DRMC%' OR tags LIKE '%SJHSS%' OR question_text LIKE '%নিচের কোনটি সঠিক%' OR question_text LIKE '%i.%')`);
      } else if (args.difficulty === "easy") {
        whereClauses.push(`type = 'MCQ' AND question_text NOT LIKE '%নিচের কোনটি সঠিক%' AND LENGTH(question_text) < 100`);
      } else {
        whereClauses.push(`type = 'MCQ'`);
      }

      let sql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id FROM questions WHERE ${whereClauses.join(" AND ")} ORDER BY RANDOM() LIMIT ${count};`;
      let res = await executeRawSql(sql);

      if (res.rows.length === 0) {
        // Fallback: preserve chapter if specified, but relax difficulty
        const fallbackWhere = [`question_text != ''`, `answer != ''`, `type = 'MCQ'`];
        if (matchedMcqChapterId) fallbackWhere.push(`chapter_id = '${matchedMcqChapterId}'`);
        else if (subjId) fallbackWhere.push(`subject_id = '${subjId}'`);
        sql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, solution, tags, subject_id FROM questions WHERE ${fallbackWhere.join(" AND ")} ORDER BY RANDOM() LIMIT ${count};`;
        res = await executeRawSql(sql);
      }

      // Aggregate all board and college occurrences across the entire database for each question
      for (const r of res.rows) {
        try {
          const esc = r.question_text.replace(/'/g, "''");
          const allOccurrences = await executeRawSql(`SELECT tags FROM questions WHERE question_text = '${esc}' AND tags != '' LIMIT 15;`);
          const mergedTags = [...new Set(allOccurrences.rows.flatMap(x => (x.tags || '').split(',').map(t => t.trim())).filter(Boolean))];
          if (mergedTags.length > 0) {
            r.tags = mergedTags.join(', ');
          }
        } catch (e) {}
      }

        const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
        const rawAns = res.rows[0]?.answer || '';
        const normAns = toBnAns[rawAns] || rawAns || 'খ';

        return {
          subject: subjId || "all",
          board: args.board || "all",
          year: args.year || "all",
          mode: isMockTest ? "mock_test" : "practice",
          difficulty: args.difficulty || "standard",
          quiz: res.rows.map(r => ({
            ...r,
            formatted_source: formatTag(r.tags),
            all_board_tags: r.tags
          })),
          instructions_for_mentor: "কুইজ মোড: প্রশ্ন, বোর্ড রেফারেন্স [বোর্ড: " + (res.rows[0]?.tags || "বোর্ড স্ট্যান্ডার্ড") + "] ও ৪টি অপশন (ক, খ, গ, ঘ) উপস্থাপন করো। অপশনের শেষে ব্র্যাকেটে [ans: " + normAns + "] লিখবে। এই মেসেজে কোনো ব্যাখ্যা বা সঠিক উত্তর টেক্সটে লিখবে না, যাতে কুইজ স্পয়েল না হয়। শিক্ষার্থী অপশন ক্লিক করলে স্বয়ংক্রিয়ভাবে পরবর্তী মেসেজে তুমি পূর্ণাঙ্গ ব্যাখ্যা ও মূল্যায়ন দেবে।"
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
      let yrCode = null;
      if (args.year) {
        const yStr = String(args.year).replace(/[^0-9]/g, '');
        yrCode = yStr.length === 4 ? yStr.slice(2) : yStr;
      }

      const whereClauses = [
        `(question_text LIKE '%${query}%' OR solution LIKE '%${query}%')`
      ];

      if (subjId) whereClauses.push(`subject_id = '${subjId}'`);
      if (boardTag && yrCode) {
        whereClauses.push(`(tags LIKE '%${boardTag} ${yrCode}%' OR (tags LIKE '%${boardTag}%' AND tags LIKE '%${yrCode}%'))`);
      } else if (boardTag) {
        whereClauses.push(`tags LIKE '%${boardTag}%'`);
      } else if (yrCode) {
        whereClauses.push(`tags LIKE '%${yrCode}%'`);
      }

      if (args.type === "MCQ") {
        whereClauses.push(`type IN ('MCQ', 'MCQ_N')`);
      } else if (args.type === "CQ") {
        whereClauses.push(`type IN ('CQ_4', 'CQ_3', 'CQ_N')`);
      }

      const limit = Math.min(parseInt(args.limit) || 2, 5);
      let sql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, solution, tags, type, subject_id FROM questions WHERE ${whereClauses.join(" AND ")} ORDER BY RANDOM() LIMIT ${limit};`;
      let res = await executeRawSql(sql);

      // Fallback if combination is too strict
      if (res.rows.length === 0) {
        const fallbackSql = `SELECT question_text, option_a, option_b, option_c, option_d, answer, solution, tags, type, subject_id FROM questions WHERE (question_text LIKE '%${query}%' OR solution LIKE '%${query}%') ORDER BY RANDOM() LIMIT ${limit};`;
        res = await executeRawSql(fallbackSql);
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
      const subjId = normalizeSubject(args.subject) || "ssc_physics";
      const chapKw = normalizeTopic(args.chapter) || args.chapter;

      // Find chapter row
      const chapRes = await executeRawSql(`
        SELECT id, name, order_num FROM chapters 
        WHERE subject_id = '${subjId}' AND (name LIKE '%${chapKw}%' OR order_num = '${chapKw}') 
        LIMIT 1;
      `);
      const chapter = chapRes.rows[0];
      const chapIdClause = chapter ? `AND chapter_id = '${chapter.id}'` : "";

      // Count total questions in chapter
      const countRes = await executeRawSql(`SELECT COUNT(*) as total FROM questions WHERE subject_id = '${subjId}' ${chapIdClause};`);
      const totalQ = parseInt(countRes.rows[0]?.total) || 0;

      // Sample representative questions from this chapter
      const sampleRes = await executeRawSql(`
        SELECT id, tags, type, question_text, option_a, option_b, option_c, option_d, answer, solution
        FROM questions
        WHERE subject_id = '${subjId}' ${chapIdClause} AND question_text IS NOT NULL AND question_text != ''
        ORDER BY RANDOM()
        LIMIT 15;
      `);

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
