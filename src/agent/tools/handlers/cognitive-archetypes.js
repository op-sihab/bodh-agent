// Cognitive Archetype Detector for Questions (গণিত, বিজ্ঞান, সমাজ, সাহিত্য)

export const COGNITIVE_ARCHETYPES = {
  SEQUENTIAL_STOICHIOMETRY: "ধারাবাহিক বিক্রিয়া ও স্টয়কিওমিতি (Sequential Stoichiometry)",
  LIMITING_REACTANT: "লিমিটিং বিক্রিয়ক ও অবশিষ্ট উৎপাদ (Limiting Reactant & Yield)",
  MOLAR_CONCENTRATION_TITRATION: "মোলারিটি ও প্রশমন টাইট্রেশন (Molarity & Titration)",
  SINGLE_STEP_FORMULA: "এক-ধাপের মৌলিক সূত্র প্রয়োগ (Single-Step Direct Formula)",
  MATHEMATICAL_DERIVATION: "গাণিতিক ডেরিভেশন ও সমীকরণ সমাধান (Mathematical Derivation)",
  CAUSE_AND_MECHANISM: "কারণ ও বৈজ্ঞানিক মেকানিজম (Cause & Mechanism)",
  PERIODIC_TREND: "পর্যায়বৃত্ত ধর্ম ও পরিবর্তনশীল ট্রেন্ড (Periodic Trend & Property)",
  REAL_WORLD_APPLICATION: "বাস্তব জীবনের বৈজ্ঞানিক প্রয়োগ (Real-World Applied Principle)",
  COMPARATIVE_CONTRAST: "তুলনা ও বৈশিষ্ট্যমূলক বৈসাদৃশ্য (Comparative & Contrastive)",
  THEMATIC_PARALLELISM: "ভাবগত সাদৃশ্য ও তুলনামূলক বিশ্লেষণ (Thematic Parallelism)"
};

export function detectCognitiveArchetype(questionText, options = [], subjectId = null) {
  const fullText = `${questionText || ""} ${(options || []).join(" ")}`.toLowerCase();

  // 1. Limiting Reactants & Reaction Yields
  if (/লিমিটিং\s*বিক্রিয়ক|কোনটি\s*আগে\s*শেষ\s*হবে|অবশিষ্ট\s*থাকবে|কতটুকু\s*বাকি|প্রত্যাশিত\s*উৎপাদ/i.test(fullText)) {
    return {
      type: "LIMITING_REACTANT",
      title: COGNITIVE_ARCHETYPES.LIMITING_REACTANT,
      description: "বিক্রিয়ার সমাপ্তি, লিমিটিং বিক্রিয়ক চিহ্নিতকরণ ও অপচয়/অবশিষ্ট পরিমাপ।"
    };
  }

  // 2. Sequential Reactions & Stoichiometric Multi-Step Mass/Mole Calculation
  const hasChemicalReaction = /বিক্রিয়া|বিক্রিয়ায়|কস্টিক\s*সোডা|চুনাপাথর|সোডিয়াম\s*কার্বনেট|গ্যাস\s*প্রস্তুত|প্রয়োজনীয়|উৎপন্ন\s*হবে|যুক্ত\s*করলে/i.test(fullText) &&
                              /(?:caco3|co2|naoh|hcl|na2co3|h2o|h2so4|ch4|o2|n2|h2|কস্টিক|চুনাপাথর|কার্বনেট|এসিড|ক্ষার)/i.test(fullText);
  if (hasChemicalReaction && /\d+(?:\.\d+)?\s*(?:g|gm|গ্রাম|mol|মোল|l|লিটার)\b/i.test(fullText)) {
    return {
      type: "SEQUENTIAL_STOICHIOMETRY",
      title: COGNITIVE_ARCHETYPES.SEQUENTIAL_STOICHIOMETRY,
      description: "একাধিক বিক্রিয়ার সমীকরণভিত্তিক মোল অনুপাত ও ভর হিসাব (mass → mole → reaction → ratio → mass)।"
    };
  }

  // 3. Molarity, Solution Concentration & Titration
  if (/মোলার\s*দ্রবণ|সেমিমোলার|ডেসিমোলার|মোলারিটি|ঘনমাত্রা|প্রমিত\s*দ্রবণ|প্রশমিত|টাইট্রেশন|v1s1/i.test(fullText) ||
      (/\d+\s*(?:ml|মি\.লি|l|লিটার)\b/i.test(fullText) && /\d+(?:\.\d+)?\s*m\b/i.test(fullText))) {
    return {
      type: "MOLAR_CONCENTRATION_TITRATION",
      title: COGNITIVE_ARCHETYPES.MOLAR_CONCENTRATION_TITRATION,
      description: "দ্রবণের ঘনমাত্রা, মোলার দ্রবণ প্রস্তুতি ও এসিড-ক্ষার প্রশমন (S = 1000W / MV বা V1S1 = V2S2)।"
    };
  }

  // 4. Single-step Direct Formula Plug (e.g. 5 mol CO2 volume, F=ma, s=vt)
  const isSimpleFormula = /আয়তন\s*কত|মোল\s*সংখ্যা\s*কত|ভর\s*কত|অণুর\s*সংখ্যা\s*কত|পরমাণুর\s*সংখ্যা\s*কত|বেগ\s*কত|ত্বরণ\s*কত|বল\s*কত/i.test(fullText) &&
                          !hasChemicalReaction;
  if (isSimpleFormula && /\d+(?:\.\d+)?\s*(?:g|mol|l|m\/s|m\/s²|kg|n|v|j)\b/i.test(fullText)) {
    return {
      type: "SINGLE_STEP_FORMULA",
      title: COGNITIVE_ARCHETYPES.SINGLE_STEP_FORMULA,
      description: "সরাসরি এক-ধাপের মৌলিক সূত্রে মান বসিয়ে হিসাব (যেমন: V = n × 22.4, n = W/M, F = ma)।"
    };
  }

  // 5. General Mathematical Derivation
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
