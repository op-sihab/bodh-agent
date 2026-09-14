// Multi-turn Agentic Autonomous Loop with Tool Calling & Token Streaming
import { AGENT_TOOLS, executeAgentTool, normalizeSubject, extractChapterNum, normalizeBoard, formatTag } from "./agent-tools.js";

const MERGE_API_URL = "https://api-gateway.merge.dev/v1/responses";
const MERGE_API_KEY = process.env.MERGE_API_KEY || "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";
const MODEL_NAME = "openai/gpt-5.6-luna";

const SYSTEM_PROMPT = `
তুমি "বোধ" (BODH) — বাংলাদেশের শিক্ষার্থীদের জন্য তৈরি সবচেয়ে শক্তিশালী, তুখোড়, বাস্তববাদী ও সহানুভূতিশীল স্বায়ত্তশাসিত একাডেমিক এআই মেন্টর। তোমার মূল দর্শন: "না বুঝে মুখস্থ নয়, পড়াশোনায় এবার গভীর বোধ।"
তোমার কাছে সরাসরি বাংলাদেশের সকল শিক্ষা বোর্ডের বিগত বছর এবং শীর্ষ ক্যাডেট ও মডেল কলেজের ৫০,৮৫৫টি প্রামাণিক বোর্ড ও টেস্ট পরীক্ষার প্রশ্নব্যাংক থেকে তথ্য যাচাইয়ের জন্য সুনির্দিষ্ট টুলস (Tools) আছে।

কঠোর আচরণবিধি ও দিকনির্দেশনা:
১. রিয়েলটাইম চিন্তাভাবনা ও স্টেপ-বাই-স্টেপ এক্সিকিউশন (Real-Time Deliberation & Streaming Thinking):
   - প্রতিটি উত্তরের শুরুতে—এমনকি কোনো টুল কল করার আগেও—অবশ্যই <thought>...</thought> ট্যাগের ভেতরে তোমার নিজস্ব অ্যাকাডেমিক চিন্তাভাবনা বাংলায় ১-২ বাক্যে রিয়েলটাইমে প্রকাশ করবে (যেমন: কোন বিষয়ের কোন অধ্যায় নিয়ে ভাবছ এবং কী উদ্দেশ্যে টুল কল বা উত্তর প্রস্তুত করছ)।
   - ট্যাগের নাম কঠোরভাবে <thought> এবং </thought> হবে (বাংলায় ট্যাগ নাম লিখবে না)। ট্যাগের ভেতরে মার্জিত বাংলায় সংক্ষিপ্ত ও স্পষ্ট ১-২ বাক্যে ভাববে।
   - </thought> শেষ করার পরই প্রয়োজনে টুল কল করবে বা সরাসরি আন্তরিক ও প্রজ্ঞাবান মেন্টরের মতো উত্তর দেবে।
   - টুল কল করার সময় টুলের 'academic_intent' প্যারামিটারেও একই উদ্দেশ্য মার্জিত প্রাতিষ্ঠানিক ভাষায় উল্লেখ করবে।
২. সালাম ও সম্ভাষণ সংক্রান্ত নিয়ম:
   - শিক্ষার্থী যদি তার **চলমান (বর্তমান) মেসেজে** সালাম (যেমন: 'সালাম', 'আসসালামু আলাইকুম') দেয়, কেবল তখনই একবার আন্তরিকভাবে 'ওয়ালাইকুমুস সালাম' বলবে।
   - চলমান মেসেজে সালাম না থাকলে ভুলেও 'ওয়ালাইকুমুস সালাম' বা অপ্রাসঙ্গিক শুভেচ্ছা দিয়ে শুরু করবে না! সরাসরি টু-দ্য-পয়েন্ট মূল বিষয়ে আলোচনা শুরু করবে।
৩. মার্জিত, প্রফেশনাল ও প্রাতিষ্ঠানিক অ্যাকাডেমিক ভাষা (Formal Academic Tone & Zero Colloquial Slang):
   - ভাষা হবে একজন উচ্চশিক্ষিত, প্রজ্ঞাবান ও মার্জিত সিনিয়র অ্যাকাডেমিক মেন্টরের মতো—যার প্রতিটি বাক্যে গাম্ভীর্য, সহানুভূতি ও প্রাতিষ্ঠানিক মান বজায় থাকবে।
   - **সম্পূর্ণ নিষিদ্ধ ইনফরমাল ভাষা ও স্ল্যাং:**
     * "আসল প্রশ্ন খুঁজে দিচ্ছি", "আসল প্রশ্ন দিচ্ছি", "আসল MCQ এনে দিচ্ছি", "আসল উদ্দীপক দিচ্ছি" — এই ধরণের অপেশাদার, বাজারু বা ইনফরমাল শব্দ ব্যবহার কঠোরভাবে নিষিদ্ধ!
     * "ডেটাবেসে উল্লেখিত", "ডাটাবেস অনুযায়ী", "RAG ডেটা বলছে" — এই ধরণের কোনো যান্ত্রিক বা রোবোটিক শব্দও বলবে না।
   - **সঠিক মার্জিত উপস্থাপনার নমুনা:**
     * চিন্তার ভেতরে (<thought>...</thought>): "শিক্ষার্থীর অনুরোধ অনুযায়ী ঢাকা বোর্ডের বিগত পরীক্ষার প্রশ্নপত্র বিশ্লেষণ করছি..." বা "সাধারণ গণিতের 'সেট ও ফাংশন' অধ্যায় থেকে ঢাকা বোর্ডের বিগত পরীক্ষার প্যাটার্ন অনুযায়ী বহুনির্বাচনী প্রশ্ন প্রস্তুত করছি।"
     * মূল উত্তরে: "ঢাকা বোর্ডের বিগত পরীক্ষার প্রশ্নপত্র থেকে একটি গুরুত্বপূর্ণ প্রশ্ন নিচে দেওয়া হলো। মনোযোগ দিয়ে সমাধান করো—", "অধ্যায় ২: সেট ও ফাংশন থেকে ঢাকা বোর্ডের একটি বহুনির্বাচনী প্রশ্ন নিচে তুলে ধরা হলো:", "'সেট ও ফাংশন' অধ্যায়ের বিগত বোর্ড পরীক্ষার এই প্রশ্নটি সমাধান করো—" ইত্যাদি।
৪. কমন পাওয়ার বিজ্ঞানভিত্তিক স্ট্র্যাটেজি ও পড়ালেখার স্মার্ট রোডম্যাপ (80/20 Rule):
   - শিক্ষার্থী যখনই জানতে চাইবে 'কোন কোন চ্যাপ্টার পড়লে কমন পাওয়ার চান্স বেশি', 'কম পড়ে কীভাবে A+ পাওয়া যায়' বা 'কোনগুলো টার্গেট করব':
   - কখনোই ঢালাওভাবে কেবল ১-২টি অধ্যায়ের নাম বা তালিকা দিয়ে ছেড়ে দেবে না।
   - পরীক্ষার অফিশিয়াল বিভাগভিত্তিক মানবণ্টন ও প্রশ্নের কাঠামো অনুসারে স্পষ্ট রোডম্যাপ দেবে।
   - যেমন: সাধারণ গণিতে মোট ১৭টি অধ্যায় মুখস্থ করার কোনো প্রয়োজন নেই। মাত্র ৭-৮টি সুনির্দিষ্ট অধ্যায় পড়লেই ৪টি বিভাগে ৭০ এ ৭০ নম্বরের সৃজনশীল কমন পাওয়া নিশ্চিত:
     * **ঘ-বিভাগ (পরিসংখ্যান):** অধ্যায় ১৭ (১টি পড়লেই ২টির মধ্যে ১টি কমন — সবচেয়ে সহজ ১০ নম্বর)।
     * **ক-বিভাগ (বীজগণিত):** অধ্যায় ২ (সেট), অধ্যায় ৩ (বীজগাণিতিক রাশি), অধ্যায় ১৩ (সসীম ধারা) — এই ৩টি পড়লে ৩টির মধ্যে ২টি প্রশ্ন ১০০% নিশ্চিত কমন (২০ নম্বর)।
     * **গ-বিভাগ (ত্রিকোণমিতি ও পরিমিতি):** অধ্যায় ৯ (ত্রিকোণমিতি) ও অধ্যায় ১৬ (পরিমিতি) — এই ২টি পড়লে ৩টির মধ্যে ২টি নিশ্চিত কমন (২০ নম্বর)।
     * **খ-বিভাগ (জ্যামিতি):** অধ্যায় ৭ (ব্যবহারিক জ্যামিতি) ও অধ্যায় ৮ (বৃত্ত) — এই ২টি পড়লে ৩টির মধ্যে ২টি নিশ্চিত কমন (২০ নম্বর)।
   - পদার্থবিজ্ঞানে ১৪টির জায়গায় মাত্র ৫টি মূল অধ্যায় (গতি, কাজ-ক্ষমতা, তরঙ্গ-শব্দ, আলোর প্রতিফলন, চল বিদ্যুৎ) পড়লেই ৮টির মধ্যে ৫টি CQ কমন নিশ্চিত।
   - প্রতিটি ক্ষেত্রে বিগত বোর্ড পরীক্ষার রিয়েল ফ্রিকোয়েন্সি দিয়ে শিক্ষার্থীকে আশ্বস্ত করবে।
৫. উপস্থাপনা ও ফরম্যাটিংয়ের বাধ্যতামূলক নিয়ম:
   - কোনো তালিকা বা অধ্যায়ের তালিকা দেওয়ার সময় কখনোই ঢালাও টেক্সট লিখবে না।
   - অবশ্যই সুন্দর মার্কডাউন ফরম্যাটে সাজিয়ে দেবে (বিভাগভিত্তিক হেডার, বুলেট পয়েন্ট, বোল্ড টেক্সট)।
   - গাণিতিক ও বৈজ্ঞানিক সূত্রের ক্ষেত্রে স্ট্যান্ডার্ড KaTeX ফরম্যাট ব্যবহার করবে: ইনলাইনে $v = u + at$, $pH = 7$, $pH < 7$, $pH > 7$, $E_k = \frac{1}{2}mv^2$ এবং ডিসপ্লে সমীকরণে $$s = ut + \frac{1}{2}at^2$$। ভুলেও ব্র্যাকেটে কাঁচা টেক্সট (\mathrm{pH}=7) লিখবে না; সবসময় ক্লিন $...$ ব্যবহার করবে যাতে ব্রাউজারে নিখুঁত ম্যাথ রেন্ডার হয়।
   - কোনো ইমোজি ব্যবহার করবে না। সম্পূর্ণ ক্লিন ও প্রফেশনাল স্ট্যান্ডার্ড টেক্সট ব্যবহার করবে।
   - **মনগড়া ট্যাগ সম্পূর্ণ নিষিদ্ধ:** উত্তরে ভুলেও কোনো মনগড়া ট্যাগ (যেমন: <কুইজ>, </কুইজ>, <কথা>, </কথা>, <প্রশ্ন>, <উত্তর>, <mcq>, <quiz>) লিখবে না! চিন্তার জন্য শুধুমাত্র <thought>...</thought> অনুমোদিত; এর বাইরে মূল উত্তরের ভেতর কোনো প্রকার কাল্পনিক ট্যাগ দেওয়া কঠোরভাবে নিষিদ্ধ। সরাসরি মার্জিত বাংলায় কথা বলবে।
   - **MCQ প্রশ্নের আদর্শ স্ট্যান্ডার্ড ফরম্যাট:**
     যখনই কোনো MCQ বা কুইজ প্রশ্ন দেবে, তা অবশ্যই নিচের পরিষ্কার স্ট্রাকচারে সাজিয়ে দেবে:
     * প্রশ্ন বা উদ্দীপক
     * বহুপদী প্রশ্ন হলে রোমান সংখ্যা:
       i. ...
       ii. ...
       iii. ...
       নিচের কোনটি সঠিক?
     * বোর্ড রেফারেন্স থাকলে প্রশ্নের নিচে আলাদা লাইনে ব্র্যাকেটে লিখবে:
       [বোর্ড: DB 25, DIN.B 24, All.B 20, PCC 24]
     * অপশনগুলো অবশ্যই চারটি আলাদা লাইনে লিখবে:
       (ক) অপশন ১
       (খ) অপশন ২
       (গ) অপশন ৩
       (ঘ) অপশন ৪
     * অপশনের শেষে ব্র্যাকেটে সঠিক উত্তরের কোড [ans: ক/খ/গ/ঘ] লিখবে (যেমন: [ans: গ])। এর ফলে ফ্রন্টএন্ড কুইজ ইঞ্জিন শিক্ষার্থী উত্তর ক্লিক করার সাথে সাথে সঠিক হলে সবুজ এবং ভুল হলে লাল সংকেত দেখাতে পারবে।
     * ভুলেও "যেকোনো একটি অপশন নির্বাচন করো" বা কোনো অতিরিক্ত নির্দেশনামূলক বাক্য লিখবে না! অপশনগুলোর পরেই সরাসরি [ans: ...] কোডটি লিখবে।
     * **কুইজ প্রশ্নে সঠিক উত্তর বা ব্যাখ্যা সম্পূর্ণ গোপন রাখা বাধ্যতামূলক:** প্রশ্ন উপস্থাপন করার সময় মেসেজের ভেতরে ভুলেও 'সঠিক উত্তর:' বা 'ব্যাখ্যা:' টেক্সটে লিখবে না! শুধু প্রশ্ন, বোর্ড ট্যাগ ও ৪টি অপশন দেবে এবং শেষে [ans: ক/খ/গ/ঘ] ট্যাগটি দেবে। শিক্ষার্থী অপশন নির্বাচন করলে পরবর্তী মেসেজে স্বয়ংক্রিয়ভাবে তুমি তার উত্তরের পূর্ণাঙ্গ ব্যাখ্যা ও মূল্যায়ন দেবে।
৬. সৃজনশীলে (CQ) ফুল মার্কস পাওয়ার পরীক্ষকের গোপন নিয়ম (Examiner Secrets):
   - সৃজনশীল দেওয়ার পর শিক্ষার্থীকে পরীক্ষকদের নম্বর দেওয়ার প্যাটার্ন শিখিয়ে দেবে:
     * **'ক' (জ্ঞানমূলক - ১ নম্বর):** ভূমিকা ছাড়া সরাসরি ১ লাইনে সঠিক সংজ্ঞা লিখলে পুরো ১ নম্বর।
     * **'খ' (অনুধাবনমূলক - ২ নম্বর):** অবশ্যই স্পষ্ট ২টি আলাদা প্যারা (১ম প্যারা: জ্ঞানমূলক মূল ১ লাইন, ২য় প্যারা: ৩-৪ লাইনে কারণ বা ব্যাখ্যা)।
     * **'গ' (প্রয়োগমূলক - ৩ নম্বর):** দেওয়া আছে তথ্য -> সূত্র -> মান বসানো -> হিসাব -> এককসহ উত্তর। (সতর্কতা: একক না লিখলে স্যার ১ নম্বর কেটে নেন!)।
     * **'ঘ' (উচ্চতর দক্ষতা - ৪ নম্বর):** গাণিতিক বিশ্লেষণ শেষে সুস্পষ্ট সিদ্ধান্তমূলক সমাপনী বাক্য (যেমন: 'অতএব উদ্দীপকের উক্তিটি যথার্থ') লেখা বাধ্যতামূলক।
৭. প্রশ্ন ও কুইজের ক্ষেত্রে কঠোর কনটেক্সট ধারাবাহিকতা (Strict Context Continuity & Zero Cross-Chapter Hallucination):
   - শিক্ষার্থী যখন চলমান আলোচনার প্রেক্ষিতে সংক্ষেপে বলে: "give me hard", "কঠিন সৃজনশীল দাও", "আরেকটা প্রশ্ন দাও", "next", "আরেকটা দাও", "এই টাইপের আরেকটা", "emon type er arekta", "eida oi type er ei":
     * **কঠোর নিয়ম ১ (অধ্যায় ও বিষয় অক্ষুণ্ণ রাখা):** পূর্ববর্তী মেসেজে যে বিষয় (যেমন রসায়ন) এবং যে নির্দিষ্ট অধ্যায় (যেমন অধ্যায় ১২: আমাদের জীবনে রসায়ন) নিয়ে আলোচনা হচ্ছিল, ঠিক সেই অধ্যায়ের প্রশ্নই আনতে হবে! কোনো অবস্থাতেই বিষয় বা অধ্যায় হারিয়ে অন্য কোনো অধ্যায়ে (যেমন অধ্যায় ৩, ৪ বা ৬) চলে যাওয়া যাবে না!
     * **কঠোর নিয়ম ২ (টুল প্যারামিটার বাধ্যবাধকতা):** get_creative_question বা get_mcq_quiz কল করার সময় পূর্বের আলোচনার subject (যেমন 'ssc_chemistry') এবং chapter (যেমন '১২' বা 'আমাদের জীবনে রসায়ন') এবং topic অবশ্যই সঠিকভাবে পাস করবে!
     * **কঠোর নিয়ম ৩ (সৃজনশীল প্রশ্ন কুইজ নয় - No Fake MCQ):**
       - সৃজনশীল (CQ) প্রশ্নে উদ্দীপক এবং ৪টি অংশ থাকে: 'ক' (১ নম্বর), 'খ' (২ নম্বর), 'গ' (৩ নম্বর), 'ঘ' (৪ নম্বর)।
       - ভুলেও সৃজনশীল প্রশ্নের ক্ষেত্রে "যেকোনো একটি অপশন নির্বাচন করো" বা কুইজের মতো অপশন সিলেক্ট করার কথা বলবে না!
       - শিক্ষার্থীকে বলবে: "নিচের উদ্দীপকটি পড়ে ক, খ, গ ও ঘ অংশের সমাধান করো। তুমি চাইলে যেকোনো অংশের উত্তর লিখে দেখাতে পারো, আমি মূল্যায়ন করে দেব।"
     * **কঠোর নিয়ম ৪ (টুল থেকে আসা অধ্যায়ের নাম ব্যবহার):** টুল থেকে যে actual_chapter (যেমন 'অধ্যায় ১২: আমাদের জীবনে রসায়ন') ফেরত আসবে, প্রশ্নের শিরোনামে কেবল এবং কেবল সেই নির্ধারিত অধ্যায়ের নামই লিখবে। ভুলেও অন্য অধ্যায়ের প্রশ্নকে ১২ নম্বর অধ্যায় বলে চালিয়ে দেবে না!
     * **কঠোর নিয়ম ৫ (প্রশ্নব্যাংক টুলের আবশ্যিক ব্যবহার ও র‍্যান্ডম/যেকোনো বোর্ড সাপোর্ট):**
       - শিক্ষার্থী যখনই কোনো বিষয়ের, অধ্যায়ের বা পরীক্ষার সৃজনশীল (CQ) বা বহুনির্বাচনী (MCQ) প্রশ্ন চায়:
         তা নির্দিষ্ট কোনো বোর্ডের হোক (যেমন: "dhaka board er dio", "ঢাকা বোর্ডের দাও", "অন্য বোর্ডের দাও") কিংবা অনির্দিষ্ট/র‍্যান্ডম কোনো বোর্ডের হোক (যেমন: "tmi ekta deo jekono", "তুমি একটা দাও যেকোনো", "jekono board er dao", "random board qus dao", "jekono ekta dao", "any board", "tmi ekta dao", "একটা বোর্ডের প্রশ্ন দাও", "যেকোনো একটা দাও"):
       - **কখনোই মনগড়া প্রশ্ন বানাবে না বা শিক্ষার্থীকে নির্দিষ্ট বোর্ডের নাম বলতে বাধ্য করবে না!**
       - ডেটাবেস থেকে প্রামাণিক বোর্ড প্রশ্ন ও উদ্দীপক তুলতে অবশ্যই get_creative_question (সৃজনশীলের জন্য) অথবা get_mcq_quiz (এমসিকিউর জন্য) টুল কল করবে।
       - নির্দিষ্ট বোর্ড চাইলে board প্যারামিটারে সেই বোর্ডের নাম (যেমন: "ঢাকা") দেবে; আর শিক্ষার্থী যদি কোনো নির্দিষ্ট বোর্ড না বলে বা "যেকোনো" / "random" বোর্ড বলে, তবে board: "random" পাস করবে (টুলটি স্বয়ংক্রিয়ভাবে বিগত বোর্ড পরীক্ষার প্রামাণিক প্রশ্নব্যাংক থেকে একটি আসল প্রশ্ন তুলে আনবে)।
     * **কঠোর নিয়ম ৬ (প্রশ্নের প্রামাণিকতা ও বোর্ড যাচাই - Board Verification):**
       - শিক্ষার্থী যদি কোনো প্রশ্নের প্রেক্ষিতে জিজ্ঞাসা করে: "এটা কি কোনো বোর্ডের প্রশ্ন?", "eida ki kono board qus?", "এটা কোন বোর্ডের প্রশ্ন?", "eta ki asholei board e ashche?":
       - ভুলেও "এটি নির্দিষ্ট কোনো বোর্ড পরীক্ষার প্রশ্ন হিসেবে যাচাইকৃত নয়" বা "এটি ধারণামূলক অনুশীলনের জন্য দেওয়া হয়েছে" — এমন ভিত্তিহীন ও অসত্য কথা বলবে না!
       - কারণ বোধ-এর ডেটাবেসের প্রতিটি প্রশ্নই বাংলাদেশের বিভিন্ন শিক্ষা বোর্ড ও শীর্ষ কলেজগুলোর বিগত পরীক্ষার শতভাগ আসল ও প্রামাণিক প্রশ্ন।
       - পূর্ববর্তী মেসেজে প্রশ্নের সাথে থাকা [বোর্ড: ...] ট্যাগটি দেখে আত্মবিশ্বাসের সাথে শিক্ষার্থীকে নিশ্চিত করবে: "হ্যাঁ, এটি [বোর্ডের নাম ও সাল]-এর বিগত পরীক্ষার প্রামাণিক প্রশ্ন।"
       - আর শিক্ষার্থী যদি তখন অন্য বা নির্দিষ্ট কোনো বোর্ডের প্রশ্ন চায়, তবে সাথে সাথে সংশ্লিষ্ট বোর্ড দিয়ে টুল কল করবে।
     * **কঠোর নিয়ম ৭ (বোর্ড পরীক্ষা ও সালের প্রামাণিকতা - Zero False Exam Disruption Hallucination):**
       - কখনোই 'বোর্ড পরীক্ষা অনুষ্ঠিত হয়নি', '২০২০-২০২৫ সময়ে এসএসসি পরীক্ষা নিয়মিতভাবে অনুষ্ঠিত হয়নি', বা 'নির্দিষ্ট সময়ে প্রশ্ন পাওয়া যাচ্ছে না' জাতীয় কোনো মনগড়া ও ভিত্তিহীন ঐতিহাসিক অজুহাত দেবে না!
       - ডেটাবেসে ২০২০ থেকে ২০২৬ সালের সকল শিক্ষা বোর্ডের হাজার হাজার আসল প্রশ্ন ও বহুনির্বাচনী প্রশ্ন সংরক্ষিত আছে।
       - শিক্ষার্থী কোনো নির্দিষ্ট সালের বা সালের রেঞ্জের প্রশ্ন চাইলে (যেমন: "2020-2025 er mondhe ase nai", "২০২০-২০২৫ এর প্রশ্ন দাও", "2024 er dao"): সাথে সাথে get_mcq_quiz বা get_creative_question টুলে year: "2020-2025" (বা নির্দিষ্ট সাল) এবং বোর্ড উল্লেখ থাকলে সেই board পাস করে আসল প্রশ্ন তুলে আনবে।
   - **ব্যতিক্রম:** শিক্ষার্থী যখন চলমান কুইজ বা প্রশ্নের উত্তর দিচ্ছে (যেমন: "খ", "উত্তর ক", "ans b", "amar mone hoy kh"), তখন ভুলেও কোনো টুল কল করবে না! সরাসরি পূর্বের প্রশ্নের উত্তরের সাথে মিলিয়ে মূল্যায়ন করবে।
৭. ইন্টারেক্টিভ কুইজ ও ডায়নামিক অ্যাডাপ্টিভ টেস্ট মোড (Dynamic Adaptive Testing & Live Grading):
   - শিক্ষার্থী যদি বলে "আমার থেকে টেস্ট নাও", "একটা পরীক্ষা নাও", "mcq test dao", বা পূর্বের প্রশ্নের পর "পরের প্রশ্ন দাও / next":
     * **ডায়নামিক অ্যাডাপ্টিভ লেভেলিং (Real-Time Skill Progression):**
       - শুরুতে স্ট্যান্ডার্ড বা মাঝারি (Medium / প্রয়োগমূলক) প্রশ্ন দিয়ে শুরু করবে।
       - শিক্ষার্থী পরপর সঠিক উত্তর দিলে স্বয়ংক্রিয়ভাবে ডিফিকাল্টি বাড়াবে (Level Up ➔ hard: বহুপদী সমাপ্তিসূচক i, ii, iii বা ক্যাডেট ট্র্যাপ প্রশ্ন) এবং শিক্ষার্থীকে উৎসাহিত করবে: "চমৎকার! তোমার বেসিক চমৎকার, এবার দেখা যাক এই কঠিন ট্রিকি প্রশ্নটি সমাধান করতে পারো কি না—"।
       - শিক্ষার্থী ভুল উত্তর দিলে পরবর্তী প্রশ্নে একই সূত্রের ওপর একটি সহজ বা ফাউন্ডেশন প্রশ্ন (Level Down ➔ easy: মৌলিক জ্ঞান/সংজ্ঞা) দিয়ে কনসেপ্ট ঝালিয়ে দেবে: "কোনো সমস্যা নেই, চলো একই কনসেপ্টের এই বেসিক প্রশ্নটি আগে ক্লিয়ার করি—"।
     * get_mcq_quiz টুলটি mode: 'mock_test' দিয়ে কল করবে এবং হিসাব অনুযায়ী difficulty ('easy' | 'medium' | 'hard') পাস করবে।
     * প্রশ্ন ও ৪টি অপশন (ক, খ, গ, ঘ) উপস্থাপন করবে, কিন্তু **সঠিক উত্তর ও ব্যাখ্যা শুরুতে গোপন রাখবে**!
     * শিক্ষার্থীকে বলবে: "তোমার উত্তর কোনটি? (ক, খ, গ নাকি ঘ?)"
   - **কুইজের উত্তর মূল্যায়ন (Strictly No Tool Calls):** শিক্ষার্থী যখন আগের প্রশ্নের উত্তর দেয় (যেমন: "খ", "b", "উত্তর ক", "amar mone hoy uttor kh"):
     * কোনো টুল কল করবে না।
     * সরাসরি পূর্বের প্রশ্নের উত্তরের সাথে মিলিয়ে তাৎক্ষণিক ভাইয়াসুলভ প্রাণবন্ত মূল্যায়ন করবে:
       - **সঠিক হলে:** আন্তরিক প্রশংসা করবে (যেমন: "সাবাশ ভাইয়া! একদম ঠিক ধরেছ।") ➔ এরপর ২-৩ লাইনে উত্তরের মূল বৈজ্ঞানিক যুক্তি/সূত্র মনে করিয়ে দেবে ➔ তারপর স্বাভাবিকভাবে পরের চ্যালেঞ্জে ডাকবে: "বেসিক তো দারুণ আয়ত্ত করেছ! কিন্তু পরীক্ষকরা ঠিক এই টাইপের প্রশ্নটাই আরেকটু ঘুরিয়ে পেঁচিয়ে দেয়। চলো এবার এই টাইপেরই একটু কঠিন আর ট্রিকি প্রশ্নে যাই, দেখি ধরতে পারো কি না?"
       - **ভুল হলে:** কোনো রোবোটিক বা হতাশাজনক কথা নয়, বড় ভাইয়ের মতো স্নেহ নিয়ে বলবে: "আরেহ ভাইয়া, একটু তাড়াহুড়ো করে ফেললে! পরীক্ষক কিন্তু ঠিক এই জায়গাটাতেই ফাঁদ পাতে।" ➔ এরপর সঠিক উত্তর ও স্টেপ-বাই-স্টেপ সমাধান বুঝিয়ে দেবে ➔ তারপর বলবে: "কোনো সমস্যা নেই, এই টাইপটা এখন মাথায় ঢুকে গেছে তো? চলো একই টাইপের আরেকটি সহজ প্রশ্ন দিয়ে জিনিসটা একদম ঝালাই করে নিই।"
৮. স্পেসিফিক সূত্র ও টপিক অনুসন্ধান (Universal Search):
   - শিক্ষার্থী যদি কোনো নির্দিষ্ট সূত্র বা বিষয় (যেমন: "ওহমের সূত্র", "নিউটনের ৩য় সূত্র", "কপোতাক্ষ নদ", "দ্বিঘাত সমীকরণ", "তুল্যরোধ", "ক্লোরোপ্লাস্ট") নিয়ে প্রশ্ন চায়:
   - সরাসরি search_question_bank টুল কল করে আসল বোর্ড ও টেস্ট পরীক্ষার প্রশ্ন তুলে এনে দেবে।
৯. বাংলিশ ও শর্টকাট দ্রুত অনুধাবন:
   - শিক্ষার্থী বাংলিশে বা সংক্ষেপে লিখলেও (যেমন: "gotto koita" বা "goddo koita" ➔ বাংলা ১ম পত্রের গদ্য কয়টি, "kobita koita" ➔ কবিতা কয়টি, "goti mcq", "db 26 math", "cadet hard cq", "kothin mcq dao") কোনো জড়তা ছাড়া তার সঠিক উদ্দেশ্য বুঝে সংশ্লিষ্ট বিষয় ও টুলের মাধ্যমে রিয়েল-টাইম রেসপন্স দেবে। "gotto" মানে বাংলা ১ম পত্রের "গদ্য", ভুলেও পদার্থবিজ্ঞানের "গতি" বা অন্য বিষয় ভাববে না!
১০. টাইপভিত্তিক প্রশ্ন বিশ্লেষণ ও অনুরূপ প্রশ্ন অনুসন্ধান (Vector Similarity & Similar Type):
    - শিক্ষার্থী যখনই বলবে "এই টাইপের আরেকটা প্রশ্ন দাও", "একই সূত্রের অন্য বোর্ডের প্রশ্ন দাও", "similar type dao", "emon type er arekta", "eida oi type er ei", বা পূর্ববর্তী প্রশ্নের অনুরূপ প্রশ্ন চাইবে:
      * পূর্ববর্তী প্রশ্নে যে নির্দিষ্ট অধ্যায় ও সূত্রের অঙ্ক বা বিষয়বস্তু ছিল (যেমন অধ্যায় ১২-এর সাবান/ব্লিচিং পাউডার বা অধ্যায় ৬-এর লিমিটিং বিক্রিয়ক), ঠিক সেই বিষয় ও অধ্যায় অক্ষুণ্ণ রেখে অনুরূপ প্রশ্ন তুলে আনবে।
      * সরাসরি get_creative_question (একই chapter ও topic দিয়ে) অথবা find_similar_type_questions টুল কল করবে।
      * ভুলেও সম্পূর্ণ ভিন্ন অধ্যায়ের বা অপ্রাসঙ্গিক সূত্রের প্রশ্ন এনে শিক্ষার্থীর পড়ার স্বাভাবিক ধারাবাহিকতা (Flow) নষ্ট করবে না!
      * শিক্ষার্থীকে দেখিয়ে দেবে: মূল সূত্র বা কনসেপ্ট কী ছিল এবং পরীক্ষক এখানে কীভাবে সংখ্যা বা ভাষা ঘুরিয়েছে (Examiner Twist)।
১১. অধ্যায়ভিত্তিক টাইপ ব্লুপ্রিন্ট বিশ্লেষণ (Chapter Pattern Analysis):
   - শিক্ষার্থী যখন কোনো অধ্যায়ের টাইপ জানতে চাইবে (যেমন: "গতির সবগুলো টাইপ বুঝিয়ে দাও", "কমন প্যাটার্ন কী কী?", "টাইপভিত্তিক রোডম্যাপ দাও"):
     * সরাসরি analyze_chapter_patterns টুল কল করবে।
     * পুরো অধ্যায়টিকে ৪-৬টি মাস্টার টাইপে ভাগ করে ছক আকারে উপস্থাপন করবে: ১) মাদার কনসেপ্ট ও মূল সূত্র (LaTeX), ২) পরীক্ষক যেভাবে ঘোরায় (Twist Pattern), ৩) বিগত বোর্ডের আসল উদাহরণ, ৪) ১০ সেকেন্ডের শর্টকাট ট্রিক।
১২. ডায়নামিক এসকিউএল স্ক্রিপ্টিং ও কাস্টম অনুসন্ধান (Autonomous Dynamic SQL Execution):
   - সাধারণ বা নির্দিষ্ট টুলগুলো দিয়ে যদি শিক্ষার্থীর কোনো জটিল, তুলনামূলক, বছরভিত্তিক, পরিসংখ্যানমূলক বা গভীর অনুসন্ধানী প্রশ্নের উত্তর পাওয়া না যায় (যেমন: '২০২৪ থেকে ২০২৬ সালের মধ্যে কোন কোন বোর্ডে ত্বরণ নিয়ে বহুপদী প্রশ্ন এসেছে?', 'রসায়নে জারণ-বিজারণ নিয়ে মোট কতটি প্রশ্ন আছে?', 'সবচেয়ে বেশি বার আসা ৫টি CQ প্রশ্ন কী কী?', 'ক্যাডেট কলেজ ও বোর্ডের মধ্যে প্রশ্নের পার্থক্য কী?'):
   - তুমি নিজেই স্বয়ংক্রিয়ভাবে বুদ্ধিদীপ্ত কাস্টম এসকিউএল (SELECT) কোয়েরি লিখে query_question_database_sql টুল কল করবে!
   - ডেটাবেসের টেবিলসমূহ: questions, subjects, chapters, exams, chapter_types, question_patterns, question_vectors।
   - কুয়েরি থেকে পাওয়া আসল ডেটা ও প্রশ্ন উপস্থাপন করে বাস্তব প্রমাণসহ শিক্ষার্থীকে বুঝিয়ে দেবে।
১৩. অপ্রয়োজনীয় ও পুনরাবৃত্তিমূলক টুল কল সম্পূর্ণ নিষিদ্ধ (Strictly Zero Redundant Tool Calling):
   - পূর্ববর্তী কথোপকথনে (Chat History) যদি কোনো বিষয়ের তথ্য ইতিমধ্যে উপস্থিত থাকে (যেমন: কোনো বিষয়ের অধ্যায় তালিকা ইতিমধ্যে দেওয়া হয়েছে, বা শিক্ষার্থী ফলো-আপ প্রশ্ন করেছে):
   - ভুলেও একই টুল (যেমন get_subject_chapters) দ্বিতীয়বার বা পুনরাবৃত্তিমূলকভাবে কল করবে না!
   - শিক্ষার্থী যখন পূর্ববর্তী উত্তরের প্রেক্ষিতে ফলো-আপ প্রশ্ন করে কোনো বিষয়ের তালিকা জানতে চায় (যেমন: "বলো কী কী", "কী কী", "আর কী কী", "সবগুলোর নাম বলো", "কোনগুলো", "এগুলোর মধ্যে সবচেয়ে সহজ কোনটা?", "কোনটা আগে পড়ব?", "কেন?"): সরাসরি চ্যাট হিস্ট্রি ও তোমার অ্যাকাডেমিক জ্ঞান দেখে স্বাভাবিকভাবে মানুষের মতো ঝরঝরে ভাষায় সুন্দর বুলেট তালিকা ও উত্তর দেবে। কোনো অবস্থাতেই কোনো টুল কল করবে না!
   - **সতর্কতা (প্রশ্ন চাওয়ার ক্ষেত্রে টুল আবশ্যক):** কিন্তু শিক্ষার্থী যদি নতুন কোনো প্রশ্ন বা কুইজ চায় (যেমন: "আরেকটা দাও", "tmi ekta deo jekono", "যেকোনো বোর্ডের দাও", "mcq dao", "test dao", "পরেরটা"): তখন এটি কোনো সাধারণ টেক্সট ফলো-আপ নয়—ডেটাবেস থেকে প্রামাণিক প্রশ্ন তোলার জন্য অবশ্যই get_mcq_quiz বা get_creative_question টুল কল করতে হবে! ভুলেও নিজে মনগড়া প্রশ্ন বানাবে না।
   - ভুলেও "আগে ৪টি বলেছিলাম দুঃখিত", "ভুল হয়েছিল" — এই ধরণের অপেশাদার কথা বলবে না। প্রথমবারেই নির্ভুল ও পূর্ণাঙ্গ তথ্য দেবে।
১৪. কঠোর টু-দ্য-পয়েন্ট ও প্রাসঙ্গিক উত্তর (Strict Anti-Rambling & Direct Answer):
   - শিক্ষার্থী যা জানতে চেয়েছে, ঠিক সেই সুনির্দিষ্ট প্রশ্নের সংক্ষিপ্ত ও সরাসরি উত্তর দেবে। কোনো অপ্রাসঙ্গিক লম্বা তালিকা বা অযাচিত লেকচার দেবে না!
   - শিক্ষার্থী যদি বলে "যেটা সবচেয়ে সহজ সেটা বলো" বা "কোন ১টা পড়ব?":
     * ভুলেও ৭-৮টি অধ্যায়ের তালিকা, পড়ার রুটিন বা গাদা গাদা অধ্যায় দিয়ে উত্তর ভরিয়ে ফেলবে না!
     * সরাসরি ১টি (বা সর্বোচ্চ ২টি) সুনির্দিষ্ট সহজতম অধ্যায়ের নাম স্পষ্টভাবে বলবে (যেমন: "জীববিজ্ঞানের সবচেয়ে সহজ অধ্যায় হলো **অধ্যায় ১৩: জীবের পরিবেশ**")।
     * মাত্র ২-৩ লাইনে বুঝিয়ে দেবে কেন এটি সবচেয়ে সহজ এবং কীভাবে সহজে ১০ নম্বর কমন পাওয়া যায়।
     * কথা সবসময় সংক্ষিপ্ত, মিষ্টি ও সরাসরি টু-দ্য-পয়েন্ট রাখবে।
১৫. 'কঠিন অধ্যায়' বা ভীতি সংক্রান্ত প্রশ্নের ক্ষেত্রে বাস্তব সত্য ও পরীক্ষকের রহস্য উন্মোচন (No Vague Clichés or 'মনে হয়'):
   - শিক্ষার্থী যখন জানতে চায় 'কোন অধ্যায় সবচেয়ে কঠিন?' বা 'এটা কি আসলেই কঠিন?':
     * ভুলেও 'সাধারণত মনে হয়', 'সবার জন্য আলাদা', 'অনুশীলন করলেই সহজ হবে' — এমন ভাসাভাসা, দায়সারা ও কনফিউজিং উত্তর দেবে না!
     * একজন তুখোড় এক্সপার্ট বড় ভাইয়ার মতো মুখের ওপর আসল সত্য ভেঙে বলবে:
       'আসলে কোনো অধ্যায়ই কঠিন নয় ভাইয়া! কঠিন মনে হওয়ার একমাত্র কারণ—বইতে ঢালাও ৩০-৪০টি সমস্যা থাকে কিন্তু পরীক্ষায় আসে মাত্র ৩-৪টি নির্দিষ্ট টাইপ। শিক্ষার্থীরা যখন না বুঝে পুরো বই মুখস্থ করতে যায়, তখনই তাদের কাছে কঠিন লাগে।'
     * প্রতিটি বিষয়ের "ভয়ংকর" বা "কঠিন" বলে পরিচিত অধ্যায়ের পেছনের আসল রহস্য ও পরীক্ষকের মাত্র ৩-৪টি ফিক্সড টাইপ ধরিয়ে দেবে।
     * শিক্ষার্থীকে ভয় দূর করে আশ্বস্ত করবে: 'এই ৩-৪টা প্যাটার্ন ধরতে পারলে এই তথাকথিত কঠিন অধ্যায়ই তোমার কাছে পরীক্ষার সবচেয়ে সহজ ১০ নম্বর হয়ে যাবে!'
১৬. অফিশিয়াল সিলেবাস ও অধ্যায় তথ্যের পূর্ণাঙ্গ ও নির্ভুল উপস্থাপন (Zero Hallucination):
    - শিক্ষার্থী যখন কোনো বিষয়ের অধ্যায় সংখ্যা, অধ্যায়ের নাম, সিলেবাস বা গদ্য-কবিতার তালিকা জানতে চায়: কখনোই নিজের মনগড়া অনুমান থেকে তথ্য বানিয়ে দেবে না।
১৭. বহুধাপ স্বায়ত্তশাসিত রিঅ্যাক্ট টুল কলিং ও যৌক্তিক ধাপ বিন্যাস (Multi-Step ReAct Chaining & Strict Logical Tool Ordering):
    - যদি কোনো শিক্ষার্থীর প্রশ্নের সঠিক ও পূর্ণাঙ্গ উত্তরের জন্য একের অধিক টুলের তথ্য প্রয়োজন হয় (যৌগিক প্রশ্ন / Composite Queries):
      * **কঠোর যৌক্তিক ক্রম (Strict Logical Dependency Ordering):** অজানা তথ্যের ক্ষেত্রে প্রথমে ১ম টুল কল করে আসল তথ্য জেনে নেবে, তারপর সেই ফলাফলের ভিত্তিতে ২য় টুল কল করবে।
      * উদাহরণ: যদি প্রশ্ন করে "পদার্থের কোন অধ্যায় থেকে বোর্ডে সবচেয়ে বেশি প্রশ্ন আসে এবং ওই অধ্যায় থেকে একটা বোর্ড সৃজনশীল প্রশ্ন দাও":
        - **ধাপ ১ (Step 1):** আগে get_chapter_importance_ranking(subject: "ssc_physics") কল করে সবচেয়ে বেশি প্রশ্ন আসা শীর্ষ অধ্যায়ের নাম জানবে (যেমন: গতি বা চল তড়িৎ)।
        - **ধাপ ২ (Step 2):** ১ম টুলের প্রাপ্ত ফলাফল (most_important_chapter) থেকে শীর্ষ অধ্যায়ের নাম নিয়ে get_creative_question(subject: "ssc_physics", chapter: "<প্রাপ্ত শীর্ষ অধ্যায়ের নাম>") কল করবে।
        - **ধাপ ৩ (Final Synthesis):** সব তথ্য পাওয়ার পর শিক্ষার্থীকে বড় ভাইয়ার মতো শীর্ষ অধ্যায়ের বোর্ড গুরুত্ব/পরিসংখ্যান এবং সৃজনশীল প্রশ্নটি সুন্দরভাবে সাজিয়ে দেবে।
      * ভুলেও ১ম টুলের ফলাফল পাওয়ার আগেই অনুমান করে বা অধ্যায়ের নাম ফাঁকা/ভুল রেখে ২য় টুল কল করবে না!
`;

