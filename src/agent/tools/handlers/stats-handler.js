// Tool Handlers: get_subject_chapters, check_board_frequency, get_chapter_importance_ranking, analyze_chapter_patterns
import { executeRawSql } from "../../../core/db/client.js";
import { appCache } from "../../../core/cache.js";
import { normalizeSubject } from "../../../config/subject-map.js";
import { formatTag, toBengaliNumber } from "../../../config/tag-map.js";
import { findChapterCached } from "../helpers.js";

const BN_DIGITS = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
const toBn = (n) => String(n).replace(/[0-9]/g, d => BN_DIGITS[d] || d);

export async function handleGetSubjectChapters(args) {
  const subj = normalizeSubject(args.subject) || args.subject || "ssc_general_math";
  const cacheKey = `tool:get_subject_chapters:${subj}`;
  const cached = appCache.get(cacheKey);
  if (cached) return cached;

  const subjNameRes = await executeRawSql(`SELECT name FROM subjects WHERE id = '${subj}' LIMIT 1;`);
  const subjectName = subjNameRes.rows[0]?.name || subj;

  // Custom rich syllabus for SSC Bangla 1st Paper
  if (subj === 'ssc_bangla_1st') {
    const totalCountRes = await executeRawSql("SELECT COUNT(*) as cnt FROM questions WHERE subject_id = 'ssc_bangla_1st';");
    const totalQuestions = parseInt(totalCountRes.rows[0]?.cnt || 4475);

    const gaddyaList = [
      "১. সুভা — রবীন্দ্রনাথ ঠাকুর",
      "২. বই পড়া — প্রমথ চৌধুরী",
      "৩. আম-আঁটির ভেঁপু — বিভূতিভূষণ বন্দ্যোপাধ্যায়",
      "৪. মানুষ মুহম্মদ (সা.) — মোহাম্মদ ওয়াজেদ আলী",
      "৫. নিমগাছ — বনফুল (বলাইচাঁদ মুখোপাধ্যায়)",
      "৬. শিক্ষা ও মনুষ্যত্ব — মোতাহের হোসেন চৌধুরী",
      "৭. প্রবাস বন্ধু — সৈয়দ মুজতবা আলী",
      "৮. মমতাদি — মানিক বন্দ্যোপাধ্যায়",
      "৯. পহেলা বৈশাখ — কবীর চৌধুরী",
      "১০. একাত্তরের দিনগুলি — জাহানারা ইমাম",
      "১১. সাহিত্যের রূপ ও রীতি — হায়াত মামুদ",
      "১২. নিয়তি — হুমায়ূন আহমেদ",
      "১৩. উপেক্ষিত শক্তির উদ্বোধন — কাজী নজরুল ইসলাম",
      "১৪. দেনাপাওনা — রবীন্দ্রনাথ ঠাকুর",
      "১৫. অভাগীর স্বর্গ — শরৎচন্দ্র চট্টোপাধ্যায়"
    ];

    const kobitaList = [
      "১. বঙ্গবাণী — আব্দুল হাকিম",
      "২. কপোতাক্ষ নদ — মাইকেল মধুসূদন দত্ত",
      "৩. জীবন-সঙ্গীত — হেমচন্দ্র বন্দ্যোপাধ্যায়",
      "৪. জুতা আবিষ্কার — রবীন্দ্রনাথ ঠাকুর",
      "৫. ঝিঙে ফুল — কাজী নজরুল ইসলাম",
      "৬. মানুষ — কাজী নজরুল ইসলাম",
      "৭. সেইদিন এই মাঠ — জীবনানন্দ দাশ",
      "৮. পল্লীজননী — জসীমউদ্দীন",
      "৯. আশা — সিকান্দার আবু জাফর",
      "১০. আমি কোনো আগন্তুক নই — আহসান হাবীব",
      "১১. রানার — সুকান্ত ভট্টাচার্য",
      "১২. তোমাকে পাওয়ার জন্যে, হে স্বাধীনতা — শামসুর রাহমান",
      "১৩. আমার পরিচয় — সৈয়দ শামসুল হক",
      "১৪. স্বাধীনতা, এ শব্দটি কীভাবে আমাদের হলো — নির্মলেন্দু গুণ",
      "১৫. সাহসী জননী বাংলা — কামাল চৌধুরী"
    ];

    const sahopathList = [
      "১. উপন্যাস: কাকতাড়ুয়া — সেলিনা হোসেন",
      "২. নাটক: বহিপীর — সৈয়দ ওয়ালীউল্লাহ"
    ];

    const finalRes = {
      subject: subjectName,
      subject_id: subj,
      total_parts: 3,
      total_gaddya: 15,
      total_kobita: 15,
      total_sahopath: 2,
      total_questions_in_subject: totalQuestions,
      sections: {
        "গদ্য অংশ (১৫টি পাঠ)": gaddyaList,
        "কবিতা অংশ (১৫টি পাঠ)": kobitaList,
        "বাংলা সহপাঠ (উপন্যাস ও নাটক)": sahopathList
      },
      numbered_chapters: [
        "অংশ ১: গদ্য (১৫টি নির্ধারিত গল্প/প্রবন্ধ)",
        "অংশ ২: কবিতা (১৫টি নির্ধারিত কবিতা)",
        "অংশ ৩: বাংলা সহপাঠ (উপন্যাস: কাকতাড়ুয়া ও নাটক: বহিপীর)"
      ],
      instructions_for_mentor: `এনসিটিবি (NCTB) অফিশিয়াল পাঠ্যক্রম অনুযায়ী এসএসসি বাংলা ১ম পত্রে মোট ৩টি অংশ রয়েছে: গদ্য (১৫টি পাঠ), কবিতা (১৫টি পাঠ) এবং সহপাঠ (উপন্যাস: কাকতাড়ুয়া, নাটক: বহিপীর)। আমাদের ডেটাবেসে মোট ${toBn(totalQuestions)}টি বোর্ড প্রশ্ন সংরক্ষিত। শিক্ষার্থীদের গদ্য ও কবিতার পূর্ণাঙ্গ পাঠ্যতালিকা সুন্দরভাবে উপস্থাপন করো। কোনো এইচএসসি পাঠ এর সাথে মেশাবে না!`
    };

    appCache.set(cacheKey, finalRes, 3600);
    return finalRes;
  }

  // Custom rich syllabus for SSC ICT (Information & Communication Technology)
  if (subj === 'ssc_ict') {
    const totalCountRes = await executeRawSql("SELECT COUNT(*) as cnt FROM questions WHERE subject_id = 'ssc_ict';");
    const totalQuestions = parseInt(totalCountRes.rows[0]?.cnt || 2026);

    const ictChapters = [
      { id: "ict_ch1", order_num: "1", name: "তথ্য ও যোগাযোগ প্রযুক্তি এবং আমাদের বাংলাদেশ" },
      { id: "ict_ch2", order_num: "2", name: "কম্পিউটার ও কম্পিউটার ব্যবহারকারীর নিরাপত্তা" },
      { id: "ict_ch3", order_num: "3", name: "আমার শিক্ষায় ইন্টারনেট" },
      { id: "ict_ch4", order_num: "4", name: "আমার লেখালেখি ও হিসাব" },
      { id: "ict_ch5", order_num: "5", name: "মাল্টিমিডিয়া ও গ্রাফিক্স" },
      { id: "ict_ch6", order_num: "6", name: "ডেটাবেজ-এর ব্যবহার" }
    ];

    const numberedChapters = ictChapters.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`);

    const finalRes = {
      subject: subjectName,
      subject_id: subj,
      total_chapters: 6,
      total_questions_in_subject: totalQuestions,
      chapters: ictChapters,
      numbered_chapters: numberedChapters,
      instructions_for_mentor: `এনসিটিবি (NCTB) অফিশিয়াল কারিকুলাম অনুযায়ী এসএসসি তথ্য ও যোগাযোগ প্রযুক্তি (ICT) বিষয়ের মোট ৬টি অধ্যায় ও মোট ${toBn(totalQuestions)}টি সংরক্ষিত বোর্ড প্রশ্নের তালিকা প্রস্তুত। শিক্ষার্থীদের অধ্যায়গুলো নম্বরসহ সুন্দর তালিকা আকারে উপস্থাপন করো।`
    };

    appCache.set(cacheKey, finalRes, 3600);
    return finalRes;
  }

  // Custom rich syllabus for HSC Physics (1st Paper: 10 chapters, 2nd Paper: 11 chapters)
  if (subj === 'hsc_physics') {
    const paper1Chapters = [
      { id: "phys_1_1", order_num: "1", name: "ভৌতজগৎ ও পরিমাপ", paper: "১ম পত্র" },
      { id: "phys_1_2", order_num: "2", name: "ভেক্টর", paper: "১ম পত্র" },
      { id: "phys_1_3", order_num: "3", name: "গতিবিদ্যা", paper: "১ম পত্র" },
      { id: "phys_1_4", order_num: "4", name: "নিউটনিয়ান বলবিদ্যা", paper: "১ম পত্র" },
      { id: "phys_1_5", order_num: "5", name: "কাজ, শক্তি ও ক্ষমতা", paper: "১ম পত্র" },
      { id: "phys_1_6", order_num: "6", name: "মহাকর্ষ ও অভিকর্ষ", paper: "১ম পত্র" },
      { id: "phys_1_7", order_num: "7", name: "পদার্থের গাঠনিক ধর্ম", paper: "১ম পত্র" },
      { id: "phys_1_8", order_num: "8", name: "পর্যায়বৃত্ত গতি", paper: "১ম পত্র" },
      { id: "phys_1_9", order_num: "9", name: "তরঙ্গ", paper: "১ম পত্র" },
      { id: "phys_1_10", order_num: "10", name: "আদর্শ গ্যাস ও গ্যাসের গতিতত্ত্ব", paper: "১ম পত্র" }
    ];

    const paper2Chapters = [
      { id: "phys_2_1", order_num: "1", name: "তাপগতিবিদ্যা", paper: "২য় পত্র" },
      { id: "phys_2_2", order_num: "2", name: "স্থির তড়িৎ", paper: "২য় পত্র" },
      { id: "phys_2_3", order_num: "3", name: "চল তড়িৎ", paper: "২য় পত্র" },
      { id: "phys_2_4", order_num: "4", name: "তড়িৎ প্রবাহের চৌম্বক ক্রিয়া ও চৌম্বকত্ব", paper: "২য় পত্র" },
      { id: "phys_2_5", order_num: "5", name: "তড়িৎচৌম্বকীয় আবেশ ও পরিবর্তী প্রবাহ", paper: "২য় পত্র" },
      { id: "phys_2_6", order_num: "6", name: "জ্যামিতিক আলোকবিজ্ঞান", paper: "২য় পত্র" },
      { id: "phys_2_7", order_num: "7", name: "ভৌত আলোকবিজ্ঞান", paper: "২য় পত্র" },
      { id: "phys_2_8", order_num: "8", name: "আধুনিক পদার্থবিজ্ঞানের সূচনা", paper: "২য় পত্র" },
      { id: "phys_2_9", order_num: "9", name: "পরমাণুর মডেল ও নিউক্লিয়ার পদার্থবিজ্ঞান", paper: "২য় পত্র" },
      { id: "phys_2_10", order_num: "10", name: "সেমিকন্ডাক্টর ও ইলেকট্রনিক্স", paper: "২য় পত্র" },
      { id: "phys_2_11", order_num: "11", name: "জ্যোতির্বিজ্ঞান", paper: "২য় পত্র" }
    ];

    const finalRes = {
      subject: "এইচএসসি পদার্থবিজ্ঞান",
      subject_id: "hsc_physics",
      total_chapters: 21,
      total_paper1: 10,
      total_paper2: 11,
      paper_1: paper1Chapters,
      paper_2: paper2Chapters,
      sections: {
        "পদার্থবিজ্ঞান ১ম পত্র (১০টি অধ্যায়)": paper1Chapters.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
        "পদার্থবিজ্ঞান ২য় পত্র (১১টি অধ্যায়)": paper2Chapters.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`)
      },
      numbered_chapters: [
        ...paper1Chapters.map(c => `১ম পত্র - অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
        ...paper2Chapters.map(c => `২য় পত্র - অধ্যায় ${toBn(c.order_num)}: ${c.name}`)
      ],
      instructions_for_mentor: `এনসিটিবি (NCTB) অফিশিয়াল কারিকুলাম অনুযায়ী এইচএসসি পদার্থবিজ্ঞানে মোট ২১টি অধ্যায় রয়েছে: ১ম পত্রে ১০টি অধ্যায় এবং ২য় পত্রে ১১টি অধ্যায়।\n- শিক্ষার্থী যদি নির্দিষ্টভাবে '১ম পত্র' চায়, তবে শুধুমাত্র ১ম পত্রের ১০টি অধ্যায়ের ক্রম ও নাম সুন্দর সংখ্যাযুক্ত তালিকায় উপস্থাপন করো।\n- যদি '২য় পত্র' চায়, তবে ২য় পত্রের ১১টি অধ্যায় উপস্থাপন করো।\n- অন্য কোনো বিষয়ের অধ্যায় কখনো মেশাবে না!`
    };

    appCache.set(cacheKey, finalRes, 3600);
    return finalRes;
  }

  // Custom rich syllabus for HSC Chemistry (1st Paper: 5 chapters, 2nd Paper: 5 chapters)
  if (subj === 'hsc_chemistry') {
    const paper1 = [
      { id: "chem_1_1", order_num: "1", name: "ল্যাবরেটরির নিরাপদ ব্যবহার", paper: "১ম পত্র" },
      { id: "chem_1_2", order_num: "2", name: "গুণগত রসায়ন", paper: "১ম পত্র" },
      { id: "chem_1_3", order_num: "3", name: "মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন", paper: "১ম পত্র" },
      { id: "chem_1_4", order_num: "4", name: "রাসায়নিক পরিবর্তন", paper: "১ম পত্র" },
      { id: "chem_1_5", order_num: "5", name: "কর্মমুখী রসায়ন", paper: "১ম পত্র" }
    ];
    const paper2 = [
      { id: "chem_2_1", order_num: "1", name: "পরিবেশ রসায়ন", paper: "২য় পত্র" },
      { id: "chem_2_2", order_num: "2", name: "জৈব যৌগ", paper: "২য় পত্র" },
      { id: "chem_2_3", order_num: "3", name: "পরিমাণগত রসায়ন", paper: "২য় পত্র" },
      { id: "chem_2_4", order_num: "4", name: "তড়িৎ রসায়ন", paper: "২য় পত্র" },
      { id: "chem_2_5", order_num: "5", name: "অর্থনৈতিক রসায়ন", paper: "২য় পত্র" }
    ];

    const finalRes = {
      subject: "এইচএসসি রসায়ন",
      subject_id: "hsc_chemistry",
      total_chapters: 10,
      total_paper1: 5,
      total_paper2: 5,
      paper_1: paper1,
      paper_2: paper2,
      sections: {
        "রসায়ন ১ম পত্র (৫টি অধ্যায়)": paper1.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
        "রসায়ন ২য় পত্র (৫টি অধ্যায়)": paper2.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`)
      },
      numbered_chapters: [
        ...paper1.map(c => `১ম পত্র - অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
        ...paper2.map(c => `২য় পত্র - অধ্যায় ${toBn(c.order_num)}: ${c.name}`)
      ],
      instructions_for_mentor: `এনসিটিবি (NCTB) কারিকুলাম অনুযায়ী এইচএসসি রসায়নে মোট ১০টি অধ্যায়: ১ম পত্রে ৫টি এবং ২য় পত্রে ৫টি। শিক্ষার্থীর চাহিদামাফিক ১ম পত্র বা ২য় পত্রের তালিকা নির্ভুলভাবে দাও।`
    };

    appCache.set(cacheKey, finalRes, 3600);
    return finalRes;
  }

  // Custom rich syllabus for HSC Higher Math (1st Paper: 10 chapters, 2nd Paper: 10 chapters)
  if (subj === 'hsc_math' || subj === 'hsc_higher_math') {
    const paper1 = [
      { id: "math_1_1", order_num: "1", name: "ম্যাট্রিক্স ও নির্ণায়ক" },
      { id: "math_1_2", order_num: "2", name: "ভেক্টর" },
      { id: "math_1_3", order_num: "3", name: "সরলরেখা" },
      { id: "math_1_4", order_num: "4", name: "বৃত্ত" },
      { id: "math_1_5", order_num: "5", name: "বিন্যাস ও সমাবেশ" },
      { id: "math_1_6", order_num: "6", name: "ত্রিকোণমিতিক অনুপাত" },
      { id: "math_1_7", order_num: "7", name: "সংযুক্ত ও যৌগিক কোণের ত্রিকোণমিতিক অনুপাত" },
      { id: "math_1_8", order_num: "8", name: "ফাংশন ও ফাংশনের লেখচিত্র" },
      { id: "math_1_9", order_num: "9", name: "অন্তরীকরণ" },
      { id: "math_1_10", order_num: "10", name: "যোগজীকরণ" }
    ];
    const paper2 = [
      { id: "math_2_1", order_num: "1", name: "বাস্তব সংখ্যা ও অসমতা" },
      { id: "math_2_2", order_num: "2", name: "যোগাশ্রয়ী প্রোগ্রাম" },
      { id: "math_2_3", order_num: "3", name: "জটিল সংখ্যা" },
      { id: "math_2_4", order_num: "4", name: "বহুপদী ও বহুপদী সমীকরণ" },
      { id: "math_2_5", order_num: "5", name: "দ্বিপদী বিস্তৃতি" },
      { id: "math_2_6", order_num: "6", name: "কণিক" },
      { id: "math_2_7", order_num: "7", name: "বিপরীত ত্রিকোণমিতিক ফাংশন ও ত্রিকোণমিতিক সমীকরণ" },
      { id: "math_2_8", order_num: "8", name: "স্থিতিবিদ্যা" },
      { id: "math_2_9", order_num: "9", name: "সমতলে বস্তুকণার গতি" },
      { id: "math_2_10", order_num: "10", name: " বিস্তার পরিমাপ ও সম্ভাবনা" }
    ];

    const finalRes = {
      subject: "এইচএসসি উচ্চতর গণিত",
      subject_id: subj,
      total_chapters: 20,
      total_paper1: 10,
      total_paper2: 10,
      paper_1: paper1,
      paper_2: paper2,
      sections: {
        "উচ্চতর গণিত ১ম পত্র (১০টি অধ্যায়)": paper1.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
        "উচ্চতর গণিত ২য় পত্র (১০টি অধ্যায়)": paper2.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`)
      },
      numbered_chapters: [
        ...paper1.map(c => `১ম পত্র - অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
        ...paper2.map(c => `২য় পত্র - অধ্যায় ${toBn(c.order_num)}: ${c.name}`)
      ],
      instructions_for_mentor: `এনসিটিবি কারিকুলাম অনুযায়ী এইচএসসি উচ্চতর গণিতে মোট ২০টি অধ্যায়: ১ম পত্রে ১০টি ও ২য় পত্রে ১০টি।`
    };

    appCache.set(cacheKey, finalRes, 3600);
    return finalRes;
  }

  // Custom rich syllabus for HSC Biology (1st Paper Botany: 12 chapters, 2nd Paper Zoology: 12 chapters)
  if (subj === 'hsc_biology') {
    const botany = [
      { id: "bio_1_1", order_num: "1", name: "কোষ ও এর গঠন" },
      { id: "bio_1_2", order_num: "2", name: "কোষ বিভাজন" },
      { id: "bio_1_3", order_num: "3", name: "কোষ রসায়ন" },
      { id: "bio_1_4", order_num: "4", name: "অণুজীব" },
      { id: "bio_1_5", order_num: "5", name: "শৈবাল ও ছত্রাক" },
      { id: "bio_1_6", order_num: "6", name: "ব্রায়োফাইটা ও টেরিডোফাইটা" },
      { id: "bio_1_7", order_num: "7", name: "নগ্নবীজী ও আবৃতবীজী উদ্ভিদ" },
      { id: "bio_1_8", order_num: "8", name: "টিসু ও টিসুতন্ত্র" },
      { id: "bio_1_9", order_num: "9", name: "উদ্ভিদ শারীরতত্ত্ব" },
      { id: "bio_1_10", order_num: "10", name: "উদ্ভিদ প্রজনন" },
      { id: "bio_1_11", order_num: "11", name: "জীবপ্রযুক্তি" },
      { id: "bio_1_12", order_num: "12", name: "জীবের পরিবেশ, বিস্তার ও সংরক্ষণ" }
    ];
    const zoology = [
      { id: "bio_2_1", order_num: "1", name: "প্রাণীর ভিন্নতা ও শ্রেণিবিন্যাস" },
      { id: "bio_2_2", order_num: "2", name: "প্রাণীর পরিচিতি (হাইড্রা, ঘাসফড়িং, রুই মাছ)" },
      { id: "bio_2_3", order_num: "3", name: "পরিপাক ও শোষণ" },
      { id: "bio_2_4", order_num: "4", name: "রক্ত সংবহন" },
      { id: "bio_2_5", order_num: "5", name: "শ্বাসক্রিয়া ও শ্বসন" },
      { id: "bio_2_6", order_num: "6", name: "বর্জ্য ও নিষ্কাশন" },
      { id: "bio_2_7", order_num: "7", name: "চলন ও অঙ্গচালনা" },
      { id: "bio_2_8", order_num: "8", name: "সমন্বয় ও নিয়ন্ত্রণ" },
      { id: "bio_2_9", order_num: "9", name: "মানব জীবনের ধারাবাহিকতা" },
      { id: "bio_2_10", order_num: "10", name: "মানবদেহের প্রতিরক্ষা" },
      { id: "bio_2_11", order_num: "11", name: "জিনতত্ত্ব ও বিবর্তন" },
      { id: "bio_2_12", order_num: "12", name: "প্রাণীর আচরণ" }
    ];

    const finalRes = {
      subject: "এইচএসসি জীববিজ্ঞান",
      subject_id: "hsc_biology",
      total_chapters: 24,
      total_paper1: 12,
      total_paper2: 12,
      paper_1: botany,
      paper_2: zoology,
      sections: {
        "১ম পত্র (উদ্ভিদবিজ্ঞান - ১২টি অধ্যায়)": botany.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
        "২য় পত্র (প্রাণিবিজ্ঞান - ১২টি অধ্যায়)": zoology.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`)
      },
      numbered_chapters: [
        ...botany.map(c => `১ম পত্র (উদ্ভিদবিজ্ঞান) - অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
        ...zoology.map(c => `২য় পত্র (প্রাণিবিজ্ঞান) - অধ্যায় ${toBn(c.order_num)}: ${c.name}`)
      ],
      instructions_for_mentor: `এনসিটিবি কারিকুলাম অনুযায়ী এইচএসসি জীববিজ্ঞানে মোট ২৪টি অধ্যায়: ১ম পত্র (উদ্ভিদবিজ্ঞান) ১২টি এবং ২য় পত্র (প্রাণিবিজ্ঞান) ১২টি।`
    };

    appCache.set(cacheKey, finalRes, 3600);
    return finalRes;
  }

  // Custom rich syllabus for HSC ICT
  if (subj === 'hsc_ict') {
    const ictChapters = [
      { id: "hsc_ict_1", order_num: "1", name: "তথ্য ও যোগাযোগ প্রযুক্তি: বিশ্ব ও বাংলাদেশ প্রেক্ষিত" },
      { id: "hsc_ict_2", order_num: "2", name: "কমিউনিকেশন সিস্টেমস ও নেটওয়ার্কিং" },
      { id: "hsc_ict_3", order_num: "3", name: "সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস" },
      { id: "hsc_ict_4", order_num: "4", name: "ওয়েব ডিজাইন পরিচিতি এবং এইচটিএমএল (HTML)" },
      { id: "hsc_ict_5", order_num: "5", name: "প্রোগ্রামিং ভাষা (C Programming)" },
      { id: "hsc_ict_6", order_num: "6", name: "ডেটাবেজ ম্যানেজমেন্ট সিস্টেম (DBMS)" }
    ];

    const finalRes = {
      subject: "এইচএসসি তথ্য ও যোগাযোগ প্রযুক্তি",
      subject_id: "hsc_ict",
      total_chapters: 6,
      chapters: ictChapters,
      numbered_chapters: ictChapters.map(c => `অধ্যায় ${toBn(c.order_num)}: ${c.name}`),
      instructions_for_mentor: `এনসিটিবি অফিশিয়াল সিলেবাস অনুযায়ী এইচএসসি ICT বিষয়ে মোট ৬টি অধ্যায় রয়েছে। অধ্যায়গুলোর তালিকা সাজিয়ে উপস্থাপন করো।`
    };

    appCache.set(cacheKey, finalRes, 3600);
    return finalRes;
  }

  // Default dynamic chapter resolution for SSC/other subjects from cached corpus
  const allCached = await getAllChaptersCached();
  const matched = allCached.filter(c => c.subject_id === subj);

  if (matched.length > 0) {
    const numberedChapters = matched.map(r => {
      const ord = r.relative_num || r.order_num ? `অধ্যায় ${toBn(r.relative_num || r.order_num)}: ` : "";
      return `${ord}${r.name}`;
    });

    const finalRes = {
      subject: subjectName,
      subject_id: subj,
      total_chapters: matched.length,
      chapters: matched.map(r => ({
        id: r.id,
        name: r.name,
        order_num: r.relative_num || r.order_num
      })),
      numbered_chapters: numberedChapters,
      instructions_for_mentor: `এনসিটিবি কারিকুলাম অনুযায়ী '${subjectName}' বিষয়ের মোট ${toBn(matched.length)}টি অধ্যায়ের তালিকা প্রস্তুত। শিক্ষার্থীদের সুন্দরভাবে মার্জিত নম্বর ও বুলেট তালিকা আকারে উপস্থাপন করো।`
    };

    appCache.set(cacheKey, finalRes, 3600);
    return finalRes;
  }

  const sql = `
    SELECT c.id, c.name, c.order_num, COUNT(q.id) as question_count 
    FROM chapters c 
    LEFT JOIN questions q ON c.id = q.chapter_id 
    WHERE c.subject_id = '${subj}' 
    GROUP BY c.id, c.name, c.order_num 
    ORDER BY CAST(c.order_num AS INTEGER) ASC;
  `;
  const res = await executeRawSql(sql);

  const numberedChapters = res.rows.map(r => {
    const ord = r.order_num ? `অধ্যায় ${toBn(r.order_num)}: ` : "";
    const cnt = parseInt(r.question_count) || 0;
    return `${ord}${r.name} (${toBn(cnt)}টি প্রশ্ন)`;
  });

  const totalQuestions = res.rows.reduce((sum, r) => sum + (parseInt(r.question_count) || 0), 0);

  const finalRes = {
    subject: subjectName,
    subject_id: subj,
    total_chapters: res.rows.length,
    total_questions_in_subject: totalQuestions,
    chapters: res.rows.map(r => ({
      id: r.id,
      name: r.name,
      order_num: r.order_num,
      question_count: parseInt(r.question_count) || 0
    })),
    numbered_chapters: numberedChapters,
    instructions_for_mentor: `এনসিটিবি কারিকুলাম ও অফিশিয়াল ডেটাবেস অনুযায়ী '${subjectName}' বিষয়ের মোট ${toBn(res.rows.length)}টি অধ্যায় ও ${toBn(totalQuestions)}টি বোর্ড প্রশ্নের পূর্ণ তালিকা প্রস্তুত। শিক্ষার্থীদের সুন্দরভাবে মার্জিত নম্বর ও বুলেট তালিকা আকারে উপস্থাপন করো।`
  };

  appCache.set(cacheKey, finalRes, 3600);
  return finalRes;
}

export async function handleCheckBoardFrequency(args) {
  const topic = (args.topic || "").replace(/'/g, "''").trim();
  
  // Check if topic matches an official chapter
  const matchedChapter = await findChapterCached({ topic, chapter: topic, subject: args.subject }, args.subject);
  const whereClause = matchedChapter 
    ? `(chapter_id = '${matchedChapter.id}' OR question_text LIKE '%${topic}%')`
    : `question_text LIKE '%${topic}%'`;

  const countRes = await executeRawSql(`SELECT COUNT(*) as c FROM questions WHERE ${whereClause};`);
  const total = parseInt(countRes.rows[0]?.c || 0);

  const tagsRes = await executeRawSql(`SELECT tags, COUNT(*) as c FROM questions WHERE ${whereClause} AND tags IS NOT NULL AND tags != '' GROUP BY tags ORDER BY c DESC LIMIT 25;`);

  const recentBoards = [];
  const pastBoards = [];
  const topColleges = [];

  for (const row of tagsRes.rows) {
    const t = row.tags;
    const count = parseInt(row.c);
    const formatted = `${formatTag(t)} (${toBengaliNumber(count)} বার এসেছে)`;
    
    const isCollege = t.includes("CC") || t.includes("BNMPC") || t.includes("RUMC") || t.includes("SJHSS") || t.includes("RCPC") || t.includes("ACC") || t.includes("VNSC") || t.includes("ISCM") || t.includes("DRMC");
    const isRecent = t.includes("24") || t.includes("25") || t.includes("26") || t.includes("23");

    if (isCollege) {
      if (topColleges.length < 5) topColleges.push(formatted);
    } else if (isRecent) {
      if (recentBoards.length < 5) recentBoards.push(formatted);
    } else {
      if (pastBoards.length < 5) pastBoards.push(formatted);
    }
  }

  let recurringConcepts = [];
  let examinerTraps = [];

  if (matchedChapter) {
    const typesRes = await executeRawSql(`SELECT type_name, core_concept, core_formula, examiner_traps FROM chapter_types WHERE chapter_id = '${matchedChapter.id}' LIMIT 3;`);
    if (typesRes.rows.length > 0) {
      recurringConcepts = typesRes.rows.map(t => `${t.type_name}${t.core_formula ? ' (' + t.core_formula + ')' : ''}`);
      examinerTraps = typesRes.rows.filter(t => t.examiner_traps).map(t => `${t.type_name}: ${t.examiner_traps}`);
    }
  }

  if (recurringConcepts.length === 0) {
    const samplePatternsRes = await executeRawSql(`SELECT question_text FROM questions WHERE ${whereClause} AND question_text != '' AND (tags LIKE '%25%' OR tags LIKE '%24%' OR tags LIKE '%23%' OR tags LIKE '%DB%') LIMIT 3;`);
    if (samplePatternsRes.rows.length > 0) {
      recurringConcepts = samplePatternsRes.rows.map(q => {
        const clean = (q.question_text || "").replace(/\n+/g, " ").slice(0, 90).trim();
        return clean.length === 90 ? `${clean}...` : clean;
      });
    }
  }

  return {
    topic,
    chapter_identified: matchedChapter ? matchedChapter.name : null,
    total_questions: total,
    importance_rating: total > 200 ? "⭐⭐⭐ (টপ প্রায়োরিটি / মাস্ট-রিড অধ্যায়)" : total > 80 ? "⭐⭐ (গুরুত্বপূর্ণ অধ্যায়)" : "⭐ (বেসিক অধ্যায়)",
    recent_board_appearances: recentBoards,
    past_board_appearances: pastBoards,
    top_cadet_and_model_colleges: topColleges,
    frequent_topic_patterns: recurringConcepts.length > 0 ? recurringConcepts : undefined,
    examiner_traps_identified: examinerTraps.length > 0 ? examinerTraps : undefined
  };
}

export async function handleGetChapterImportanceRanking(args) {
  const subj = normalizeSubject(args.subject) || args.subject || "ssc_physics";

  const sql = `SELECT c.id, c.name, c.order_num, COUNT(q.id) as q_count FROM chapters c LEFT JOIN questions q ON c.id = q.chapter_id WHERE c.subject_id = '${subj}' GROUP BY c.id, c.name, c.order_num ORDER BY CAST(q_count AS INTEGER) DESC;`;
  const res = await executeRawSql(sql);
  const subjNameRes = await executeRawSql(`SELECT name FROM subjects WHERE id = '${subj}' LIMIT 1;`);
  const subjectName = subjNameRes.rows[0]?.name || subj;

  const topTierWithBoardDetails = [];
  const mediumTier = [];
  const foundationTier = [];

  const rows = res.rows;
  const totalQuestionsAnalyzed = rows.reduce((sum, r) => sum + (parseInt(r.q_count) || 0), 0);

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const count = parseInt(r.q_count || 0);

    if (i < 4) {
      const tagsRes = await executeRawSql(`SELECT tags, COUNT(*) as c FROM questions WHERE chapter_id = '${r.id}' AND tags IS NOT NULL AND tags != '' GROUP BY tags ORDER BY c DESC LIMIT 6;`);
      const boards = tagsRes.rows.map(t => `${formatTag(t.tags)} (${toBengaliNumber(t.c)} বার)`);
      
      topTierWithBoardDetails.push({
        chapter_name: r.name,
        chapter_number: toBn(r.order_num || i + 1),
        total_board_appearances: `${toBn(count)} বার`,
        specific_boards_and_colleges: boards
      });
    } else if (i < 8) {
      mediumTier.push(`অধ্যায় ${toBn(r.order_num || i + 1)}: ${r.name} (বিগত বোর্ডগুলোতে প্রায় ${toBn(count)} বার এসেছে)`);
    } else {
      foundationTier.push(`অধ্যায় ${toBn(r.order_num || i + 1)}: ${r.name} (বিগত বোর্ডগুলোতে প্রায় ${toBn(count)} বার এসেছে)`);
    }
  }

  const top4Count = rows.slice(0, 4).reduce((sum, r) => sum + (parseInt(r.q_count) || 0), 0);
  const top4Percent = totalQuestionsAnalyzed > 0 ? Math.round((top4Count / totalQuestionsAnalyzed) * 100) : 0;

  const highYieldStrategy = {
    core_message: `${subjectName}-এ মোট ${toBn(totalQuestionsAnalyzed)}টি বোর্ড/কলেজ প্রশ্নের মধ্যে শীর্ষ ৪টি অধ্যায় থেকেই এসেছে প্রায় ${toBn(top4Percent)}% প্রশ্ন! এই অধ্যায়গুলো সম্পূর্ণ আয়ত্ত করলে পরীক্ষায় সর্বাধিক নম্বর নিশ্চিত করা সম্ভব।`,
    must_master_chapters: rows.slice(0, 4).map(r => `অধ্যায় ${toBn(r.order_num || '')}: ${r.name} (${toBn(r.q_count)}টি প্রশ্ন)`),
    strategy_recommendation: "পরীক্ষায় পূর্ণ নম্বর কমন পেতে সবার আগে এই শীর্ষ অধ্যায়গুলোর CQ ও ট্রিকি MCQ আয়ত্ত করো, এরপর মাঝারি প্রায়োরিটির অধ্যায়গুলোতে যাও।"
  };

  return {
    subject: subjectName,
    total_chapters_analyzed: rows.length,
    total_questions_analyzed: totalQuestionsAnalyzed,
    most_important_chapter: rows[0]?.name,
    high_yield_strategy: highYieldStrategy,
    top_priority_chapters_with_board_breakdown: topTierWithBoardDetails,
    medium_priority_chapters: mediumTier,
    foundation_chapters: foundationTier,
    instructions_for_mentor: "কমন পাওয়ার কৌশল ও গুরুত্ব সংক্রান্ত প্রশ্নের ক্ষেত্রে ওপরের ডেটা-ভিত্তিক 'high_yield_strategy' ও শীর্ষ অধ্যায়গুলোর বাস্তব বোর্ড পরিসংখ্যান সুন্দর ও পরিষ্কারভাবে উপস্থাপন করো।"
  };
}

export async function handleAnalyzeChapterPatterns(args) {
  let subjId = normalizeSubject(args.subject) || "ssc_physics";
  const chapter = await findChapterCached({ chapter: args.chapter, subject: subjId }, subjId);
  if (chapter && chapter.subject_id) {
    subjId = chapter.subject_id;
  }
  const chapIdClause = chapter ? `AND chapter_id = '${chapter.id}'` : "";

  // Count total questions in chapter
  const countRes = await executeRawSql(`SELECT COUNT(*) as total FROM questions WHERE subject_id = '${subjId}' ${chapIdClause};`);
  const totalQ = parseInt(countRes.rows[0]?.total) || 0;

  // Sample representative questions from this chapter
  const sampleRes = await executeRawSql(`
    SELECT id, tags, type, question_text, option_a, option_b, option_c, option_d, answer, solution
    FROM questions
    WHERE subject_id = '${subjId}' ${chapIdClause} AND question_text IS NOT NULL AND question_text != ''
    LIMIT 50;
  `);
  if (sampleRes.rows.length > 15) {
    sampleRes.rows = sampleRes.rows.sort(() => Math.random() - 0.5).slice(0, 15);
  }

  // Check if pre-analyzed master types exist in chapter_types table
  let masterTypes = [];
  if (chapter) {
    const typesRes = await executeRawSql(`
      SELECT type_no, type_name, core_concept, core_formula, examiner_traps, shortcut_trick, frequency_count 
      FROM chapter_types 
      WHERE chapter_id = '${chapter.id}' 
      ORDER BY type_no ASC;
    `);
    masterTypes = typesRes.rows;
  }

  // Top contributing boards
  const tagsRes = await executeRawSql(`
    SELECT tags, COUNT(*) as c 
    FROM questions 
    WHERE subject_id = '${subjId}' ${chapIdClause} AND tags IS NOT NULL AND tags != ''
    GROUP BY tags 
    ORDER BY c DESC 
    LIMIT 6;
  `);

  return {
    subject: args.subject,
    chapter_name: chapter ? chapter.name : args.chapter,
    total_questions_in_database: totalQ,
    has_precomputed_master_types: masterTypes.length > 0,
    master_types_breakdown: masterTypes.length > 0 ? masterTypes.map(m => ({
      type_number: `টাইপ-${m.type_no}`,
      name: m.type_name,
      concept: m.core_concept,
      formula: m.core_formula,
      examiner_traps: m.examiner_traps,
      shortcut: m.shortcut_trick,
      question_count_in_db: `${m.frequency_count}টি প্রশ্ন`
    })) : null,
    top_contributing_boards_and_colleges: tagsRes.rows.map(r => `${formatTag(r.tags)} (${r.c}টি প্রশ্ন)`),
    sample_questions_pool: sampleRes.rows.map(r => ({
      id: r.id,
      tag: formatTag(r.tags),
      type: r.type,
      q: r.question_text.slice(0, 120),
      ans: r.answer
    })),
    pattern_analysis_framework: {
      master_goal: "শিক্ষার্থীকে এই অধ্যায়ের ৪-৬টি মূল মাস্টার টাইপে ভেঙে বুঝিয়ে দেওয়া।",
      structure_per_type: [
        "১. টাইপ পরিচিতি ও মাদার কনসেপ্ট",
        "২. মূল সূত্র (LaTeX)",
        "৩. পরীক্ষক যেভাবে প্রশ্ন ঘোরায় (Spin/Trap Pattern: সংখ্যা পরিবর্তন, অনুপাত, উল্টো মান, গ্রাফ)",
        "৪. বিগত বোর্ডের বাস্তব প্রশ্ন ও ট্রিক",
        "৫. ১০ সেকেন্ডের শর্টকাট সমাধান"
      ]
    },
    mentor_instructions: "শিক্ষার্থীকে পুরো অধ্যায়ের মাস্টার টাইপগুলোর একটি সুবিন্যস্ত ব্লুপ্রিন্ট দাও। প্রতিটি টাইপের সাথে আসল বোর্ড রেফারেন্স ও পরীক্ষকের ঘোরানোর প্যাটার্ন স্পষ্ট করে বুঝিয়ে দাও যাতে শিক্ষার্থী এই অধ্যায়ের যেকোনো প্রশ্ন নির্ভুলভাবে চিনতে পারে।"
  };
}
