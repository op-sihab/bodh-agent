// AGENT_TOOLS JSON Schema Definitions for BODH AI Mentor
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
            description: "Number of MCQs (1 to 10, default 1 for single query, 5 to 10 for exam/mock test)"
          },
          mode: {
            type: "string",
            enum: ["practice", "mock_test"],
            description: "Mode: 'practice' (default: provides question, options, correct answer and full explanation) or 'mock_test' (interactive exam mode: provides question, options, hidden answer/solution tag for interactive exam modal)"
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