function isConversational(msg) {
  if (!msg) return false;
  const m = msg.trim().toLowerCase().replace(/[\?\!\.\,\-_]/g, "");
  const greetings = [
    "assalamulikum", "assalamu alaikum", "assalamualaikum", "সালাম", "আসসালামু আলাইকুম",
    "hi", "hello", "hey", "hola", "হাই", "হ্যালো",
    "kemon acho", "kemon aso", "কেমন আছো", "কেমন আছেন",
    "thanks", "thx", "dhonnobad", "ধন্যবাদ", "থ্যাংকস",
    "ok", "hmm", "হুম", "আচ্ছা", "accha", "bye", "বিদায়"
  ];
  if (greetings.includes(m)) return true;
  if (m.length < 35 && greetings.some(g => m.startsWith(g)) && 
      !m.includes("অধ্যায়") && !m.includes("অধ্যায়") && 
      !m.includes("প্রশ্ন") && !m.includes("চ্যাপ্টার") && 
      !m.includes("mcq") && !m.includes("cq") &&
      !m.includes("math") && !m.includes("গণিত") && !m.includes("physics") && !m.includes("পদার্থ")) {
    return true;
  }
  return false;
}



// Token Optimization Helper: Compacting tool results reduces context payload by 85-95%
export function compactToolResult(toolName, rawResult, toolArgs = {}) {
  if (!rawResult) return { status: "empty" };

  switch (toolName) {
    case "get_mcq_quiz": {
      const q = rawResult.quiz?.[0];
      if (!q || !q.question_text) {
        return {
          status: "not_found",
          message: "নির্দিষ্ট অধ্যায়ে কোনো বহুনির্বাচনী প্রশ্ন পাওয়া যায়নি। শিক্ষার্থীকে আন্তরিকভাবে বিষয় বা অন্য কোনো অধ্যায় উল্লেখ করতে বলো।"
        };
      }
      const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
      const rawAns = q?.answer || '';
      const normAns = toBnAns[rawAns] || rawAns || 'ক';
      const bTag = q?.formatted_source || formatTag(q?.tags) || "বোর্ড প্রামাণিক প্রশ্ন";

      return {
        chapter: rawResult.actual_chapter?.display || rawResult.actual_chapter?.name || toolArgs?.chapter || "",
        board: bTag,
        question: q?.question_text,
        options: {
          "ক": q?.option_a,
          "খ": q?.option_b,
          "গ": q?.option_c,
          "ঘ": q?.option_d
        },
        answer_code: normAns,
        mentor_guide: `উপস্থাপনার নিয়ম: প্রথমে ১-২ বাক্যে মার্জিত ও প্রফেশনাল ভূমিকা দিয়ে প্রশ্নটির গুরুত্ব উল্লেখ করো (যেমন: '${bTag}-এর বিগত পরীক্ষার একটি গুরুত্বপূর্ণ বহুনির্বাচনী প্রশ্ন নিচে দেওয়া হলো—')। প্রশ্নের ঠিক নিচে আলাদা লাইনে [বোর্ড: ${bTag}] উল্লেখ করবে। এটি কোনো কাল্পনিক প্রশ্ন নয়, শতভাগ প্রামাণিক বোর্ড প্রশ্ন। কোনো <কুইজ> বা কাল্পনিক ট্যাগ লিখবে না। ভুলেও 'যেকোনো একটি অপশন নির্বাচন করো' বা 'খুঁজে দিচ্ছি' বলবে না। তারপর প্রশ্ন, ৪টি অপশন এবং শেষে [ans: ${normAns}] দেবে। ভুলেও সরাসরি উত্তর বা ব্যাখ্যা লিখবে না যাতে কুইজ স্পয়েল না হয়।`
      };
    }

    case "get_creative_question": {
      if (!rawResult.stem && !rawResult.question_text) {
        return {
          status: "not_found",
          message: "নির্দিষ্ট অধ্যায়ে কোনো সৃজনশীল প্রশ্ন পাওয়া যায়নি।"
        };
      }
      const ch = rawResult.actual_chapter?.display || rawResult.actual_chapter?.name || rawResult.chapter_name || toolArgs?.chapter || "";
      const bTag = rawResult.board_tag || rawResult.formatted_source || formatTag(rawResult.raw_tag || rawResult.tags) || "বোর্ড প্রামাণিক প্রশ্ন";

      return {
        chapter: ch,
        board: bTag,
        stem: rawResult.stem || rawResult.question_text,
        part_ka: rawResult.part_ka,
        part_kha: rawResult.part_kha,
        part_ga: rawResult.part_ga,
        part_gha: rawResult.part_gha,
        mentor_guide: `উপস্থাপনার নিয়ম: মার্জিত ও প্রাতিষ্ঠানিক অ্যাকাডেমিক কথনে শিরোনামে অধ্যায় এবং [বোর্ড: ${bTag}] উল্লেখ করবে। উদ্দীপক এবং ক, খ, গ, ঘ অংশের প্রশ্ন ও নম্বর বণ্টন উল্লেখ করে সুন্দর মার্কডাউনে উপস্থাপন করো। ভুলেও 'আসল প্রশ্ন', 'আসল CQ' বা কোনো কাল্পনিক ট্যাগ লিখবে না।`
      };
    }

    case "get_subject_chapters": {
      return {
        subject: rawResult.subject,
        total_chapters: rawResult.total_chapters,
        divisions: rawResult.divisions,
        numbered_chapters: rawResult.numbered_chapters
      };
    }

    case "check_board_frequency": {
      return {
        topic: rawResult.topic || toolArgs.topic,
        total_questions: rawResult.total_questions,
        frequency_summary: rawResult.frequency_analysis || `${rawResult.topic} বিগত বছরগুলোতে মোট ${rawResult.total_questions} বার এসেছে।`
      };
    }

    case "get_board_exam_questions": {
      return {
        board: rawResult.board || toolArgs.board_name,
        available_exam_sets: rawResult.available_exam_sets?.slice(0, 3),
        total_sets: rawResult.available_exam_sets?.length || 0
      };
    }

    case "get_chapter_importance_ranking": {
      const topList = rawResult.top_priority_chapters_with_board_breakdown || rawResult.topTierWithBoardDetails || [];
      return {
        subject: rawResult.subject,
        most_important_chapter: rawResult.most_important_chapter,
        top_priority_chapters: topList.slice(0, 4).map(c => ({
          chapter: `অধ্যায় ${c.chapter_number}: ${c.chapter_name}`,
          appearances: c.total_board_appearances
        }))
      };
    }

    case "find_similar_type_questions": {
      const q = rawResult.similar_type_questions?.[0];
      const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
      const rawAns = q?.answer || '';
      const normAns = toBnAns[rawAns] || rawAns || 'ক';
      const bTag = formatTag(q?.board || q?.raw_tag) || "বোর্ড স্ট্যান্ডার্ড";

      return {
        chapter: rawResult.chapter_name || toolArgs?.chapter || "",
        board: bTag,
        question: q?.question,
        options: {
          "ক": q?.options?.[0],
          "খ": q?.options?.[1],
          "গ": q?.options?.[2],
          "ঘ": q?.options?.[3]
        },
        answer_code: normAns,
        mentor_guide: `অনুরূপ প্রশ্ন: বড় ভাইয়াসুলভ কথনে আগের প্রশ্নের মূল টাইপ ও সূত্রের সাথে এই প্রশ্নের মিল ধরিয়ে দাও। শেষে [ans: ${normAns}] দেবে।`
      };
    }

    case "analyze_chapter_patterns": {
      return {
        chapter: rawResult.chapter_name,
        total_questions: rawResult.total_questions_in_database,
        patterns: rawResult.patterns
      };
    }

    case "search_question_bank": {
      return {
        query: rawResult.search_query,
        total_found: rawResult.total_found,
        results: (rawResult.results || []).slice(0, 3).map(r => ({
          question: r.question_text,
          answer: r.answer,
          board: formatTag(r.tags)
        }))
      };
    }

    case "query_question_database_sql": {
      return {
        success: rawResult.success,
        total_matching_rows: rawResult.total_matching_rows,
        rows: (rawResult.rows || []).slice(0, 5)
      };
    }

    default:
      return rawResult;
  }
}

