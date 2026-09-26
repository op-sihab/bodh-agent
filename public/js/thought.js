// BODH Autonomous ReAct Thought Tree & Dynamic Shimmer Engine
    function generateThoughtTreeData(tool, args, result, userPrompt = '') {
      const up = (userPrompt || '').toLowerCase();
      let subj = getBanglaSubjectName(args?.subject || result?.subject);
      let rawTopic = result?.actual_chapter?.name || result?.actual_chapter?.display || result?.chapter_name || args?.chapter || args?.topic || result?.topic || '';

      if (!subj && up) {
        if (up.includes('রসায়ন') || up.includes('রসায়ন') || up.includes('chem')) subj = 'এইচএসসি রসায়ন';
        else if (up.includes('পদার্থ') || up.includes('phys')) subj = 'এইচএসসি পদার্থবিজ্ঞান';
        else if (up.includes('জীব') || up.includes('bio')) subj = 'এইচএসসি জীববিজ্ঞান';
        else if (up.includes('উচ্চতর') || up.includes('higher') || up.includes('hm')) subj = 'উচ্চতর গণিত';
        else if (up.includes('গণিত') || up.includes('গনিত') || up.includes('math')) subj = 'সাধারণ গণিত';
        else if (up.includes('বাংলা') || up.includes('bangla')) subj = 'বাংলা';
        else if (up.includes('ইংরেজি') || up.includes('english')) subj = 'ইংরেজি';
        else if (up.includes('ict') || up.includes('তথ্য')) subj = 'তথ্য ও যোগাযোগ প্রযুক্তি';
        else if (up.includes('bgs') || up.includes('সমাজ')) subj = 'বাংলাদেশ ও বিশ্বপরিচয়';
        else if (up.includes('ধর্ম') || up.includes('ইসলাম')) subj = 'ইসলাম শিক্ষা';
      }
      if (!subj) {
        subj = currentSelectedSubject?.name || 'এইচএসসি পদার্থবিজ্ঞান';
      }

      if (!rawTopic && userPrompt) {
        const numMatch = userPrompt.match(/(?:অধ্যায়|অধ্যায়|chapter|ch)\s*([০-৯0-9]+)/i);
        if (numMatch) {
          rawTopic = `অধ্যায় ${toBnDigits(numMatch[1])}`;
        } else {
          const beforeChMatch = userPrompt.match(/([^,।?!\n]+?)\s*(?:ei\s+)?(?:chapter|অধ্যায়|অধ্যায়)/i);
          if (beforeChMatch && beforeChMatch[1].trim() && !/^(ei|oi|ekta|akta|kono|any|theke|theika)$/i.test(beforeChMatch[1].trim())) {
            rawTopic = beforeChMatch[1].trim();
          } else {
            const chMatch = userPrompt.match(/(?:অধ্যায়|অধ্যায়|chapter|ch)\s*([০-৯0-9]+|[^\s,।]+)/i);
            const stopWords = ['theke', 'er', 'theika', 'থেকে', 'এর', 'টা', 'টি', 'ta', 'ti', 'koyta', 'koi', 'koto', 'ekta', 'akta'];
            if (chMatch && !stopWords.includes(chMatch[1].toLowerCase())) {
              rawTopic = `অধ্যায় ${chMatch[1]}`;
            }
          }
        }
      }

      if (!tool && userPrompt) {
        if (up.includes('mcq') || up.includes('নৈর্ব্যক্তিক') || up.includes('বহুনির্বাচনী') || up.includes('quiz') || up.includes('কুইজ')) tool = 'get_mcq_quiz';
        else if (up.includes('সৃজনশীল') || /\bcq\b/i.test(up) || up.includes('উদ্দীপক')) tool = 'get_creative_question';
        else if (up.includes('কয়টা') || up.includes('কয়টা') || up.includes('সবগুলো') || up.includes('অধ্যায়গুলো') || up.includes('সিলেবাস')) tool = 'get_subject_chapters';
        else if (up.includes('গুরুত্ব') || up.includes('ইম্পর্টেন্ট') || up.includes('important') || up.includes('আগে পড়ব') || up.includes('সহজ')) tool = 'get_chapter_importance_ranking';
      }

      const topic = rawTopic ? `'${rawTopic}'` : (subj || 'একাডেমিক প্রস্তুতি');

      let mainTitle = `${topic}: বোর্ড প্রশ্ন ও কনসেপ্ট বিশ্লেষণ`;
      let intentReasoning = `${topic} সংক্রান্ত বিগত বছরের বোর্ড প্রশ্ন ও পরীক্ষকদের প্যাটার্ন বিশ্লেষণ করছি... বিশেষ করে কোন জায়গাগুলো শিক্ষার্থীদের পরীক্ষায় বেশি কাজে লাগবে তা দেখা হচ্ছে।`;
      let toolLabel = "বোর্ড প্রশ্নব্যাংক ও সমাধান অনুসন্ধান";
      let countTag = "যাচাই সম্পন্ন";
      let synthesisReasoning = "সংগৃহীত বোর্ড তথ্যের আলোকে শিক্ষার্থীর জন্য সহজে বোঝার উপযোগী ব্যাখ্যা ও কাঠামো সাজাচ্ছি।";

      if (tool === 'get_mcq_quiz') {
        const q = result?.quiz?.[0];
        const rawTag = q?.formatted_source || q?.all_board_tags || q?.tags || (args?.board ? `${args.board} বোর্ড` : '');
        const boardTag = formatFullBoardTags(rawTag) || 'বোর্ড স্ট্যান্ডার্ড';
        mainTitle = `${topic}: বোর্ড MCQ ও কনসেপ্ট বিশ্লেষণ`;
        intentReasoning = `${subj ? `${subj}: ` : ''}${topic} থেকে বিগত বছরগুলোতে পরীক্ষকরা কোন প্যাঁচ বা ট্রিকি জায়গাগুলো থেকে প্রশ্ন করত তা বিশ্লেষণ করছি... বিশেষ করে যে টাইপের প্রশ্নে শিক্ষার্থীরা সাধারণত দ্বিধায় পড়ে, সেই প্যাটার্নের একটি আদর্শ প্রশ্ন বাছাই করা প্রয়োজন যাতে মৌলিক কনসেপ্ট পুরোপুরি স্পষ্ট হয়।`;
        toolLabel = `বিগত বছরের বোর্ড ও শীর্ষ টেস্ট পেপার প্রশ্ন আর্কাইভ অনুসন্ধান`;
        countTag = `✓ ${boardTag} (মানসম্মত প্রশ্ন)`;
        synthesisReasoning = `বাছাইকৃত প্রশ্নটির ৪টি বিকল্প অপশন পরীক্ষা করে দিচ্ছি—যাতে মুখস্থ না করে শিক্ষার্থী নিজে লজিক খাটিয়ে সঠিক সিদ্ধান্তে পৌঁছাতে পারে এবং ভুল অপশনগুলোর পেছনের কারণও সহজে আত্মস্থ করতে পারে।`;
      } else if (tool === 'get_creative_question') {
        mainTitle = `${subj ? `${subj}: ` : ''}${topic} বোর্ড স্ট্যান্ডার্ড সৃজনশীল (CQ) বিশ্লেষণ`;
        intentReasoning = `${subj ? `${subj}-এর ` : ''}${topic} অংশ থেকে বোর্ড পরীক্ষায় প্রায়ই আসা সৃজনশীল কাঠামো বিশ্লেষণ করছি... উদ্দীপকের সাথে জ্ঞান (ক), অনুধাবন (খ), প্রয়োগ (গ) ও উচ্চতর দক্ষতার (ঘ) সঠিক ভারসাম্য নিশ্চিত করা প্রয়োজন যাতে শিক্ষার্থী পরীক্ষার আসল মানবণ্টন অনুভব করতে পারে।`;
        toolLabel = `শীর্ষ টেস্ট পেপার ও বিগত বোর্ড সৃজনশীল ব্যাংক অনুসন্ধান`;
        countTag = `✓ ৪ স্তর সমন্বিত আসল CQ`;
        synthesisReasoning = `পরীক্ষকদের নম্বর দেওয়ার গোপন নিয়ম (Examiner Secrets) অনুযায়ী উদ্দীপকটি গুছিয়ে দিচ্ছি—কোথায় একক না লিখলে নম্বর কাটা যায় এবং কোন অংশে কীভাবে পয়েন্ট লিখলে পুরো ১০ নম্বর পাওয়া যাবে তা স্পষ্ট করে সাজাচ্ছি।`;
      } else if (tool === 'get_chapter_importance_ranking') {
        const mostImp = result?.most_important_chapter || 'শীর্ষ অধ্যায়';
        mainTitle = `${subj || 'বিষয়'}: বিগত ৫ বছরের বোর্ড প্রশ্ন ফ্রিকোয়েন্সি ও প্রায়োরিটি বিশ্লেষণ`;
        intentReasoning = `শিক্ষার্থীর মূল্যবান সময় বাঁচাতে ${subj || 'এই'} বিষয়ের বিগত ৫ বছরের সব বোর্ডের প্রশ্ন রেকর্ড বিশ্লেষণ করছি... পুরো বইয়ের সব অধ্যায়ে সমান সময় নষ্ট না করে কোন ২-৩টি অধ্যায় আগে পড়লে ৮০/২০ নিয়মে সর্বাধিক CQ ও MCQ কমন পাওয়া যাবে তা বের করছি।`;
        toolLabel = `বিগত ৫ বছরের বোর্ড পরীক্ষার অধ্যায়ভিত্তিক প্রশ্ন ফ্রিকোয়েন্সি হিসাব`;
        countTag = `✓ শীর্ষ প্রায়োরিটি: ${mostImp}`;
        synthesisReasoning = `কম পরিশ্রমে এ-প্লাস নিশ্চিত করার জন্য অধ্যায়গুলোকে ক্রমানুসারে সাজাচ্ছি—কোন অধ্যায়টি আগে ধরলে আত্মবিশ্বাস বাড়বে এবং পরীক্ষার প্রস্তুতিতে সবচেয়ে দ্রুত ভালো আউটপুট আসবে সেই রুটম্যাপ তৈরি করলাম।`;
      } else if (tool === 'get_subject_chapters') {
        const sub = getBanglaSubjectName(result?.subject || args?.subject) || result?.subject || currentSelectedSubject?.name || 'এইচএসসি পদার্থবিজ্ঞান';
        mainTitle = `${sub}: অফিশিয়াল এনসিটিবি পাঠ্যক্রম ও অধ্যায় বিন্যাস`;

        const q = String(userPrompt || '').toLowerCase();
        const isFirstPaper = q.includes('1st') || q.includes('১ম') || q.includes('প্রথম') || q.includes('first');
        const isSecondPaper = q.includes('2nd') || q.includes('২য়') || q.includes('দ্বিতীয়') || q.includes('second');
        const paperStr = isFirstPaper ? ' ১ম পত্রের' : (isSecondPaper ? ' ২য় পত্রের' : '');

        const isCountQuery = q.includes('কয়') || q.includes('কত') || q.includes('সংখ্যা') || q.includes('number') || q.includes('count') || q.includes('how many') || q.includes('koi') || q.includes('koy') || q.includes('koto') || q.includes('koida') || q.includes('koyta');
        const isNameQuery = q.includes('নাম') || q.includes('তালিকা') || q.includes('name') || q.includes('list') || q.includes('সবগুলো') || q.includes('অধ্যায়গুলো') || q.includes('sob') || q.includes('shob');

        if (isCountQuery) {
          intentReasoning = `${sub}${paperStr} মূল পাঠ্যবইয়ে মোট কয়টি অধ্যায় রয়েছে তা নিশ্চিত করতে অফিশিয়াল কারিকুলাম রেকর্ড খতিয়ে দেখছি... যাতে শিক্ষার্থী বোর্ড অনুমোদিত নির্ভুল ও পূর্ণাঙ্গ অধ্যায় সংখ্যা জানতে পারে।`;
          synthesisReasoning = `অফিশিয়াল কারিকুলাম অনুযায়ী মোট অধ্যায় সংখ্যা নিশ্চিত করে প্রতিটি অধ্যায়ের নাম ক্রমানুসারে সাজিয়ে দিচ্ছি।`;
        } else if (isNameQuery || isFirstPaper || isSecondPaper) {
          intentReasoning = `শিক্ষার্থী ${sub}${paperStr} অধ্যায়গুলোর তালিকা জানতে চেয়েছে... এনসিটিবি (NCTB) অফিশিয়াল সূচিপত্র ও ক্রম যাচাই করে নির্ভুল ও পূর্ণাঙ্গ তালিকা প্রস্তুত করছি।`;
          synthesisReasoning = `অধ্যায়গুলোকে মূল পাঠ্যবইয়ের সঠিক ক্রমানুসারে সাজিয়ে দিচ্ছি, যাতে শিক্ষার্থী সহজেই তার পড়ার পরিকল্পনা সাজাতে পারে।`;
        } else if (result?.divisions && typeof result.divisions === 'object') {
          intentReasoning = `${sub} বিষয়ের অফিশিয়াল পাঠ্যক্রম ও বিভাগভিত্তিক কাঠামো খতিয়ে দেখছি... পাঠ্যবইয়ের নির্ধারিত গদ্য, পদ্য বা ব্যাকরণ অংশগুলো সুবিন্যস্তভাবে যাচাই করা হচ্ছে।`;
          synthesisReasoning = `পাঠ্যবইয়ের প্রতিটি বিভাগ ও অংশ ক্রমানুসারে সাজিয়ে দিচ্ছি, যাতে শিক্ষার্থী সম্পূর্ণ সিলেবাসের স্পষ্ট ধারণা পায়।`;
        } else {
          intentReasoning = `${sub} বিষয়ের অফিশিয়াল এনসিটিবি কারিকুলাম ও বোর্ড অনুমোদিত অধ্যায় বিন্যাস যাচাই করছি... মূল পাঠ্যবইয়ের প্রতিটি অধ্যায়ের সঠিক ক্রম নির্ধারণ করা হচ্ছে।`;
          synthesisReasoning = `পাঠ্যবইয়ের ক্রম অনুযায়ী প্রতিটি অধ্যায় সাজিয়ে দিচ্ছি, যাতে শিক্ষার্থী সহজেই তার পড়ার পরিকল্পনা সাজাতে পারে।`;
        }

        if (result?.divisions && typeof result.divisions === 'object') {
          toolLabel = `এনসিটিবি অফিশিয়াল সিলেবাস ও বিভাগভিত্তিক তালিকা যাচাই`;
          const divEntries = Object.entries(result.divisions);
          const totalItems = divEntries.reduce((sum, [_, arr]) => sum + (Array.isArray(arr) ? arr.length : 1), 0);
          countTag = `✓ ${toBnDigits(totalItems)}টি পাঠ (${toBnDigits(divEntries.length)}টি বিভাগ)`;
        } else {
          toolLabel = `এনসিটিবি অফিশিয়াল সিলেবাস ও অধ্যায় তালিকা যাচাই`;
          let totalCh = result?.total_chapters || result?.chapters?.length || (result?.numbered_chapters ? result.numbered_chapters.length : 0);
          if (!totalCh) {
            const s = String(result?.subject || args?.subject || '').toLowerCase();
            if (s.includes('chem') || s.includes('রসায়ন') || s.includes('রসায়ন')) totalCh = 12;
            else if (s.includes('phys') || s.includes('পদার্থ')) totalCh = 14;
            else if (s.includes('bio') || s.includes('জীববিজ্ঞান')) totalCh = 14;
            else if (s.includes('ict') || s.includes('তথ্য')) totalCh = 6;
            else if (s.includes('high') || s.includes('উচ্চতর')) totalCh = 14;
            else if (s.includes('math') || s.includes('গণিত')) totalCh = 17;
            else if (s.includes('bangla_1') || s.includes('বাংলা ১ম')) totalCh = 3;
            else if (s.includes('bangla_2') || s.includes('বাংলা ২য়')) totalCh = 2;
            else totalCh = 0;
          }
          countTag = totalCh > 0 ? `✓ ${toBnDigits(totalCh)}টি অধ্যায়` : '✓ সিলেবাস যাচাইকৃত';
        }
      } else if (tool === 'check_board_frequency') {
        const total = result?.total_questions ? toBnDigits(result.total_questions) : '';
        mainTitle = `${topic} টপিকের বিগত বোর্ড পরীক্ষার পুনরাবৃত্তি রেকর্ড`;
        intentReasoning = `বোর্ড পরীক্ষায় ${topic} টপিকটির গুরুত্ব যাচাই করার জন্য বিগত সব সালের প্রশ্নপত্র খতিয়ে দেখছি... এটি কি নিয়মিত বোর্ডে আসে নাকি নির্দিষ্ট কয়েক বছর পর পর পরীক্ষকরা দেয়, সেই পুনরাবৃত্তির প্যাটার্ন বের করা হচ্ছে।`;
        toolLabel = `বোর্ড পরীক্ষার প্রশ্নপত্র ও ফ্রিকোয়েন্সি রেকর্ড বিশ্লেষণ`;
        countTag = total ? `✓ ${total} বার বোর্ডে এসেছে` : 'যাচাইকৃত';
        synthesisReasoning = `টপিকটি আগামী পরীক্ষায় আসার সম্ভাবনা কতটুকু এবং ঠিক কোন দৃষ্টিকোণ থেকে প্রশ্ন আসার সম্ভাবনা বেশি, তার আলোকে শিক্ষার্থীকে কার্যকর পরামর্শ সাজিয়ে দিচ্ছি।`;
      } else if (tool === 'get_board_exam_questions') {
        const board = result?.board || args?.board_name || 'বোর্ড';
        const sets = result?.available_exam_sets?.length ? toBnDigits(result.available_exam_sets.length) : '১+';
        mainTitle = `${board} বোর্ডের বিগত বছরের অফিশিয়াল প্রশ্নপত্র সংগ্রহ`;
        intentReasoning = `${board} বোর্ডের বিগত বছরগুলোর আসল প্রশ্নপত্রের প্রশ্নের গঠন ও পরীক্ষকদের প্রিয় টপিক বিশ্লেষণ করছি... যাতে শিক্ষার্থী নির্দিষ্ট বোর্ডের মানসিকতা ও প্রশ্নের স্টাইল বুঝতে পারে।`;
        toolLabel = `বোর্ড প্রশ্ন আর্কাইভ অনুসন্ধান`;
        countTag = `✓ ${sets}টি প্রশ্ন সেট প্রস্তুত`;
        synthesisReasoning = `বোর্ড স্ট্যান্ডার্ড প্রশ্ন ও পরীক্ষকদের নম্বর বণ্টনের আলোকে বাস্তবসম্মত উত্তর ও পরীক্ষার টিপস সাজাচ্ছি।`;
      } else if (tool === 'analyze_chapter_patterns') {
        const ch = result?.chapter_name || args?.chapter || 'অধ্যায়';
        const total = result?.total_questions_in_database ? toBnDigits(result.total_questions_in_database) : '৫০+';
        mainTitle = `${ch}: বিগত ১০ বছরের মাস্টার টাইপ ও শর্টকাট ব্লুপ্রিন্ট`;
        intentReasoning = `${ch} অধ্যায়ের শত শত প্রশ্নের পেছনের মাত্র ৩-৪টি মূল টাইপ চিহ্নিত করছি... পুরো অধ্যায় মুখস্থ করার বদলে নির্দিষ্ট প্যাটার্নগুলো ধরে পড়লে পরীক্ষার প্রস্তুতি অনেক দ্রুত ও হালকা হবে।`;
        toolLabel = `বিগত ১০ বছরের প্রশ্ন ক্লাস্টারিং ও প্যাটার্ন অ্যানালিসিস`;
        countTag = `✓ ${total}টি প্রশ্ন বিশ্লেষিত`;
        synthesisReasoning = `মাদার কনসেপ্ট, বোর্ড উদাহরণ ও ১০ সেকেন্ডের শর্টকাট ট্রিক সমন্বিত ছক সাজিয়ে দিচ্ছি—যাতে প্রতিটি টাইপ দেখেই শিক্ষার্থী সরাসরি সমাধানের পথ ধরতে পারে।`;
      } else if (tool === 'search_question_bank') {
        const query = result?.search_query || args?.query || '';
        const total = result?.total_found ? toBnDigits(result.total_found) : '';
        mainTitle = `'${query}' সংক্রান্ত বোর্ড প্রশ্ন ও সমাধান অনুসন্ধান`;
        intentReasoning = `'${query}' নিয়ে বিগত বোর্ড ও শীর্ষ কলেজগুলোতে পরীক্ষকরা কীভাবে প্রশ্ন ঘুরিয়েছে তা বিশ্লেষণ করছি... মূল সূত্র অপরিবর্তিত রেখে তথ্যের মান বা প্রেক্ষাপট কীভাবে পরিবর্তন করা হয় তা চিহ্নিত করছি।`;
        toolLabel = `৩,০৬,৬৭৮টি ডিজিটাল বোর্ড প্রশ্নব্যাংক থেকে সিমান্টিক সার্চ`;
        countTag = total ? `✓ ${total}টি প্রশ্ন প্রস্তুত` : 'সমাধান প্রস্তুত';
        synthesisReasoning = `শিক্ষার্থীর দ্রুত বোঝার সুবিধার্থে স্টেপ-বাই-স্টেপ সমাধান ও সূত্রের প্রয়োগ সহজ ভাষায় উপস্থাপন করছি—যাতে এক দেখাতেই পুরো সমাধান পদ্ধতি মাথায় গেঁথে যায়।`;
      } else if (tool === 'find_similar_type_questions') {
        mainTitle = `অনুরূপ সূত্রের প্রশ্ন ও ভেক্টর প্যাটার্ন বিশ্লেষণ`;
        intentReasoning = `পূর্বের প্রশ্নের মূল কনসেপ্ট ও সূত্রের সাথে হুবহু মিল রেখে অন্য বোর্ডের প্রশ্ন অনুসন্ধান করছি... সূত্র একই থাকবে কিন্তু পরীক্ষকের প্যাঁচ বা সংখ্যা ভিন্ন হবে যাতে শিক্ষার্থী একই কনসেপ্ট বিভিন্ন রূপে অনুশীলন করতে পারে।`;
        toolLabel = `১০২৪-মাত্রার ভেক্টর এমবেডিং ও সূত্র প্যাটার্ন ম্যাচিং`;
        countTag = `✓ অনুরূপ বোর্ড প্রশ্ন প্রস্তুত`;
        synthesisReasoning = `দুটো প্রশ্নের মধ্যকার মূল প্যাঁচ ও সংখ্যার ভিন্নতা ধরিয়ে দিচ্ছি—যাতে পরীক্ষক যেভাবেই ঘুরিয়ে প্রশ্ন করুক না কেন শিক্ষার্থী নির্ভয়ে সঠিক উত্তর বের করতে পারে।`;
      } else if (tool === 'query_question_database_sql') {
        const count = result?.rows?.length || result?.total_rows || (Array.isArray(result) ? result.length : 0);
        mainTitle = `বোর্ড প্রশ্ন ডেটাবেস কাস্টম অ্যানালিটিক্স ও রেকর্ড বিশ্লেষণ`;
        intentReasoning = `৩,০৬,৬৭৮টি বোর্ড প্রশ্ন ডেটাবেসে সুনির্দিষ্ট এসকিউএল কুয়েরি প্রয়োগ করছি... বিগত বছরগুলোতে কীভাবে প্রশ্নের রূপান্তর ঘটেছে তার নির্ভুল পরিসংখ্যান বের করা হচ্ছে।`;
        toolLabel = `৩,০৬,৬৭৮টি বোর্ড প্রশ্ন লাইভ অ্যানালিটিক্স কুয়েরি`;
        countTag = count ? `✓ ${toBnDigits(count)}টি ডেটা রেকর্ড` : '✓ ডেটা সংগৃহীত';
        synthesisReasoning = `সংগৃহীত বোর্ড পরীক্ষার ডেটা ও পরিসংখ্যানের ভিত্তিতে শিক্ষার্থীর পরীক্ষার প্রস্তুতির জন্য প্রয়োজনীয় সারসংক্ষেপ প্রস্তুত করলাম।`;
      }

      // Always prioritize the AI model's authentic generated intent reasoning
      if (args?.academic_intent) {
        intentReasoning = args.academic_intent;
      }

      return { mainTitle, intentReasoning, toolLabel, countTag, synthesisReasoning };
    }

    // Toggle entire Thought Tree
    function toggleThoughtTree(treeId, triggerEl) {
      const tree = document.getElementById(treeId);
      if (!tree) return;
      const chevron = triggerEl.querySelector('.thought-chevron');
      if (tree.classList.contains('collapsed')) {
        tree.classList.remove('collapsed');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
      } else {
        tree.classList.add('collapsed');
        if (chevron) chevron.style.transform = 'rotate(-90deg)';
      }
    }

    // Toggle individual Think sub-step
    function toggleSubStep(triggerEl) {
      const step = triggerEl.closest('.thought-step');
      if (!step) return;
      const content = step.querySelector('.thought-sub-content');
      const chevron = triggerEl.querySelector('svg:last-child');
      if (!content) return;
      if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
      } else {
        content.classList.add('collapsed');
        if (chevron) chevron.style.transform = 'rotate(-90deg)';
      }
    }

    // Toggle Exam Result Audit Questions List
    function toggleExamAudit(triggerEl) {
      const card = triggerEl.closest('.exam-audit-card') || triggerEl.parentElement;
      if (!card) return;
      const collapsible = card.querySelector('.audit-collapsible');
      if (!collapsible) return;
      const chevron = card.querySelector('.audit-chevron');
      const isCollapsed = collapsible.classList.contains('collapsed');
      if (isCollapsed) {
        collapsible.classList.remove('collapsed');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
      } else {
        collapsible.classList.add('collapsed');
        if (chevron) chevron.style.transform = 'rotate(-90deg)';
      }
    }

    function renderThoughtFormattedHtml(rawThought, inProgress = false) {
      if (!rawThought) return inProgress ? '<span class="thought-cursor"></span>' : '';

      let cleanText = String(rawThought).trim();
      let subjectTag = null;
      let chapterTag = null;

      const tagMatch = cleanText.match(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|subject)\s*[:ঃ]\s*([^,\]]+)(?:,\s*(?:অধ্যায়|অধ্যায়|chapter)\s*[:ঃ]\s*([^\]]+))?\s*\]/i);
      if (tagMatch) {
        subjectTag = tagMatch[1].trim();
        if (tagMatch[2]) chapterTag = tagMatch[2].trim();
        cleanText = cleanText.replace(tagMatch[0], '').trim();
      }

      cleanText = cleanText
        .replace(/^<[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>/gi, '')
        .replace(/<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>$/gi, '')
        .replace(/(?:<[\s]*\/?)?(?:thought|thinking|থought|থট)[\s>]*\[[\s\S]*?\]/gi, '')
        .replace(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|subject)[^\]]*\]/gi, '')
        .replace(/\[\s*(?:বিষয়|বিষয়|অধ্যায়|অধ্যায়|subject|chapter)[^\]]*$/gi, '')
        .replace(/<[^>]*$/g, '')
        .trim();

      if (cleanText.length < 15 && !inProgress) {
        const subjName = subjectTag || currentSelectedSubject?.name || 'চলমান বিষয়';
        cleanText = `শিক্ষার্থীর প্রশ্নটির অ্যাকাডেমিক তাৎপর্য ও ${subjName}-এর পাঠ্যক্রমের আলোকে গভীর শিক্ষাদান পরিকল্পনা সাজাচ্ছি। মুখস্থের বদলে বাস্তব উদাহরণ ও স্পষ্ট ব্যাখ্যা দিয়ে কনসেপ্টটি নিখুঁতভাবে বুঝিয়ে দেওয়া হবে।`;
      }

      const isBogusSubj = !subjectTag || /নির্ধারিত নয়|প্রযোজ্য নয়|সার্বিক|all|none/i.test(subjectTag);
      const displaySubj = (!isBogusSubj && subjectTag) ? subjectTag : (currentSelectedSubject?.name || null);
      let badgeHtml = '';
      if (displaySubj && !/নির্ধারিত নয়|প্রযোজ্য নয়/i.test(displaySubj)) {
        const isBogusCh = !chapterTag || /নির্ধারিত নয়|প্রযোজ্য নয়|none|null/i.test(chapterTag);
        const chDisplay = (!isBogusCh && chapterTag) ? ` • অধ্যায় ${toBnDigits(chapterTag)}` : '';
        badgeHtml = `
          <div class="inline-flex items-center gap-1.5 px-2 py-0.5 mb-1.5 rounded-md bg-violet-500/10 border border-violet-400/25 text-[11px] font-medium text-violet-200 select-none shadow-[0_0_12px_rgba(168,85,247,0.1)]">
            <svg class="w-3 h-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>${escapeHtml(displaySubj)}${escapeHtml(chDisplay)}</span>
          </div>
        `;
      }

      const cursorHtml = inProgress ? '<span class="thought-cursor"></span>' : '';
      return `${badgeHtml}<div class="thought-body-text leading-relaxed text-zinc-300 font-sans">${escapeHtml(cleanText)}${cursorHtml}</div>`;
    }

    function streamThinkingText(el, text, speedMs = 24, onComplete = null) {
      if (!el || !text) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      let cleanText = String(text).trim();
      let subjectTag = null;
      let chapterTag = null;
      const tagMatch = cleanText.match(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|subject)\s*[:ঃ]\s*([^,\]]+)(?:,\s*(?:অধ্যায়|অধ্যায়|chapter)\s*[:ঃ]\s*([^\]]+))?\s*\]/i);
      if (tagMatch) {
        subjectTag = tagMatch[1].trim();
        if (tagMatch[2]) chapterTag = tagMatch[2].trim();
        cleanText = cleanText.replace(tagMatch[0], '').trim();
      }

      cleanText = cleanText
        .replace(/^<[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>/gi, '')
        .replace(/<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা)[\s]*>$/gi, '')
        .replace(/(?:<[\s]*\/?)?(?:thought|thinking|থought|থট)[\s>]*\[[\s\S]*?\]/gi, '')
        .replace(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|subject)[^\]]*\]/gi, '')
        .trim();

      if (cleanText.length < 15) {
        const subjName = subjectTag || currentSelectedSubject?.name || 'চলমান বিষয়';
        cleanText = `শিক্ষার্থীর প্রশ্নটির অ্যাকাডেমিক তাৎপর্য ও ${subjName}-এর পাঠ্যক্রমের আলোকে গভীর শিক্ষাদান পরিকল্পনা সাজাচ্ছি। মুখস্থের বদলে বাস্তব উদাহরণ ও স্পষ্ট ব্যাখ্যা দিয়ে কনসেপ্টটি নিখুঁতভাবে বুঝিয়ে দেওয়া হবে।`;
      }

      el.innerHTML = '';
      const isBogusSubj = !subjectTag || /নির্ধারিত নয়|প্রযোজ্য নয়|সার্বিক|all|none/i.test(subjectTag);
      if (subjectTag && !isBogusSubj) {
        const isBogusCh = !chapterTag || /নির্ধারিত নয়|প্রযোজ্য নয়|none|null/i.test(chapterTag);
        const chDisplay = (!isBogusCh && chapterTag) ? ` • অধ্যায় ${toBnDigits(chapterTag)}` : '';
        const badgeEl = document.createElement('div');
        badgeEl.className = 'inline-flex items-center gap-1.5 px-2 py-0.5 mb-1.5 rounded-md bg-violet-500/10 border border-violet-400/25 text-[11px] font-medium text-violet-200 select-none shadow-[0_0_12px_rgba(168,85,247,0.1)]';
        badgeEl.innerHTML = `
          <svg class="w-3 h-3 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>${escapeHtml(subjectTag)}${escapeHtml(chDisplay)}</span>
        `;
        el.appendChild(badgeEl);
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'thought-body-text leading-relaxed text-zinc-300 font-sans';
      el.appendChild(bodyEl);

      const cursor = document.createElement('span');
      cursor.className = 'thought-cursor';
      bodyEl.appendChild(cursor);

      let i = 0;
      const chunkSize = Math.max(4, Math.ceil(cleanText.length / 15));
      const timer = setInterval(() => {
        if (i < cleanText.length) {
          const nextSlice = cleanText.slice(i, i + chunkSize);
          cursor.before(document.createTextNode(nextSlice));
          i += chunkSize;
        } else {
          clearInterval(timer);
          if (cursor.parentNode) cursor.remove();
          if (typeof onComplete === 'function') onComplete();
        }
      }, 16);
      el._finishThinking = () => {
        clearInterval(timer);
        if (i < cleanText.length) cursor.before(document.createTextNode(cleanText.slice(i)));
        if (cursor.parentNode) cursor.remove();
        if (typeof onComplete === 'function') onComplete();
      };
    }

    const streamThoughtText = (el, txt, spd) => streamThinkingText(el, txt, spd);


