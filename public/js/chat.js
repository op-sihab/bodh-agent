// BODH Chat Engine, Streaming Pipeline & Sequential Tool Execution
    function handleHeroSubmit(e) {
      e.preventDefault();
      const inp = document.getElementById('heroInput');
      const txt = inp.value.trim();
      if (!txt || isProcessing) return;
      activateChatView();
      sendMessage(txt);
      inp.value = '';
    }

    let currentAbortController = null;
    let currentStreamReader = null;

    function stopCurrentGeneration() {
      if (!isProcessing) return;
      if (currentAbortController) {
        try {
          currentAbortController.abort();
        } catch (e) {}
      }
      if (currentStreamReader) {
        try {
          currentStreamReader.cancel();
        } catch (e) {}
      }
      setSendButtonState(false);
    }

    function setSendButtonState(streaming) {
      const sendBtn = document.getElementById('sendBtn');
      if (!sendBtn) return;
      const sendIcon = sendBtn.querySelector('.send-icon');
      const stopIcon = sendBtn.querySelector('.stop-icon');

      if (streaming) {
        sendBtn.disabled = false;
        sendBtn.classList.remove('opacity-40');
        sendBtn.setAttribute('title', 'থামাও');
        sendBtn.setAttribute('aria-label', 'থামাও');
        if (sendIcon) sendIcon.classList.add('hidden');
        if (stopIcon) stopIcon.classList.remove('hidden');
      } else {
        sendBtn.disabled = false;
        sendBtn.classList.remove('opacity-40');
        sendBtn.setAttribute('title', 'পাঠাও');
        sendBtn.setAttribute('aria-label', 'পাঠাও');
        if (sendIcon) sendIcon.classList.remove('hidden');
        if (stopIcon) stopIcon.classList.add('hidden');
      }
    }

    function handleDockedSubmit(e) {
      if (e) e.preventDefault();
      if (isProcessing) {
        stopCurrentGeneration();
        return;
      }
      const inp = document.getElementById('dockedInput');
      const txt = inp.value.trim();
      if (!txt) return;
      activateChatView();
      sendMessage(txt);
      inp.value = '';
      inp.style.height = 'auto';
    }

    function submitPrompt(text) {
      if (isProcessing) return;
      activateChatView();
      sendMessage(text);
    }


    function handleOptionClick(btn, letter) {
      if (isProcessing) return;
      const cardWrapper = btn.closest('.mcq-wrapper');
      let correct = cardWrapper ? cardWrapper.getAttribute('data-correct') : null;
      if (correct) correct = correct.trim();

      const chosenNorm = normLetter(letter);
      const correctNorm = normLetter(correct);
      const isCorrect = Boolean(correctNorm && chosenNorm === correctNorm);

      const grid = btn.closest('.mcq-options-grid');
      if (grid) {
        grid.querySelectorAll('.mcq-opt').forEach(opt => {
          opt.classList.add('pointer-events-none');
          const optL = (opt.getAttribute('data-letter') || '').trim();
          const optLNorm = normLetter(optL);
          const badge = opt.querySelector('.opt-badge');

          if (correctNorm && optLNorm === correctNorm) {
            opt.classList.add('correct');
            if (badge) {
              badge.innerHTML = '<span class="text-emerald-400 text-sm font-bold">✓</span>';
              badge.classList.remove('hidden');
            }
          } else if (optLNorm === chosenNorm && !isCorrect) {
            opt.classList.add('wrong');
            if (badge) {
              badge.innerHTML = '<span class="text-rose-400 text-sm font-bold">✕</span>';
              badge.classList.remove('hidden');
            }
          } else {
            opt.classList.add('opacity-35');
          }
        });
      }

      // Save interactive selection in session snapshot
      const currSession = chatSessions.find(s => s.id === currentSessionId);
      if (currSession) {
        const areaEl = document.getElementById('messagesArea');
        if (areaEl) {
          const clone = areaEl.cloneNode(true);
          clone.querySelectorAll('.streaming-cursor, .thought-cursor, [id^="writingPulse_"]').forEach(el => el.remove());
          currSession.html = clone.innerHTML;
          saveSessions();
        }
      }

      // No redundant banner inside the card — the conversational tutor below gives the full explanation!
      const replyMsg = `আমার উত্তর (${letter})`;
      sendMessage(replyMsg);
    }


    function buildExamLoadingCardHtml(subject, board, year) {
      const subjDisplay = formatSubjectName(subject || currentSelectedSubject?.name || 'এসএসসি বিষয়');
      const bName = board || 'ঢাকা';
      const yr = year || '২০২৬';
      return `
        <div class="exam-launcher-loading my-3 p-4 sm:p-5 rounded-2xl bg-[#121216] border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.3)] select-none animate-pulse">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
                </svg>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-zinc-100 tracking-tight truncate">${escapeHtml(subjDisplay)}</h4>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium shrink-0">ডাটাবেস অনুসন্ধান</span>
                </div>
                <p class="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap font-normal">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                  <span>${escapeHtml(bName)} বোর্ড ${escapeHtml(yr)} পূর্ণাঙ্গ প্রশ্নপত্র প্রস্তুত হচ্ছে...</span>
                </p>
              </div>
            </div>
            <div class="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-zinc-400 text-xs font-mono shrink-0 flex items-center gap-1.5 hidden sm:flex">
              <svg class="w-3.5 h-3.5 text-indigo-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>প্রস্তুতি চলছে</span>
            </div>
          </div>
        </div>
      `;
    }

    function buildExamLauncherCardHtml(subject, chapter, total, questions) {
      const displaySubj = formatSubjectName(subject || currentSelectedSubject?.name || 'এসএসসি বিষয়');
      const totVal = total || (questions?.length ? questions.length : 25);
      const totBn = toBnDigits(totVal);
      const chStr = chapter || (questions && questions.length >= 15 ? `${displaySubj} পূর্ণাঙ্গ বোর্ড পরীক্ষা` : `${displaySubj} মূল্যায়ন পরীক্ষা`);
      const qJsonAttr = questions && questions.length > 0 ? `data-questions="${escapeHtml(JSON.stringify(questions))}"` : '';

      return `
        <div class="exam-launcher-card my-3.5 p-4 sm:p-5 rounded-2xl bg-[#121216] border border-white/[0.08] hover:border-white/[0.16] shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-200 select-none group"
          data-subject="${escapeHtml(displaySubj)}"
          data-chapter="${escapeHtml(chStr)}"
          data-total="${totVal}"
          ${qJsonAttr}>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3.5 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 shrink-0 group-hover:border-white/20 transition">
                <svg class="w-5 h-5 text-indigo-400/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-zinc-100 tracking-tight truncate">${escapeHtml(displaySubj)}</h4>
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.05] text-zinc-400 border border-white/[0.08] font-medium shrink-0">মক টেস্ট</span>
                </div>
                <p class="text-xs text-zinc-400 mt-1 flex items-center gap-1.5 flex-wrap font-normal">
                  <span>${escapeHtml(chStr)}</span>
                  <span class="text-zinc-600">•</span>
                  <span>${totBn}টি প্রশ্ন</span>
                  <span class="text-zinc-600">•</span>
                  <span>${totBn} মিনিট সময়</span>
                </p>
              </div>
            </div>
            <button type="button" onclick="startExamFromCard(this)" class="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs sm:text-[13px] shadow-sm active:scale-95 transition-all duration-150 cursor-pointer shrink-0 flex items-center justify-center gap-2">
              <span>পরীক্ষা শুরু করো</span>
              <svg class="w-3.5 h-3.5 text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/></svg>
            </button>
          </div>
        </div>
      `;
    }

    // Content Formatter (Markdown + KaTeX Math + Robust Multi-MCQ Extraction)

    function renderUserMessageBubble(text) {
      if (!text) return '';

      // 0. Socratic Hint or In-Exam Guidance Request
      if (text.includes("সোক্রেটিক হিন্ট চাই") || text.includes("কনসেপ্ট বিশ্লেষণ চাই")) {
        const qNumMatch = text.match(/প্রশ্ন\s*([০-৯0-9]+)/);
        const qNum = qNumMatch ? qNumMatch[1] : '';
        const isHint = text.includes("সোক্রেটিক হিন্ট");
        return `
          <div class="flex justify-end my-1.5 w-full">
            <div class="w-full sm:max-w-[78%] p-3.5 rounded-xl bg-[#121218] border border-indigo-500/25 shadow-md space-y-2 select-text">
              <div class="flex items-center justify-between text-[11px] text-indigo-300 font-mono pb-1 border-b border-white/[0.06]">
                <span class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  <span>${isHint ? 'কো-পাইলট সোক্রেটিক হিন্ট' : 'কো-পাইলট কনসেপ্ট গাইডেন্স'}</span>
                </span>
                <span>প্রশ্ন ${qNum}</span>
              </div>
              <p class="text-xs text-zinc-200 leading-relaxed font-sans">${escapeHtml(text.split('\n')[0])}</p>
            </div>
          </div>
        `;
      }

      // 1. Single MCQ Review Request from Modal or Scorecard
      if (text.includes("MCQ কনসেপ্ট বিশ্লেষণ") || text.includes("সঠিক উত্তর কেন") || text.includes("এই MCQ-তে আমার ভুল হয়েছিল")) {
        let stem = "";
        let options = [];
        let userAns = "";
        let correctAns = "";

        const stemMatch = text.match(/প্রশ্ন:\s*([^\n\r]+)/);
        if (stemMatch) stem = stemMatch[1].trim();

        const optLine = text.split('\n').find(l => /^\s*\([ক-ঘa-dA-D]\)/.test(l.trim()));
        if (optLine) {
          const optMatches = [...optLine.matchAll(/\(([ক-ঘa-dA-D])\)\s*([^(\n\r]+)/g)];
          options = optMatches.map(m => ({ letter: m[1], text: m[2].trim() }));
        }

        const userMatch = text.match(/(?:আমার উত্তর(?: ছিল)?:\s*(?:\()?([^\s,\)\n\r]+)(?:\)?))/);
        if (userMatch) userAns = userMatch[1].trim();

        const correctMatch = text.match(/(?:সঠিক উত্তর:\s*(?:\()?([^\s,\)\n\r]+)(?:\)?))/);
        if (correctMatch) correctAns = correctMatch[1].trim();

        return `
          <div class="flex justify-end my-2 w-full">
            <div class="w-full sm:max-w-[78%] p-4 sm:p-5 rounded-2xl bg-[#121216] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-3.5 select-text">
              <!-- Card Header Strip -->
              <div class="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300 shrink-0">
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </span>
                  <span class="text-xs font-medium text-zinc-200">MCQ কনসেপ্ট বিশ্লেষণ ও ডাউট রিভিউ</span>
                </div>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-400">একাডেমিক রিভিউ</span>
              </div>

              <!-- Question Body -->
              ${stem ? `
                <div class="space-y-1">
                  <div class="text-[11px] font-mono text-zinc-400">প্রশ্ন:</div>
                  <div class="text-xs sm:text-[13.5px] font-normal text-white leading-relaxed font-sans">
                    ${formatExamMath(stem)}
                  </div>
                </div>
              ` : ''}

              <!-- Options Grid (if parsed) -->
              ${options.length > 0 ? `
                <div class="grid grid-cols-2 gap-2 pt-0.5">
                  ${options.map(o => `
                    <div class="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs">
                      <span class="w-5 h-5 rounded bg-white/[0.04] text-zinc-300 font-mono text-[10px] flex items-center justify-center font-medium shrink-0 border border-white/[0.06]">(${o.letter})</span>
                      <span class="text-zinc-300 truncate">${formatExamMath(o.text)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- Answer Comparison Badges -->
              <div class="grid grid-cols-2 gap-2.5 pt-1">
                <div class="p-2.5 rounded-lg bg-rose-500/[0.06] border border-rose-500/20 flex flex-col">
                  <span class="text-[10px] font-mono text-rose-300">আমার উত্তর</span>
                  <span class="text-xs sm:text-[13px] font-semibold text-rose-400 mt-0.5">(${userAns || 'ভুল'})</span>
                </div>
                <div class="p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 flex flex-col">
                  <span class="text-[10px] font-mono text-emerald-300">সঠিক উত্তর</span>
                  <span class="text-xs sm:text-[13px] font-semibold text-emerald-400 mt-0.5">(${correctAns || 'ক'})</span>
                </div>
              </div>

              <!-- Student Request Prompt -->
              <div class="pt-2 border-t border-white/[0.06] flex items-center gap-2 text-xs text-zinc-300 font-normal leading-snug">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>সঠিক উত্তরের পেছনের মূল সূত্র বা কনসেপ্ট সংক্ষেপে পয়েন্ট আকারে বুঝিয়ে দাও।</span>
              </div>
            </div>
          </div>
        `;
      }

      // 2. Exam Completion Report / Multi-Question Mistake Clinic & Debrief Request
      if (text.includes("পরীক্ষা সমাপ্তি ও ফলাফল রিপোর্ট") || text.includes("মিস্টেক ক্লিনিক") || text.includes("পারফরম্যান্স অডিট") || text.includes("এই প্রশ্নগুলোতে আমার ভুল হয়েছিল") || text.includes("ভুল প্রশ্নাবলি")) {
        const lines = text.split('\n').filter(l => l.trim().startsWith('-'));
        const subjectLine = text.split('\n').find(l => l.startsWith('বিষয়:')) || '';
        const scoreLine = text.split('\n').find(l => l.includes('মোট প্রশ্ন:')) || '';
        const isExamFinish = text.includes("পরীক্ষা সমাপ্তি ও ফলাফল রিপোর্ট");

        return `
          <div class="flex justify-end my-2 w-full">
            <div class="exam-audit-card w-full sm:max-w-[78%] p-4 sm:p-5 rounded-2xl bg-[#121216] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-3 select-text">
              <div class="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5 cursor-pointer select-none group/audit" onclick="toggleExamAudit(this)" title="প্রশ্ন তালিকা দেখতে বা সংক্ষেপ করতে ক্লিক করুন">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-6 h-6 rounded-md ${lines.length > 0 ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'} flex items-center justify-center shrink-0">
                    ${lines.length > 0 ? `
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                      </svg>
                    ` : `
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                        <path d="M4 22h16"/>
                        <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-2c-.55 0-1-.45-1-1v-2.34"/>
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                      </svg>
                    `}
                  </span>
                  <span class="text-xs font-medium text-zinc-200 truncate">${escapeHtml(subjectLine.replace(/^বিষয়:\s*/, '') || (isExamFinish ? 'মক টেস্ট ফলাফল রিপোর্ট' : '১-অন-১ পারফরম্যান্স অডিট ও মিস্টেক ক্লিনিক'))}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-zinc-300 font-medium group-hover/audit:border-white/20 transition-colors">
                    ${lines.length > 0 ? `${toBnDigits(lines.length)}টি ভুল অডিট` : 'পূর্ণাঙ্গ সঠিক'}
                  </span>
                  ${lines.length > 0 ? `
                    <span class="p-0.5 text-zinc-400 group-hover/audit:text-zinc-200 transition">
                      <svg class="audit-chevron w-3.5 h-3.5 transition-transform duration-200" style="transform: rotate(-90deg);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </span>
                  ` : ''}
                </div>
              </div>
              ${scoreLine ? `
                <div class="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-zinc-300">
                  ${escapeHtml(scoreLine)}
                </div>
              ` : ''}
              ${lines.length > 0 ? `
                <div class="audit-collapsible collapsed space-y-1.5 text-xs text-zinc-400">
                  ${lines.map(l => `<div class="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] leading-relaxed text-[12px] font-sans hover:bg-white/[0.04] transition-colors">${escapeHtml(l.replace(/^-\s*/, ''))}</div>`).join('')}
                </div>
              ` : ''}
              <div class="pt-2 border-t border-white/[0.06] flex items-center gap-2 text-xs text-zinc-400 font-normal">
                <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>${lines.length > 0 ? 'ভুল হওয়া প্রশ্নগুলোর ১-অন-১ কনসেপ্ট ক্লিয়ারিং ও সমাধান অনুরোধ করা হয়েছে।' : 'সকল প্রশ্নের উত্তর সফলভাবে যাচাই সম্পন্ন হয়েছে।'}</span>
              </div>
            </div>
          </div>
        `;
      }

      // 3. Default Standard User Message
      return `
        <div class="flex justify-end my-1">
          <div class="bg-[#27272e] text-zinc-100 px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[72%] text-sm leading-relaxed border border-white/[0.06] shadow-sm font-normal tracking-wide select-text">
            ${escapeHtml(text)}
          </div>
        </div>
      `;
    }

    async function sendMessage(text) {
      if (currentUserCredits <= 0) {
        showCreditExhaustedChatBanner();
        return;
      }

      if (!currentSessionId) {
        currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newSession = {
          id: currentSessionId,
          title: generateSessionTitle(text),
          subject_id: currentSelectedSubject ? currentSelectedSubject.id : null,
          subject_name: currentSelectedSubject ? currentSelectedSubject.name : null,
          subject_icon: currentSelectedSubject ? currentSelectedSubject.icon : '📚',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          conversationHistory: [],
          state: {
            subject_id: currentSelectedSubject ? currentSelectedSubject.id : null,
            subject_name: currentSelectedSubject ? currentSelectedSubject.name : null
          },
          html: ''
        };
        chatSessions.unshift(newSession);
        saveSessions();
        renderRecentChats();
      } else {
        const idx = chatSessions.findIndex(s => s.id === currentSessionId);
        if (idx > 0) {
          const [sess] = chatSessions.splice(idx, 1);
          chatSessions.unshift(sess);
          saveSessions();
          renderRecentChats();
        }
      }

      const area = document.getElementById('messagesArea');

      // 1. User Message (Formatted with Premium Exam Card or Clean Chat Bubble)
      const userHtml = renderUserMessageBubble(text);
      area.insertAdjacentHTML('beforeend', userHtml);
      scrollToBottom();

      const msgId = 'msg_' + Date.now();
      const contentId = 'content_' + msgId;
      const statusId = 'status_' + msgId;
      const labelId = 'statusLabel_' + msgId;
      const toolContainerId = 'tool_' + msgId;
      const treeTitleId = 'treeTitle_' + msgId;
      const treeId = 'tree_' + msgId;

      // 2. Assistant Message Shell (Lightbulb Thinking Animation initially, Dotted Thought Tree starts HIDDEN)
      const assistantHtml = `
        <div id="${msgId}" class="w-full space-y-2 py-1 select-text">
          
          <!-- Exact Reference 1: Lightbulb Thinking Animation with Text Shimmer Beam -->
          <div id="${statusId}" class="flex items-center gap-2 text-sm text-zinc-400 select-none py-1 transition-all">
            <svg class="w-4 h-4 text-amber-400 shrink-0 thinking-bulb-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 2a7 7 0 00-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 002 2h4a2 2 0 002-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 00-7-7zM9 21h6"/>
            </svg>
            <span id="${labelId}" class="thinking-shimmer font-medium tracking-wide">গভীরভাবে বিশ্লেষণ করছি...</span>
          </div>

          <!-- Exact Reference 2: Dotted Thought Tree (Interactive Collapsible Toggle, starts HIDDEN) -->
          <div id="${toolContainerId}" class="hidden select-none py-0.5">
            <div class="thought-header flex items-center gap-2 text-xs sm:text-[13px] text-zinc-300 hover:text-white cursor-pointer py-1 transition group w-fit" onclick="toggleThoughtTree('${treeId}', this)">
              <svg class="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span id="${treeTitleId}" class="font-medium tracking-tight text-violet-200">একাডেমিক বিশ্লেষণ ও চিন্তাধারা</span>
              <svg class="thought-chevron w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>

            <!-- Dotted Connector Thread -->
            <div id="${treeId}" class="thought-tree pl-2.5 ml-2 border-l border-dashed border-violet-500/30 my-2 space-y-2 text-xs text-zinc-400"></div>
          </div>

          <!-- Content Container (Full Width Editorial Flow) -->
          <div id="${contentId}" class="markdown-body text-[14px] sm:text-[15px] leading-relaxed hidden min-h-[20px]">
            <div id="prose_${msgId}" class="message-prose space-y-2"></div>
            <div id="examSlot_${msgId}" class="message-exam-slot"></div>
          </div>

          <!-- Message Meta & Telemetry Strip -->
          <div id="meta_${msgId}" class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04] text-[11px] text-zinc-500 font-mono hidden select-none">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 text-zinc-400" title="রেসপন্স সময়">
                <svg class="w-3 h-3 text-amber-400/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4l2.5 2.5M10 2h4"/></svg>
                <span id="latency_${msgId}">--</span>
              </span>
              <span class="text-zinc-600">•</span>
              <span class="inline-flex items-center gap-1.5 text-zinc-400" title="টোটাল টোকেন">
                <svg class="w-3 h-3 text-indigo-400/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M8 12h8"/></svg>
                <span id="tokens_${msgId}">--</span>
              </span>
              <span class="text-zinc-600">•</span>
              <span class="inline-flex items-center gap-1.5 text-sky-400 font-medium" title="প্রকৃত খরচ (USD ও BDT)">
                <svg class="w-3 h-3 text-sky-400/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 6v12M15 9.5a2.5 2.5 0 0 0-5 0c0 3 5 2 5 5a2.5 2.5 0 0 1-5 0"/></svg>
                <span id="cost_${msgId}">--</span>
              </span>
              <span class="text-zinc-600">•</span>
              <span class="inline-flex items-center gap-1.5 text-emerald-400 font-medium" title="ব্যয়িত ক্রেডিট (১k টোকেনে ১ ক্রেডিট)">
                <svg class="w-3 h-3 text-emerald-400/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <span id="creditCost_${msgId}">--</span>
              </span>
              <span id="savings_${msgId}" class="hidden items-center gap-1 text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/25 text-[10px] font-medium" title="BODH ইন্টেলিজেন্ট রাউটার ও টুল কম্প্যাকশন সাশ্রয়">
                <svg class="w-2.5 h-2.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                <span id="savingsText_${msgId}">--</span>
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <button type="button" onclick="openMessageGatewayModal('${msgId}')" class="text-[11px] text-zinc-400 hover:text-indigo-300 bg-white/[0.03] hover:bg-indigo-500/10 px-2 py-0.5 rounded-md border border-white/[0.08] hover:border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer group" title="গেটওয়ে ব্রেকডাউন">
                <svg class="w-3 h-3 text-indigo-400/80 group-hover:text-indigo-400 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                <span>গেটওয়ে বিশ্লেষণ</span>
                <svg class="w-2.5 h-2.5 text-zinc-500 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
              </button>
              <button type="button" onclick="copyMessageText('${contentId}', this)" class="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-white/[0.06] rounded transition cursor-pointer" title="কপি করো">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              </button>
            </div>
          </div>

        </div>
      `;
      area.insertAdjacentHTML('beforeend', assistantHtml);
      scrollToBottom();

      isProcessing = true;
      currentAbortController = new AbortController();
      setSendButtonState(true);

      let streamContent = "";
      let hasTool = false;
      let step1Locked = false;
      let toolStartEvt = null;
      let toolDoneEvt = null;
      let currentTurnExamQuestions = null;
      let initialThoughtCaptured = "";
      let toolStepIndex = 0;
      let isExamRequisition = !/পরীক্ষা\s*সমাপ্তি|ফলাফল|মিস্টেক\s*ক্লিনিক|পারফরম্যান্স\s*অডিট|ভুল\s*হওয়া\s*প্রশ্নসমূহ/i.test(text) && (/মক|পরীক্ষা|exam|test|প্রশ্নপত্র|ফুল\s*প্রশ্ন|পূর্ণাঙ্গ/i.test(text));
      
      // Strict Sequential Execution Engine
      let isThinkingStreaming = false;
      let isToolExecutionDone = false;
      let pendingToolDone = null;
      let hasPendingGeneratingStart = false;
      let pendingDeltas = [];
      let pendingDone = null;

      function startSequentialExecution(startEvt, doneEvt, stepIdx) {
        step1Locked = true;
        streamContent = "";

        const statusEl = document.getElementById(statusId);
        if (statusEl) statusEl.classList.add('hidden');
        const toolContainer = document.getElementById(toolContainerId);
        if (toolContainer) toolContainer.classList.remove('hidden');

        const treeEl = document.getElementById(treeId);
        if (!treeEl) return;

        const startData = generateThoughtTreeData(startEvt.tool, startEvt.args, null, text);
        const initialIntent = startEvt.intent || initialThoughtCaptured || startData.intentReasoning || "শিক্ষার্থীর অনুরোধ ও পাঠ্যক্রম অনুযায়ী তথ্য অনুসন্ধানের সিদ্ধান্ত নেওয়া হয়েছে।";

        // Step 1: Ensure Think Node exists and starts typewriter streaming
        if (!document.getElementById(`step1_${msgId}`)) {
          treeEl.innerHTML = `
            <div class="thought-step" id="step1_${msgId}">
              <div class="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer font-medium" onclick="toggleSubStep(this)">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1"></span><span class="text-xs font-semibold text-violet-200 tracking-wide">শিক্ষকীয় চিন্তাধারা</span>
                <svg class="w-3 h-3 text-zinc-500 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </div>
              <div class="thought-sub-content pl-3 pt-1 text-[11.5px] text-zinc-400 leading-relaxed font-sans" id="step1Text_${msgId}"></div>
            </div>
          `;
          const step1TextEl = document.getElementById(`step1Text_${msgId}`);
          if (step1TextEl) {
            isThinkingStreaming = true;
            streamThinkingText(step1TextEl, initialIntent, 24, () => {
              isThinkingStreaming = false;
              proceedToToolPhase(startEvt, doneEvt, stepIdx);
            });
          } else {
            proceedToToolPhase(startEvt, doneEvt, stepIdx);
          }
        } else {
          // If thought was already streamed live
          proceedToToolPhase(startEvt, doneEvt, stepIdx);
        }
      }

      function proceedToToolPhase(startEvt, doneEvt, stepIdx) {
        const treeEl = document.getElementById(treeId);
        if (!treeEl) return;

        // Step 2: Show Tool Search Row with pulsating search badge
        if (!document.getElementById(`stepTool_${stepIdx}_${msgId}`)) {
          const startData = generateThoughtTreeData(startEvt.tool, startEvt.args, null, text);
          const toolStepHtml = `
            <div class="thought-step flex items-center gap-2 text-zinc-300 font-medium transition-all pt-1" id="stepTool_${stepIdx}_${msgId}">
              <svg class="w-3.5 h-3.5 text-zinc-400 shrink-0 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <span id="stepToolLabel_${stepIdx}_${msgId}">${escapeHtml(startEvt.label || startData.toolLabel)}</span>
              <span class="text-[11px] font-mono text-zinc-400 bg-white/[0.06] border-white/[0.08] animate-pulse px-1.5 py-0.5 rounded border" id="stepToolBadge_${stepIdx}_${msgId}">অনুসন্ধান চলছে...</span>
            </div>
          `;
          treeEl.insertAdjacentHTML('beforeend', toolStepHtml);
          scrollToBottom();
        }

        // Step 3: Hold search pulse for 350ms, then transition to verified badge
        setTimeout(() => {
          const targetDoneEvt = doneEvt || pendingToolDone || toolDoneEvt || startEvt;
          const doneData = generateThoughtTreeData(targetDoneEvt.tool, targetDoneEvt.args, targetDoneEvt.result, text);
          const stepToolBadge = document.getElementById(`stepToolBadge_${stepIdx}_${msgId}`);
          if (stepToolBadge) {
            stepToolBadge.className = "text-[11px] font-mono text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20";
            let countBadge = "";
            if (targetDoneEvt.tool === 'get_subject_chapters') {
              const tot = targetDoneEvt.result?.total_chapters || targetDoneEvt.result?.chapters?.length || (targetDoneEvt.result?.numbered_chapters ? targetDoneEvt.result.numbered_chapters.length : 0);
              countBadge = tot ? `✓ ${toBnDigits(tot)}টি অধ্যায়` : `✓ যাচাই সম্পন্ন`;
            } else {
              countBadge = doneData.countTag || "যাচাই সম্পন্ন";
            }
            stepToolBadge.innerText = countBadge;
          }
          const stepToolEl = document.getElementById(`stepTool_${stepIdx}_${msgId}`);
          if (stepToolEl) {
            const icon = stepToolEl.querySelector('svg');
            if (icon) icon.classList.remove('animate-pulse');
          }
          const titleEl = document.getElementById(treeTitleId);
          if (titleEl && (targetDoneEvt.title || doneData.mainTitle)) {
            titleEl.innerText = targetDoneEvt.title || doneData.mainTitle;
          }

          isToolExecutionDone = true;

          // Step 4: Show writing pulse and start streaming markdown deltas
          const contentEl = document.getElementById(contentId);
          const proseEl = document.getElementById(`prose_${msgId}`);
          if (contentEl) {
            contentEl.classList.remove('hidden');
            if (pendingDeltas.length === 0 && !pendingDone) {
              const targetEl = proseEl || contentEl;
              targetEl.innerHTML = `
                <div class="flex items-center gap-2 text-xs text-zinc-400 py-1.5 select-none" id="writingPulse_${msgId}">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
                  <span class="thinking-shimmer font-medium tracking-wide text-zinc-300">উত্তর সাজানো হচ্ছে...</span>
                </div>
              `;
            }
          }

          // Flush queued deltas
          if (pendingDeltas.length > 0) {
            streamContent += pendingDeltas.join('');
            pendingDeltas = [];
            scheduleStreamRender();
          }

          if (pendingDone) {
            handleFinalDone(pendingDone);
            pendingDone = null;
          }
        }, 60);
      }

      function extractToolExtras(toolEvt) {
        if (!toolEvt) return { boardTag: null, ans: null, quizData: null, qid: null, examTitle: null };
        const tool = toolEvt.tool;
        const res = toolEvt.result || {};
        const args = toolEvt.args || {};

        if (tool === 'get_mcq_quiz') {
          const q = res.quiz?.[0];
          return {
            boardTag: q?.all_board_tags || q?.formatted_source || (args?.board ? args.board + ' বোর্ড' : '') || null,
            ans: q?.answer || null,
            quizData: res.quiz || null,
            qid: q?.id || null,
            examTitle: res.topic || (args?.chapter ? `অধ্যায়: ${args.chapter}` : null)
          };
        } else if (tool === 'get_board_exam_questions') {
          const q = res.sample_mcq?.[0];
          const bName = res.board || args?.board_name || 'ঢাকা';
          const bYr = res.year || args?.year || '২০২৬';
          return {
            boardTag: res.board ? res.board + ' বোর্ড' : (args?.board_name ? args.board_name + ' বোর্ড' : null),
            ans: q?.answer || null,
            quizData: res.sample_mcq || null,
            qid: q?.id || null,
            examTitle: `${bName} বোর্ড ${bYr} পূর্ণাঙ্গ প্রশ্নপত্র`
          };
        } else if (tool === 'find_similar_type_questions') {
          const q = res.similar_type_questions?.[0] || res.seed_question;
          return {
            boardTag: q?.board || q?.raw_tag || null,
            ans: q?.answer || null,
            quizData: res.similar_type_questions || null,
            qid: q?.id || null,
            examTitle: null
          };
        } else if (tool === 'get_creative_question') {
          return {
            boardTag: res.board_tag || res.formatted_source || res.raw_tag || null,
            ans: null,
            quizData: null,
            qid: res.id || null,
            examTitle: null
          };
        }
        return { boardTag: null, ans: null, quizData: null, qid: null, examTitle: null };
      }

      let renderRafId = null;
      let targetAnswer = "";
      let displayedAnswer = "";
      let smoothStreamRaf = null;
      let lastRenderedAnswer = "";
      let pendingFinalData = null;
      let lastStreamTimestamp = 0;

      function pushStreamText(newFullText) {
        if (!newFullText) return;
        targetAnswer = newFullText;
        if (!smoothStreamRaf) {
          lastStreamTimestamp = performance.now();
          smoothStreamRaf = requestAnimationFrame(smoothStreamTick);
        }
      }

      function smoothStreamTick(timestamp) {
        if (!timestamp) timestamp = performance.now();
        const diff = targetAnswer.length - displayedAnswer.length;

        if (diff > 0) {
          const elapsed = timestamp - lastStreamTimestamp;
          
          // Ultra-responsive high-framerate streaming engine (60fps adaptive flow):
          // If server finished (pendingFinalData), briskly glide to finish in ~150ms!
          // While streaming, maintain natural brisk 120-240 chars/sec speed so it feels instant and alive!
          const isFinishing = Boolean(pendingFinalData);
          const minInterval = isFinishing ? 8 : (diff > 120 ? 10 : 16);

          if (elapsed >= minInterval) {
            lastStreamTimestamp = timestamp;

            let step = Math.max(4, Math.ceil(diff / 3));
            if (isFinishing || diff > 40) {
              step = Math.max(8, Math.ceil(diff / 2));
            }

            displayedAnswer = targetAnswer.slice(0, displayedAnswer.length + step);

            if (displayedAnswer !== lastRenderedAnswer) {
              lastRenderedAnswer = displayedAnswer;
              renderAnswerToDom(displayedAnswer, true);
            }
          }

          smoothStreamRaf = requestAnimationFrame(smoothStreamTick);
        } else {
          smoothStreamRaf = null;
          lastStreamTimestamp = 0;
          if (pendingFinalData) {
            const d = pendingFinalData;
            pendingFinalData = null;
            applyFinalDone(d);
          }
        }
      }

      function renderAnswerToDom(textToRender, isStreaming) {
        if (!textToRender) return;
        const contentEl = document.getElementById(contentId);
        const proseEl = document.getElementById(`prose_${msgId}`);
        if (contentEl) {
          contentEl.classList.remove('hidden');
          const wp = document.getElementById(`writingPulse_${msgId}`);
          if (wp) wp.remove();
          // Purge any thought cursor instantly when answer begins rendering so only 1 dot exists
          document.querySelectorAll(`#step1Text_${msgId} .thought-cursor, .thought-cursor`).forEach(el => el.remove());
          const extras = extractToolExtras(toolDoneEvt);
          const targetEl = proseEl || contentEl;
          targetEl.innerHTML = renderFormattedContentWithCursor(textToRender, isStreaming, extras.boardTag, extras.ans, extras.quizData, extras.qid, extras.examTitle, true);
        }
        scrollToBottom();
      }

      function scheduleStreamRender() {
        if (renderRafId) return;
        renderRafId = requestAnimationFrame(() => {
          renderRafId = null;
          performStreamRender();
        });
      }

      function performStreamRender() {
        if (!step1Locked) {
          const parsed = parseStreamThoughts(streamContent);

          if (parsed.hasThought) {
            const statusEl = document.getElementById(statusId);
            if (statusEl) statusEl.classList.add('hidden');

            const toolContainer = document.getElementById(toolContainerId);
            if (toolContainer) toolContainer.classList.remove('hidden');

            const treeEl = document.getElementById(treeId);
            if (treeEl && !document.getElementById(`step1_${msgId}`)) {
              treeEl.innerHTML = `
                <div class="thought-step" id="step1_${msgId}">
                  <div class="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer font-medium" onclick="toggleSubStep(this)">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1"></span><span class="text-xs font-semibold text-violet-200 tracking-wide">শিক্ষকীয় চিন্তাধারা</span>
                    <svg class="w-3 h-3 text-zinc-500 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                  </div>
                  <div class="thought-sub-content pl-3 pt-1 text-[11.5px] text-zinc-400 leading-relaxed font-sans" id="step1Text_${msgId}"></div>
                </div>
              `;
            }

            const step1TextEl = document.getElementById(`step1Text_${msgId}`);
            if (step1TextEl && parsed.thought) {
              initialThoughtCaptured = parsed.thought;
              const showThoughtDot = parsed.inProgress && !parsed.answer;
              step1TextEl.innerHTML = renderThoughtFormattedHtml(parsed.thought, showThoughtDot);
            }

            const answerText = parsed.answer;
            if (answerText) {
              document.querySelectorAll(`#step1Text_${msgId} .thought-cursor, .thought-cursor`).forEach(el => el.remove());
              pushStreamText(answerText);
            }
          } else if (!parsed.inProgress && streamContent.trim()) {
            const statusEl = document.getElementById(statusId);
            if (statusEl) statusEl.classList.add('hidden');

            document.querySelectorAll(`#step1Text_${msgId} .thought-cursor, .thought-cursor`).forEach(el => el.remove());
            pushStreamText(streamContent);
          }
        } else {
          // STEP 2: Tool has already executed -> clean answer tokens stream directly and smoothly!
          let cleanAnswer = streamContent
            .replace(/^<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>[\s\S]*?<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi, '')
            .replace(/^<\/?[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi, '')
            .trimStart();
          
          if (cleanAnswer) {
            pushStreamText(cleanAnswer);
          }
        }
      }

      function parseStreamThoughts(raw) {
        if (!raw) return { hasThought: false, inProgress: false, thought: '', answer: '' };

        // Match closed thought tags <thought>...</thought>
        const thoughtRegex = /<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>([\s\S]*?)<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi;
        const allThoughts = [];
        let lastClosedEnd = 0;
        let m;
        while ((m = thoughtRegex.exec(raw)) !== null) {
          allThoughts.push(m[1].trim());
          lastClosedEnd = m.index + m[0].length;
        }

        let remaining = raw.slice(lastClosedEnd);
        const inProgressOpen = remaining.match(/<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/i);
        if (inProgressOpen) {
          const inProgressText = remaining.slice(inProgressOpen.index + inProgressOpen[0].length).trimStart();
          const combinedThought = allThoughts.concat([inProgressText]).filter(Boolean).join(' ');
          const preAnswer = remaining.slice(0, inProgressOpen.index).trimStart();
          return { hasThought: true, inProgress: true, thought: combinedThought, answer: preAnswer };
        }

        if (/^<\/?\s*(?:th?o?u?g?h?t?|th?i?n?k?i?n?g?|চি?ন?্ত?া?|ভা?ব?ন?া?|স্?ট?য?া?ট?া?স?|st?a?t?u?s?)[^>]*$/i.test(remaining.trim())) {
          return { hasThought: true, inProgress: true, thought: allThoughts.join(' '), answer: '' };
        }

        if (allThoughts.length > 0) {
          const cleanedRemaining = remaining.replace(/^<\/?(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/i, '').trimStart();
          return { hasThought: true, inProgress: false, thought: allThoughts.join(' '), answer: cleanedRemaining };
        }

        return { hasThought: false, inProgress: false, thought: '', answer: raw };
      }

      function handleFinalDone(data) {
        if (renderRafId) {
          cancelAnimationFrame(renderRafId);
          renderRafId = null;
        }

        const final = data?.content || streamContent;
        const parsed = parseStreamThoughts(final);
        let cleanFinal = parsed.hasThought ? parsed.answer : final;

        cleanFinal = cleanFinal
          .replace(/^<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>[\s\S]*?<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi, '')
          .replace(/^<\/?[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi, '')
          .trim();

        if (cleanFinal) {
          targetAnswer = cleanFinal;
        }

        const statusEl = document.getElementById(statusId);
        if (statusEl) statusEl.classList.add('hidden');

        const cur1 = document.querySelector(`#step1Text_${msgId} .thought-cursor`);
        if (cur1) cur1.remove();

        const wp = document.getElementById(`writingPulse_${msgId}`);
        if (wp) wp.remove();

        // If smooth stream typing is still in progress, let it glide smoothly to the very end!
        if (smoothStreamRaf && displayedAnswer.length < targetAnswer.length) {
          pendingFinalData = data;
          return;
        }

        applyFinalDone(data);
      }

      function applyFinalDone(data) {
        if (smoothStreamRaf) {
          cancelAnimationFrame(smoothStreamRaf);
          smoothStreamRaf = null;
        }
        pendingFinalData = null;

        const final = data?.content || streamContent;
        const parsed = parseStreamThoughts(final);
        let cleanFinal = parsed.hasThought ? parsed.answer : final;

        cleanFinal = cleanFinal
          .replace(/^<[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>[\s\S]*?<[\s]*\/[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi, '')
          .replace(/^<\/?[\s]*(?:thought|thinking|চিন্তা|ভাবনা|স্ট্যাটাস|status)[\s]*>/gi, '')
          .trim();

        const statusEl = document.getElementById(statusId);
        if (statusEl) statusEl.classList.add('hidden');

        const cur1 = document.querySelector(`#step1Text_${msgId} .thought-cursor`);
        if (cur1) cur1.remove();

        const wp = document.getElementById(`writingPulse_${msgId}`);
        if (wp) wp.remove();

        const contentEl = document.getElementById(contentId);
        const proseEl = document.getElementById(`prose_${msgId}`);
        if (contentEl) {
          contentEl.classList.remove('hidden');
          const extras = extractToolExtras(toolDoneEvt);
          const targetEl = proseEl || contentEl;
          if (cleanFinal) {
            targetEl.innerHTML = renderFormattedContentWithCursor(cleanFinal, false, extras.boardTag, extras.ans, extras.quizData, extras.qid, extras.examTitle, true);
          }
          // Thoroughly purge any residual cursors
          targetEl.querySelectorAll('.streaming-dot, .streaming-cursor, .thought-cursor').forEach(el => el.remove());
        }

        // Step 5: Mount Exam Launcher Card at the VERY BOTTOM (strictly LAST!), once text is 100% complete
        const isAuditText = /পরীক্ষা\s*সমাপ্তি|ফলাফল|মিস্টেক\s*ক্লিনিক|পারফরম্যান্স\s*অডিট|ভুল\s*হওয়া\s*প্রশ্নসমূহ/i.test(text);
        const examSlotEl = document.getElementById(`examSlot_${msgId}`);
        if (examSlotEl) {
          const targetEvt = toolDoneEvt || toolStartEvt;
          const extras = extractToolExtras(targetEvt);
          const rawFullText = final || cleanFinal || '';
          const hasLauncherTag = /\[exam_launcher:/i.test(rawFullText) || /%%%EXAM_LAUNCHER_PLACEHOLDER%%%/i.test(rawFullText);
          const hasTurnQuestions = currentTurnExamQuestions && Array.isArray(currentTurnExamQuestions) && currentTurnExamQuestions.length >= 2;
          const isExamTool = targetEvt && (targetEvt.tool === 'get_board_exam_questions' || (targetEvt.tool === 'get_mcq_quiz' && hasTurnQuestions));

          // STRICT CONDITION: Only mount the exam card if THIS specific turn either:
          // 1. Has [exam_launcher: ...] in the response, OR
          // 2. Executed a board exam or multi-MCQ quiz tool in this turn, OR
          // 3. The student's prompt specifically asked for an exam/test AND questions were returned in this turn.
          const shouldMountExamCard = !isAuditText && (hasLauncherTag || isExamTool || (isExamRequisition && hasTurnQuestions));

          if (shouldMountExamCard) {
            const qListToEmbed = hasTurnQuestions
              ? currentTurnExamQuestions
              : (extras.quizData && Array.isArray(extras.quizData) && extras.quizData.length >= 2 ? extras.quizData : null);

            let launcherData = null;
            const match = rawFullText.match(/\[exam_launcher:\s*(\{[\s\S]*?\}|[\d০-৯]+)\]/i);
            if (match && match[1]) {
              try {
                const trimmed = match[1].trim();
                if (trimmed.startsWith('{')) launcherData = JSON.parse(trimmed);
                else launcherData = { total: parseInt(trimmed) || 5 };
              } catch (e) {}
            }

            const rawSubj = launcherData?.subject || targetEvt?.result?.subject || targetEvt?.args?.subject || currentSelectedSubject?.name || 'এসএসসি বিষয়';
            const chStr = launcherData?.chapter || extras.examTitle || (targetEvt?.args?.board ? `${targetEvt.args.board} বোর্ড পূর্ণাঙ্গ প্রশ্নপত্র` : null);
            const totVal = launcherData?.total || qListToEmbed?.length || 25;

            examSlotEl.innerHTML = buildExamLauncherCardHtml(
              rawSubj,
              chStr,
              totVal,
              qListToEmbed
            );
            scrollToBottom();
          } else {
            examSlotEl.innerHTML = '';
          }
        }

        // Render Message Telemetry Meta Bar
        const gw = data?.gatewayTelemetry;
        const metaEl = document.getElementById(`meta_${msgId}`);
        if (gw && metaEl) {
          metaEl.classList.remove('hidden');

          const latEl = document.getElementById(`latency_${msgId}`);
          if (latEl && data.latencyMs) {
            latEl.innerText = `${toBnDigits((data.latencyMs / 1000).toFixed(1))}s`;
          }

          const tokEl = document.getElementById(`tokens_${msgId}`);
          if (tokEl) {
            const totTokens = gw.total_tokens || (gw.input_tokens + gw.output_tokens);
            tokEl.innerText = `${toBnDigits(totTokens)} টোকেন`;
          }

          const costEl = document.getElementById(`cost_${msgId}`);
          if (costEl) {
            costEl.innerText = `${gw.cost_formatted_usd} (${gw.cost_formatted_bdt})`;
          }

          const credEl = document.getElementById(`creditCost_${msgId}`);
          const cred = data?.credits || data?.creditTelemetry;
          if (credEl && cred) {
            credEl.innerText = `-${toBnDigits(cred.deducted)} ক্রেডিট`;
          }
          if (cred && typeof cred.remainingCredits === 'number') {
            updateHeaderCreditDisplay(cred.remainingCredits, cred.totalCredits);
          }

          const savEl = document.getElementById(`savings_${msgId}`);
          const savTextEl = document.getElementById(`savingsText_${msgId}`);
          if (savEl && gw.savings_percent > 0) {
            if (savTextEl) {
              savTextEl.innerText = `${toBnDigits(gw.savings_percent)}% সাশ্রয়`;
            } else {
              savEl.innerText = `${toBnDigits(gw.savings_percent)}% সাশ্রয়`;
            }
            savEl.classList.remove('hidden');
            savEl.classList.add('inline-flex');
          }

          // Store for details modal
          msgGatewayTelemetryMap[msgId] = {
            gateway: gw,
            latencyMs: data.latencyMs,
            ttft: data.ttft
          };

          // Update header live cost
          refreshGatewayHeaderStats();
        }

        conversationHistory.push({ role: "user", content: text });
        conversationHistory.push({ role: "assistant", content: cleanFinal });

        const currSession = chatSessions.find(s => s.id === currentSessionId);
        if (currSession) {
          if (data?.state?.subject_id) {
            const found = SUBJECTS_LIST.find(s => s.id === data.state.subject_id);
            if (found) {
              currentSelectedSubject = found;
              updateActiveSubjectBadge();
            }
          }
          if (currSession) {
            currSession.updatedAt = Date.now();
            if (data?.state) {
              currSession.state = data.state;
              if (data.state.subject_id) {
                currSession.subject_id = data.state.subject_id;
                if (data.state.subject_name) currSession.subject_name = data.state.subject_name;
              }
            }
          }
          currSession.conversationHistory = JSON.parse(JSON.stringify(conversationHistory));
          const areaEl = document.getElementById('messagesArea');
          if (areaEl) {
            const clone = areaEl.cloneNode(true);
            clone.querySelectorAll('.streaming-dot, .streaming-cursor, .thought-cursor, [id^="writingPulse_"]').forEach(el => el.remove());
            currSession.html = clone.innerHTML;
          }
          saveSessions();
          renderRecentChats();
        }
        scrollToBottom();
      }

      try {
        const currSession = chatSessions.find(s => s.id === currentSessionId);
        const sessionSubj = currSession?.subject_id || (currentSelectedSubject ? currentSelectedSubject.id : null);
        const sessionSubjName = currSession?.subject_name || (currentSelectedSubject ? currentSelectedSubject.name : null);
        
        const payloadState = {
          ...(currSession ? currSession.state : {}),
          subject_id: sessionSubj,
          subject_name: sessionSubjName
        };

        const res = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            history: conversationHistory,
            state: payloadState
          }),
          signal: currentAbortController ? currentAbortController.signal : undefined
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const reader = res.body.getReader();
        currentStreamReader = reader;
        const decoder = new TextDecoder('utf-8');
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) handleSseChunk(buffer);
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop();
          for (const p of parts) handleSseChunk(p);
        }

        function handleSseChunk(chunk) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const raw = trimmed.replace(/^data:\s*/, "").trim();
            if (!raw) continue;

            try {
              const data = JSON.parse(raw);

              if (data.type === "credit_exhausted") {
                const cur1 = document.querySelector(`#step1Text_${msgId} .thought-cursor`);
                if (cur1) cur1.remove();
                const wp = document.getElementById(`writingPulse_${msgId}`);
                if (wp) wp.remove();
                const statusEl = document.getElementById(statusId);
                if (statusEl) statusEl.classList.add('hidden');
                updateHeaderCreditDisplay(0, 500);

                const contentEl = document.getElementById(contentId);
                if (contentEl) {
                  contentEl.classList.remove('hidden');
                  contentEl.innerHTML = `
                    <div class="my-3 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-500/[0.12] via-[#1a1215] to-[#121218] border border-rose-500/30 shadow-[0_4px_24px_rgba(244,63,94,0.15)] select-none animate-fadeIn">
                      <div class="flex items-start gap-3.5">
                        <div class="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 shadow-sm">
                          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="5" width="20" height="14" rx="2"/>
                            <line x1="2" y1="10" x2="22" y2="10"/>
                            <line x1="6" y1="14" x2="6.01" y2="14"/>
                            <line x1="10" y1="14" x2="14" y2="14"/>
                          </svg>
                        </div>
                        <div class="min-w-0 flex-1 space-y-2">
                          <div class="flex items-center gap-2">
                            <h3 class="text-sm sm:text-base font-bold text-rose-200 tracking-tight">আপনার ক্রেডিট শেষ হয়ে গেছে!</h3>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">০ ক্রেডিট অবশিষ্ট</span>
                          </div>
                          <p class="text-xs text-zinc-300 leading-relaxed font-sans">
                            আপনি আপনার ৫০০টি ডেমো ক্রেডিট সম্পূর্ণ ব্যবহার করেছেন (প্রতি ১,০০০ টোকেনে ১ ক্রেডিট হারে)। আর কোনো প্রশ্ন করতে বা মক টেস্ট চালাতে অনুগ্রহ করে ডেমো ক্রেডিট রিচার্জ করুন।
                          </p>
                          <div class="pt-1.5 flex items-center gap-2.5">
                            <button type="button" onclick="resetUserDemoCredits()" class="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2">
                              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                              <span>ডেমো ক্রেডিট রিচার্জ করুন (+৫০০ ক্রেডিট)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  `;
                }
                scrollToBottom();
                return;
              }

              if (data.type === "error") {
                console.error("[SSE Error]", data.error);
                const cur1 = document.querySelector(`#step1Text_${msgId} .thought-cursor`);
                if (cur1) cur1.remove();
                const wp = document.getElementById(`writingPulse_${msgId}`);
                if (wp) wp.remove();
                const contentEl = document.getElementById(contentId);
                if (contentEl) {
                  contentEl.classList.remove('hidden');
                  contentEl.innerHTML = `<span class="text-rose-400 font-mono text-xs">ত্রুটি: ${escapeHtml(data.error || 'অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।')}</span>`;
                }
                scrollToBottom();
                return;
              }

              if (data.type === "state_sync" && data.state) {
                if (data.state.subject_id) {
                  const found = SUBJECTS_LIST.find(s => s.id === data.state.subject_id);
                  if (found) {
                    currentSelectedSubject = found;
                    updateActiveSubjectBadge();
                  }
                }
                const currSession = chatSessions.find(s => s.id === currentSessionId);
                if (currSession) {
                  currSession.state = data.state;
                  if (data.state.subject_id) {
                    currSession.subject_id = data.state.subject_id;
                    if (data.state.subject_name) currSession.subject_name = data.state.subject_name;
                  }
                  saveSessions();
                }
              }

              if (data.type === "thought_delta") {
                const statusEl = document.getElementById(statusId);
                if (statusEl) statusEl.classList.add('hidden');

                const toolContainer = document.getElementById(toolContainerId);
                if (toolContainer) toolContainer.classList.remove('hidden');

                const treeEl = document.getElementById(treeId);
                if (treeEl && !document.getElementById(`step1_${msgId}`)) {
                  treeEl.innerHTML = `
                    <div class="thought-step" id="step1_${msgId}">
                      <div class="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer font-medium" onclick="toggleSubStep(this)">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1"></span><span class="text-xs font-semibold text-violet-200 tracking-wide">শিক্ষকীয় চিন্তাধারা</span>
                        <svg class="w-3 h-3 text-zinc-500 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                      </div>
                      <div class="thought-sub-content pl-3 pt-1 text-[11.5px] text-zinc-400 leading-relaxed font-sans" id="step1Text_${msgId}"></div>
                    </div>
                  `;
                }

                const step1TextEl = document.getElementById(`step1Text_${msgId}`);
                if (step1TextEl && data.thought) {
                  initialThoughtCaptured = data.thought;
                  step1TextEl.innerHTML = renderThoughtFormattedHtml(data.thought, true);
                }
              }

              if (data.type === "thought_done") {
                const statusEl = document.getElementById(statusId);
                if (statusEl) statusEl.classList.add('hidden');

                const toolContainer = document.getElementById(toolContainerId);
                if (toolContainer) toolContainer.classList.remove('hidden');

                const treeEl = document.getElementById(treeId);
                if (treeEl && !document.getElementById(`step1_${msgId}`)) {
                  treeEl.innerHTML = `
                    <div class="thought-step" id="step1_${msgId}">
                      <div class="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer font-medium" onclick="toggleSubStep(this)">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mr-1"></span><span class="text-xs font-semibold text-violet-200 tracking-wide">শিক্ষকীয় চিন্তাধারা</span>
                        <svg class="w-3 h-3 text-zinc-500 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
                      </div>
                      <div class="thought-sub-content pl-3 pt-1 text-[11.5px] text-zinc-400 leading-relaxed font-sans" id="step1Text_${msgId}"></div>
                    </div>
                  `;
                }

                const step1TextEl = document.getElementById(`step1Text_${msgId}`);
                if (step1TextEl && data.thought) {
                  initialThoughtCaptured = data.thought;
                  step1TextEl.innerHTML = renderThoughtFormattedHtml(data.thought, false);
                }
                const cur1 = document.querySelector(`#step1Text_${msgId} .thought-cursor`);
                if (cur1) cur1.remove();
              }

              // 1. Tool Start -> Initiate Strict Sequential Pipeline
              if (data.type === "tool_start") {
                toolStepIndex++;
                streamContent = "";
                const contentEl = document.getElementById(contentId);
                const isAuditText = /পরীক্ষা\s*সমাপ্তি|ফলাফল|মিস্টেক\s*ক্লিনিক|পারফরম্যান্স\s*অডিট|ভুল\s*হওয়া\s*প্রশ্নসমূহ/i.test(text);
                if (!isAuditText && (data.tool === "get_board_exam_questions" || (data.tool === "get_mcq_quiz" && (data.args?.count >= 3 || /মক|পরীক্ষা|exam|test|সব|full/i.test(text))))) {
                  isExamRequisition = true;
                }
                if (contentEl) {
                  contentEl.classList.add('hidden');
                }
                toolStartEvt = data;
                hasTool = true;

                const titleEl = document.getElementById(treeTitleId);
                const startData = generateThoughtTreeData(data.tool, data.args, null, text);
                if (titleEl && startData.mainTitle) titleEl.innerText = startData.mainTitle;

                startSequentialExecution(data, null, toolStepIndex);
              }

              // 2. Tool Done -> Buffer or update
              if (data.type === "tool_done") {
                toolDoneEvt = data;
                hasTool = true;
                pendingToolDone = data;
                if (data.tool === "get_mcq_quiz" && data.result?.quiz && Array.isArray(data.result.quiz) && data.result.quiz.length > 0) {
                  currentTurnExamQuestions = data.result.quiz;
                  globalActiveExamQuestions = data.result.quiz;
                }
                if (data.tool === "get_board_exam_questions" && data.result?.sample_mcq && Array.isArray(data.result.sample_mcq) && data.result.sample_mcq.length > 0) {
                  currentTurnExamQuestions = data.result.sample_mcq;
                  globalActiveExamQuestions = data.result.sample_mcq;
                }
              }

              // 2b. Generating Start -> Flag or show writing pulse
              if (data.type === "generating_start") {
                hasPendingGeneratingStart = true;
                if (!isThinkingStreaming && isToolExecutionDone) {
                  const contentEl = document.getElementById(contentId);
                  const proseEl = document.getElementById(`prose_${msgId}`);
                  if (contentEl && (!proseEl || !proseEl.innerHTML.trim())) {
                    contentEl.classList.remove('hidden');
                    const targetEl = proseEl || contentEl;
                    targetEl.innerHTML = `
                      <div class="flex items-center gap-2 text-xs text-zinc-400 py-1.5 select-none" id="writingPulse_${msgId}">
                        <span class="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
                        <span class="thinking-shimmer font-medium tracking-wide text-zinc-300">উত্তর সাজানো হচ্ছে...</span>
                      </div>
                    `;
                    scrollToBottom();
                  }
                }
              }

              // 3. Content Delta -> Stream immediately to UI without artificial blocking
              if (data.type === "content_delta" && data.delta) {
                if (isThinkingStreaming) {
                  isThinkingStreaming = false;
                  const step1El = document.getElementById(`step1Text_${msgId}`);
                  if (step1El && typeof step1El._finishThinking === "function") step1El._finishThinking();
                }
                isToolExecutionDone = true;
                if (pendingDeltas.length > 0) {
                  streamContent += pendingDeltas.join("");
                  pendingDeltas = [];
                }
                streamContent += data.delta;
                scheduleStreamRender();
              }

              // 4. Done Event -> Buffer or handle final crisp render
              if (data.type === "done") {
                if (hasTool && (!isToolExecutionDone || isThinkingStreaming)) {
                  pendingDone = data;
                } else {
                  handleFinalDone(data);
                }
              }
            } catch (e) {
              console.error("[SSE Parse Error]", e, raw);
            }
          }
        }

      } catch (err) {
        const contentEl = document.getElementById(contentId);
        const statusEl = document.getElementById(statusId);
        if (statusEl) statusEl.classList.add('hidden');
        if (renderRafId) { cancelAnimationFrame(renderRafId); renderRafId = null; }
        if (smoothStreamRaf) { cancelAnimationFrame(smoothStreamRaf); smoothStreamRaf = null; }
        if (err.name === 'AbortError' || err.name === 'DOMException') {
          // User halted generation via Stop button
          const wp = document.getElementById(`writingPulse_${msgId}`);
          if (wp) wp.remove();
          const cur1 = document.querySelector(`#step1Text_${msgId} .thought-cursor`);
          if (cur1) cur1.remove();
          if (contentEl) {
            contentEl.classList.remove('hidden');
            contentEl.querySelectorAll('.streaming-dot, .streaming-cursor, .thought-cursor').forEach(el => el.remove());
          }
          const metaEl = document.getElementById(`meta_${msgId}`);
          if (metaEl) metaEl.classList.remove('hidden');

          const isAuditText = /পরীক্ষা\s*সমাপ্তি|ফলাফল|মিস্টেক\s*ক্লিনিক|পারফরম্যান্স\s*অডিট|ভুল\s*হওয়া\s*প্রশ্নসমূহ/i.test(text);
          const examSlotEl = document.getElementById(`examSlot_${msgId}`);
          const hasTurnQuestions = currentTurnExamQuestions && Array.isArray(currentTurnExamQuestions) && currentTurnExamQuestions.length >= 2;
          const isExamTool = (toolDoneEvt || toolStartEvt) && ((toolDoneEvt || toolStartEvt).tool === 'get_board_exam_questions' || ((toolDoneEvt || toolStartEvt).tool === 'get_mcq_quiz' && hasTurnQuestions));
          const shouldMountExamCard = !isAuditText && (isExamTool || (isExamRequisition && hasTurnQuestions));

          if (shouldMountExamCard && examSlotEl) {
            const targetEvt = toolDoneEvt || toolStartEvt;
            const extras = extractToolExtras(targetEvt);
            const rawSubj = targetEvt?.result?.subject || targetEvt?.args?.subject || currentSelectedSubject?.name || 'এসএসসি বিষয়';
            const chStr = extras.examTitle || (targetEvt?.args?.board ? `${targetEvt.args.board} বোর্ড পূর্ণাঙ্গ প্রশ্নপত্র` : null);
            examSlotEl.innerHTML = buildExamLauncherCardHtml(
              rawSubj,
              chStr,
              currentTurnExamQuestions.length,
              currentTurnExamQuestions
            );
          } else if (examSlotEl) {
            examSlotEl.innerHTML = '';
          }
        } else if (contentEl) {
          contentEl.classList.remove('hidden');
          contentEl.innerHTML = `<span class="text-rose-400 font-mono text-xs">ত্রুটি: ${escapeHtml(err.message)}</span>`;
        }
      } finally {
        isProcessing = false;
        currentAbortController = null;
        currentStreamReader = null;
        setSendButtonState(false);
      }
    }

    let scrollRaf = null;

    function triggerPrewarm() {
      try {
        fetch('/api/chat/prewarm', { method: 'POST' }).catch(() => {});
      } catch(e) {}
    }
    setTimeout(triggerPrewarm, 100);

    const hInp = document.getElementById('heroInput');
    if (hInp) hInp.addEventListener('focus', triggerPrewarm, { once: true });
    const dInp = document.getElementById('dockedInput');
    if (dInp) dInp.addEventListener('focus', triggerPrewarm, { once: true });

    // =========================================================
    // 4. PREMIUM EXAM ENGINE & LIVE MOCK TEST MODAL
    // =========================================================
    let currentExamState = {
      questions: [],
      currentIndex: 0,
      userAnswers: {},
      timerInterval: null,
      timeLeft: 300,
      totalTime: 300,
      isSubmitted: false,
      subjectName: '',
      topicName: '',
      copilotHistory: {}
    };

    let globalActiveExamQuestions = [];