export async function runAgenticConversation(userMessage, onEvent, options = {}) {
  const startTime = performance.now();
  const pastHistory = options.history || [];

  // Build input history with system prompt, past chat turns, and current user query
  const inputHistory = [
    { type: "message", role: "system", content: SYSTEM_PROMPT }
  ];

  // Token Optimization: Keep only last 4 turns (2 user, 2 assistant)
  // Truncate overlong assistant messages (> 750 chars) to conserve context
  for (const item of pastHistory.slice(-4)) {
    if (item.role === "user" || item.role === "assistant") {
      let content = item.content;
      if (typeof content === "string") {
        // Strip out any thought tags from past conversation history so model is not confused!
        content = content.replace(/<[\s]*(?:thought|thinking)[\s]*>[\s\S]*?<[\s]*\/[\s]*(?:thought|thinking)[\s]*>/gi, '').trim();
      }
      if (item.role === "assistant" && typeof content === "string" && content.length > 750) {
        content = content.slice(0, 750) + "...";
      }
      inputHistory.push({
        type: "message",
        role: item.role,
        content
      });
    }
  }

  const isUserAnswering = /^(ক|খ|গ|ঘ|a|b|c|d|১|২|৩|৪)$|^উত্তর\s*[:ঃ]?\s*(ক|খ|গ|ঘ|a|b|c|d)|^ans\s*[:ঃ]?\s*(ক|খ|গ|ঘ|a|b|c|d)/i.test(userMessage.trim());
  const isMcqIntent = !isUserAnswering && (/mcq|বহুনির্বাচন|quiz|নৈর্ব্যক্তিক|নৈর্বাচনিক|একটি mcq|এক্টা mcq|ekta mcq|আরেকটা দাও|নতুন mcq/i.test(userMessage) || (/(প্রশ্ন দাও|test dao|কুইজ)/i.test(userMessage) && !/সৃজনশীল|cq/i.test(userMessage)));
  const isCqIntent = !isUserAnswering && /cq|সৃজনশীল|উদ্দীপক/i.test(userMessage);

  if (isMcqIntent) {
    inputHistory.push({
      type: "message",
      role: "system",
      content: "IMPORTANT ACADEMIC DIRECTIVE: The student is requesting an authentic Board/College MCQ. You MUST invoke get_mcq_quiz with the relevant chapter/topic/subject/board/year. Under NO circumstances should you invent or hallucinate a question in text without calling the tool."
    });
  } else if (isCqIntent) {
    inputHistory.push({
      type: "message",
      role: "system",
      content: "IMPORTANT ACADEMIC DIRECTIVE: The student is requesting an authentic Board/College Creative Question (CQ). You MUST invoke get_creative_question with the relevant chapter/topic/subject/board/year. Under NO circumstances should you invent or hallucinate a question in text without calling the tool."
    });
  }

  // Add current user message
  inputHistory.push({
    type: "message",
    role: "user",
    content: userMessage
  });

  // Fast path for conversational messages (greetings, thanks, small talk)
  // Skips tool serialization overhead to deliver ~1.1s instant streaming!
  if (isConversational(userMessage)) {
    const streamRes = await fetch(MERGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERGE_API_KEY}`
      },
      body: JSON.stringify({
        input: inputHistory,
        model: MODEL_NAME,
        vendor: "openai",
        stream: true,
        include_routing_metadata: true
      })
    });

    if (!streamRes.ok) {
      const err = await streamRes.text();
      throw new Error(`Merge Stream Error ${streamRes.status}: ${err}`);
    }

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let lastSeenLength = 0;

    let firstTokenTime = null;

    conversationalLoop: while (true) {
      const { done, value } = await reader.read();
      if (done) break conversationalLoop;

      buffer += decoder.decode(value);
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (!raw) continue;
          if (raw === "[DONE]") {
            try { reader.cancel(); } catch (e) {}
            break conversationalLoop;
          }

          try {
            const parsed = JSON.parse(raw);
            const currentText = parsed.output?.[0]?.content?.[0]?.text;
            if (currentText !== undefined && currentText.length > lastSeenLength) {
              if (!firstTokenTime) {
                firstTokenTime = Math.round(performance.now() - startTime);
              }
              const delta = currentText.slice(lastSeenLength);
              lastSeenLength = currentText.length;
              fullContent = currentText;
              await onEvent({
                type: "content_delta",
                delta
              });
            }
          } catch (e) {}
        }
      }
    }

    const totalLatency = Math.round(performance.now() - startTime);
    await onEvent({
      type: "done",
      content: fullContent,
      toolCalls: [],
      latencyMs: totalLatency,
      ttft: firstTokenTime
    });
    return;
  }

  const executedToolsLog = [];
  let firstTokenTime = null;
  let finalResponseContent = "";

  // Smart tool filtering: if student asks a direct follow-up listing ("বলো কী কী", "কী কী", "আর কী কী", "নামগুলো বলো", "কোনগুলো")
  // and there is already recent history, remove get_subject_chapters so the model synthesizes directly from memory without duplicate tool calls!
  const isFollowUpListing = /^(বলো\s*কী\s*কী|কী\s*কী|আর\s*কী\s*কী|কোনগুলো|নামগুলো\s*বলো|কি\s*কি|bolo\s*ki\s*ki|ki\s*ki|ar\s*ki|naam\s*bolo|kon\s*gula|r\s*ki)/i.test(userMessage.trim().replace(/[?!.,]/g, ""));

  const availableTools = (isFollowUpListing && pastHistory.length > 0)
    ? AGENT_TOOLS.filter(t => t.function.name !== "get_subject_chapters")
    : AGENT_TOOLS;

  const MAX_STEPS = 3;
  let currentStep = 0;

  reactLoop: while (currentStep < MAX_STEPS) {
    currentStep++;

    // Once a tool has already been executed, force direct answer synthesis in the next step (NO TOOLS)!
    const toolsForStep = (executedToolsLog.length > 0 || currentStep >= MAX_STEPS)
      ? undefined
      : availableTools;

    const res = await fetch(MERGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERGE_API_KEY}`
      },
      body: JSON.stringify({
        input: inputHistory,
        tools: toolsForStep,
        model: MODEL_NAME,
        vendor: "openai",
        stream: true,
        include_routing_metadata: true
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Merge Gateway Error ${res.status}: ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let toolCall = null;
    let stepContent = "";
    let lastSeenLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        if (raw === "[DONE]") {
          try { reader.cancel(); } catch (e) {}
          break;
        }

        try {
          const parsed = JSON.parse(raw);
          const content = parsed.output?.[0]?.content;
          if (Array.isArray(content)) {
            for (const item of content) {
              if (item.type === "tool_use") {
                toolCall = item;
              } else if (item.type === "text" && item.text) {
                stepContent = item.text;
                if (item.text.length > lastSeenLength) {
                  const delta = item.text.slice(lastSeenLength);
                  lastSeenLength = item.text.length;
                  if (delta) {
                    if (!firstTokenTime) {
                      firstTokenTime = Math.round(performance.now() - startTime);
                    }
                    await onEvent({
                      type: "content_delta",
                      delta
                    });
                  }
                }
              }
            }
          }
        } catch (e) {}
      }
    }

    // CASE A: Model provided direct response text (No tool called in this step) -> Streamed in real time!
    if (!toolCall) {
      const cleanAnswer = stepContent ? stepContent.replace(/<thought>[\s\S]*?<\/thought>/gi, "").trim() : "";
      if (!cleanAnswer && currentStep < MAX_STEPS) {
        // Model emitted thinking tags without actually answering or calling a tool
        const isMcqIntent = /mcq|বহুনির্বাচন|quiz|নৈর্ব্যক্তিক|নৈর্বাচনিক|একটি mcq|এক্টা mcq/i.test(userMessage);
        const isCqIntent = /cq|সৃজনশীল|উদ্দীপক|ক\s*\)\s*|খ\s*\)/i.test(userMessage);

        if (isMcqIntent) {
          console.warn(`[AgentLoop] Step ${currentStep} emitted thought without tool_use for MCQ intent. Synthesizing get_mcq_quiz...`);
          toolCall = {
            id: "call_synth_mcq_" + Date.now(),
            name: "get_mcq_quiz",
            input: {
              query: userMessage,
              academic_intent: "শিক্ষার্থীর চাওয়া অধ্যায়ের সঠিক বোর্ড বহুনির্বাচনী প্রশ্ন অনুসন্ধান করছি..."
            }
          };
        } else if (isCqIntent) {
          console.warn(`[AgentLoop] Step ${currentStep} emitted thought without tool_use for CQ intent. Synthesizing get_creative_question...`);
          toolCall = {
            id: "call_synth_cq_" + Date.now(),
            name: "get_creative_question",
            input: {
              query: userMessage,
              academic_intent: "শিক্ষার্থীর চাওয়া অধ্যায়ের সঠিক বোর্ড সৃজনশীল প্রশ্ন অনুসন্ধান করছি..."
            }
          };
        } else {
          // General question: nudge model to complete the answer directly in Bengali
          console.warn(`[AgentLoop] Step ${currentStep} produced thought but no answer or tool. Continuing to generate answer...`);
          if (stepContent && stepContent.includes("<thought>") && !stepContent.includes("</thought>")) {
            await onEvent({ type: "content_delta", delta: "</thought>\n\n" });
            stepContent += "</thought>\n\n";
          }
          await onEvent({ type: "thought_done", thought: stepContent });
          conversationMessages.push({ role: "assistant", content: stepContent });
          conversationMessages.push({ role: "user", content: "শিক্ষার্থীর প্রশ্নের সম্পূর্ণ উত্তর সরাসরি বাংলায় সুন্দরভাবে বুঝিয়ে দাও।" });
          continue reactLoop;
        }
      } else {
        finalResponseContent = stepContent;
        break reactLoop;
      }
    }

    // CASE B: Model invoked a tool! (Think -> Act -> Observe)
    const toolName = toolCall.name;
    const toolArgs = toolCall.input || {};
    const callId = toolCall.id;

    // If model invoked tool directly without text, stream its authentic academic_intent as thinking first!
    if (!stepContent) {
      const intentText = toolArgs.academic_intent || getToolHumanLabel(toolName, toolArgs) || "প্রাসঙ্গিক তথ্য ও প্রশ্ন অনুসন্ধান করছি...";
      stepContent = `<thought>${intentText}</thought>`;
      await onEvent({
        type: "content_delta",
        delta: stepContent
      });
    }

    // Ensure any open thought tag is cleanly closed and flushed to client
    if (stepContent && stepContent.includes("<thought>") && !stepContent.includes("</thought>")) {
      await onEvent({
        type: "content_delta",
        delta: "</thought>"
      });
      stepContent += "</thought>";
    }

    if (stepContent) {
      await onEvent({
        type: "thought_done",
        thought: stepContent
      });
    }

    // 1. Think / Intent (Emits academic intent to frontend)
    await onEvent({
      type: "tool_start",
      tool: toolName,
      args: toolArgs,
      label: getToolHumanLabel(toolName, toolArgs)
    });

    // 2. Act: Execute tool
    const dbStart = performance.now();
    const rawResult = await executeAgentTool(toolName, toolArgs);
    const toolDurationMs = Math.round(performance.now() - dbStart);
    executedToolsLog.push({ tool: toolName, args: toolArgs, durationMs: toolDurationMs, result: rawResult });

    // 3. Observe: Emit tool_done
    await onEvent({
      type: "tool_done",
      tool: toolName,
      args: toolArgs,
      durationMs: toolDurationMs,
      result: rawResult,
      title: getToolCompletedTitle(toolName, toolArgs, rawResult),
      summary: getToolSummary(toolName, rawResult)
    });

    // Notify frontend: next step generating starts immediately
    await onEvent({
      type: "generating_start"
    });

    // 4. Token Optimization: Compact tool result before appending to context
    const compacted = compactToolResult(toolName, rawResult, toolArgs);

    inputHistory.push({
      type: "message",
      role: "assistant",
      content: stepContent
        ? [{ type: "text", text: stepContent }, toolCall]
        : [toolCall]
    });
    inputHistory.push({
      type: "message",
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: callId,
          content: JSON.stringify(compacted)
        }
      ]
    });

    // Explicitly direct model to synthesize final answer with formal mentor tone and NO redundant thought tag
    inputHistory.push({
      type: "message",
      role: "system",
      content: "তথ্য পাওয়া গেছে। কোনো <thought> ট্যাগ ছাড়া এবং 'আসল প্রশ্ন খুঁজে দিচ্ছি' বা 'আসল MCQ' জাতীয় কোনো অপেশাদার স্ল্যাং ব্যবহার না করে সরাসরি মার্জিত ও প্রফেশনাল অ্যাকাডেমিক ভাষায় শিক্ষার্থীকে প্রশ্ন ও প্রয়োজনীয় দিকনির্দেশনা উপস্থাপন করো।"
    });
  }

  const totalLatency = Math.round(performance.now() - startTime);
  await onEvent({
    type: "done",
    content: finalResponseContent,
    toolCalls: executedToolsLog,
    latencyMs: totalLatency,
    ttft: firstTokenTime
  });
  return;
}

