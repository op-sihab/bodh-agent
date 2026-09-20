// Streamlined AGENT_TOOLS JSON Schema Definitions for BODH AI Mentor
// High-density, minimal-token footprint schemas
export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_subject_chapters",
      description: "Get official NCTB chapter list, total count, and question counts for any SSC subject.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject ID, e.g. 'ssc_chemistry', 'ssc_physics', 'ssc_biology', 'ssc_general_math', 'ssc_higher_math', 'ssc_bangla_1st'"
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
      description: "Check how many times a topic or formula appeared across board exams (2016-2026) and top colleges.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "Topic keyword in Bengali, e.g. 'গতি', 'বল', 'মহাকর্ষ', 'মোলের ধারণা'"
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
      description: "Fetch authentic board exam question sets or full papers across an entire subject (e.g. Dhaka Board full exam). CRITICAL: If the student asks for questions on a specific chapter/topic (e.g. গতি, বল, কাজ) or single MCQ practice, you MUST invoke 'get_mcq_quiz' instead.",
      parameters: {
        type: "object",
        properties: {
          board_name: {
            type: "string",
            description: "Board name, e.g. 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী'"
          },
          year: {
            type: "string",
            description: "Optional exam year, e.g. '২০২৪', '২০২৬', '২০২৫'"
          },
          subject: {
            type: "string",
            description: "Optional subject filter"
          },
          chapter: {
            type: "string",
            description: "Optional chapter name or number, e.g. 'গতি'"
          },
          topic: {
            type: "string",
            description: "Optional topic keyword"
          },
          count: {
            type: "integer",
            description: "Number of MCQs to retrieve (e.g. 25 for full exam set, 3-5 for practice)"
          },
          mode: {
            type: "string",
            enum: ["sample", "full_exam"],
            description: "Set to 'full_exam' when the student asks for all questions / full question paper / 25 questions"
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
      description: "Fetch authentic SSC Creative Question (CQ / সৃজনশীল) with stem and ক, খ, গ, ঘ.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject ID like 'ssc_physics', 'ssc_chemistry', 'ssc_general_math'"
          },
          chapter: {
            type: "string",
            description: "Chapter name or number, e.g. 'গতি', 'বল', 'অধ্যায় ৩'"
          },
          topic: {
            type: "string",
            description: "Topic keyword in Bengali"
          },
          board: {
            type: "string",
            description: "Board name (e.g. 'ঢাকা', 'রাজশাহী') or 'random' for any board"
          },
          year: {
            type: "string",
            description: "Exam year, e.g. '2025', '2024'"
          },
          difficulty: {
            type: "string",
            enum: ["hard", "medium", "easy"],
            description: "Difficulty level"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_mcq_quiz",
      description: "Fetch authentic board MCQ questions with 4 options from real past exams and test papers. Primary tool for chapter, topic, and board-specific MCQ practice. Always use this when the student asks for MCQs of a specific chapter or topic.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject ID like 'ssc_physics', 'ssc_chemistry', 'ssc_general_math'"
          },
          chapter: {
            type: "string",
            description: "Chapter name or number, e.g. 'গতি', 'মোলের ধারণা'"
          },
          topic: {
            type: "string",
            description: "Topic keyword in Bengali"
          },
          board: {
            type: "string",
            description: "Board name (e.g. 'ঢাকা', 'রাজশাহী') or 'random' for any board"
          },
          year: {
            type: "string",
            description: "Exam year, e.g. '2025', '2024'"
          },
          difficulty: {
            type: "string",
            enum: ["hard", "medium", "easy"],
            description: "Difficulty level"
          },
          count: {
            type: "number",
            description: "Number of MCQs requested by student (default 1, up to 30 for mock test or multi-question exam)"
          },
          mode: {
            type: "string",
            enum: ["practice", "mock_test"],
            description: "Mode: 'practice' (single MCQ) or 'mock_test' (interactive test)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_chapter_importance_ranking",
      description: "Get 80/20 chapter priority and board frequency ranking for any SSC subject.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject ID, e.g. 'ssc_physics', 'ssc_chemistry', 'ssc_general_math'"
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
      description: "Search 50,855 questions database by formula, keyword, or concept.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keyword, formula, or concept"
          },
          subject: {
            type: "string",
            description: "Optional subject ID"
          },
          board: {
            type: "string",
            description: "Optional board name"
          },
          type: {
            type: "string",
            enum: ["MCQ", "CQ", "ALL"],
            description: "Question type filter"
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
      description: "Find questions of the exact same formula and pattern from other boards using semantic vectors.",
      parameters: {
        type: "object",
        properties: {
          query_text: {
            type: "string",
            description: "The question text, formula, or concept"
          },
          question_id: {
            type: "string",
            description: "Target question ID if available"
          },
          subject: {
            type: "string",
            description: "Subject ID"
          },
          limit: {
            type: "number",
            description: "Max questions (default 3)"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_chapter_patterns",
      description: "Analyze chapter questions into 4-6 Master Types with concepts, board repeat trends, traps, and shortcuts.",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "Subject name (e.g. 'পদার্থবিজ্ঞান', 'রসায়ন')"
          },
          chapter: {
            type: "string",
            description: "Chapter name or number (e.g. 'গতি', 'বল')"
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
      description: "Execute read-only SQL query against the 50,855-question database (questions, subjects, chapters, exams tables).",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "Read-only SQLite SELECT query."
          },
          explanation: {
            type: "string",
            description: "1-line explanation of the query."
          }
        },
        required: ["sql"]
      }
    }
  }
];

// Add lightweight academic_intent parameter
for (const t of AGENT_TOOLS) {
  if (t.function?.parameters?.properties) {
    t.function.parameters.properties.academic_intent = {
      type: "string",
      description: "1-2 sentence Bengali academic rationale for tool call."
    };
  }
}

