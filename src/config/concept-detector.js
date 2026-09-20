// Comprehensive NCTB SSC Academic Concept & Topic Detector
// Provides autonomous cross-subject intent recognition for Bengali & Banglish student queries.
import { normalizeSubject, SUBJECT_DISPLAY_NAMES } from './subject-map.js';

export const TOPIC_TAXONOMY = [
  // ==========================================
  // SSC PHYSICS (পদার্থবিজ্ঞান)
  // ==========================================
  {
    subject_id: 'ssc_physics',
    chapter_num: '2',
    chapter_name: 'গতি',
    // Covers: goti, gotir sutro, somikoron, toron, mondon, druti, shoron, beg, poronto bostu, etc.
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:গতি|গতির|গতিসূত্র|গতির\s*সূত্র|গতি\s*সমীকরণ|গতির\s*সমীকরণ|ত্বরণ|ত্বরণের|মন্দন|মন্দনের|দ্রুতি|দ্রুতির|সরণ|সরণের|ঘূর্ণন\s*গতি|চলন\s*গতি|রৈখিক\s*গতি|পড়ন্ত\s*বস্তু|পরন্ত\s*বস্তু|পড়ন্ত\s*বস্তুর|পরন্ত\s*বস্তুর|সমবেগ|অসমবেগ|গড়\s*বেগ|তাৎক্ষণিক\s*বেগ|goti|gotir|gotividya|motion|toron|toroner|acceleration|mondon|mondoner|retardation|druti|drutir|shoron|soron|displacement|poronto\s*bostu|gurnon\s*goti|somobeg|osomobeg|v\s*=\s*s\/t|s\s*=\s*vt|v\s*=\s*u\s*\+\s*at|s\s*=\s*ut|v\^2\s*=\s*u\^2)(?:$|\s|[^\u0980-\u09ff\w])/i,
      /(?:^|\s|[^\u0980-\u09ff\w])(?:বেগ|বেগের|veg|beg)\s*(?:কাকে\s*বলে|কী|কি|বলতে\s*কী|এর\s*সংজ্ঞা|এর\s*সূত্র|এর\s*একক|kake\s*bole|ki|er\s*sutro|er\s*songa|er\s*ekok)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '3',
    chapter_name: 'বল',
    // Covers: newton's laws, boler sutro, songa, ghorshon, vorbeg, jodota
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:নিউটনের\s*সূত্র|নিউটনের\s*গতিসূত্র|নিউটনের\s*১ম|নিউটনের\s*২য়|নিউটনের\s*৩য়|নিউটনের|বলের\s*সূত্র|বলের\s*সংজ্ঞা|বল\s*কাকে\s*বলে|বল\s*ও\s*ত্বরণ|ঘর্ষণ\s*বল|ঘর্ষণ|জড়তা|জড়তা|ভরবেগ|ভরবেগের\s*সংরক্ষণ|ক্রিয়া-প্রতিক্রিয়া|ক্রিয়া\s*ও\s*প্রতিক্রিয়া|newton(?:er)?|newton's|boler\s*sutro|boler\s*songa|bol\s*kake\s*bole|ghorshon|ghorson|friction|jodota|jorota|inertia|vorbeg|vhorbeg|momentum|f\s*=\s*ma)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '4',
    chapter_name: 'কাজ, ক্ষমতা ও শক্তি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:কাজ\s*,?\s*ক্ষমতা\s*ও?\s*শক্তি|গতিশক্তি|বিভবশক্তি|কর্মদক্ষতা|যান্ত্রিক\s*শক্তি|কাজের\s*একক|কাজের\s*সূত্র|কাজ\s*কাকে\s*বলে|শক্তির\s*সংরক্ষণশীলতা|জুল|ওয়াট|kaj\s*khomota|gotishokti|bibhob\s*shokti|kormodokkhota|efficiency|jantrik\s*shokti|kinetic\s*energy|potential\s*energy|w\s*=\s*fs|ep\s*=\s*mgh|ek\s*=\s*1\/2\s*mv)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '5',
    chapter_name: 'পদার্থের অবস্থা ও চাপ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:প্যাসকেল|প্যাসকেলের\s*সূত্র|আর্কিমিডিস|আর্কিমিডিসের\s*সূত্র|প্লবতা|ঘনত্ব|ব্যারোমিটার|পীড়ন|পীড়ন\s*ও\s*বিকৃতি|বিকৃতি|হুকের\s*সূত্র|বায়ুমণ্ডলীয়\s*চাপ|বায়ুমণ্ডলীয়\s*চাপ|চাপের\s*সূত্র|চাপের\s*একক|pascal|paskal|pashcal|archimedes|archimedis|plobota|buoyancy|barometer|hooker\s*sutro|chaper\s*sutro|p\s*=\s*h\s*rho|p\s*=\s*f\/a)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '6',
    chapter_name: 'বস্তুর ওপর তাপের প্রভাব',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:বস্তুর\s*ওপ?র\s*তাপের\s*প্রভাব|আপেক্ষিক\s*তাপ|তাপধারণ\s*ক্ষমতা|সুপ্ততাপ|ক্যালোরিমিতি|ক্যালোরিমিতির|তাপমাত্রা|ফারেনহাইট|সেলসিয়াস|তাপীয়\s*প্রসারণ|calorimetry|calorimiti|suptotap|specific\s*heat|tapdharon|fahrenheit|celsius|q\s*=\s*ms\s*delta)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '7',
    chapter_name: 'তরঙ্গ ও শব্দ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:তরঙ্গ\s*ও\s*শব্দ|তরঙ্গদৈর্ঘ্য|কম্পাঙ্ক|পর্যায়কাল|পর্যায়কাল|প্রতিধ্বনি|শ্রাব্যতার\s*সীমা|অনুপ্রস্থ\s*তরঙ্গ|অনুদৈর্ঘ্য\s*তরঙ্গ|শব্দের\s*বেগ|torongo|toronger|torongodoigho|wavelength|kompangko|frequency|porjaykal|protiddhoni|echo|shrabyotar|v\s*=\s*f\s*lambda)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '8',
    chapter_name: 'আলোর প্রতিফলন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:আলোর\s*প্রতিফলন|অবতল\s*দর্পণ|উত্তল\s*দর্পণ|গোলীয়\s*দর্পণ|বক্রতার\s*ব্যাসার্ধ|ফোকাস\s*দূরত্ব|রৈখিক\s*বিবর্ধন|দর্পণের\s*সূত্র|alor\s*protifolon|reflection\s*of\s*light|oboto\s*dorpon|uttol\s*dorpon|focal\s*length|bokrotar\s*bashardo|roikhik\s*bibordhon|1\/u\s*\+\s*1\/v)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '9',
    chapter_name: 'আলোর প্রতিসরণ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:আলোর\s*প্রতিসরণ|প্রতিসরাঙ্ক|ক্রান্তি\s*কোণ|সংকট\s*কোণ|পূর্ণ\s*অভ্যন্তরীণ\s*প্রতিফলন|ডায়োপ্টার|দৃষ্টির\s*ত্রুটি|হ্রস্বদৃষ্টি|দীর্ঘদৃষ্টি|উত্তল\s*লেন্স|অবতল\s*লেন্স|লেন্সের\s*ক্ষমতা|alor\s*protisoron|refraction\s*of\s*light|protisorangko|refractive\s*index|kranti\s*kon|songkot\s*kon|critical\s*angle|total\s*internal\s*reflection|diopter|dioptre)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '10',
    chapter_name: 'স্থির বিদ্যুৎ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:স্থির\s*বিদ্যুৎ|কুলম্বের\s*সূত্র|তড়িৎ\s*তীব্রতা|তড়িৎ\s*বিভব|ধারক|আধান|চার্জ|কুলম্ব|sthir\s*bidyut|static\s*electricity|coulomb(?:er)?|coulomb's|torit\s*tibrota|torit\s*bibhob|dharok|capacitor|f\s*=\s*k\s*q1\s*q2)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '11',
    chapter_name: 'চল বিদ্যুৎ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:চল\s*বিদ্যুৎ|ওহমের\s*সূত্র|তুল্য\s*রোধ|বর্তনী|তড়িৎ\s*প্রবাহ|তড়িৎ\s*ক্ষমতা|তড়িচ্চালক\s*শক্তি|অ্যামিটার|ভোল্টমিটার|আপেক্ষিক\s*রোধ|শ্রেণি\s*সংযোগ|সমান্তরাল\s*সংযোগ|রোধের\s*সূত্র|chol\s*bidyut|current\s*electricity|ohmer\s*sutro|ohm's\s*law|tulyo\s*rodh|equivalent\s*resistance|bortoni|circuit|torit\s*probaho|ammeter|voltmeter|v\s*=\s*ir|p\s*=\s*vi)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '12',
    chapter_name: 'বিদ্যুতের চৌম্বক ক্রিয়া',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:বিদ্যুতের\s*চৌম্বক\s*ক্রিয়া|চৌম্বক\s*ক্ষেত্র|সোলেনয়েড|ট্রান্সফরমার|তড়িৎচৌম্বক\s*আবেশ|ফ্যারাডের\s*সূত্র|লেঞ্জের\s*সূত্র|চৌম্বক\s*বল|choumbok\s*kria|magnetic\s*field|solenoid|transformer|faraday(?:'s)?|farader\s*sutro)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '13',
    chapter_name: 'আধুনিক পদার্থবিজ্ঞান ও ইলেকট্রনিক্স',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:আধুনিক\s*পদার্থবিজ্ঞান|তেজস্ক্রিয়তা|তেজস্ক্রিয়তা|অর্ধায়ু|সেমিকন্ডাক্টর|ডায়োড|ট্রানজিস্টর|আইসি|modhunik\s*podarthobiggan|radioactivity|tejoshkriyota|ordhayu|semiconductor|transistor|diode)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_physics',
    chapter_num: '14',
    chapter_name: 'জীবন বাঁচাতে পদার্থবিজ্ঞান',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবন\s*বাঁচাতে\s*পদার্থবিজ্ঞান|এক্স-রে|সিটি\s*স্ক্যান|এমআরআই|আল্ট্রাসনোগ্রাফি|ইসিজি|রেডিওথেরাপি|x-ray|xray|ct\s*scan|mri|ultrasonography|ecg|radiotherapy)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC CHEMISTRY (রসায়ন)
  // ==========================================
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '2',
    chapter_name: 'পদার্থের অবস্থা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:কণার\s*গতিতত্ত্ব|ব্যাপন|নিঃসরণ|ঊর্ধ্বপাতন|গলনাঙ্ক|স্ফুটনাঙ্ক|শীতলীকরণ|konar\s*gotitotto|byapon|diffusion|nisshoron|effusion|urdhopaton|sublimation|golonangko|melting\s*point|sfutanangko|boiling\s*point)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '3',
    chapter_name: 'পদার্থের গঠন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:পদার্থের\s*গঠন|পরমাণুর\s*মডেল|প্রোটন|নিউট্রন|ইলেকট্রন\s*বিন্যাস|আইসোটোপ|আইসোবার|বোর\s*মডেল|রাদারফোর্ড\s*মডেল|আপেক্ষিক\s*পারমাণবিক\s*ভর|podarther\s*gothon|proton|neutron|electron\s*binnyas|electronic\s*configuration|isotope|isobar|bohr\s*model|rutherford\s*model)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '4',
    chapter_name: 'পর্যায় সারণি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:পর্যায়\s*সারণি|পর্যায়\s*সারণী|পর্যায়\s*সারণি|ক্ষার\s*ধাতু|মৃৎক্ষার\s*ধাতু|হ্যালোজেন|নিষ্ক্রিয়\s*গ্যাস|আয়নীকরণ\s*শক্তি|তড়িৎ\s*ঋণাত্মকতা|ইলেকট্রন\s*আসক্তি|মৌলের\s*পর্যায়বৃত্ত\s*ধর্ম|porjay\s*saroni|porjoy\s*saroni|periodic\s*table|alkali\s*metal|halogen|noble\s*gas|ayonikoron\s*shokti|ionization\s*energy|electronegativity)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '5',
    chapter_name: 'রাসায়নিক বন্ধন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:রাসায়নিক\s*বন্ধন|রাসায়নিক\s*বন্ধন|যোজ্যতা|যোজনী|আয়নিক\s*বন্ধন|সমযোজী\s*বন্ধন|ধাতব\s*বন্ধন|অষ্টক\s*নিয়ম|ক্যাটায়ন|অ্যানায়ন|rashayonik\s*bondhon|chemical\s*bond|yojyota|jojoni|valency|ionic\s*bond|covalent\s*bond|metallic\s*bond|ostok\s*niom|octet\s*rule|cation|anion)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '6',
    chapter_name: 'মোলের ধারণা ও রাসায়নিক গণনা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:মোলের\s*ধারণা|মোলার\s*দ্রবণ|মোলারিটি|অ্যাভোগাড্রো|লিমিটিং\s*বিক্রিয়ক|লিমিটিং\s*বিক্রিয়ক|শতকরা\s*সংযুতি|স্থূল\s*সংকেত|আণবিক\s*সংকেত|moler\s*dharona|avogadro|molar\s*drowon|molarity|limiting\s*bikriok|limiting\s*reactant|sthul\s*songket|empirical\s*formula|anobik\s*songket|molecular\s*formula)(?:$|\s|[^\u0980-\u09ff\w])/i,
      /(?:^|\s|[^\u0980-\u09ff\w])(?:মোল|মোলের|mol|moler)\s*(?:কাকে\s*বলে|কী|কি|এর\s*সংজ্ঞা|এর\s*সূত্র|kake\s*bole|ki|er\s*sutro|er\s*songa)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '7',
    chapter_name: 'রাসায়নিক বিক্রিয়া',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:রাসায়নিক\s*বিক্রিয়া|রাসায়নিক\s*বিক্রিয়া|জারণ-বিজারণ|জারণ|বিজারণ|রেডক্স|সংযোজন\s*বিক্রিয়া|বিযোজন\s*বিক্রিয়া|প্রতিস্থাপন\s*বিক্রিয়া|দহন\s*বিক্রিয়া|তাপোৎপাদী|তাপহারী|লা-শাতেলিয়ার|লা\s*শাতেলিয়ার|rashayonik\s*bikriya|chemical\s*reaction|jaron|bijaron|redox|tapothpadi|exothermic|tapohari|endothermic|la\s*chatelier|le\s*chatelier)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '8',
    chapter_name: 'রসায়ন ও শক্তি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:রসায়ন\s*ও\s*শক্তি|রসায়ন\s*ও\s*শক্তি|তড়িৎ\s*রাসায়নিক\s*কোষ|গ্যালভানিক\s*কোষ|ড্রাই\s*সেল|লবণ\s*সেতু|অ্যানোড|ক্যাথোড|তড়িৎ\s*বিশ্লেষণ|torit\s*rashayonik\s*kosh|electrochemical\s*cell|galvanic\s*cell|dry\s*cell|salt\s*bridge|anode|cathode|electrolysis)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '9',
    chapter_name: 'অ্যাসিড-ক্ষারক সমতা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:অ্যাসিড-ক্ষারক|এসিড-ক্ষারক|অ্যাসিড|এসিড|ক্ষারক|ক্ষার|pH\b|নির্দেশক|প্রশমন\s*বিক্রিয়া|প্রশমন\s*বিক্রিয়া|acid\s*khar|acid\s*base|proshomon\s*bikriya|neutralization)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '10',
    chapter_name: 'খনিজ সম্পদ: ধাতু-অধাতু',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:খনিজ\s*সম্পদ\s*ধাতু|ধাতু\s*নিষ্কাশন|আকরিক|ক্ষয়রোধ|মরিচা|dhatu\s*nishkashon|metal\s*extraction|akorik|moricha|rusting)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '11',
    chapter_name: 'খনিজ সম্পদ: জীবাশ্ম',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবাশ্ম\s*জ্বালানি|হাইড্রোকার্বন|অ্যালকেন|অ্যালকিন|অ্যালকাইন|অ্যালকোহল|অ্যালডিহাইড|জৈব\s*অ্যাসিড|ফ্যাটি\s*অ্যাসিড|পলিমার|প্লাস্টিক|fossil\s*fuel|hydrocarbon|alkane|alkene|alkyne|alcohol|aldehyde|polymer|plastic)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_chemistry',
    chapter_num: '12',
    chapter_name: 'আমাদের জীবনে রসায়ন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:আমাদের\s*জীবনে\s*রসায়ন|বেকিং\s*পাউডার|ভিনেগার|ব্লিচিং\s*পাউডার|টয়লেট\s*ক্লিনার|baking\s*powder|vinegar|bleaching\s*powder|detergent)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC BIOLOGY (জীববিজ্ঞান)
  // ==========================================
  {
    subject_id: 'ssc_biology',
    chapter_num: '1',
    chapter_name: 'জীবন পাঠ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবন\s*পাঠ|দ্বিপদ\s*নামকরণ|লিনিয়াস|হুইটটেকার|মনেরা|প্রোটিস্টা|ফানজাই|shrenibinnyas|binomial\s*nomenclature|linnaeus|whittaker|monera|protista|fungi)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '2',
    chapter_name: 'জীবকোষ ও টিস্যু',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবকোষ|মাইটোকন্ড্রিয়া|প্লাস্টিড|গলগি\s*বডি|রাইবোজোম|লাইসোজোম|কোষঝিল্লি|কোষপ্রাচীর|জাইলেম|ফ্লোয়েম|প্যারেনকাইমা|কোলেনকাইমা|স্ক্লেরেনকাইমা|jibokosh|mitochondria|plastid|golgi|ribosome|lysosome|kosh\s*prachir|koshjhilli|xylem|phloem)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '3',
    chapter_name: 'কোষ বিভাজন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:কোষ\s*বিভাজন|মাইটোসিস|মিয়োসিস|অ্যামাইটোসিস|প্রোফেজ|মেটাফেজ|অ্যানাফেজ|টেলোফেজ|ক্রসিং\s*ওভার|স্পিন্ডল|kosh\s*bibhajon|cell\s*division|mitosis|meiosis|amitosis|prophase|metaphase|anaphase|telophase|crossing\s*over)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '4',
    chapter_name: 'জীবনীশক্তি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবনীশক্তি|সালোকসংশ্লেষণ|শ্বসন|এটিপি|ATP|ক্যালভিন\s*চক্র|ক্রেবস\s*চক্র|গ্লাইকোলাইসিস|সবাত\s*শ্বসন|অবাত\s*শ্বসন|ক্লোরোফিল|saloksongshleshon|photosynthesis|calvin\s*cycle|krebs\s*cycle|glycolysis|chlorophyll)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '5',
    chapter_name: 'খাদ্য, পুষ্টি ও পরিপাক',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:খাদ্য\s*পুষ্টি\s*ও\s*পরিপাক|পরিপাক|পাকস্থলী|যকৃৎ|অগ্ন্যাশয়|ক্ষুদ্রান্ত্র|বৃহদান্ত্র|এনজাইম|বিএমআই|BMI|poripak|digestion|paksthali|jokrit|liver|pancreas|khudrantro|brihodantro)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '6',
    chapter_name: 'জীবে পরিবহন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবে\s*পরিবহন|হৃদপিণ্ড|ধমনী|শিরা|রক্তরস|লোহিত\s*রক্তকণিকা|শ্বেত\s*রক্তকণিকা|অনুচক্রিকা|হিমোগ্লোবিন|রক্তচাপ|প্রস্বেদন|লসিকা|hridpindo|dhomoni|artery|shira|vein|plasma|hemoglobin|prosbedon|transpiration)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '7',
    chapter_name: 'গ্যাসীয় বিনিময়',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:গ্যাসীয়\s*বিনিময়|গ্যাসীয়\s*বিনিময়|শ্বসনতন্ত্র|ফুসফুস|অ্যালভিওলাস|ব্রঙ্কাস|ব্রঙ্কাইটিস|ট্রাকিয়া|হাঁপানি|নিউমোনিয়া|fushfush|lung|alveolus|bronchus|bronchitis|trachea|asthma|pneumonia)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '8',
    chapter_name: 'রেচন প্রক্রিয়া',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:রেচন\s*প্রক্রিয়া|রেচন|বৃক্ক|নেফ্রন|ইউরেটার|মূত্রথলি|ডায়ালাইসিস|গ্লোমেরুলাস|রেনাল|ইউরিয়া|ইউরিয়া|rechon|excretion|brikko|kidney|nephron|ureter|dialysis|glomerulus|renal)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '9',
    chapter_name: 'দৃঢ়তা প্রদান ও চলন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:কঙ্কাল|অস্থি|তরুণাস্থি|সাইনোভিয়াল|সাইনোভিয়াল|অস্টিওপোরোসিস|লিগামেন্ট|টেনডন|kongkal|skeleton|osti|bone|ligament|tendon)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '10',
    chapter_name: 'সমন্বয় ও নিঃসরণ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:নিউরন|সিন্যাপস|মস্তিষ্ক|হরমোন|থাইরয়েড|পিটুইটারি|অক্সিন|জিব্বেরেলিন|অ্যাড্রেনালিন|স্নায়ুতন্ত্র|neuron|synapse|mostisko|brain|hormone|thyroid|pituitary|auxin)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '11',
    chapter_name: 'জীবের প্রজনন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবের\s*প্রজনন|পরাগায়ন|পরাগায়ন|পুংকেশর|গর্ভাশয়|পরাগধানী|নিষেক|অমরা|ভ্রূণ|পুংস্তবক|স্ত্রীস্তবক|poragayon|pollination|pungkeshor|gorbhashoy|nishek|fertilization|bhrun|embryo)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '12',
    chapter_name: 'জীবের বংশগতি ও বিবর্তন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবের\s*বংশগতি|বংশগতি|বিবর্তন|ডিএনএ|আরএনএ|DNA|RNA|জিন|ক্রোমোজোম|মেন্ডেলের\s*সূত্র|মেন্ডেল|ডারউইন|থ্যালাসেমিয়া|বর্ণান্ধতা|মিউটেশন|bongshogoti|genetics|biborton|evolution|gene|chromosome|mendel|darwin|thalassemia)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '13',
    chapter_name: 'জীবের পরিবেশ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:বাস্তুতন্ত্র|উৎপাদক|খাদক|বিয়োজক|বিয়োজক|খাদ্যশিকল|খাদ্যজাল|ট্রফিক\s*লেভেল|শক্তি\s*পিরামিড|bastutontro|ecosystem|khaddo\s*shikol|food\s*chain|trophic\s*level)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_biology',
    chapter_num: '14',
    chapter_name: 'জীবপ্রযুক্তি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জীবপ্রযুক্তি|টিস্যু\s*কালচার|রিকম্বিন্যান্ট|প্লাজমিড|রেস্ট্রিকশন\s*এনজাইম|জিএমও|GMO|ইনসুলিন|জিন\s*প্রকৌশল|jibprojukti|biotechnology|tissue\s*culture|recombinant|plasmid|insulin)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC GENERAL MATH (সাধারণ গণিত)
  // ==========================================
  {
    subject_id: 'ssc_general_math',
    chapter_num: '1',
    chapter_name: 'বাস্তব সংখ্যা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:বাস্তব\s*সংখ্যা|মূলদ\s*সংখ্যা|অমূলদ\s*সংখ্যা|আবৃত\s*দশমিক|bastob\s*songkha|muld|omuld)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '2',
    chapter_name: 'সেট ও ফাংশন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:সেট\s*ও\s*ফাংশন|সার্বিক\s*সেট|শক্তি\s*সেট|ভেনচিত্র|ডোমেন\s*ও\s*রেঞ্জ|set\s*o\s*function|universal\s*set|power\s*set|venn\s*diagram|venchitro)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '3',
    chapter_name: 'বীজগণিতীয় রাশি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:বীজগণিতীয়\s*রাশি|উৎপাদকে\s*বিশ্লেষণ|বর্গ\s*নির্ণয়ের\s*সূত্র|ঘন\s*নির্ণয়ের\s*সূত্র|bijgonitio\s*rashi|utpadok|factorization)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '4',
    chapter_name: 'সূচক ও লগারিদম',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:সূচক\s*ও\s*লগারিদম|লগারিদম|সূচকীয়\s*সমীকরণ|logarithm|suchok|suchokio)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '8',
    chapter_name: 'বৃত্ত',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:স্পর্শক|বৃত্তস্থ\s*কোণ|কেন্দ্রস্থ\s*কোণ|বৃত্তস্থ\s*চতুর্ভুজ|sporshok|tangent|brittostho|kendrostho)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '9',
    chapter_name: 'ত্রিকোণমিতিক অনুপাত',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:ত্রিকোণমিতিক\s*অনুপাত|ত্রিকোণমিতি|ত্রিকোণমিতির\s*সূত্র|ত্রিকোণমিতির|trikonmiti|trigonometry|trikonmitir\s*sutro|trikonmitik|sin\^2|cos\^2|tan\s*30|tan\s*45|tan\s*60)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '10',
    chapter_name: 'দূরত্ব ও উচ্চতা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:দূরত্ব\s*ও\s*উচ্চতা|উন্নতি\s*কোণ|অবনতি\s*কোণ|durutto\s*o\s*ucchota|unnoti\s*kon|obonoti\s*kon)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '13',
    chapter_name: 'সসীম ধারা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:সসীম\s*ধারা|সমান্তর\s*ধারা|গুণোত্তর\s*ধারা|ধারার\s*সমষ্টি|shoshim\s*dhara|somantor\s*dhara|gunottor\s*dhara)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '16',
    chapter_name: 'পরিমিতি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:পরিমিতি|সিলিন্ডার|বেলন|গোলক|ঘনক|porimiti|mensuration|cylinder|belon|golok|ghonok)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_general_math',
    chapter_num: '17',
    chapter_name: 'পরিসংখ্যান',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:পরিসংখ্যান|প্রচুরক|মধ্যক|অজিব\s*রেখা|আয়তলেখ|ক্রমযোজিত\s*গণসংখ্যা|porisongkhan|statistics|modhyok|prochurok|ojib\s*rekha|ayotolekho)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC HIGHER MATH (উচ্চতর গণিত)
  // ==========================================
  {
    subject_id: 'ssc_higher_math',
    chapter_num: null,
    chapter_name: 'উচ্চতর গণিত',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:উচ্চতর\s*গণিত|এক-এক\s*ফাংশন|ভাগশেষ\s*উপপাদ্য|আংশিক\s*ভগ্নাংশ|দ্বিঘাত\s*সমীকরণ|নিশ্চায়ক|নিশ্চায়ক|অসীম\s*ধারা|অসীমতক\s*সমষ্টি|রেডিয়ান\s*কোণ|দ্বিপদী\s*বিস্তৃতি|প্যাসকেলের\s*ত্রিভুজ|স্থানাঙ্ক\s*জ্যামিতি|সরলরেখার\s*ঢাল|সমতলীয়\s*ভেক্টর|ভেক্টর\s*যোগ|সম্ভাবনা|ucchotor\s*gonit|higher\s*math|angshik\s*vognangsho|dwighat\s*somikoron|nishchayok|discriminant|dwipodi\s*bistiti|sthanangko\s*jamiti|shombhabona|probability)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC BANGLA 1ST PAPER (বাংলা ১ম পত্র)
  // ==========================================
  {
    subject_id: 'ssc_bangla_1st',
    chapter_num: null,
    chapter_name: 'বাংলা ১ম পত্র সাহিত্য',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:সুভা|শুভা|আম-আঁটির\s*ভেঁপু|মানুষ\s*মুহম্মদ|নিমগাছ|শিক্ষা\s*ও\s*মনুষ্যত্ব|প্রবাস\s*বন্ধু|মমতাদি|একাত্তরের\s*দিনগুলি|সাহিত্যের\s*রূপ\s*ও\s*রীতি|কপোতাক্ষ\s*নদ|জীবন-সঙ্গীত|জুতা-আবিष्कार|বঙ্গবাণী|ঝিঙে\s*ফুল|সেইদিন\s*এই\s*মাঠ|পল্লীজননী|রানার|তোমাকে\s*পাওয়ার\s*জন্যে|আমার\s*পরিচয়|স্বাধীনতা\s*এ\s*শব্দটি|কাকতাড়ুয়া|বহিপীর|বুধা|হাতেম\s*আলী|তাহেরা|suva|shuva|am\s*atir\s*bhepu|manush\s*muhammad|nim\s*gach|shikkha\s*o\s*monushotto|probas\s*bondhu|momtadi|ekattorer\s*dinguli|kopotakkho\s*nod|jibon\s*shonggit|juta\s*abishkar|bongobani|pollijanani|kaktarua|bohipir|budha)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC BANGLA 2ND PAPER (বাংলা ২য় পত্র)
  // ==========================================
  {
    subject_id: 'ssc_bangla_2nd',
    chapter_num: null,
    chapter_name: 'বাংলা ব্যাকরণ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:বাংলা\s*২য়\s*পত্র|বাংলা\s*২য়\s*পত্র|সমাস|সন্ধি|ণ-ত্ব\s*ও\s*ষ-ত্ব|ণ-ত্ব|ষ-ত্ব|কারক\s*ও\s*বিভক্তি|কারক|উপসর্গ|প্রত্যয়|প্রত্যয়|ধ্বনি\s*তত্ত্ব|ধ্বনি|বর্ণ\s*প্রকরণ|বাক্য\s*পরিবর্তন|বাচ্য|বাগধারা|somash|shondhi|natwo|shatwo|karok|bibhokti|uposorgo|protyoy|dhwoni|bakkyo\s*poriborton|bachyo|bagdhara)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC ICT (তথ্য ও যোগাযোগ প্রযুক্তি)
  // ==========================================
  {
    subject_id: 'ssc_ict',
    chapter_num: null,
    chapter_name: 'আইসিটি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:আইসিটি|তথ্য\s*ও\s*যোগাযোগ\s*প্রযুক্তি|বাইনারি\s*সংখ্যা|স্প্রেডশিট|এক্সেল|ডেটাবেজ|ম্যালওয়্যার|অ্যান্টিভাইরাস|সাইবার\s*নিরাপত্তা|ict\b|spreadsheet|binary\b|database|malware|cyber\s*security)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC BGS (বাংলাদেশ ও বিশ্বপরিচয়)
  // ==========================================
  {
    subject_id: 'ssc_bgs',
    chapter_num: '1',
    chapter_name: 'পূর্ব বাংলার আন্দোলন ও জাতীয়তাবাদের উত্থান (১৯৪৭-১৯৭০)',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জাতির\s*পিতা|বঙ্গবন্ধু|শেখ\s*মুজিবুর\s*রহমান|শেখ\s*মুজিব|মুজিবুর\s*রহমান|ভাষা\s*আন্দোলন|তমুদ্দুন\s*মজলিস|সর্বদলীয়\s*রাষ্ট্রভাষা|যুক্তফ্রন্ট|২১\s*দফা|একুশ\s*দফা|৬\s*দফা|ছয়\s*দফা|৬-দফা|ছয়দফা|আইয়ুব\s*খান|আগরতলা\s*ষড়যন্ত্র\s*মামলা|ঊনসত্তরের\s*গণঅভ্যুত্থান|গণঅভ্যুত্থান|৭০\s*এর\s*নির্বাচন|১৯৭০\s*এর\s*নির্বাচন|পূর্ব\s*বাংলা)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '2',
    chapter_name: 'বাংলাদেশের স্বাধীনতা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:৭ই\s*মার্চ|৭\s*মার্চ|ঐতিহাসিক\s*৭\s*মার্চ|২৫শে\s*মার্চ|২৫\s*মার্চ|কালরাত|অপারেশন\s*সার্চলাইট|স্বাধীনতার\s*ঘোষণা|মুজিবনগর\s*সরকার|মুজিবনগর|মুক্তিযুদ্ধ|মুক্তিবাহিনী|১০ই\s*এপ্রিল|১৭ই\s*এপ্রিল|বীরশ্রেষ্ঠ|সেক্টর\s*কমান্ডার|যৌথ\s*বাহিনী|১৬ই\s*ডিসেম্বর|১৬\s*ডিসেম্বর|বিজয়\s*দিবস|স্বাধীনতা\s*দিবস)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '3',
    chapter_name: 'সৌরজগৎ ও ভূমন্ডল',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:সৌরজগৎ|সৌরজগত|গ্রহ|উপগ্রহ|সূর্য|অক্ষরেখা|দ্রাঘিমারেখা|মূল\s*মধ্যরেখা|কর্কটক্রান্তি|মকরক্রান্তি|আহ্নিক\s*গতি|বার্ষিক\s*গতি|জোয়ার\s*ভাটা|জোয়ার-ভাটা|প্রতিপাদ\s*স্থান|স্থানীয়\s*সময়|প্রমাণ\s*সময়)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '4',
    chapter_name: 'বাংলাদেশের ভূপ্রকৃতি ও জলবায়ু',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:ভূপ্রকৃতি|টারশিয়ারি|টারশিয়ারি\s*যুগের\s*পাহাড়|প্লাইস্টোসিন|প্লাইস্টোসিনকালের\s*চত্বর|বরেন্দ্র\s*ভূমি|মধুপুর\s*গড়|লালমাই\s*পাহাড়|প্লাবন\s*সমভূমি|কালবৈশাখী|ঘূর্ণিঝড়|মৌসুমি\s*বায়ু|মৌসুমি\s*বায়ু|জলবায়ু\s*পরিবর্তন|গ্রিনহাউস\s*প্রভাব)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '5',
    chapter_name: 'বাংলাদেশের নদ-নদী ও প্রাকৃতিক সম্পদ',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:নদ-নদী|পদ্মা|মেঘনা|যমুনা|ব্রহ্মপুত্র|কর্ণফুলী|তিস্তা|সুরমা|পানি\s*সম্পদ|বনজ\s*সম্পদ|সুন্দরবন|ম্যানগ্রোভ|চিরহরিৎ|খনিজ\s*সম্পদ|প্রাকৃতিক\s*গ্যাস|কয়লা)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '6',
    chapter_name: 'রাষ্ট্র, নাগরিকতা ও আইন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:রাষ্ট্রের\s*উপাদান|সার্বভৌমত্ব|নাগরিকতা|নাগরিকের\s*অধিকার|নাগরিকের\s*কর্তব্য|আইন|আইনের\s*শাসন|আইনের\s*উৎস)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '7',
    chapter_name: 'বাংলাদেশ সরকারের বিভিন্ন অঙ্গ ও প্রশাসন ব্যবস্থা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:আইন\s*বিভাগ|শাসন\s*বিভাগ|বিচার\s*বিভাগ|জাতীয়\s*সংসদ|প্রধানমন্ত্রী|রাষ্ট্রপতি|সুপ্রিম\s*কোর্ট|হাইকোর্ট|প্রশাসন\s*ব্যবস্থা|সচিবালয়)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '8',
    chapter_name: 'বাংলাদেশের গণতন্ত্র ও নির্বাচন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:গণতন্ত্র|নির্বাচন\s*কমিশন|ভোটাধিকার|নির্বাচনী\s*আচরণবিধি|রাজনৈতিক\s*দল)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '10',
    chapter_name: 'জাতীয় সম্পদ ও অর্থনৈতিক ব্যবস্থা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জাতীয়\s*সম্পদ|অর্থনৈতিক\s*ব্যবস্থা|ধনতান্ত্রিক|সমাজতান্ত্রিক|মিশ্র\s*অর্থনীতি|ইসলামিক\s*অর্থনীতি)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '11',
    chapter_name: 'অর্থনৈতিক নির্দেশকসমূহ ও বাংলাদেশের অর্থনীতির প্রকৃতি',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:জিডিপি|জিএনপি|মাথাপিছু\s*আয়|gdp\b|gnp\b|মাথাপিছু\s*আয়|মুদ্রাস্ফীতি|জাতীয়\s*আয়)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: '15',
    chapter_name: 'বাংলাদেশের সামাজিক পরিবর্তন ও সামাজিক সমস্যা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:সামাজিক\s*পরিবর্তন|সামাজিক\s*সমস্যা|নিরক্ষরতা|বেকারত্ব|মাদকাসক্তি|বাল্যবিয়ে|যৌতুক|শিশুশ্রম|নারীর\s*প্রতি\s*সহিংসতা)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_bgs',
    chapter_num: null,
    chapter_name: 'বাংলাদেশ ও বিশ্বপরিচয়',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:বাংলাদেশ\s*ও\s*বিশ্বপরিচয়|বিশ্বপরিচয়|বি\s*ও\s*বি|সামাজিক\s*বিজ্ঞান|বাওবি|bgs\b|bangladesh\s*o\s*bishwo)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },

  // ==========================================
  // SSC ISLAM (ইসলাম ও নৈতিক শিক্ষা)
  // ==========================================
  {
    subject_id: 'ssc_islam',
    chapter_num: '1',
    chapter_name: 'আকাইদ ও নৈতিক জীবন',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:ঈমান|আকাইদ|তাওহিদ|তাওহীদ|শিরক|কুফর|নিফাক|মুনাফিক|আসমাউল\s*হুসনা|রিসালাত|খতমে\s*নবুয়ত|খতমে\s*নবুওয়াত|আখিরাত|কিয়ামত|কিয়ামত|হাশর|মিজান|সিরাত|শাফায়াত|শাফাআত|জান্নাত|জাহান্নাম)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_islam',
    chapter_num: '2',
    chapter_name: 'শরীয়তের উৎস',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:শরীয়ত|শরিয়ত|শরিয়তের\s*উৎস|কুরআন\s*মাজিদ|আল-কুরআন|কুরআন|ওহি|তাজবিদ|ওয়াকফ|মাক্কি\s*সুরা|মাদানি\s*সুরা|সুরা\s*ইনফিতার|সুরা\s*শামস|হাদিস|হাদিসে\s*কুদসি|সনদ|মতন|সিহাহ\s*সিত্তাহ|বুখারি|মুসলিম|তিরমিজি|ইজমা|কিয়াস|কিয়াস)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_islam',
    chapter_num: '3',
    chapter_name: 'ইবাদত',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:ইবাদত|সালাত|নামায|নামাজ|সাওম|রোজা|যাকাত|জাকাত|নিসাব|সাদাকা|হজ্জ|হজ|কাবা|তাওয়াফ|জিহাদ|মালিক-শ্রমিক\s*সম্পর্ক)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_islam',
    chapter_num: '4',
    chapter_name: 'আখলাক',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:আখলাক|আখলাকে\s*হামিদা|তাকওয়া|সততা|ওয়াদা\s*পালন|শালীনতা|সৃষ্টির\s*সেবা|দেশপ্রেম|ক্ষমা|পরোপকার|ভ্রাতৃত্ব|আখলাকে\s*সাইয়্যিয়াহ|প্রতারণা|গিবত|পরনিন্দা|হিংসা|ক্রোধ|সুদ|ঘুষ|অপচয়)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_islam',
    chapter_num: '5',
    chapter_name: 'আদর্শ জীবনচরিত',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:মহানবী|হযরত\s*মুহাম্মদ|রাসূলুল্লাহ|মদিনা\s*সনদ|বদর\s*যুদ্ধ|ওহুদ\s*যুদ্ধ|হুদায়বিয়ার\s*সন্ধি|মক্কা\s*বিজয়|বিদায়\s*হজ|হযরত\s*আবু\s*বকর|হযরত\s*উমর|হযরত\s*উসমান|হযরত\s*আলী|ইমাম\s*বুখারি|ইমাম\s*আবু\s*হানিফা)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  },
  {
    subject_id: 'ssc_islam',
    chapter_num: null,
    chapter_name: 'ইসলাম ও নৈতিক শিক্ষা',
    patterns: [
      /(?:^|\s|[^\u0980-\u09ff\w])(?:ইসলাম\s*ও\s*নৈতিক\s*শিক্ষা|ইসলাম\s*শিক্ষা|দীনি\s*শিক্ষা|islam\s*o\s*noitik)(?:$|\s|[^\u0980-\u09ff\w])/i
    ]
  }
];