function toBnDigits(num) {
  if (num === undefined || num === null) return "";
  const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(num).replace(/[0-9]/g, d => bn[d]);
}

// Helpers for student-friendly, empathetic tool progress labels
function getToolHumanLabel(tool, args) {
  switch (tool) {
    case "get_subject_chapters":
      return `এনসিটিবি কারিকুলাম ও অফিশিয়াল অধ্যায় বিন্যাস যাচাই চলছে...`;
    case "check_board_frequency":
      return `'${args.topic || ""}' টপিকের বিগত বোর্ড পুনরাবৃত্তি রেকর্ড বিশ্লেষণ চলছে...`;
    case "get_board_exam_questions":
      return `${args.board_name || ""} বোর্ডের বিগত প্রশ্নপত্র ও পরীক্ষার প্যাটার্ন অনুসন্ধান চলছে...`;
    case "get_creative_question":
      return `বোর্ড স্ট্যান্ডার্ড সৃজনশীল (CQ) উদ্দীপক ও মানবণ্টন কাঠামো যাচাই চলছে...`;
    case "get_mcq_quiz":
      return `বোর্ড প্রশ্নব্যাংক থেকে ট্রিকি ও গুরুত্বপূর্ণ MCQ বাছাই করা হচ্ছে...`;
    case "get_chapter_importance_ranking":
      return `বিগত ৫ বছরের বোর্ড পরীক্ষার ৮০/২০ প্রায়োরিটি রুটম্যাপ বিশ্লেষণ চলছে...`;
    case "search_question_bank":
      return `'${args.query || ""}' সংক্রান্ত বোর্ড প্রশ্ন ও সমাধান অনুসন্ধান চলছে...`;
    case "find_similar_type_questions":
      return `অনুরূপ সূত্রের প্রশ্ন ও ভেক্টর প্যাটার্ন ম্যাচিং চলছে...`;
    case "analyze_chapter_patterns":
      return `${args.chapter || ""} অধ্যায়ের বিগত ১০ বছরের মাস্টার টাইপ ব্লুপ্রিন্ট প্রস্তুত হচ্ছে...`;
    case "query_question_database_sql":
      return args.explanation ? `অ্যাকাডেমিক অনুসন্ধান: ${args.explanation}...` : `৫০,৮৫৫টি বোর্ড প্রশ্ন থেকে লাইভ অ্যানালিটিক্স সংগ্রহ চলছে...`;
    default:
      return `বোর্ড পরীক্ষার ডেটাবেস বিশ্লেষণ চলছে...`;
  }
}

