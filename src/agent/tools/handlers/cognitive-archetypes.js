// Cognitive Archetype Detector for Questions (গণিত, বিজ্ঞান, সমাজ, সাহিত্য)

export const COGNITIVE_ARCHETYPES = {
  MATHEMATICAL_DERIVATION: "গাণিতিক ডেরিভেশন ও সূত্র প্রয়োগ (Mathematical Derivation)",
  CAUSE_AND_MECHANISM: "কারণ ও বৈজ্ঞানিক মেকানিজম (Cause & Mechanism)",
  PERIODIC_TREND: "পর্যায়বৃত্ত ধর্ম ও পরিবর্তনশীল ট্রেন্ড (Periodic Trend & Property)",
  REAL_WORLD_APPLICATION: "বাস্তব জীবনের বৈজ্ঞানিক প্রয়োগ (Real-World Applied Principle)",
  COMPARATIVE_CONTRAST: "তুলনা ও বৈশিষ্ট্যমূলক বৈসাদৃশ্য (Comparative & Contrastive)",
  THEMATIC_PARALLELISM: "ভাবগত সাদৃশ্য ও তুলনামূলক বিশ্লেষণ (Thematic Parallelism)"
};

export function detectCognitiveArchetype(questionText, options = [], subjectId = null) {
  const fullText = `${questionText || ""} ${(options || []).join(" ")}`.toLowerCase();

  // 1. Check for Mathematical Derivation
  const hasNumbers = /\d+(?:\.\d+)?\s*(?:g|mol|l|ml|cm|m\/s|km\/h|kg|v|ohm|d|°c|j|w|n|pa|atm|m)\b/i.test(fullText) ||
                     /\b(?:stp|ঘনমাত্রা|মোলারিটি|মোলার ভর|আণবিক ভর|ত্বরণ|বেগ|দূরত্ব|ফোকাস দূরত্ব|বক্রতার ব্যাসার্ধ|তুল্য রোধ|বিভব পার্থক্য|কাজ|ক্ষমতা|গতিশক্তি|বিভবশক্তি|উচ্চতা)\b/i.test(fullText);
  const isMathSubject = ["ssc_physics", "ssc_chemistry", "ssc_general_math", "ssc_higher_math"].includes(subjectId);
  if (hasNumbers && isMathSubject) {
    return {
      type: "MATHEMATICAL_DERIVATION",
      title: COGNITIVE_ARCHETYPES.MATHEMATICAL_DERIVATION,
      description: "গাণিতিক সূত্র, চলকের রূপান্তর ও নির্দিষ্ট সূত্রের মান নির্ণয়।"
    };
  }

  // 2. Periodic Trend & Properties
  if (/আয়নীকরণ শক্তি|ইলেকট্রন আসক্তি|তড়িৎ ঋণাত্মকতা|পারমাণবিক ব্যাসার্ধ|গ্রুপের উপর থেকে নিচে|পর্যায়ের বাম থেকে ডানে|পর্যায়বৃত্ত ধর্ম/i.test(fullText)) {
    return {
      type: "PERIODIC_TREND",
      title: COGNITIVE_ARCHETYPES.PERIODIC_TREND,
      description: "পর্যায় সারণির গ্রুপ বা পর্যায়ে আকারের হ্রাস-বৃদ্ধির ওপর ধর্মের নির্ভরতা।"
    };
  }

  // 3. Cause & Mechanism (কেন বলা হয় / কার্যপ্রণালী)
  if (/(?:কেন বলা হয়|বলা হয় কেন|কারণ কী|কী কারণে|এর কারণ|পাওয়ার হাউস|রান্নাঘর|আত্মঘাতী থলিকা|শ্বসন অঙ্গাণু|হজম|উৎসেচক|এনজাইম)/i.test(fullText)) {
    return {
      type: "CAUSE_AND_MECHANISM",
      title: COGNITIVE_ARCHETYPES.CAUSE_AND_MECHANISM,
      description: "নির্দিষ্ট জৈবিক বা বৈজ্ঞানিক নামকরণের শারীরবৃত্তীয় কারণ ও ক্রিয়াকৌশল।"
    };
  }

  // 4. Real-World Application
  if (/(?:ব্যবহার করা হয়|ব্যবহার হয়|ব্যবহৃত হয়|গাড়ির|পাহাড়ি রাস্তা|শেভিং মিরর|দাঁতের চিকিৎসা|অপটিক্যাল ফাইবার|পেরিস্কোপ|সাবান|ডিটারজেন্ট|ভিনেগার|ব্লিচিং)/i.test(fullText)) {
    return {
      type: "REAL_WORLD_APPLICATION",
      title: COGNITIVE_ARCHETYPES.REAL_WORLD_APPLICATION,
      description: "বাস্তব জীবনের ব্যবহারিক ক্ষেত্রে বিজ্ঞাননীতির সক্রিয় প্রয়োগ।"
    };
  }

  // 5. Comparative Contrast
  if (/(?:পার্থক্য|তুলনা|সাদৃশ্য ও বৈসাদৃশ্য|কোনটি ভিন্ন|উভয়ের মধ্যে)/i.test(fullText)) {
    return {
      type: "COMPARATIVE_CONTRAST",
      title: COGNITIVE_ARCHETYPES.COMPARATIVE_CONTRAST,
      description: "দুটি বৈজ্ঞানিক ধারণা বা সত্তার মধ্যকার মৌলিক বৈশিষ্ট্যের পার্থক্য।"
    };
  }

  // 6. Thematic Parallelism (Literature / Bangla)
  if (/(?:উদ্দীপক|কপোতাক্ষ নদ|সুভা|বুধা|কাকতাড়ুয়া|বহিপীর|ভাবার্থ|প্রতিফলন ঘটেছে|মনোভাব|চরিত্রের)/i.test(fullText)) {
    return {
      type: "THEMATIC_PARALLELISM",
      title: COGNITIVE_ARCHETYPES.THEMATIC_PARALLELISM,
      description: "উদ্দীপকের সাথে মূল টেক্সটের মূলভাব ও মনস্তাত্ত্বিক দর্শনের সাদৃশ্য।"
    };
  }

  return {
    type: "CONCEPTUAL_REASONING",
    title: "মৌলিক বৈজ্ঞানিক ধারণা ও বিশ্লেষণ",
    description: "পাঠ্যবইয়ের নির্দিষ্ট ধারণাগত ভিত্তি ও ব্যাখ্যামূলক বিশ্লেষণ।"
  };
}