/**
 * Detects Academic Subject and Chapter from user query text.
 * Returns null if no distinct academic concept is identified.
 */
export function detectSubjectAndChapterFromQuery(queryText, currentSubjectId = null) {
  if (!queryText || typeof queryText !== 'string') return null;
  const clean = queryText.trim().toLowerCase();
  if (!clean || clean.length < 2) return null;

  const cleanNoCase = clean.replace(/(?:ের|কে|তে|এ|য়|টি|গুলো|টার|টির)(?=\s|$|[^\u0980-\u09ff\w])/g, '');

  // 1. Direct explicit subject check
  const directSubj = normalizeSubject(clean) || normalizeSubject(cleanNoCase);
  if (directSubj && directSubj !== currentSubjectId) {
    // If user explicitly named a different subject (e.g. "physics porbo", "chemistry te jabo")
    for (const item of TOPIC_TAXONOMY) {
      if (item.subject_id === directSubj) {
        for (const pat of item.patterns) {
          if (pat.test(clean) || pat.test(cleanNoCase)) {
            return {
              subject_id: directSubj,
              subject_name: SUBJECT_DISPLAY_NAMES[directSubj] || directSubj,
              chapter_num: item.chapter_num,
              chapter_name: item.chapter_name
            };
          }
        }
      }
    }
    return {
      subject_id: directSubj,
      subject_name: SUBJECT_DISPLAY_NAMES[directSubj] || directSubj,
      chapter_num: null,
      chapter_name: null
    };
  }

  // 2. Concept & Topic Matching across Taxonomy
  for (const item of TOPIC_TAXONOMY) {
    for (const pat of item.patterns) {
      if (pat.test(clean) || pat.test(cleanNoCase)) {
        return {
          subject_id: item.subject_id,
          subject_name: SUBJECT_DISPLAY_NAMES[item.subject_id] || item.subject_id,
          chapter_num: item.chapter_num,
          chapter_name: item.chapter_name
        };
      }
    }
  }

  return null;
}