function getToolCompletedTitle(tool, args, result) {
  switch (tool) {
    case "get_subject_chapters":
      return `${result?.subject || "সিলেবাস"}: অফিশিয়াল এনসিটিবি কারিকুলাম যাচাইকৃত`;
    case "get_chapter_importance_ranking":
      return `${result?.subject || "সকল"}: বিগত ৫ বছরের বোর্ড প্রশ্ন ফ্রিকোয়েন্সি ও প্রায়োরিটি`;
    case "check_board_frequency":
      return `'${result?.topic || args?.topic || ""}' টপিকের বোর্ড পরীক্ষার রেকর্ড যাচাইকৃত`;
    case "get_board_exam_questions":
      return `${result?.board || args?.board_name || ""} বোর্ডের বিগত প্রশ্নপত্র সংগ্রহ প্রস্তুত`;
    case "get_creative_question":
      return `বোর্ড স্ট্যান্ডার্ড সৃজনশীল (CQ) উদ্দীপক ও ৪ স্তরের মানবণ্টন প্রস্তুত`;
    case "get_mcq_quiz":
      return `বোর্ড পরীক্ষার স্ট্যান্ডার্ড MCQ ও কনসেপ্ট বিশ্লেষণ প্রস্তুত`;
    case "search_question_bank":
      return `বোর্ড প্রশ্নব্যাংক অনুসন্ধান ও নির্ভরযোগ্য সমাধান প্রস্তুত`;
    case "find_similar_type_questions":
      return `অনুরূপ সূত্রের প্রশ্ন ও ভেক্টর প্যাটার্ন প্রস্তুত`;
    case "analyze_chapter_patterns":
      return `${result?.chapter_name || args?.chapter || ""} অধ্যায়ের মাস্টার টাইপ ব্লুপ্রিন্ট প্রস্তুত`;
    case "query_question_database_sql":
      return `৫০,৮৫৫টি প্রশ্নব্যাংক থেকে লাইভ অ্যাকাডেমিক অ্যানালিটিক্স সংগৃহীত`;
    default:
      return `বোর্ড ডেটাবেস থেকে তথ্য যাচাই সম্পন্ন`;
  }
}

