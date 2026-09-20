// Subject Display Names & Identification Mapping
export const SUBJECT_DISPLAY_NAMES = {
  "ssc_physics": "পদার্থবিজ্ঞান",
  "ssc_chemistry": "রসায়ন",
  "ssc_biology": "জীববিজ্ঞান",
  "ssc_general_math": "সাধারণ গণিত",
  "ssc_higher_math": "উচ্চতর গণিত",
  "ssc_bangla_1st": "বাংলা ১ম পত্র",
  "ssc_bangla_2nd": "বাংলা ২য় পত্র",
  "ssc_english_1st": "ইংরেজি ১ম পত্র",
  "ssc_english_2nd": "ইংরেজি ২য় পত্র",
  "ssc_ict": "তথ্য ও যোগাযোগ প্রযুক্তি",
  "ssc_bgs": "বাংলাদেশ ও বিশ্বপরিচয়",
  "ssc_islam": "ইসলাম ও নৈতিক শিক্ষা",
  "ssc_hindu": "হিন্দুধর্ম ও নৈতিক শিক্ষা",
  "ssc_agriculture": "কৃষি শিক্ষা"
};

export function toBnDigits(num) {
  if (num === undefined || num === null) return "";
  const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, d => bn[d]);
}

export function normalizeSubject(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();

  // Fast direct ID match
  if (s.startsWith("ssc_")) return s;

  // Bangla 2nd Paper
  if (/bangla\s*2|বাংলা\s*২|ব্যাকরণ|byakoron|bakoron|bng\s*2|সমাস|সন্ধি|ণ-ত্ব|ষ-ত্ব|কারক|প্রত্যয়|বাগধারা/i.test(s)) return 'ssc_bangla_2nd';
  
  // English 2nd Paper
  if (/english\s*2|ইংরেজি\s*২|eng\s*2/i.test(s)) return 'ssc_english_2nd';
  
  // BGS (Bangladesh & Global Studies) - must precede Bangla so 'বাংলাদেশ' never matches 'বাংলা'
  if (/বিজিএস|\bbgs\b|বাংলাদেশ|বিশ্বপরিচয়|বিশ্বপরিচয়|সমাজ|বঙ্গভঙ্গ|মুক্তিযুদ্ধ|৬\s*দফা|৭ই\s*মার্চ|জাতির\s*পিতা|বঙ্গবন্ধু|মুজিবনগর/i.test(s)) return 'ssc_bgs';

  // Bangla 1st Paper
  if (/suva|সুভা|শুভা|নিমগাছ|নিম\s*গাছ|আম-আঁটি|আম\s*আঁটি|মানুষ\s*মুহম্মদ|পল্লীজননী|কপোতাক্ষ|রানার|কাকতাড়ুয়া|kaktarua|বহিপীর|bohipir|বই\s*পড়া|boi\s*pora|goddo|gotto|গদ্য|kobita|কবিতা|সাহিত্য|সহপাঠ/i.test(s)) return 'ssc_bangla_1st';
  if (/bangla\s*1|বাংলা\s*১|\bbng\s*1\b|bangla(?!\w)|বাংলা(?!\s*দেশ)|\bbng\b/i.test(s)) return 'ssc_bangla_1st';
  
  // English 1st Paper
  if (/english\s*1|ইংরেজি\s*১|\beng\s*1\b|english|ইংরেজি|\beng\b/i.test(s)) return 'ssc_english_1st';
  
  // Higher Math
  if (/উচ্চতর|হায়ার|হায়ার|\b(?:hm|hmath|higher|h_math|h\s*math)\b/i.test(s)) return 'ssc_higher_math';
  
  // General Math
  if (/সাধারণ\s*গণিত|গণিত|গনিত|\b(?:math|maths|gonit|gonith|gm|gen\s*math)\b/i.test(s)) return 'ssc_general_math';
  
  // Physics: covers physics, phycis, physcis, physisc, physis, physic, phys, phy, fijiks, fizix, fizic, fizics, podartho, podartha, podarthobiggan, podarthobidya, etc.
  if (/পদার্থবিজ্ঞান|পদার্থবিদ্য|পদার্থ|\b(?:physics|phycis|physcis|physisc|physis|physic|phys|phy|fijiks|fizix|fizic|fizics|fizi|fysics|fyziks|podartho|podartha|podarthobiggan|podarthobidya)\b|\bphyc|\bfizik|\bfijik/i.test(s)) return 'ssc_physics';
  
  // Chemistry: covers chemistry, chemisty, chemestry, chemi, chem, kemistri, kemistry, kemi, roshon, roshoyon, roshayon, ইত্যাদি
  if (/রসায়ন|রসায়ন|কেমিস্ট্রি|\b(?:chemistry|chemisty|chemestry|chem|chemi|kemi|kemistri|kemistry|roshon|roshayon|roshoyon)\b/i.test(s)) return 'ssc_chemistry';
  
  // Biology: covers biology, bilogoy, bilogy, bology, bioloy, biolgy, biologi, bio, baio, boilogy, jibbiggan, jibbigan, jib, ইত্যাদি
  if (/জীববিজ্ঞান|বায়োলজি|বায়োলজি|(?:^|\s)জীব(?:\s|$)|\b(?:biology|bilogoy|bilogy|bology|bioloy|biolgy|biologi|bio|baio|boilogy|jibbiggan|jibbigan|jib)\b/i.test(s)) return 'ssc_biology';
  
  // ICT
  if (/আইসিটি|\bict\b|তথ্য\s*ও\s*যোগাযোগ|মডেম|রাউটার|ডেটাবেজ|ডাটাবেজ/i.test(s)) return 'ssc_ict';
  
  // Religion
  if (/ইসলাম|ধর্ম|\bislam\b|আকিকা|আকীকাহ|কুরবানি|নামাজ|রোজা|হজ|যাকাত|তাওহিদ/i.test(s)) return 'ssc_islam';
  if (/হিন্দু|\bhindu\b/i.test(s)) return 'ssc_hindu';
  
  // Agriculture
  if (/কৃষি|\bagri\b|agriculture/i.test(s)) return 'ssc_agriculture';

  return null;
}
