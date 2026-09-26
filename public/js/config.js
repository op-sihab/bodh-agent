// BODH Configuration & Master Academic Catalog

// Global Shared State (declared with var so it's accessible across all script modules & on window)
var isProcessing = false;
var isChatActive = false;
var conversationHistory = [];
var currentSessionId = null;
var currentSelectedSubject = null; // Default: All SSC Subjects (Auto-Detect)
var isSubjectGridOpen = false;

// Purge legacy flat prompt strings
try {
  if (localStorage.getItem('prime_recent_chats')) {
    localStorage.removeItem('prime_recent_chats');
  }
} catch(e) {}

var SESSIONS_STORAGE_KEY = 'bodh_chat_sessions_v1';
var chatSessions = [];
try {
  chatSessions = JSON.parse(localStorage.getItem(SESSIONS_STORAGE_KEY) || '[]');
  if (!Array.isArray(chatSessions)) chatSessions = [];
} catch(e) {
  chatSessions = [];
}

// Bespoke Lucide-style Vector SVG Icons for NCTB Academic Subjects
var SUBJECT_SVGS = {
  chemistry: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
    <path d="M8.5 2h7"/>
    <path d="M7 16h10"/>
    <circle cx="10" cy="18.5" r=".5" fill="currentColor"/>
    <circle cx="14" cy="18" r=".5" fill="currentColor"/>
  </svg>`,
  physics: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>`,
  biology: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="m2 15 6-6m-6 0 6 6m6-6 6 6m-6 0 6-6"/>
    <circle cx="5" cy="12" r="2.5"/>
    <circle cx="19" cy="12" r="2.5"/>
    <path d="M12 2a10 10 0 0 0-4 1.5M12 22a10 10 0 0 1-4-1.5M12 2a10 10 0 0 1 4 1.5M12 22a10 10 0 0 0 4-1.5"/>
  </svg>`,
  math: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19h16"/>
    <path d="M4 5h4"/>
    <path d="M6 3v4"/>
    <path d="M16 5h4"/>
    <path d="M16 13h4"/>
    <path d="M16 17h4"/>
    <path d="m5 13 4 4m0-4-4 4"/>
  </svg>`,
  higher_math: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 3c-2 0-3 1.5-3 3.5v11c0 2 1 3.5 3 3.5s3-1.5 3-3.5"/>
    <path d="M14 8h6m-3-3v6"/>
    <path d="m14 19 6-6m-6 0 6 6"/>
  </svg>`,
  bangla_1st: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
    <path d="M6 6h10m-10 4h10m-10 4h6"/>
  </svg>`,
  bangla_2nd: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
    <line x1="16" y1="8" x2="2" y2="22"/>
    <line x1="17.5" y1="15" x2="9" y2="15"/>
  </svg>`,
  ict: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2"/>
    <line x1="8" x2="16" y1="21" y2="21"/>
    <line x1="12" x2="12" y1="17" y2="21"/>
    <path d="m7 8 2 2-2 2m4 0h3"/>
  </svg>`,
  bgs: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>
  </svg>`,
  islam: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.5 5.5 0 0 1-7.54-7.54A9 9 0 0 0 12 3Z"/>
    <polygon points="18 4 19 6.5 21.5 6.5 19.5 8 20.5 10.5 18 9 15.5 10.5 16.5 8 14.5 6.5 17 6.5 18 4" fill="currentColor" stroke="none"/>
  </svg>`
};

