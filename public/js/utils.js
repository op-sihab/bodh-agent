// BODH Formatting & Utility Engine
    function toBnDigits(num) {
      if (num === undefined || num === null) return "";
      const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
      return String(num).replace(/[0-9]/g, d => bn[d]);
    }

    // Exact Reference Generator: Builds intelligent academic thought tree
    function getBanglaSubjectName(sub) {
      if (!sub) return "";
      const s = String(sub).toLowerCase();
      if (s.includes('phys')) return 'পদার্থবিজ্ঞান';
      if (s.includes('chem')) return 'রসায়ন';
      if (s.includes('bio')) return 'জীববিজ্ঞান';
      if (s.includes('high') || s.includes('h_math')) return 'উচ্চতর গণিত';
      if (s.includes('math') || s.includes('gonit')) return 'সাধারণ গণিত';
      if (s.includes('bangla') || s.includes('bng')) return 'বাংলা';
      if (s.includes('eng')) return 'ইংরেজি';
      if (s.includes('ict')) return 'তথ্য ও যোগাযোগ প্রযুক্তি';
      if (s.includes('bgs')) return 'বাংলাদেশ ও বিশ্বপরিচয়';
      if (s.includes('islam')) return 'ইসলাম ও নৈতিক শিক্ষা';
      return sub;
    }


    function formatFullBoardTags(tagStr) {
      if (!tagStr) return "";
      return String(tagStr)
        .split(",")
        .map(single => {
          const clean = single.trim().replace(/^['"-]+|['"-]+$/g, '');
          if (!clean) return "";
          const match = clean.match(/^([A-Za-z.]+)\s*[-'"]*\s*(\d{2,4})?$/i);
          if (match) {
            const rawCode = match[1].toUpperCase();
            const cleanCode = rawCode.replace(/\.+$/, '');
            const yr = match[2];
            const boardName = BOARD_NAME_MAP[rawCode] || BOARD_NAME_MAP[cleanCode] || match[1];
            if (yr) {
              const fullYr = yr.length === 2 ? (parseInt(yr, 10) > 70 ? `19${yr}` : `20${yr}`) : yr;
              return `${boardName} ${toBnDigits(fullYr)}`;
            }
            return boardName;
          }
          return toBnDigits(clean);
        })
        .filter(Boolean)
        .join(', ');
    }

    function isAcademicPrompt(t) {
      if (!t) return false;
      const s = t.toLowerCase();
      const kw = [
        'প্রশ্ন', 'অধ্যায়', 'অধ্যায়', 'সৃজনশীল', 'cq', 'mcq', 'math', 'গণিত', 'গনিত',
        'পদার্থ', 'physics', 'রসায়ন', 'রসায়ন', 'chem', 'biology', 'জীববিজ্ঞান',
        'উচ্চতর', 'কঠিন', 'সহজ', 'সিলেবাস', 'অধ্যায়গুলো', 'বোর্ড', 'টাইপ', 'সূত্র',
        'আরেকটা', 'arekta', 'next', 'hard', 'easy', 'অন্য', 'অন্যটি', 'কুইজ', 'নৈর্ব্যক্তিক'
      ];
      return kw.some(k => s.includes(k));
    }


    function normLetter(ch) {
      if (!ch) return '';
      const c = ch.trim().toLowerCase();
      if (c === 'a' || c === 'ক') return 'ক';
      if (c === 'b' || c === 'খ') return 'খ';
      if (c === 'c' || c === 'গ') return 'গ';
      if (c === 'd' || c === 'ঘ') return 'ঘ';
      return c;
    }

    // Interactive MCQ Selection (High-contrast Red/Green Feedback)

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }


    function renderFormattedContent(rawText, extraBoardTag = null, extraAns = null, extraQuizData = null, extraQid = null, extraExamTitle = null, suppressLauncherCard = false) {
      if (!rawText) return "";

      let clean = String(rawText)
        // 1. Strip all closed thought blocks along with their inner content
        .replace(/<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>[\s\S]*?<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi, '')
        // 2. Strip any leading unclosed thought blocks up to double newline
        .replace(/^<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>[\s\S]*?(?:\n\n|$)/gi, '')
        // 3. Strip 'থought[...]' or 'thought[...]' or '<thought>[...]' variations
        .replace(/(?:<[\s]*\/?)?(?:thought|thinking|থought|থট)[\s>]*\[[\s\S]*?\]/gi, '')
        // 4. Strip standalone metadata bracket tags: [বিষয়: ...], [অধ্যায়: ...], [বিষয় পরিবর্তন: ...]
        .replace(/\[\s*(?:বিষয়\s*পরিবর্তন|বিষয়|বিষয়\s*পরিবর্তন|বিষয়|অধ্যায়|অধ্যায়|subject|chapter)[^\]]*\]/gi, '')
        // 5. Strip stray thought tags
        .replace(/<\/?[\s]*(?:thought|thinking)[\s]*>/gi, '')
        // 6. Unwrap any accidental wrapping angle brackets from introductory sentences
        .replace(/^<([^<>]{4,})>/gm, (m, g1) => g1.trim())
        // 7. Strip stray custom tags
        .replace(/<\/?[\s]*(?:কুইজ|quiz|কথা|kotha|স্ট্যাটাস|status|প্রশ্ন|question|উত্তর|answer|message|response|text|mcq|cq)[\s]*>/gi, '')
        .trim();

      if (/^<\/?\s*(?:th?o?u?g?h?t?|th?i?n?k?i?n?g?)[^>]*$/i.test(clean)) {
        return "";
      }

      // 0. Extract Exam Launcher Tag (e.g. [exam_launcher: {"total": 7, "subject": "রসায়ন", "chapter": "অধ্যায় ৪: পর্যায় সারণি"}])
      let examLauncherData = null;
      clean = clean.replace(/\[exam_launcher:\s*(\{[\s\S]*?\}|[\d০-৯]+)\]/gi, (m, payload) => {
        try {
          const trimmed = payload.trim();
          if (trimmed.startsWith('{')) {
            examLauncherData = JSON.parse(trimmed);
          } else {
            examLauncherData = { total: parseInt(trimmed) || 5 };
          }
        } catch (e) {
          examLauncherData = { total: 5 };
        }
        return '%%%EXAM_LAUNCHER_PLACEHOLDER%%%';
      });

      // 1. Extract Board Reference Tag (cleanly removes tag from text without leaking placeholder)
      let boardTagsHtml = "";
      clean = clean.replace(/\[(?:বোর্ড|Board):?\s*([^\]]+)\]/gi, (match, tag) => {
        const formatted = formatFullBoardTags(tag);
        const tags = formatted.split(',').map(x => x.trim()).filter(Boolean);
        boardTagsHtml = tags.map(b => `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08]">${escapeHtml(b)}</span>`).join(' ');
        return '';
      });
      clean = clean.replace(/%%%BOARD_CONTAINER%%%/gi, '');

      if (!boardTagsHtml && extraBoardTag) {
        const formatted = formatFullBoardTags(extraBoardTag);
        const tags = formatted.split(',').map(x => x.trim()).filter(Boolean);
        boardTagsHtml = tags.map(b => `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08]">${escapeHtml(b)}</span>`).join(' ');
      }

      // 2. Extract detected answer tag and optional question ID
      let detectedAns = null;
      let detectedQid = null;
      clean = clean.replace(/\[ans:\s*([ক-ঘa-dA-D])\]/gi, (m, g) => {
        detectedAns = g;
        return '';
      });
      clean = clean.replace(/\[(?:qid|id):\s*(q_\d+)\]/gi, (m, g) => {
        detectedQid = g;
        return '';
      });
      if (!detectedAns && extraAns) {
        const toBnAns = { 'A': 'ক', 'B': 'খ', 'C': 'গ', 'D': 'ঘ', 'a': 'ক', 'b': 'খ', 'c': 'গ', 'd': 'ঘ' };
        detectedAns = toBnAns[extraAns] || extraAns;
      }
      if (!detectedQid && extraQid) {
        detectedQid = extraQid;
      }

      // 3. Protect KaTeX Display Math ($$...$$ and \[...\])
      const displayMath = [];
      clean = clean.replace(/(?:\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g, (m, c1, c2) => {
        const code = c1 !== undefined ? c1 : c2;
        displayMath.push(code);
        return '%%%MATH_D_' + (displayMath.length - 1) + '%%%';
      });

      // Normalize escaped backslashes before math delimiters (\\( -> \( or \\[ -> \[)
      clean = clean.replace(/\\\\([()[\]])/g, '\\$1');

      // 3b. Normalize bare isotope notations: e.g. (^{32}P), ^{32}P, (^{60}Co), ^{14}C -> ${}^{32}\text{P}$
      clean = clean.replace(/\(?\^\{?([০-৯0-9]+[a-zA-Z]*)\}?\s*([A-Za-z]+)\)?/g, (m, mass, elem) => {
        const asciiMass = mass.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));
        return `$ {}^{${asciiMass}}\\text{${elem}} $`;
      });

      // 4. Protect KaTeX Inline Math ($...$, \(...\), and parenthesized/standalone LaTeX formulas like (\mathrm{pH}=7))
      const inlineMath = [];
      clean = clean.replace(/(?:(?<!\\)\$([^\$\n]+?)(?<!\\)\$|\\\(([\s\S]*?)\\\)|\(([^()\n]*?\\[a-zA-Z]+[^()\n]*?)\)|(\\[a-zA-Z]+(?:\{[^\}\n]*\})*(?:[\s_^\-\+*\/=<>]+[a-zA-Z0-9\(\)\{\}\\]+)*))/g, (m, c1, c2, c3, c4) => {
        const code = c1 !== undefined ? c1 : (c2 !== undefined ? c2 : (c3 !== undefined ? c3 : c4));
        inlineMath.push(code);
        return '%%%MATH_I_' + (inlineMath.length - 1) + '%%%';
      });

      // 4b. Eliminate redundant double numbering in chapter lists (e.g. "8. **অধ্যায় ৮: আলোর প্রতিফলন**" -> "- **অধ্যায় ৮: আলোর প্রতিফলন**")
      clean = clean.replace(/^(\s*)[০-৯0-9]+[\.\)]\s+(\*{0,2}(?:অধ্যায়|অধ্যায়)\s*[০-৯0-9]+(?::|\*{1,2}|\s))/gim, (m, g1, g2) => g1 + '- ' + g2);

      // 5. Robust Raw-Text MCQ Option Extraction (Handles blank lines, bullets, bolding, multi-MCQs)
      const singleOptionLineRegex = /^[ \t]*(?:[-*+]\s+)?(?:\*{1,2})?(?:\(([ক-ঘa-dA-D])\)|([ক-ঘa-dA-D])[\.\)])(?:\*{1,2})?[ \t]+([^\r\n]+)/;

      const lines = clean.split(/\r?\n/);
      const clusters = [];
      let currentCluster = null;

      function isCreativeQuestionCluster(cluster, fullText) {
        if (!cluster || !cluster.items || cluster.items.length === 0) return false;
        // If explicitly tagged as MCQ or Quiz, it is NEVER a Creative Question
        if (/\bMCQ\b|নৈর্ব্যক্তিক|বহুনির্বাচনী|কুইজ/i.test(fullText)) {
          return false;
        }
        if (/উদ্দীপক|সৃজনশীল|\bCQ\b|\bCQ_\d\b|সৃজনশীল প্রশ্ন/i.test(fullText)) {
          return true;
        }
        const cqKeywords = /(?:কাকে বলে|কী\?|কেন\?|কীভাবে|ব্যাখ্যা কর|বিশ্লেষণ কর|নির্ণয় কর|হিসাব কর|প্রমাণ কর|লেখো|চিহ্নিত কর|তুলনা কর|উদ্বৃত্ত|বিক্রিয়াটি লেখ|পার্থক্য|ধর্ম ব্যাখ্যা|প্রক্রিয়া|উপযোগিতা|যৌগটির|মৌলটির)/i;
        if (cluster.items.some(it => cqKeywords.test(it.text))) return true;
        if (cluster.items.some(it => it.text.length > 60)) return true;
        return false;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(singleOptionLineRegex);

        if (match) {
          const letter = match[1] || match[2];
          const text = match[3].replace(/\*{2,4}$/, '').trim();
          if (!currentCluster) {
            currentCluster = { startIndex: i, endIndex: i, items: [] };
          }
          currentCluster.endIndex = i;
          currentCluster.items.push({ letter, text, lineIdx: i });
        } else if (line.trim() === "") {
          // Keep cluster active across blank lines between options
        } else {
          if (currentCluster) {
            if (currentCluster.items.length >= 2 && !isCreativeQuestionCluster(currentCluster, clean)) {
              clusters.push(currentCluster);
            }
            currentCluster = null;
          }
        }
      }
      if (currentCluster && currentCluster.items.length >= 2 && !isCreativeQuestionCluster(currentCluster, clean)) {
        clusters.push(currentCluster);
      }

      const resolveClusterMath = (str) => {
        if (!str) return '';
        return str
          .replace(/%%%MATH_D_(\d+)%%%/g, (m, idx) => {
            const code = displayMath[parseInt(idx, 10)];
            return code ? `$$${code}$$` : m;
          })
          .replace(/%%%MATH_I_(\d+)%%%/g, (m, idx) => {
            const code = inlineMath[parseInt(idx, 10)];
            return code ? `$${code}$` : m;
          });
      };

      // 5. Identify start line of each question with precise header and stem detection
      const questionStarts = [];
      for (let c = 0; c < clusters.length; c++) {
        const cluster = clusters[c];
        let s = cluster.startIndex - 1;
        while (s >= 0 && lines[s].trim() === '') s--;
        while (s > 0) {
          const prev = lines[s - 1].trim();
          if (!prev) {
            let p2 = s - 1;
            while (p2 >= 0 && lines[p2].trim() === '') p2--;
            if (p2 >= 0 && (/^(?:#{1,4}\s*)?(?:প্রশ্ন|MCQ|Q)[\s\d:০-৯\.\)]*$/i.test(lines[p2].trim()) || /\[(?:বোর্ড|Board):/i.test(lines[p2].trim()))) {
              s = p2;
              continue;
            }
            break;
          }
          if (/^[-*_]{3,}$/.test(prev)) break;
          if (c > 0 && (s - 1) <= clusters[c - 1].endIndex) break;
          if (/^(?:#{1,4}\s*)?(?:প্রশ্ন|MCQ|Q)[\s\d:০-৯\.\)]*$/i.test(prev)) {
            s = s - 1;
            break;
          }
          if (/\[(?:বোর্ড|Board):/i.test(prev)) {
            s = s - 1;
            continue;
          }
          s--;
        }
        questionStarts[c] = s;
      }

      // 5b. Multi-Exam check: Known from extraQuizData (from DB) OR 2+ clusters
      const isMultiExam = (extraQuizData && Array.isArray(extraQuizData) && extraQuizData.length >= 2) || clusters.length >= 2;

      // Extract Questions FIRST while lines array is intact
      let extractedExamQuestions = [];
      if (isMultiExam && clusters.length >= 2) {
        for (let c = 0; c < clusters.length; c++) {
          const cluster = clusters[c];
          const startLine = questionStarts[c];
          const stemLines = [];
          let boardTagForQ = extraBoardTag || '';

          for (let l = startLine; l < cluster.startIndex; l++) {
            const rawL = (lines[l] || '').trim();
            if (!rawL) continue;
            if (/^[-*_]{3,}$/.test(rawL)) continue;
            const bM = rawL.match(/\[(?:বোর্ড|Board):?\s*([^\]]+)\]/i);
            if (bM) {
              boardTagForQ = bM[1];
              continue;
            }
            if (/^(?:#{1,4}\s*)?(?:প্রশ্ন|MCQ|Q)[\s\d:০-৯\.\)]*$/i.test(rawL)) continue;
            const cleanL = rawL.replace(/^(?:#{1,4}\s*)?(?:প্রশ্ন\s*[:\d০-৯\.\)]*|\d+[\.\)]\s*)/i, '').trim();
            if (cleanL) stemLines.push(cleanL);
          }

          let ansForQ = 'ক';
          const nextStart = (c < clusters.length - 1) ? questionStarts[c + 1] : lines.length;
          for (let l = cluster.endIndex + 1; l < nextStart; l++) {
            const rawL = (lines[l] || '').trim();
            const aM = rawL.match(/\[ans:\s*([ক-ঘa-dA-D])\]|(?:সঠিক উত্তর|Answer|Ans)[:\s]*\(([ক-ঘa-dA-D])\)|(?:সঠিক উত্তর|Answer|Ans)[:\s]*([ক-ঘa-dA-D])/i);
            if (aM) {
              ansForQ = normLetter(aM[1] || aM[2] || aM[3]);
              break;
            }
          }

          const rawStem = stemLines.join(' ').trim() || `প্রশ্ন ${c + 1}`;
          extractedExamQuestions.push({
            question_text: resolveClusterMath(rawStem),
            option_a: resolveClusterMath(cluster.items.find(it => normLetter(it.letter) === 'ক')?.text || cluster.items[0]?.text || ''),
            option_b: resolveClusterMath(cluster.items.find(it => normLetter(it.letter) === 'খ')?.text || cluster.items[1]?.text || ''),
            option_c: resolveClusterMath(cluster.items.find(it => normLetter(it.letter) === 'গ')?.text || cluster.items[2]?.text || ''),
            option_d: resolveClusterMath(cluster.items.find(it => normLetter(it.letter) === 'ঘ')?.text || cluster.items[3]?.text || ''),
            answer: ansForQ,
            solution: 'বোর্ড স্ট্যান্ডার্ড সমাধান ও নির্ভুল বিশ্লেষণ',
            tags: boardTagForQ
          });
        }

        // Only overwrite globalActiveExamQuestions if not already loaded with complete DB questions
        if (!globalActiveExamQuestions || globalActiveExamQuestions.length < extractedExamQuestions.length || !globalActiveExamQuestions[0]?.question_text) {
          globalActiveExamQuestions = extractedExamQuestions;
        }
      }

      const cards = [];
      if (isMultiExam) {
        // Multi-MCQ / Full Exam: Keep clean introduction markdown; cleanly strip any question stems, option lines, or metadata tags
        const cleanIntroLines = [];
        let hitQuestionBlock = false;
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i].trim();
          if (!l) {
            if (!hitQuestionBlock) cleanIntroLines.push(lines[i]);
            continue;
          }
          if (/^(?:#{1,4}\s*)?(?:প্রশ্ন|MCQ|Q)[\s\d:০-৯\.\)]*$/i.test(l) ||
              singleOptionLineRegex.test(l) ||
              /^\s*\[ans:\s*[ক-ঘa-dA-D]/i.test(l) ||
              /^\s*\[qid:\s*q_\d+/i.test(l) ||
              /^\s*(?:সঠিক উত্তর|Answer|Ans)[:\s]*/i.test(l)) {
            hitQuestionBlock = true;
            continue;
          }
          if (!hitQuestionBlock) {
            cleanIntroLines.push(lines[i]);
          }
        }
        cleanIntroLines.push('\n%%%EXAM_LAUNCHER_PLACEHOLDER%%%\n');
        clean = cleanIntroLines.join('\n');
      } else {
        // Single MCQ Practice: Interactive visual card rendered directly in chat
        for (let c = clusters.length - 1; c >= 0; c--) {
          const cluster = clusters[c];
          const firstLineIdx = cluster.startIndex;
          let lastLineIdx = cluster.endIndex;

          const startLine = (typeof questionStarts[c] === 'number' && questionStarts[c] >= 0) ? questionStarts[c] : firstLineIdx;
          const stemLines = [];
          let boardTagForQ = extraBoardTag || '';

          for (let l = startLine; l < firstLineIdx; l++) {
            const rawL = (lines[l] || '').trim();
            if (!rawL) continue;
            if (/^[-*_]{3,}$/.test(rawL)) continue;
            const bM = rawL.match(/\[(?:বোর্ড|Board):?\s*([^\]]+)\]/i);
            if (bM) {
              boardTagForQ = bM[1];
              continue;
            }
            if (/^(?:#{1,4}\s*)?(?:প্রশ্ন|MCQ|Q)[\s\d:০-৯\.\)]*$/i.test(rawL)) continue;
            const cleanL = rawL.replace(/^(?:#{1,4}\s*)?(?:প্রশ্ন\s*[:\d০-৯\.\)]*|\d+[\.\)]\s*)/i, '').trim();
            if (cleanL) stemLines.push(cleanL);
          }

          const questionStemText = stemLines.join(' ').trim();
          const effectiveStartLine = (stemLines.length > 0 && startLine < firstLineIdx) ? startLine : firstLineIdx;

          let explanationLines = [];
          let foundAnsInExp = null;
          let scanIdx = lastLineIdx + 1;

          while (scanIdx < lines.length && lines[scanIdx].trim() === "") scanIdx++;

          while (scanIdx < lines.length && /^\s*(?:\*{0,2}(?:সঠিক উত্তর|Answer|Ans|ব্যাখ্যা|Explanation):)/i.test(lines[scanIdx])) {
            explanationLines.push(lines[scanIdx]);
            lastLineIdx = scanIdx;
            scanIdx++;

            let consecutiveBlanks = 0;
            while (scanIdx < lines.length) {
              const expLine = lines[scanIdx];
              if (expLine.trim() === "") {
                consecutiveBlanks++;
                if (consecutiveBlanks >= 2) break;
                explanationLines.push(expLine);
              } else {
                if (/^(?:#{1,4}\s+|MCQ:|\d+[\.\)]|প্রশ্ন\s*[:\d])/i.test(expLine.trim())) break;
                if (/^\s*(?:\*{0,2}(?:সঠিক উত্তর|Answer|Ans|ব্যাখ্যা|Explanation):)/i.test(expLine)) break;
                consecutiveBlanks = 0;
                explanationLines.push(expLine);
              }
              lastLineIdx = scanIdx;
              scanIdx++;
            }
          }

          const explanationText = explanationLines.join('\n').trim();
          if (explanationText) {
            const expAnsM = explanationText.match(/(?:সঠিক উত্তর|Answer|Ans)[:\s]*\(([ক-ঘa-dA-D])\)|(?:সঠিক উত্তর|Answer|Ans)[:\s]*([ক-ঘa-dA-D])/i);
            if (expAnsM) foundAnsInExp = expAnsM[1] || expAnsM[2];
          }

          const targetAns = detectedAns || foundAnsInExp || '';
          const effectiveBoardTag = boardTagForQ || (boardTagsHtml ? boardTagsHtml.replace(/<[^>]+>/g, '').trim() : '');

          const optionsHtml = cluster.items.map(it => `
            <button type="button" 
              class="mcq-opt group flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl text-left w-full cursor-pointer relative overflow-hidden bg-white/[0.025] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-150 ring-1 ring-white/[0.02]"
              data-letter="${it.letter}"
              onclick="handleOptionClick(this, '${it.letter}')">
              <div class="flex items-center gap-3 min-w-0">
                <span class="opt-letter w-7 h-7 rounded-lg bg-white/[0.05] text-zinc-300 font-mono text-xs flex items-center justify-center font-bold shrink-0 border border-white/[0.08] transition-all group-hover:border-indigo-400/50 group-hover:bg-indigo-500/10 group-hover:text-white">
                  ${it.letter}
                </span>
                <span class="opt-text text-xs sm:text-[14px] text-zinc-200 transition-colors font-normal leading-snug">${formatExamMath(it.text)}</span>
              </div>
              <span class="opt-badge hidden text-xs font-bold shrink-0"></span>
            </button>
          `).join('');

          const placeholder = `%%%MCQ_PLACEHOLDER_${c}%%%`;
          const cardHtml = `
            <div class="mcq-wrapper my-4 bg-gradient-to-b from-[#12131e] to-[#0a0a10] border border-white/[0.12] rounded-2xl p-4 sm:p-5 space-y-4 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] ring-1 ring-white/[0.04] transition-all" data-correct="${targetAns}">
              <!-- Visual Card Header -->
              <div class="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-sm">
                    <svg class="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>MCQ অনুশীলন</span>
                  </span>
                  ${effectiveBoardTag ? `<span class="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-zinc-300 font-medium">${escapeHtml(effectiveBoardTag)}</span>` : ''}
                </div>
                <span class="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06] tracking-wider">১টি প্রশ্ন • ইন্টারেক্টিভ</span>
              </div>

              <!-- Question Stem (Clean & Visual) -->
              ${questionStemText ? `
              <div class="mcq-stem text-[14px] sm:text-[15px] font-medium text-zinc-100 leading-relaxed font-sans select-text">
                ${formatExamMath(questionStemText)}
              </div>` : ''}

              <!-- Interactive Options Grid -->
              <div class="mcq-options-grid grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                ${optionsHtml}
              </div>

              <!-- Action Bar (Clean Cyan/Indigo Palette) -->
              <div class="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08]">
                <button type="button" onclick="submitPrompt('এই টাইপের আরেকটি প্রশ্ন অনুশীলন করতে চাই' + (typeof detectedQid !== 'undefined' && detectedQid ? ' [ID: ' + detectedQid + ']' : ''))" 
                  class="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-500/[0.08] hover:bg-sky-500/[0.15] text-sky-300 hover:text-sky-200 border border-sky-500/25 hover:border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.06)] transition-all duration-150 cursor-pointer font-medium text-[11.5px] active:scale-[0.98]">
                  <svg class="w-3.5 h-3.5 text-sky-400 shrink-0 transition-transform duration-300 group-hover:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  <span>পরের প্রশ্ন অনুশীলন করো</span>
                </button>
                <button type="button" onclick="submitPrompt('এই প্রশ্নটির সম্পূর্ণ ব্যাখ্যা ও শর্টকাট ট্রিক বুঝিয়ে দাও')" 
                  class="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/[0.08] hover:bg-indigo-500/[0.15] text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 hover:border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.05)] transition-all duration-150 cursor-pointer font-medium text-[11.5px] active:scale-[0.98]">
                  <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0 transition-transform duration-200 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3m-9-4a4 4 0 100 8 4 4 0 000-8z"/>
                  </svg>
                  <span>ব্যাখ্যা ও ট্রিকস</span>
                </button>
              </div>
            </div>
          `;

          lines.splice(effectiveStartLine, (lastLineIdx - effectiveStartLine + 1), placeholder);
          cards.push({ placeholder, cardHtml });
        }
        clean = lines.join('\n');
      }

      // 6. Parse Markdown
      let html = "";
      try {
        html = marked.parse(clean);
      } catch (e) {
        html = escapeHtml(clean);
      }

      // 6b. Inject Exam Launcher Card if present OR if multi-MCQ cluster detected
      if (!suppressLauncherCard && (clean.includes('%%%EXAM_LAUNCHER_PLACEHOLDER%%%') || examLauncherData || isMultiExam)) {
        const qListToEmbed = (extraQuizData && Array.isArray(extraQuizData) && extraQuizData.length > 0)
          ? extraQuizData
          : null;

        const totVal = examLauncherData?.total || (qListToEmbed?.length ? qListToEmbed.length : (clusters.length >= 2 ? clusters.length : 25));
        const rawSubj = examLauncherData?.subject || currentSelectedSubject?.name || 'এসএসসি বিষয়';
        const chStr = examLauncherData?.chapter || extraExamTitle;
        const launcherCardHtml = buildExamLauncherCardHtml(rawSubj, chStr, totVal, qListToEmbed);

        if (html.includes('%%%EXAM_LAUNCHER_PLACEHOLDER%%%')) {
          html = html.replace(/<p>\s*%%%EXAM_LAUNCHER_PLACEHOLDER%%%\s*<\/p>|%%%EXAM_LAUNCHER_PLACEHOLDER%%%/g, launcherCardHtml);
        } else if (!html.includes('exam-launcher-card')) {
          html += launcherCardHtml;
        }
      } else {
        html = html.replace(/<p>\s*%%%EXAM_LAUNCHER_PLACEHOLDER%%%\s*<\/p>|%%%EXAM_LAUNCHER_PLACEHOLDER%%%/g, '');
      }

      // 7. Inject MCQ Cards: ONLY for Single MCQ practice! If multi-MCQ, cards are inside the launcher
      if (!isMultiExam && clusters.length < 2) {
        for (const card of cards) {
          const reg = new RegExp(`<p>\\s*${card.placeholder}\\s*<\\/p>|${card.placeholder}`, 'g');
          html = html.replace(reg, card.cardHtml);
        }
      } else {
        // Multi-MCQ clean-up safeguard: remove any stray question headers or divider lines
        html = html.replace(/<h[1-4]>\s*(?:প্রশ্ন|MCQ|Q)[\s\d:০-৯\.\)]*<\/h[1-4]>/gi, '');
        html = html.replace(/<hr\s*\/?>/gi, '');
      }

      // 7b. Format Examiner Traps & Master Tricks inside blockquotes into glowing glassmorphic cards
      html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (m, inner) => {
        if (/বোর্ড এক্সামিনারের ফাঁদ|পরীক্ষকের ফাঁদ|ফাঁদ অ্যালার্ট/i.test(inner)) {
          const cleanInner = inner
            .replace(/<p>(?:⚠️\s*)?<strong>(?:⚠️\s*)?(?:বোর্ড এক্সামিনারের ফাঁদ|পরীক্ষকের ফাঁদ|ফাঁদ অ্যালার্ট):?<\/strong>\s*/gi, '<p>')
            .replace(/⚠️/g, '')
            .trim();
          return `
            <div class="my-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 text-xs text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.08)] backdrop-blur-md">
              <div class="flex items-center gap-2 font-bold text-amber-400 text-[13px] mb-2">
                <svg class="w-4 h-4 shrink-0 text-amber-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>বোর্ড এক্সামিনারের ফাঁদ ও সাধারণ ভুল</span>
              </div>
              <div class="leading-relaxed text-zinc-300 pl-6 space-y-1.5">${cleanInner}</div>
            </div>
          `;
        }
        if (/মাস্টার ট্রিক|শর্টকাট ট্রিক|মাস্টার টাইপ/i.test(inner)) {
          const cleanInner = inner
            .replace(/<p>(?:🎯\s*)?<strong>(?:🎯\s*)?(?:মাস্টার ট্রিক|শর্টকাট ট্রিক|মাস্টার টাইপ):?<\/strong>\s*/gi, '<p>')
            .replace(/🎯/g, '')
            .trim();
          return `
            <div class="my-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.08] p-4 text-xs text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.08)] backdrop-blur-md">
              <div class="flex items-center gap-2 font-bold text-indigo-400 text-[13px] mb-2">
                <svg class="w-4 h-4 shrink-0 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <circle cx="12" cy="12" r="9"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3m-9-4a4 4 0 100 8 4 4 0 000-8z"/>
                </svg>
                <span>মাস্টার হ্যাক ও শর্টকাট কৌশল</span>
              </div>
              <div class="leading-relaxed text-zinc-300 pl-6 space-y-1.5">${cleanInner}</div>
            </div>
          `;
        }
        return m;
      });

      // 7c. Format standalone paragraph callouts (without blockquote) into styled cards
      html = html.replace(/<p>(?:⚠️\s*)?<strong>(?:⚠️\s*)?(বোর্ড এক্সামিনারের ফাঁদ|পরীক্ষকের ফাঁদ|ফাঁদ অ্যালার্ট):?<\/strong>([\s\S]*?)<\/p>/gi, (m, title, content) => {
        return `
          <div class="my-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 text-xs text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.08)] backdrop-blur-md">
            <div class="flex items-center gap-2 font-bold text-amber-400 text-[13px] mb-2">
              <svg class="w-4 h-4 shrink-0 text-amber-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <span>${title}</span>
            </div>
            <div class="leading-relaxed text-zinc-300 pl-6">${content.trim()}</div>
          </div>
        `;
      });

      html = html.replace(/<p>(?:🎯\s*)?<strong>(?:🎯\s*)?(মাস্টার ট্রিক|শর্টকাট ট্রিক|মাস্টার টাইপ):?<\/strong>([\s\S]*?)<\/p>/gi, (m, title, content) => {
        return `
          <div class="my-3.5 rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.08] p-4 text-xs text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.08)] backdrop-blur-md">
            <div class="flex items-center gap-2 font-bold text-indigo-400 text-[13px] mb-2">
              <svg class="w-4 h-4 shrink-0 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="12" cy="12" r="9"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3m-9-4a4 4 0 100 8 4 4 0 000-8z"/>
              </svg>
              <span>${title}</span>
            </div>
            <div class="leading-relaxed text-zinc-300 pl-6">${content.trim()}</div>
          </div>
        `;
      });

      // 7d. Format Exam Completion Report into a luxurious SVG banner (No ugly raw emojis!)
      const reportBannerHtml = `
        <div class="exam-report-banner my-3.5 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/[0.12] via-[#161622] to-[#121218] border border-indigo-500/25 shadow-[0_4px_24px_rgba(99,102,241,0.12)] select-none">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-sm">
              <svg class="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">পরীক্ষা সমাপ্তি ও ফলাফল রিপোর্ট</h3>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium shrink-0">ফলাফল বিশ্লেষণ</span>
              </div>
              <p class="text-[11.5px] text-zinc-400 mt-0.5">মক টেস্ট স্কোর ও ১-অন-১ কনসেপ্ট সমাধান</p>
            </div>
          </div>
        </div>
      `;
      html = html.replace(/<h[1-4]>(?:<svg[^>]*>.*?<\/svg>|\s*|📊|📈)*(?:পরীক্ষা সমাপ্তি ও ফলাফল রিপোর্ট|মক টেস্ট ফলাফল রিপোর্ট|ফলাফল রিপোর্ট|এক্সাম রিপোর্ট)<\/h[1-4]>/gi, reportBannerHtml);
      html = html.replace(/<p>\s*<strong>(?:<svg[^>]*>.*?<\/svg>|\s*|📊|📈)*(?:পরীক্ষা সমাপ্তি ও ফলাফল রিপোর্ট|মক টেস্ট ফলাফল রিপোর্ট|ফলাফল রিপোর্ট|এক্সাম রিপোর্ট):?<\/strong>\s*<\/p>/gi, reportBannerHtml);
      html = html.replace(/<p>(?:<svg[^>]*>.*?<\/svg>|\s*|📊|📈)*(?:পরীক্ষা সমাপ্তি ও ফলাফল রিপোর্ট|মক টেস্ট ফলাফল রিপোর্ট|ফলাফল রিপোর্ট|এক্সাম রিপোর্ট):?\s*<\/p>/gi, reportBannerHtml);



      // 8. Restore KaTeX Display Math (Memoized for 60fps streaming)
      html = html.replace(/%%%MATH_D_(\d+)%%%/g, (m, idx) => {
        const code = displayMath[parseInt(idx, 10)];
        if (!code) return m;
        return getRenderedKaTeX(code, true);
      });

      // 9. Restore KaTeX Inline Math (Memoized for 60fps streaming)
      html = html.replace(/%%%MATH_I_(\d+)%%%/g, (m, idx) => {
        const code = inlineMath[parseInt(idx, 10)];
        if (!code) return m;
        return getRenderedKaTeX(code, false);
      });

      html = html.replace(/<p>\s*\[ans:[^\]]*\]\s*<\/p>|\[ans:[^\]]*\]/gi, '');
      html = html.replace(/<p>\s*<\/p>/g, '');
      return html;
    }

    // High-performance KaTeX memoization cache to prevent CPU thrashing during streaming
    const katexCache = new Map();
    function getRenderedKaTeX(latex, displayMode) {
      if (!latex) return '';
      let cleanLatex = String(latex).trim()
        .replace(/\\\\+/g, '\\')
        .replace(/\\+$/, '')
        .replace(/\\mathrm\{\s*~?\s*\}/g, '')
        .replace(/~+/g, ' ')
        .trim();
      if (!cleanLatex) return '';

      const key = (displayMode ? 'D:' : 'I:') + cleanLatex;
      if (katexCache.has(key)) return katexCache.get(key);
      let rendered = '';
      if (window.katex) {
        try {
          rendered = window.katex.renderToString(cleanLatex, { displayMode, throwOnError: true });
        } catch(e) {
          // If complex latex fails, render as clean chemical formula text (never show red raw code)
          const fallbackText = cleanLatex
            .replace(/\\mathrm\{([^}]*)\}/g, '$1')
            .replace(/\\text\{([^}]*)\}/g, '$1')
            .replace(/\\/g, '')
            .trim();
          rendered = displayMode ? `<div class="katex-display font-medium text-zinc-100">${escapeHtml(fallbackText || cleanLatex)}</div>` : `<span class="katex-inline font-medium text-zinc-100">${escapeHtml(fallbackText || cleanLatex)}</span>`;
        }
      } else {
        rendered = displayMode ? `<div class="katex-display font-medium text-zinc-100">${escapeHtml(cleanLatex)}</div>` : `<span class="katex-inline font-medium text-zinc-100">${escapeHtml(cleanLatex)}</span>`;
      }
      if (katexCache.size < 1200) katexCache.set(key, rendered);
      return rendered;
    }

    // Helper to format subject slugs into clean, human Bengali names
    function formatSubjectName(raw) {
      if (!raw) return 'এসএসসি প্রস্তুতি';
      const map = {
        'ssc_chemistry': 'রসায়ন',
        'ssc_physics': 'পদার্থবিজ্ঞান',
        'ssc_biology': 'জীববিজ্ঞান',
        'ssc_higher_math': 'উচ্চতর গণিত',
        'ssc_general_math': 'সাধারণ গণিত',
        'ssc_bangla_1st': 'বাংলা ১ম পত্র',
        'ssc_bangla_2nd': 'বাংলা ২য় পত্র',
        'ssc_english_1st': 'ইংরেজি ১ম পত্র',
        'ssc_english_2nd': 'ইংরেজি ২য় পত্র',
        'ssc_ict': 'তথ্য ও যোগাযোগ প্রযুক্তি',
        'ssc_bgs': 'বাংলাদেশ ও বিশ্বপরিচয়',
        'ssc_islam': 'ইসলাম ও নৈতিক শিক্ষা',
        'ssc_hindu': 'হিন্দুধর্ম ও নৈতিক শিক্ষা',
        'ssc_agriculture': 'কৃষি শিক্ষা',
        'chemistry': 'রসায়ন',
        'physics': 'পদার্থবিজ্ঞান',
        'biology': 'জীববিজ্ঞান',
        'higher_math': 'উচ্চতর গণিত',
        'general_math': 'সাধারণ গণিত'
      };
      const key = String(raw).toLowerCase().trim();
      return map[key] || raw;
    }

    // Specialized high-speed math & science formula formatter for exam modal and question cards
    function formatExamMath(raw) {
      if (!raw) return '';
      let str = String(raw).trim();

      // If marked/HTML already leaked in, strip outer <p> and </p>
      str = str.replace(/^<p>([\s\S]*?)<\/p>$/i, '$1').trim();

      // Normalize escaped backslashes before math delimiters (e.g. \\( -> \( or \\[ -> \[)
      str = str.replace(/\\\\([()[\]])/g, '\\$1');

      // 0. Safety cleanup for any residual placeholders
      str = str.replace(/%%%MATH_D_(\d+)%%%/g, (m, idx) => {
        return (typeof displayMath !== 'undefined' && displayMath[idx]) ? `$$${displayMath[idx]}$$` : m;
      }).replace(/%%%MATH_I_(\d+)%%%/g, (m, idx) => {
        return (typeof inlineMath !== 'undefined' && inlineMath[idx]) ? `$${inlineMath[idx]}$` : m;
      });

      const mathItems = [];
      const placeholder = (idx) => `%%%EXAM_M_${idx}%%%`;

      // Helper to convert Bengali digits to ASCII digits for LaTeX engine
      const toAsciiMathDigits = (s) => s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));

      // 1. Display Math: $$...$$ and \[...\]
      str = str.replace(/(?:\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g, (m, c1, c2) => {
        const code = (c1 !== undefined ? c1 : c2).trim();
        mathItems.push({ code: toAsciiMathDigits(code), display: true });
        return placeholder(mathItems.length - 1);
      });

      // 2. Inline Math: $...$ and \(...\) (must allow backslashes inside \(\) so \text{} / \mathrm{} works!)
      str = str.replace(/(?:(?<!\\)\$([^\$\n]+?)(?<!\\)\$|\\\(([\s\S]*?)\\\))/g, (m, c1, c2) => {
        const code = (c1 !== undefined ? c1 : c2).trim();
        mathItems.push({ code: toAsciiMathDigits(code), display: false });
        return placeholder(mathItems.length - 1);
      });

      // 2b. Bare isotope notation with superscripts: e.g. (^{32}P), ^{32}P, (^{60}Co), ^{60}Co, (^{131}I), (^{99m}Tc), ^{14}C
      str = str.replace(/\(?\^\{?([০-৯0-9]+[a-zA-Z]*)\}?\s*([A-Za-z]+)\)?/g, (m, mass, elem) => {
        const asciiMass = toAsciiMathDigits(mass);
        mathItems.push({ code: `{}^{${asciiMass}}\\text{${elem}}`, display: false });
        return placeholder(mathItems.length - 1);
      });

      // 3. Standalone scientific notations with multiplication:
      // e.g. "3.011 × 10^{23}", "3.011 \times 10^{23}", "3.011 x 10^23", "6.022 × 10^23", "৬.০২ × ১০^{২৩}", "3 × 10^8 m/s"
      str = str.replace(/([০-৯0-9]+(?:\.[০-৯0-9]+)?\s*(?:×|\\times|\*|x)\s*(?:10|১০)\^\{?[+-]?[০-৯0-9]+\}?(?:\s*[a-zA-Z\/]+(?:\^\{?[+-]?[০-৯0-9]+\}?)?)?)/gi, (m) => {
        let clean = toAsciiMathDigits(m).replace(/×|\*|(?<=\s)x(?=\s)/g, '\\times ');
        mathItems.push({ code: clean, display: false });
        return placeholder(mathItems.length - 1);
      });

      // 4. Standalone LaTeX commands: e.g. \times, \frac{...}{...}, \mathrm{...}, \sqrt{...}
      str = str.replace(/(\\[a-zA-Z]+(?:\{[^\}\n]*\})*(?:[\s_^\-\+*\/=<>]+[a-zA-Z0-9\(\)\{\}\\]+)*)/g, (m) => {
        mathItems.push({ code: toAsciiMathDigits(m.trim()), display: false });
        return placeholder(mathItems.length - 1);
      });

      // 5. Chemical formulas with subscripts (e.g. CO_2, H_2SO_4, CaCO_3, NaHCO_3, KMnO_4, H_2O, Fe_2O_3, NO_2)
      str = str.replace(/\b((?:[A-Z][a-z]?)+(?:_\d+|\^\{?[+-]?\d+\}?)+(?:[A-Z][a-z]?(?:_\d+|\^\{?[+-]?\d+\}?)*)*)\b/g, (m) => {
        mathItems.push({ code: `\\mathrm{${m}}`, display: false });
        return placeholder(mathItems.length - 1);
      });

      // 6. Standalone powers of 10 or variables with exponents: e.g. 10^{23}, ১০^{২৩}, 10^8, 10^{-3}, ms^{-1}, ms^{-2}, v^2, u^2
      str = str.replace(/((?:10|১০)\^\{?[+-]?[০-৯0-9]+\}?|\b[a-zA-Z]\^\{?[+-]?[০-৯0-9]+\}?)/g, (m) => {
        mathItems.push({ code: toAsciiMathDigits(m), display: false });
        return placeholder(mathItems.length - 1);
      });

      // 7. Light markdown formatting for text (bold, italic, code)
      str = str
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/[0.06] font-mono text-xs">$1</code>');

      // 8. Restore all math items using high-performance getRenderedKaTeX
      str = str.replace(/%%%EXAM_M_(\d+)%%%/g, (m, idx) => {
        const item = mathItems[parseInt(idx, 10)];
        if (!item) return m;
        return getRenderedKaTeX(item.code, item.display);
      });

      return str;
    }


    // High-fidelity Markdown + KaTeX Math engine for Exam Arena & Co-Pilot
    function renderExamMarkdownAndMath(rawText, isStreaming = false) {
      if (!rawText) return isStreaming ? '<span class="streaming-cursor"></span>' : '';
      let str = String(rawText);

      // Normalize escaped backslashes before math delimiters (\\( -> \( or \\[ -> \[)
      str = str.replace(/\\\\([()[\]])/g, '\\$1');

      const toAsciiMathDigits = (s) => s.replace(/[০-৯]/g, d => '০১২৩৪৫৬৭৮৯'.indexOf(d));

      // 1. Protect display math ($$...$$ and \[...\])
      const displayMath = [];
      str = str.replace(/(?:\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\])/g, (m, c1, c2) => {
        const code = c1 !== undefined ? c1 : c2;
        displayMath.push(toAsciiMathDigits(code.trim()));
        return `%%%EXAM_MD_D_${displayMath.length - 1}%%%`;
      });

      // 2. Protect inline math ($...$ and \(...\))
      const inlineMath = [];
      str = str.replace(/(?:(?<!\\)\$([^\$\n]+?)(?<!\\)\$|\\\(([\s\S]*?)\\\))/g, (m, c1, c2) => {
        const code = c1 !== undefined ? c1 : c2;
        inlineMath.push(toAsciiMathDigits(code.trim()));
        return `%%%EXAM_MD_I_${inlineMath.length - 1}%%%`;
      });

      // 3. Protect bare isotope notation: e.g. (^{32}P), ^{32}P, (^{60}Co), ^{14}C
      str = str.replace(/\(?\^\{?([০-৯0-9]+[a-zA-Z]*)\}?\s*([A-Za-z]+)\)?/g, (m, mass, elem) => {
        const asciiMass = toAsciiMathDigits(mass);
        inlineMath.push(`{}^{${asciiMass}}\\text{${elem}}`);
        return `%%%EXAM_MD_I_${inlineMath.length - 1}%%%`;
      });

      // 4. Standalone scientific notations with multiplication: e.g. 6.022 × 10^{23}
      str = str.replace(/([০-৯0-9]+(?:\.[০-৯0-9]+)?\s*(?:×|\\times|\*|x)\s*(?:10|১০)\^\{?[+-]?[০-৯0-9]+\}?(?:\s*[a-zA-Z\/]+(?:\^\{?[+-]?[০-৯0-9]+\}?)?)?)/gi, (m) => {
        let clean = toAsciiMathDigits(m).replace(/×|\*|(?<=\s)x(?=\s)/g, '\\times ');
        inlineMath.push(clean);
        return `%%%EXAM_MD_I_${inlineMath.length - 1}%%%`;
      });

      // 5. Chemical formulas with subscripts (e.g. H_2SO_4, CO_2, KMnO_4)
      str = str.replace(/\b((?:[A-Z][a-z]?)+(?:_\d+|\^\{?[+-]?\d+\}?)+(?:[A-Z][a-z]?(?:_\d+|\^\{?[+-]?\d+\}?)*)*)\b/g, (m) => {
        inlineMath.push(`\\mathrm{${m}}`);
        return `%%%EXAM_MD_I_${inlineMath.length - 1}%%%`;
      });

      // 6. Parse Markdown safely with marked (now LaTeX underscores/asterisks are protected!)
      let resHtml = '';
      if (typeof marked !== 'undefined' && marked.parse) {
        try {
          resHtml = marked.parse(str);
        } catch(e) {
          resHtml = str;
        }
      } else {
        resHtml = str
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-white/[0.06] font-mono text-xs">$1</code>')
          .replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
        if (resHtml.includes('<li>')) {
          resHtml = resHtml.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
        }
      }

      // 7. Restore Display Math
      resHtml = resHtml.replace(/%%%EXAM_MD_D_(\d+)%%%/g, (m, idx) => {
        const code = displayMath[parseInt(idx, 10)];
        if (!code) return m;
        return getRenderedKaTeX(code, true);
      });

      // 8. Restore Inline Math
      resHtml = resHtml.replace(/%%%EXAM_MD_I_(\d+)%%%/g, (m, idx) => {
        const code = inlineMath[parseInt(idx, 10)];
        if (!code) return m;
        return getRenderedKaTeX(code, false);
      });

      if (!isStreaming) return resHtml;

      const cursorHtml = '<span class="streaming-dot" aria-hidden="true"></span>';
      
      // Attach cursor right before the last closing text tag (p, li, td, h1-h6, span, strong) so it stays strictly inline!
      const match = resHtml.match(/<\/(?:p|li|td|h[1-6]|span|strong|div)>(?![\s\S]*<\/(?:p|li|td|h[1-6]|span|strong|div)>)/i);
      if (match && match.index !== undefined) {
        return resHtml.slice(0, match.index) + cursorHtml + resHtml.slice(match.index);
      }
      return resHtml + cursorHtml;
    }

    function renderFormattedContentWithCursor(rawText, isStreaming = false, extraBoardTag = null, extraAns = null, extraQuizData = null, extraQid = null, extraExamTitle = null, suppressLauncherCard = false) {
      if (!rawText) return "";
      
      // Clean up empty trailing table pipes
      let cleanText = rawText.replace(/\|\s*\|\s*$/gm, '|');
      let html = renderFormattedContent(cleanText, extraBoardTag, extraAns, extraQuizData, extraQid, extraExamTitle, suppressLauncherCard);
      if (!isStreaming) return html;

      // If the HTML contains exam-launcher-card, suppress trailing cursor to prevent layout jumping
      if (html.includes('exam-launcher-card')) {
        return html;
      }

      const cursorHtml = '<span class="streaming-dot" aria-hidden="true"></span>';
      
      // Attach cursor before the last closing text tag (p, li, td, h1-h6, span, strong, div)
      const match = html.match(/<\/(?:p|li|td|h[1-6]|span|strong|div)>(?![\s\S]*<\/(?:p|li|td|h[1-6]|span|strong|div)>)/i);
      if (match && match.index !== undefined) {
        return html.slice(0, match.index) + cursorHtml + html.slice(match.index);
      }
      return html + cursorHtml;
    }


    function scrollToBottom() {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = null;
        const el = document.getElementById('contentScrollArea');
        if (el) el.scrollTop = el.scrollHeight;
      });
    }

    // Auto-resize docked textarea
    const dockedInp = document.getElementById('dockedInput');
    if (dockedInp) {
      dockedInp.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      });
    }

    // Keyboard Shortcuts (Ctrl+K = New Chat, Exam shortcuts)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        resetToHome();
        return;
      }

      // Exam Mode Keyboard Shortcuts
      const examPage = document.getElementById('dedicatedExamPage');
      if (examPage && !examPage.classList.contains('hidden')) {
        // If typing in custom doubt input, don't hijack keys
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea') return;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateExamQuestion(1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateExamQuestion(-1);
        } else if (e.key === '1' || e.key.toLowerCase() === 'a') {
          e.preventDefault();
          selectExamOption('ক');
        } else if (e.key === '2' || e.key.toLowerCase() === 'b') {
          e.preventDefault();
          selectExamOption('খ');
        } else if (e.key === '3' || e.key.toLowerCase() === 'c') {
          e.preventDefault();
          selectExamOption('গ');
        } else if (e.key === '4' || e.key.toLowerCase() === 'd') {
          e.preventDefault();
          selectExamOption('ঘ');
        } else if (e.key === 'Escape') {
          e.preventDefault();
          confirmExitExam();
        }
      }
    });
  
    // Background Prewarm: Preheats API connection and eliminates 1st message cold-start latency

    function copyMessageText(contentId, btnEl) {
      const el = document.getElementById(contentId);
      if (!el) return;
      const text = el.innerText || el.textContent;
      navigator.clipboard.writeText(text).then(() => {
        if (btnEl) {
          const original = btnEl.innerHTML;
          btnEl.innerHTML = `<svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
          setTimeout(() => { btnEl.innerHTML = original; }, 1500);
        }
      }).catch(() => {});
    }

