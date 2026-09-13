// Model Context Protocol (MCP) Server Implementation
import { getSubjects, getChapters, searchQuestions, getQuiz, getQuestionById, getBoardExams, getCQQuestions, getQuestionFrequency } from "./db.js";

export const MCP_TOOLS = [
  {
    name: "get_subjects",
    description: "Get the list of all SSC academic subjects available in the database (Physics, Higher Math, Biology, etc.).",
    inputSchema: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "get_chapters",
    description: "Get chapters for a specific subject ID (e.g. ssc_physics, ssc_higher_math).",
    inputSchema: {
      type: "object",
      properties: {
        subject_id: {
          type: "string",
          description: "Subject ID like 'ssc_physics', 'ssc_higher_math', 'ssc_chemistry'"
        }
      },
      required: ["subject_id"]
    }
  },
  {
    name: "search_questions",
    description: "Search through 50,000+ past board exam questions by Bengali/English keywords or formulas.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Keyword or topic to search for (e.g. 'অভিকর্ষজ ত্বরণ', 'গতিশক্তি')"
        },
        limit: {
          type: "number",
          description: "Maximum questions to retrieve (default 5)"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "get_quiz",
    description: "Generate a targeted MCQ quiz from authentic past board questions by subject or chapter.",
    inputSchema: {
      type: "object",
      properties: {
        subject_id: { type: "string", description: "Subject ID" },
        chapter_id: { type: "string", description: "Chapter ID" },
        count: { type: "number", description: "Number of questions (default 5)" }
      }
    }
  },
  {
    name: "get_board_exams",
    description: "List board exams or test papers filtered by board name (e.g. 'ঢাকা', 'চট্টগ্রাম', 'রাজশাহী').",
    inputSchema: {
      type: "object",
      properties: {
        board: { type: "string", description: "Board name in Bengali, e.g. 'ঢাকা' or 'চট্টগ্রাম'" },
        limit: { type: "number", description: "Number of exams (default 5)" }
      }
    }
  },
  {
    name: "get_cq_questions",
    description: "Get authentic Creative Questions (সৃজনশীল প্রশ্ন / CQ) with উদ্দীপক (stem) and questions ক, খ, গ, ঘ.",
    inputSchema: {
      type: "object",
      properties: {
        subject_id: { type: "string", description: "Subject ID (e.g. ssc_physics)" },
        limit: { type: "number", description: "Number of CQs (default 1)" }
      }
    }
  },
  {
    name: "get_topic_frequency",
    description: "Analyze how many times a topic or question has appeared across various Board Exams & top schools.",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Topic keyword in Bengali (e.g. 'গতি', 'বল', 'কাজ')" }
      },
      required: ["topic"]
    }
  }
];

export async function handleMcpToolCall(name, args = {}) {
  switch (name) {
    case "get_subjects": {
      const res = await getSubjects();
      return res.data;
    }
    case "get_chapters": {
      const res = await getChapters(args.subject_id);
      return res.data;
    }
    case "search_questions": {
      const res = await searchQuestions(args.query, args.limit || 5);
      return res.data;
    }
    case "get_quiz": {
      const res = await getQuiz({
        subject_id: args.subject_id,
        chapter_id: args.chapter_id,
        limit: args.count || 5
      });
      return res.data;
    }
    case "get_board_exams": {
      const res = await getBoardExams(args.board, null, args.limit || 5);
      return res.data;
    }
    case "get_cq_questions": {
      const res = await getCQQuestions({
        subject_id: args.subject_id,
        limit: args.limit || 1
      });
      return res.data;
    }
    case "get_topic_frequency": {
      const res = await getQuestionFrequency(args.topic);
      return res;
    }
    default:
      throw new Error(`Unknown MCP Tool: ${name}`);
  }
}