// Comprehensive NCTB Subjects Catalog
var SUBJECTS_LIST = [
  { 
    id: 'ssc_chemistry', 
    name: 'রসায়ন', 
    tag: '১২ অধ্যায়', 
    svgIcon: SUBJECT_SVGS.chemistry,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    activeBorder: 'border-emerald-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(16,185,129,0.16)]',
    activeRing: 'ring-emerald-500/30',
    hoverBorder: 'hover:border-emerald-500/35',
    dotBg: 'bg-emerald-400',
    placeholder: 'রসায়ন বিষয়ের যেকোনো প্রশ্ন, অধ্যায় তালিকা বা কনসেপ্ট লিখো...', 
    quickPrompts: ['৫টি গুরুত্বপূর্ণ বহুনির্বাচনী মক টেস্ট দাও', 'রসায়ন বিষয়ের সবগুলো অধ্যায়ের নাম দাও', 'মোলের ধারণা অধ্যায় থেকে একটি বোর্ড MCQ দাও', 'খনিজ সম্পদ ও জীবাশ্ম থেকে একটি CQ দাও'] 
  },
  { 
    id: 'ssc_physics', 
    name: 'পদার্থবিজ্ঞান', 
    tag: '১৪ অধ্যায়', 
    svgIcon: SUBJECT_SVGS.physics,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    activeBorder: 'border-amber-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(245,158,11,0.16)]',
    activeRing: 'ring-amber-500/30',
    hoverBorder: 'hover:border-amber-500/35',
    dotBg: 'bg-amber-400',
    placeholder: 'পদার্থবিজ্ঞান গতি, বল, কাজ-ক্ষমতা বা তড়িৎ নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['পদার্থবিজ্ঞান গতি ও বল থেকে ৫টি MCQ মক টেস্ট নাও', 'পদার্থবিজ্ঞান গতি অধ্যায়ের মাস্টার টাইপ ও সূত্র দাও', 'চল বিদ্যুৎ থেকে একটি বোর্ড স্ট্যান্ডার্ড CQ দাও', 'কাজ ক্ষমতা ও শক্তি থেকে একটি কঠিন MCQ দাও'] 
  },
  { 
    id: 'ssc_biology', 
    name: 'জীববিজ্ঞান', 
    tag: '১৪ অধ্যায়', 
    svgIcon: SUBJECT_SVGS.biology,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    activeBorder: 'border-rose-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(244,63,94,0.16)]',
    activeRing: 'ring-rose-500/30',
    hoverBorder: 'hover:border-rose-500/35',
    dotBg: 'bg-rose-400',
    placeholder: 'জীববিজ্ঞান কোষ, বংশগতি বা বাস্তুতন্ত্র নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['জীববিজ্ঞান সব অধ্যায় থেকে ৫টি MCQ মক টেস্ট দাও', 'জীবকোষ ও টিস্যু অধ্যায়ের গুরুত্বপূর্ণ চিত্র ও CQ দাও', 'জীবের বংশগতি ও বিবর্তন থেকে একটি MCQ দাও', 'জীববিজ্ঞানে ৮০/২০ নিয়মে সবচেয়ে গুরুত্বপূর্ণ অধ্যায় কোনগুলো?'] 
  },
  { 
    id: 'ssc_general_math', 
    name: 'সাধারণ গণিত', 
    tag: '১৭ অধ্যায়', 
    svgIcon: SUBJECT_SVGS.math,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/10',
    activeBorder: 'border-sky-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(56,189,248,0.16)]',
    activeRing: 'ring-sky-500/30',
    hoverBorder: 'hover:border-sky-500/35',
    dotBg: 'bg-sky-400',
    placeholder: 'সাধারণ গণিত বীজগণিত, জ্যামিতি বা ত্রিকোণমিতি নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['ত্রিকোণমিতি ও সসীম ধারা থেকে ৫টি MCQ মক টেস্ট দাও', 'কম পড়ে সাধারণ গণিতে নিশ্চিত ৭০ এ ৭০ পাওয়ার রোডম্যাপ দাও', 'ত্রিকোণমিতিক অনুপাত থেকে একটি বোর্ড CQ দাও', 'সসীম ধারা অধ্যায় থেকে একটি ট্রিকি MCQ দাও'] 
  },
  { 
    id: 'ssc_higher_math', 
    name: 'উচ্চতর গণিত', 
    tag: '১৪ অধ্যায়', 
    svgIcon: SUBJECT_SVGS.higher_math,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    activeBorder: 'border-purple-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(168,85,247,0.16)]',
    activeRing: 'ring-purple-500/30',
    hoverBorder: 'hover:border-purple-500/35',
    dotBg: 'bg-purple-400',
    placeholder: 'উচ্চতর গণিত স্থানাঙ্ক জ্যামিতি, ভেক্টর বা সম্ভাবনা নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['উচ্চতর গণিত স্থানাঙ্ক ও সম্ভাবনা থেকে ৫টি MCQ মক টেস্ট নাও', 'দ্বিপদী বিস্তৃতি ও স্থানাঙ্ক জ্যামিতি থেকে CQ দাও', 'সম্ভাবনা অধ্যায় থেকে একটি বোর্ড MCQ দাও', 'উচ্চতর গণিতে এ-প্লাস পাওয়ার চ্যাপ্টার প্রায়োরিটি রুটম্যাপ দাও'] 
  },
  { 
    id: 'ssc_bangla_1st', 
    name: 'বাংলা ১ম পত্র', 
    tag: 'সাহিত্য', 
    svgIcon: SUBJECT_SVGS.bangla_1st,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/10',
    activeBorder: 'border-teal-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(20,184,166,0.16)]',
    activeRing: 'ring-teal-500/30',
    hoverBorder: 'hover:border-teal-500/35',
    dotBg: 'bg-teal-400',
    placeholder: 'বাংলা ১ম পত্রের গদ্য, কবিতা বা সহপাঠ নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['বাংলা ১ম পত্র সাহিত্য থেকে ৫টি MCQ মক টেস্ট নাও', 'সুভা ও বই পড়া গল্প থেকে একটি বোর্ড CQ দাও', 'কপোতাক্ষ নদ কবিতা থেকে একটি MCQ দাও', 'কাকতাড়ুয়া উপন্যাস ও বহিপীর নাটকের সারসংক্ষেপ দাও'] 
  },
  { 
    id: 'ssc_bangla_2nd', 
    name: 'বাংলা ২য় পত্র', 
    tag: 'ব্যাকরণ', 
    svgIcon: SUBJECT_SVGS.bangla_2nd,
    iconColor: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    activeBorder: 'border-orange-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(249,115,22,0.16)]',
    activeRing: 'ring-orange-500/30',
    hoverBorder: 'hover:border-orange-500/35',
    dotBg: 'bg-orange-400',
    placeholder: 'বাংলা ২য় পত্র ব্যাকরণ ও নির্মিতি নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['বাংলা ২য় পত্র ব্যাকরণ অংশ থেকে ৫টি MCQ টেস্ট নাও', 'সমাস ও সন্ধি থেকে গুরুত্বপূর্ণ বোর্ড MCQ দাও', 'ণ-ত্ব ও ষ-ত্ব বিধানের নিয়মগুলো বুঝিয়ে দাও', 'প্রতিবেদন ও ভাব-সম্প্রসারণ লেখার নিয়ম দাও'] 
  },
  { 
    id: 'ssc_ict', 
    name: 'আইসিটি (ICT)', 
    tag: '৬ অধ্যায়', 
    svgIcon: SUBJECT_SVGS.ict,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    activeBorder: 'border-cyan-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(6,182,212,0.16)]',
    activeRing: 'ring-cyan-500/30',
    hoverBorder: 'hover:border-cyan-500/35',
    dotBg: 'bg-cyan-400',
    placeholder: 'আইসিটি ডেটাবেস, মাল্টিমিডিয়া বা নিরাপত্তা নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['আইসিটি বিষয়ের গুরুত্বপূর্ণ ৫টি MCQ মক টেস্ট দাও', 'কম্পিউটার ও তথ্য নিরাপত্তা থেকে বোর্ড MCQ দাও', 'স্প্রেডশিট ও ডেটাবেস ব্যবহারের মূল ধারণা বুঝিয়ে দাও', 'আইসিটিতে পূর্ণ নম্বর পাওয়ার সাজেশন দাও'] 
  },
  { 
    id: 'ssc_bgs', 
    name: 'বাংলাদেশ ও বিশ্বপরিচয়', 
    tag: '১৫ অধ্যায়', 
    svgIcon: SUBJECT_SVGS.bgs,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    activeBorder: 'border-emerald-500/50',
    activeShadow: 'shadow-[0_0_20px_rgba(16,185,129,0.16)]',
    activeRing: 'ring-emerald-500/30',
    hoverBorder: 'hover:border-emerald-500/35',
    dotBg: 'bg-emerald-400',
    placeholder: 'বাংলাদেশ ও বিশ্বপরিচয় ইতিহাস, ভূগোল বা অর্থনীতি নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['বাংলাদেশ ও বিশ্বপরিচয় থেকে ৫টি MCQ পরীক্ষা নাও', 'স্বাধীন বাংলাদেশ ও মুক্তিযুদ্ধের অধ্যায় থেকে CQ দাও', 'বাংলাদেশের সম্পদ ও শিল্প থেকে একটি MCQ দাও', 'বিজিএস-এ সর্বোচ্চ নম্বর তোলার কৌশল বলো'] 
  },
  { 
    id: 'ssc_islam', 
    name: 'ইসলাম শিক্ষা', 
    tag: '৫ অধ্যায়', 
    svgIcon: SUBJECT_SVGS.islam,
    iconColor: 'text-amber-300',
    iconBg: 'bg-amber-400/10',
    activeBorder: 'border-amber-400/50',
    activeShadow: 'shadow-[0_0_20px_rgba(251,191,36,0.16)]',
    activeRing: 'ring-amber-400/30',
    hoverBorder: 'hover:border-amber-400/35',
    dotBg: 'bg-amber-300',
    placeholder: 'ইসলাম ও নৈতিক শিক্ষার আকাইদ, ইবাদত বা চরিত্র নিয়ে প্রশ্ন করো...', 
    quickPrompts: ['ইসলাম ও নৈতিক শিক্ষা সব অধ্যায়ের তালিকা দাও', 'আকাইদ ও নৈতিক জীবন থেকে একটি CQ দাও', 'হাদিস ও শরিয়ত অংশ থেকে গুরুত্বপূর্ণ MCQ দাও', 'ইসলাম শিক্ষায় ৪ স্তরের সৃজনশীল লেখার নিয়ম দাও'] 
  }
];