/**
 * Post-Response Safety Net: Checks if generated AI content predominantly features formulas/topics
 * of a different subject than currently active.
 */
export function detectSubjectFromAcademicContent(content, currentSubjectId = null) {
  if (!content || typeof content !== 'string') return null;
  const clean = content.toLowerCase();

  // Check Physics formulas and terminology
  const hasPhysicsFormulas = /(?:v\s*=\s*s\/t|v\s*=\s*u\s*\+\s*at|s\s*=\s*ut|v\^2\s*=\s*u\^2|f\s*=\s*ma|w\s*=\s*fs|p\s*=\s*vi|v\s*=\s*ir|দ্রুতি\/বেগ|ত্বরণ\s*\(?a\)?|গতি-সংক্রান্ত|গতির\s*সমীকরণ|নিউটনের\s*গতিসূত্র)/i.test(clean);
  if (hasPhysicsFormulas && currentSubjectId !== 'ssc_physics') {
    return {
      subject_id: 'ssc_physics',
      subject_name: SUBJECT_DISPLAY_NAMES['ssc_physics'],
      chapter_num: '2',
      chapter_name: 'গতি'
    };
  }

  // Check Chemistry concepts
  const hasChemConcepts = /(?:পর্যায়\s*সারণি|ইলেকট্রন\s*বিন্যাস|মোল\s*\(?n\)?|অ্যাভোগাড্রো|রাসায়নিক\s*বিক্রিয়া|জারণ-বিজারণ|অ্যাসিড-ক্ষারক|হাইড্রোকার্বন)/i.test(clean);
  if (hasChemConcepts && currentSubjectId !== 'ssc_chemistry') {
    return {
      subject_id: 'ssc_chemistry',
      subject_name: SUBJECT_DISPLAY_NAMES['ssc_chemistry'],
      chapter_num: null,
      chapter_name: null
    };
  }

  // Check Biology concepts
  const hasBioConcepts = /(?:মাইটোকন্ড্রিয়া|মাইটোসিস|মিয়োসিস|সালোকসংশ্লেষণ|নেফ্রন|নিউরন|ডিএনএ|আরএনএ|ক্রোমোজোম)/i.test(clean);
  if (hasBioConcepts && currentSubjectId !== 'ssc_biology') {
    return {
      subject_id: 'ssc_biology',
      subject_name: SUBJECT_DISPLAY_NAMES['ssc_biology'],
      chapter_num: null,
      chapter_name: null
    };
  }

  // Check Math concepts
  const hasMathConcepts = /(?:ত্রিকোণমিতিক|sin\^2|cos\^2|tan\s*30|সমান্তর\s*ধারা|গুণোত্তর\s*ধারা|উৎপাদকে\s*বিশ্লেষণ|অজিব\s*রেখা|পরিসংখ্যান)/i.test(clean);
  if (hasMathConcepts && currentSubjectId !== 'ssc_general_math') {
    return {
      subject_id: 'ssc_general_math',
      subject_name: SUBJECT_DISPLAY_NAMES['ssc_general_math'],
      chapter_num: null,
      chapter_name: null
    };
  }

  return null;
}
