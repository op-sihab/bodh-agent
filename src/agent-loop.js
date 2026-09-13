// Multi-turn Agentic Autonomous Loop with Tool Calling & Token Streaming
import { AGENT_TOOLS, executeAgentTool } from "./agent-tools.js";

const MERGE_API_URL = "https://api-gateway.merge.dev/v1/responses";
const MERGE_API_KEY = process.env.MERGE_API_KEY || "mg_XKCpgi4dR6M2DmaBFgvjme8uTeGyWWTWGP_XP4zUjN8";
const MODEL_NAME = "openai/gpt-5.6-luna";

const SYSTEM_PROMPT = `
তুমি "বোধ" (BODH) — বাংলাদেশের শিক্ষার্থীদের জন্য তৈরি সবচেয়ে শক্তিশালী, তুখোড়, বাস্তববাদী ও সহানুভূতিশীল স্বায়ত্তশাসিত একাডেমিক এআই মেন্টর। তোমার মূল দর্শন: "না বুঝে মুখস্থ নয়, পড়াশোনায় এবার গভীর বোধ।"
তোমার কাছে সরাসরি বাংলাদেশের সকল শিক্ষা বোর্ডের বিগত বছর এবং শীর্ষ ক্যাডেট ও মডেল কলেজের ৫০,৮৫৫টি আসল বোর্ড ও টেস্ট পরীক্ষার ডেটাবেস থেকে তথ্য যাচাইয়ের জন্য সুনির্দিষ্ট টুলস (Tools) আছে।

কঠোর আচরণবিধি ও দিকনির্দেশনা:
১. সালাম ও সম্ভাষণ সংক্রান্ত নিয়ম:
   - শিক্ষার্থী যদি তার **চলমান (বর্তমান) মেসেজে** সালাম (যেমন: 'সালাম', 'আসসালামু আলাইকুম') দেয়, কেবল তখনই একবার আন্তরিকভাবে 'ওয়ালাইকুমুস সালাম' বলবে।
   - চলমান মেসেজে সালাম না থাকলে ভুলেও 'ওয়ালাইকুমুস সালাম' বা অপ্রাসঙ্গিক শুভেচ্ছা দিয়ে শুরু করবে না! সরাসরি টু-দ্য-পয়েন্ট আসল কথায় ঢুকবে।
২. ভাষা সম্পূর্ণ প্রাকৃতিক, মানুষের মতো, স্নেহশীল ও সাবলীল হতে হবে:
   - "ডেটাবেসে উল্লেখিত", "ডাটাবেস অনুযায়ী", "RAG ডেটা বলছে" — এই ধরণের কোনো রোবোটিক বা যান্ত্রিক শব্দ ভুলেও বলবে না!
   - স্বাভাবিক দরদী বড় ভাইয়ার মতো সাবলীল ভাষায় কথা বলবে। শিক্ষার্থীর পরীক্ষাভীতি ও টেনশন দূর করবে।
৩. কমন পাওয়ার বিজ্ঞানভিত্তিক স্ট্র্যাটেজি ও পড়ালেখার স্মার্ট রোডম্যাপ (80/20 Rule):
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
৪. উপস্থাপনা ও ফরম্যাটিংয়ের বাধ্যতামূলক নিয়ম:
   - কোনো তালিকা বা অধ্যায়ের তালিকা দেওয়ার সময় কখনোই ঢালাও টেক্সট লিখবে না।
   - অবশ্যই সুন্দর মার্কডাউন ফরম্যাটে সাজিয়ে দেবে (বিভাগভিত্তিক হেডার, বুলেট পয়েন্ট, বোল্ড টেক্সট)।
   - গাণিতিক ও বৈজ্ঞানিক সূত্রের ক্ষেত্রে স্ট্যান্ডার্ড KaTeX ফরম্যাট ব্যবহার করবে: ইনলাইনে $v = u + at$, $pH = 7$, $pH < 7$, $pH > 7$, $E_k = \frac{1}{2}mv^2$ এবং ডিসপ্লে সমীকরণে $$s = ut + \frac{1}{2}at^2$$। ভুলেও ব্র্যাকেটে কাঁচা টেক্সট (\mathrm{pH}=7) লিখবে না; সবসময় ক্লিন $...$ ব্যবহার করবে যাতে ব্রাউজারে নিখুঁত ম্যাথ রেন্ডার হয়।
   - কোনো ইমোজি ব্যবহার করবে না। সম্পূর্ণ ক্লিন ও প্রফেশনাল স্ট্যান্ডার্ড টেক্সট ব্যবহার করবে।
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
     * **কুইজ প্রশ্নে সঠিক উত্তর বা ব্যাখ্যা সম্পূর্ণ গোপন রাখা বাধ্যতামূলক:** প্রশ্ন উপস্থাপন করার সময় মেসেজের ভেতরে ভুলেও 'সঠিক উত্তর:' বা 'ব্যাখ্যা:' টেক্সটে লিখবে না! শুধু প্রশ্ন, বোর্ড ট্যাগ ও ৪টি অপশন দেবে এবং শেষে [ans: ক/খ/গ/ঘ] ট্যাগটি দেবে। শিক্ষার্থী অপশন নির্বাচন করলে পরবর্তী মেসেজে স্বয়ংক্রিয়ভাবে তুমি তার উত্তরের পূর্ণাঙ্গ ব্যাখ্যা ও মূল্যায়ন দেবে।
৫. সৃজনশীলে (CQ) ফুল মার্কস পাওয়ার পরীক্ষকের গোপন নিয়ম (Examiner Secrets):
   - সৃজনশীল দেওয়ার পর শিক্ষার্থীকে পরীক্ষকদের নম্বর দেওয়ার প্যাটার্ন শিখিয়ে দেবে:
     * **'ক' (জ্ঞানমূলক - ১ নম্বর):** ভূমিকা ছাড়া সরাসরি ১ লাইনে সঠিক সংজ্ঞা লিখলে পুরো ১ নম্বর।
     * **'খ' (অনুধাবনমূলক - ২ নম্বর):** অবশ্যই স্পষ্ট ২টি আলাদা প্যারা (১ম প্যারা: জ্ঞানমূলক মূল ১ লাইন, ২য় প্যারা: ৩-৪ লাইনে কারণ বা ব্যাখ্যা)।
     * **'গ' (প্রয়োগমূলক - ৩ নম্বর):** দেওয়া আছে তথ্য -> সূত্র -> মান বসানো -> হিসাব -> এককসহ উত্তর। (সতর্কতা: একক না লিখলে স্যার ১ নম্বর কেটে নেন!)।
     * **'ঘ' (উচ্চতর দক্ষতা - ৪ নম্বর):** গাণিতিক বিশ্লেষণ শেষে সুস্পষ্ট সিদ্ধান্তমূলক সমাপনী বাক্য (যেমন: 'অতএব উদ্দীপকের উক্তিটি যথার্থ') লেখা বাধ্যতামূলক।
৬. প্রশ্ন ও কুইজের ক্ষেত্রে বাধ্যতামূলক টুল কল (Zero Hallucination Policy):
   - শিক্ষার্থী যখনই কোনো প্রশ্ন (CQ বা MCQ), কোনো নির্দিষ্ট সালের প্রশ্ন (যেমন: ২০২৬, ২০২৫, ২০২৪), নির্দিষ্ট বোর্ডের প্রশ্ন (যেমন: ঢাকা বোর্ড, চট্টগ্রাম বোর্ড), কিংবা সংক্ষেপে "mcq dio", "cq দাও", "আরেকটা প্রশ্ন দাও" বলবে:
   - কখনোই নিজের মনগড়া বা স্মৃতি থেকে প্রশ্ন বানাবে না!
   - "২০২৬ সালের পরীক্ষা এখনো হয়নি" বা "প্রশ্ন প্রকাশিত হয়নি" — এমন কথা ভুলেও বলবে না! কারণ ডেটাবেসে ২০২৬ সালের শীর্ষ টেস্ট পেপারের ৪৬২টির বেশি আসল প্রশ্ন ডিজিটাইজ করা আছে।
   - অবশ্যই get_mcq_quiz অথবা get_creative_question অথবা get_board_exam_questions অথবা search_question_bank টুল কল করে ডেটাবেস থেকে আসল প্রশ্ন তুলে এনে শিক্ষার্থীকে দেবে।
   - পূর্ববর্তী কথোপকথনের কনটেক্সট (যেমন আগে ঢাকা বোর্ড বা বাংলা/পদার্থ নিয়ে কথা হয়ে থাকলে) সক্রিয় রাখবে এবং সেই অনুযায়ী প্যারামিটার পাস করবে।
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
১০. টাইপভিত্তিক প্রশ্ন বিশ্লেষণ ও অনুরূপ প্রশ্ন অনুসন্ধান (Vector Similarity & Master Types):
   - শিক্ষার্থী যখনই বলবে "এই টাইপের আরেকটা প্রশ্ন দাও", "একই সূত্রের অন্য বোর্ডের প্রশ্ন দাও", "similar type dao", বা পূর্ববর্তী প্রশ্নের অনুরূপ প্রশ্ন চাইবে:
     * সরাসরি find_similar_type_questions টুল কল করবে (১০২৪-মাত্রার ভেক্টর এমবেডিং দিয়ে অন্য বোর্ডের একই সূত্রের প্রশ্ন খুঁজে বের করবে)।
     * শিক্ষার্থীকে পরিষ্কারভাবে দেখিয়ে দেবে: মূল সূত্র কী ছিল এবং পরীক্ষক কীভাবে এখানে সংখ্যা বা ভাষা বা দৃষ্টিকোণ ঘুরিয়েছে (Examiner Twist)।
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
   - শিক্ষার্থী যখন পূর্ববর্তী উত্তরের প্রেক্ষিতে ফলো-আপ প্রশ্ন করে (যেমন: "বলো কী কী", "কী কী", "আর কী কী", "সবগুলোর নাম বলো", "কোনগুলো", "এগুলোর মধ্যে সবচেয়ে সহজ কোনটা?", "কোনটা আগে পড়ব?", "কেন?"): সরাসরি চ্যাট হিস্ট্রি ও তোমার অ্যাকাডেমিক জ্ঞান দেখে স্বাভাবিকভাবে মানুষের মতো ঝরঝরে ভাষায় সুন্দর বুলেট তালিকা ও উত্তর দেবে। কোনো অবস্থাতেই কোনো টুল কল করবে না!
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
১৬. প্রথমবারেই পূর্ণাঙ্গ ও পুঙ্খানুপুঙ্খ তথ্য প্রদান (Complete, Authoritative Answers on First Turn):
   - শিক্ষার্থী যখন কোনো বিষয়ের গদ্য, কবিতা বা অধ্যায়ের সংখ্যা জানতে চায় (যেমন: "গদ্য কয়টা", "কবিতা কয়টা", "বাংলা ১ম এ কী কী আছে", "পদার্থে কয়টা অধ্যায়"):
     * কখনোই কেবল একটি অসম্পূর্ণ সংখ্যা (যেমন '৪টি' বা কেবল '১৫টি') লিখে ছেড়ে দেবে না!
     * প্রথমবারেই সম্পূর্ণ তথ্য একবারে স্পষ্ট ও সাজিয়ে দেবে:
       - মোট সংখ্যা স্পষ্টভাবে বলবে: "বাংলা ১ম পত্রে মূল পাঠ্যবইয়ে মোট ১৫টি গদ্য রয়েছে (আর বোর্ড পরীক্ষার সংক্ষিপ্ত সিলেবাসে সাধারণত ১০ বা ১১টি অন্তর্ভুক্ত থাকে)।"
       - এবং সাথে সাথেই ১৫টি গদ্যের (বা কবিতার) সম্পূর্ণ নাম লেখকসহ সুন্দর বুলেট তালিকায় একবারে দিয়ে দেবে!
       - এর ফলে শিক্ষার্থীকে আর দ্বিতীয়বার "বলো কী কী" বা "আর কী কী" বলে প্রশ্ন করতে হবে না।
   - বাংলা ১ম পত্রের অফিশিয়াল সিলেবাস কাঠামো:
     * গদ্য (মূল বইয়ে ১৫টি): ১. শুভা (রবীন্দ্রনাথ ঠাকুর), ২. বই পড়া (প্রমথ চৌধুরী), ৩. অভাগীর স্বর্গ (শরৎচন্দ্র চট্টোপাধ্যায়), ৪. পল্লীসাহিত্য (মুহম্মদ শহীদুল্লাহ), ৫. আম-আঁটির ভেঁপু (বিভূতিভূষণ বন্দ্যোপাধ্যায়), ৬. মানুষ মুহম্মদ (স.) (মোহাম্মদ ওয়াজেদ আলী), ৭. নিমগাছ (বনফুল), ৮. শিক্ষা ও মনুষ্যত্ব (মোতাহের হোসেন চৌধুরী), ৯. প্রবাস বন্ধু (সৈয়দ মুজতবা আলী), ১০. ৭১-এর দিনগুলি (জাহানারা ইমাম), ১১. সাহিত্যের রূপ ও রীতি (হায়াৎ মামুদ), ১২. নিয়তি (হুমায়ূন আহমেদ), ১৩. উপেক্ষিত শক্তির উদ্বোধন (কাজী নজরুল ইসলাম), ১৪. একাত্তরের দিনগুলি, ১৫. পয়লা বৈশাখ (কবীর চৌধুরী)। (সংক্ষিপ্ত সিলেবাসে সাধারণত ১০-১১টি থাকে)।
     * কবিতা (মূল বইয়ে ১৫টি): ১. বঙ্গবাণী (আবদুল হাকিম), ২. কপোতাক্ষ নদ (মাইকেল মধুসূদন দত্ত), ৩. জীবন-সঙ্গীত (হেমচন্দ্র বন্দ্যোপাধ্যায়), ৪. জুতা আবিষ্কার (রবীন্দ্রনাথ ঠাকুর), ৫. ঝিঙে ফুল (কাজী নজরুল ইসলাম), ৬. প্রাণ (রবীন্দ্রনাথ ঠাকুর), ৭. পল্লীজননী (জসীম উদ্‌দীন), ৮. রানার (সুকান্ত ভট্টাচার্য), ৯. তোমাকে পাওয়ার জন্য হে স্বাধীনতা (শামসুর রাহমান), ১০. আমার পরিচয় (সৈয়দ শামসুল হক), ১১. স্বাধীনতা এ শব্দটি কীভাবে আমাদের হলো (নির্মলেন্দু গুণ), ১২. সাহসী জননী বাংলা (কামাল চৌধুরী), ১৩. সেইদিন এই মাঠ (জীবনানন্দ দাশ), ১৪. আশা (সিকান্দার আবু জাফর), ১৫. বৃষ্টি (রবীন্দ্রনাথ ঠাকুর)।
     * সহপাঠ: উপন্যাস 'কাকতাড়ুয়া' (সেলিনা হোসেন) ও নাটক 'বহিপীর' (সৈয়দ ওয়ালীউল্লাহ)।
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

export async function runAgenticConversation(userMessage, onEvent, options = {}) {
  const startTime = performance.now();
  const pastHistory = options.history || [];

  // Build input history with system prompt, past chat turns, and current user query
  const inputHistory = [
    { type: "message", role: "system", content: SYSTEM_PROMPT }
  ];

  // Include last 6 turns of conversation for memory
  for (const item of pastHistory.slice(-6)) {
    if (item.role === "user" || item.role === "assistant") {
      inputHistory.push({
        type: "message",
        role: item.role,
        content: item.content
      });
    }
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
        stream: true
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value);
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;

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

  // Smart tool filtering: if student asks a direct follow-up listing ("বলো কী কী", "কী কী", "আর কী কী", "নামগুলো বলো", "কোনগুলো")
  // and there is already recent history, remove get_subject_chapters so the model synthesizes directly from memory without duplicate tool calls!
  const isFollowUpListing = /^(বলো\s*কী\s*কী|কী\s*কী|আর\s*কী\s*কী|কোনগুলো|নামগুলো\s*বলো|কি\s*কি|bolo\s*ki\s*ki|ki\s*ki|ar\s*ki|naam\s*bolo|kon\s*gula|r\s*ki)/i.test(userMessage.trim().replace(/[?!.,]/g, ""));

  const availableTools = (isFollowUpListing && pastHistory.length > 0)
    ? AGENT_TOOLS.filter(t => t.function.name !== "get_subject_chapters")
    : AGENT_TOOLS;

  // Real-time streaming tool-aware loop
  const res = await fetch(MERGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MERGE_API_KEY}`
    },
    body: JSON.stringify({
      input: inputHistory,
      tools: availableTools,
      model: MODEL_NAME,
      vendor: "openai",
      stream: true
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
  let fullContent = "";
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
      if (!raw || raw === "[DONE]") continue;

      try {
        const parsed = JSON.parse(raw);
        const content = parsed.output?.[0]?.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === "tool_use") {
              toolCall = item;
            } else if (item.type === "text" && item.text) {
              if (item.text.length > lastSeenLength) {
                const delta = item.text.slice(lastSeenLength);
                lastSeenLength = item.text.length;
                fullContent = item.text;
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
      } catch (e) {}
    }
  }

  // Case A: Model answered directly with text (Zero tools needed) -> Already streamed in real time!
  if (!toolCall) {
    const totalLatency = Math.round(performance.now() - startTime);
    await onEvent({
      type: "done",
      content: fullContent,
      toolCalls: executedToolsLog,
      latencyMs: totalLatency,
      ttft: firstTokenTime
    });
    return;
  }

  // Case B: Model wants to invoke a tool!
  const toolName = toolCall.name;
  const toolArgs = toolCall.input || {};
  const callId = toolCall.id;

  // Notify frontend in chat: Tool started!
  await onEvent({
    type: "tool_start",
    tool: toolName,
    args: toolArgs,
    label: getToolHumanLabel(toolName, toolArgs)
  });

  // Execute tool
  const toolResult = await executeAgentTool(toolName, toolArgs);
  executedToolsLog.push({ tool: toolName, args: toolArgs, result: toolResult });

  // Notify frontend in chat: Tool done!
  await onEvent({
    type: "tool_done",
    tool: toolName,
    args: toolArgs,
    result: toolResult,
    title: getToolCompletedTitle(toolName, toolArgs, toolResult),
    summary: getToolSummary(toolName, toolResult)
  });

  // Signal generation start immediately so frontend shows live writing pulse with zero dead gap
  await onEvent({
    type: "generating_start"
  });

  // Append assistant tool_use and user tool_result
  inputHistory.push({
    type: "message",
    role: "assistant",
    content: [toolCall]
  });
  inputHistory.push({
    type: "message",
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: callId,
        content: JSON.stringify(toolResult)
      }
    ]
  });

  // Now stream the final response from LLM in real time!
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
      stream: true
    })
  });

  if (!streamRes.ok) {
    const err = await streamRes.text();
    throw new Error(`Merge Stream Error ${streamRes.status}: ${err}`);
  }

  const reader2 = streamRes.body.getReader();
  let buffer2 = "";
  let fullContent2 = "";
  let lastSeenLength2 = 0;

  while (true) {
    const { done, value } = await reader2.read();
    if (done) break;

    buffer2 += decoder.decode(value, { stream: true });
    const lines = buffer2.split("\n");
    buffer2 = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;

      try {
        const parsed = JSON.parse(raw);
        const currentText = parsed.output?.[0]?.content?.[0]?.text;
        if (currentText !== undefined && currentText.length > lastSeenLength2) {
          if (!firstTokenTime) {
            firstTokenTime = Math.round(performance.now() - startTime);
          }
          const delta = currentText.slice(lastSeenLength2);
          lastSeenLength2 = currentText.length;
          fullContent2 = currentText;
          await onEvent({
            type: "content_delta",
            delta
          });
        }
      } catch (e) {}
    }
  }

  const totalLatency = Math.round(performance.now() - startTime);
  await onEvent({
    type: "done",
    content: fullContent2,
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

// Helpers for human-friendly tool progress labels
function getToolHumanLabel(tool, args) {
  switch (tool) {
    case "get_subject_chapters":
      return `সিলেবাস ও অধ্যায় তালিকা যাচাই চলছে...`;
    case "check_board_frequency":
      return `'${args.topic || ""}' টপিকের বিগত বোর্ড রেকর্ড বিশ্লেষণ চলছে...`;
    case "get_board_exam_questions":
      return `${args.board_name || ""} বোর্ডের বিগত প্রশ্নপত্র অনুসন্ধান চলছে...`;
    case "get_creative_question":
      return `বোর্ড স্ট্যান্ডার্ড সৃজনশীল (CQ) প্রশ্ন যাচাই চলছে...`;
    case "get_mcq_quiz":
      return `বোর্ড স্ট্যান্ডার্ড MCQ কুইজ লোড হচ্ছে...`;
    case "get_chapter_importance_ranking":
      return `বিগত ৫ বছরের বোর্ড পরীক্ষার গুরুত্ব ও ফ্রিকোয়েন্সি বিশ্লেষণ চলছে...`;
    case "search_question_bank":
      return `'${args.query || ""}' সংক্রান্ত প্রশ্নব্যাংক বিশ্লেষণ চলছে...`;
    case "find_similar_type_questions":
      return `অনুরূপ সূত্রের প্রশ্ন ও ভেক্টর প্যাটার্ন ম্যাচিং চলছে...`;
    case "analyze_chapter_patterns":
      return `${args.chapter || ""} অধ্যায়ের টাইপভিত্তিক ব্লুপ্রিন্ট প্রস্তুত হচ্ছে...`;
    case "query_question_database_sql":
      return args.explanation ? `অ্যানালিটিক্স স্ক্রিপ্ট: ${args.explanation}...` : `৫০,৮৫৫টি প্রশ্ন থেকে অ্যানালিটিক্স সংগ্রহ চলছে...`;
    default:
      return `ডেটাবেস অ্যানালাইসিস চলছে...`;
  }
}

function getToolCompletedTitle(tool, args, result) {
  switch (tool) {
    case "get_subject_chapters":
      return `${result?.subject || "সিলেবাস"}: অফিশিয়াল অধ্যায় তালিকা যাচাইকৃত`;
    case "get_chapter_importance_ranking":
      return `${result?.subject || "সকল"}: বোর্ড পরীক্ষার অধ্যায়ভিত্তিক অ্যানালিটিক্স`;
    case "check_board_frequency":
      return `'${result?.topic || args?.topic || ""}' টপিকের বোর্ড রেকর্ড যাচাইকৃত`;
    case "get_board_exam_questions":
      return `${result?.board || args?.board_name || ""} বোর্ডের বিগত প্রশ্নপত্র প্রস্তুত`;
    case "get_creative_question":
      return `বোর্ড সৃজনশীল প্রশ্ন ও মানবণ্টন প্রস্তুত`;
    case "get_mcq_quiz":
      return `বোর্ড স্ট্যান্ডার্ড MCQ কুইজ প্রস্তুত`;
    case "search_question_bank":
      return `বোর্ড প্রশ্নব্যাংক অনুসন্ধান ও সমাধান যাচাইকৃত`;
    case "find_similar_type_questions":
      return `অনুরূপ টাইপের প্রশ্ন ও ভেক্টর ম্যাচিং প্রস্তুত`;
    case "analyze_chapter_patterns":
      return `${result?.chapter_name || args?.chapter || ""} অধ্যায়ের টাইপ ব্লুপ্রিন্ট প্রস্তুত`;
    case "query_question_database_sql":
      return `৫০,৮৫৫টি প্রশ্নব্যাংক থেকে লাইভ অ্যানালিটিক্স যাচাইকৃত`;
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
        return `${result.subject}: ${toBnDigits(divCount)}টি বিভাগে মোট ${toBnDigits(totalItems)}টি পাঠের অফিশিয়াল তালিকা পাওয়া গেছে।`;
      }
      const total = result.total_chapters || (result.numbered_chapters ? result.numbered_chapters.length : 0);
      return `${result.subject}: সম্পূর্ণ ${toBnDigits(total)}টি অধ্যায়ের অফিশিয়াল তালিকা পাওয়া গেছে।`;
    }
    case "check_board_frequency":
      return `'${result.topic}': বিগত বছরগুলোতে মোট ${toBnDigits(result.total_questions)} বার বোর্ডে এসেছে।`;
    case "get_board_exam_questions":
      return `${result.board} বোর্ড: ${toBnDigits(result.available_exam_sets?.length || 0)}টি প্রশ্ন সেট প্রস্তুত।`;
    case "get_creative_question":
      return `বোর্ড স্ট্যান্ডার্ড সৃজনশীল প্রশ্ন ও পূর্ণাঙ্গ ক, খ, গ, ঘ পাওয়া গেছে।`;
    case "get_mcq_quiz":
      return `${toBnDigits(result.quiz?.length || 0)}টি অ্যাডাপ্টিভ MCQ কুইজ প্রস্তুত।`;
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