// Board Name Normalization Map
var BOARD_NAME_MAP = {
  "DB": "ঢাকা বোর্ড", "DHAKA": "ঢাকা বোর্ড",
  "CTG.B": "চট্টগ্রাম বোর্ড", "CTG": "চট্টগ্রাম বোর্ড", "CHITTAGONG": "চট্টগ্রাম বোর্ড",
  "CB": "কুমিল্লা বোর্ড", "COMILLA": "কুমিল্লা বোর্ড", "CUMILLA": "কুমিল্লা বোর্ড",
  "RB": "রাজশাহী বোর্ড", "RAJSHAHI": "রাজশাহী বোর্ড",
  "SB": "সিলেট বোর্ড", "SYLHET": "সিলেট বোর্ড",
  "JB": "যশোর বোর্ড", "JESSORE": "যশোর বোর্ড", "JASHORE": "যশোর বোর্ড",
  "BB": "বরিশাল বোর্ড", "BARISAL": "বরিশাল বোর্ড", "BARISHAL": "বরিশাল বোর্ড",
  "DIN.B": "দিনাজপুর বোর্ড", "DIN": "দিনাজপুর বোর্ড", "DINAJPUR": "দিনাজপুর বোর্ড",
  "MB": "ময়মনসিংহ বোর্ড", "MYMENSINGH": "ময়মনসিংহ বোর্ড",
  "MADRASA": "মাদ্রাসা বোর্ড", "MAD": "মাদ্রাসা বোর্ড",
  "TEC": "কারিগরি বোর্ড", "BTEB": "কারিগরি বোর্ড",
  "ALL.B": "সকল বোর্ড", "ALL": "সকল বোর্ড",
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
  "BNCP": "ক্যান্টনমেন্ট পাবলিক স্কুল ও কলেজ"
};