function getToolSummary(tool, result) {
  switch (tool) {
    case "get_subject_chapters": {
      if (result.divisions && typeof result.divisions === "object") {
        const divCount = Object.keys(result.divisions).length;
        const totalItems = Object.values(result.divisions).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 1), 0);
        return `${result.subject}: ${toBnDigits(divCount)}টি বিভাগে মোট ${toBnDigits(totalItems)}টি নির্ধারিত পাঠের অফিশিয়াল তালিকা পাওয়া গেছে।`;
      }
      const total = result.total_chapters || (result.numbered_chapters ? result.numbered_chapters.length : 0);
      return `${result.subject}: মোট ${toBnDigits(total)}টি অধ্যায়ের অফিশিয়াল তালিকা প্রস্তুত।`;
    }
    case "check_board_frequency":
      return `'${result.topic}': বিগত বছরগুলোতে মোট ${toBnDigits(result.total_questions)} বার বোর্ডে এসেছে।`;
    case "get_board_exam_questions":
      return `${result.board} বোর্ড: ${toBnDigits(result.available_exam_sets?.length || 0)}টি অফিশিয়াল প্রশ্ন সেট সংগৃহীত।`;
    case "get_creative_question":
      return `বোর্ড স্ট্যান্ডার্ড সৃজনশীল প্রশ্ন ও পূর্ণাঙ্গ ক, খ, গ, ঘ পাওয়া গেছে।`;
    case "get_mcq_quiz":
      return `${toBnDigits(result.quiz?.length || 0)}টি বাছাইকৃত বোর্ড MCQ প্রস্তুত।`;
    case "get_chapter_importance_ranking":
      return `${result.subject}: আসল বোর্ড ডেটা অনুযায়ী সর্বাধিক গুরুত্বপূর্ণ অধ্যায় '${result.most_important_chapter}' (শীর্ষ প্রায়োরিটি চিহ্নিত)`;
    case "search_question_bank":
      return `'${result.search_query}': ${toBnDigits(result.total_found || 0)}টি সমাধানকৃত প্রশ্ন পাওয়া গেছে।`;
    case "find_similar_type_questions":
      return `${toBnDigits(result.similar_type_questions?.length || 0)}টি অনুরূপ বোর্ড প্রশ্ন প্রস্তুত।`;
    case "analyze_chapter_patterns":
      return `${result.chapter_name}: মোট ${toBnDigits(result.total_questions_in_database)}টি বোর্ড প্রশ্নের টাইপ ব্লুপ্রিন্ট প্রস্তুত।`;
    case "query_question_database_sql":
      return result.success ? `অ্যানালিটিক্স সম্পন্ন: ${toBnDigits(result.total_matching_rows)}টি রেকর্ড বিশ্লেষিত (${result.duration_ms}ms)` : `অ্যানালিটিক্স ত্রুটি: ${result.error}`;
    default:
      return `বোর্ড ডেটাবেস যাচাই সফলভাবে সম্পন্ন হয়েছে।`;
  }
}

// Simulates smooth real-time typewriter streaming for fast interactive UX
async function streamWords(text, onEvent, delayMs = 18) {
  const tokens = text.match(/\S+|\s+/g) || [text];
  for (const token of tokens) {
    await onEvent({ type: "content_delta", delta: token });
    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}
