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

  if (/bangla\s*2|বাংলা\s*২|ব্যাকরণ|byakoron|bakoron/i.test(s)) return 'ssc_bangla_2nd';
  if (/english\s*2|ইংরেজি\s*২|eng\s*2/i.test(s)) return 'ssc_english_2nd';
  if (/suva|সুভা|শুভা|কাকতাড়ুয়া|kaktarua|বহিপীর|bohipir|বই\s*পড়া|boi\s*pora|goddo|gotto|গদ্য|kobita|কবিতা|সাহিত্য|সহপাঠ/i.test(s)) return 'ssc_bangla_1st';
  if (/bangla\s*1|বাংলা\s*১|bangla|বাংলা|\bbng\b/i.test(s)) return 'ssc_bangla_1st';
  if (/english\s*1|ইংরেজি\s*১|english|ইংরেজি|\beng\b/i.test(s)) return 'ssc_english_1st';
  
  if (/উচ্চতর|হায়ার|হায়ার|\b(?:hm|hmath|higher|h_math)\b/i.test(s)) return 'ssc_higher_math';
  if (/সাধারণ\s*গণিত|গণিত|গনিত|\b(?:math|maths|gonit|gonith|gm|gen\s*math)\b/i.test(s)) return 'ssc_general_math';
  
  // Physics: physics, physcis, physisc, physis, physic, phys, phy, fijiks, fizix, podartho, podartha, etc.
  if (/পদার্থবিজ্ঞান|পদার্থবিদ্য|পদার্থ|\b(?:physics|physcis|physisc|physis|physic|phys|phy|fijiks|fizix|fizi|fysics|fyziks|podartho|podartha|podarthobiggan)\b/i.test(s)) return 'ssc_physics';
  
  // Chemistry: chemistry, chemisty, chem, chemi, kemistri, kemistry, kemi, roshon, roshoyon, roshayon, etc.
  if (/রসায়ন|রসায়ন|কেমিস্ট্রি|\b(?:chemistry|chemisty|chem|chemi|kemi|kemistri|kemistry|roshon|roshayon|roshoyon)\b/i.test(s)) return 'ssc_chemistry';
  
  // Biology: biology, bilogoy, bilogy, bology, bioloy, biolgy, bio, baio, jibbiggan, jibbigan, jib, etc.
  if (/জীববিজ্ঞান|বায়োলজি|বায়োলজি|(?:^|\s)জীব(?:\s|$)|\b(?:biology|bilogoy|bilogy|bology|bioloy|biolgy|bio|baio|boilogy|jibbiggan|jibbigan|jib)\b/i.test(s)) return 'ssc_biology';
  
  if (/আইসিটি|\bict\b|তথ্য\s*ও\s*যোগাযোগ/i.test(s)) return 'ssc_ict';
  if (/বিজিএস|\bbgs\b|বাংলাদেশ\s*ও\s*বিশ্ব|সমাজ/i.test(s)) return 'ssc_bgs';
  if (/ইসলাম|ধর্ম|\bislam\b/i.test(s)) return 'ssc_islam';
  if (/হিন্দু|\bhindu\b/i.test(s)) return 'ssc_hindu';
  if (/কৃষি|\bagri\b|agriculture/i.test(s)) return 'ssc_agriculture';

  return null;
}
