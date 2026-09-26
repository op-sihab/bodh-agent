// BODH Exam Arena, Interactive Scorecard & AI Co-Pilot
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

    function openExamModal(data) {
      if (!data || !data.questions || data.questions.length === 0) return;
      
      if (currentExamState.timerInterval) {
        clearInterval(currentExamState.timerInterval);
        currentExamState.timerInterval = null;
      }

      currentExamState.questions = data.questions;
      currentExamState.currentIndex = 0;
      currentExamState.userAnswers = {};
      currentExamState.isSubmitted = false;
      currentExamState.hasReportedToChat = false;
      currentExamState.copilotHistory = {};

      const rawSubj = data.subjectName || currentSelectedSubject?.name || 'এসএসসি প্রস্তুতি';
      const cleanSubj = formatSubjectName(rawSubj);
      currentExamState.subjectName = cleanSubj;
      currentExamState.topicName = data.topicName || 'অধ্যায়ভিত্তিক মূল্যায়ন পরীক্ষা';
      
      const qCount = data.questions.length;
      currentExamState.totalTime = Math.max(qCount * 60, 120); // At least 2 mins or 1 min/question
      currentExamState.timeLeft = currentExamState.totalTime;

      // Update Header Titles and Badges
      const subjBadge = document.getElementById('examSubjectBadge');
      if (subjBadge) subjBadge.innerText = cleanSubj;
      const topicSub = document.getElementById('examTopicSubtitle');
      if (topicSub) topicSub.innerText = currentExamState.topicName;
      const totalCountEl = document.getElementById('examTotalCount');
      if (totalCountEl) totalCountEl.innerText = toBnDigits(qCount);

      // Views Reset
      document.getElementById('examQuestionView').classList.remove('hidden');
      document.getElementById('examResultView').classList.add('hidden');
      document.getElementById('examActiveFooterControls').classList.remove('hidden');
      document.getElementById('examResultFooterControls').classList.add('hidden');

      // Unhide Dedicated Exam Cockpit Page
      const page = document.getElementById('dedicatedExamPage');
      if (page) {
        page.classList.remove('hidden');
        page.classList.add('flex');
      }

      // Ensure both panes are visible on desktop (>= 1024px)
      const paneCopilot = document.getElementById('dedicatedExamCoPilotPane');
      const paneArena = document.getElementById('dedicatedExamArenaPane');
      if (window.innerWidth >= 1024) {
        if (paneCopilot) {
          paneCopilot.classList.remove('hidden');
          paneCopilot.classList.add('flex');
        }
        if (paneArena) {
          paneArena.classList.remove('hidden');
          paneArena.classList.add('flex');
        }
      } else {
        // Mobile only default
        switchDedicatedExamTab('arena');
      }

      // Reset Co-Pilot Pane for this exam
      const feed = document.getElementById('copilotFeedContent');
      if (feed) feed.innerHTML = '';
      const ph = document.getElementById('copilotDefaultPlaceholder');
      if (ph) ph.classList.remove('hidden');

      renderExamPalette();
      renderExamQuestion(0);
      startExamTimer();

      try {
        if (window.location.hash !== '#exam') {
          history.pushState(null, '', '#exam');
        }
      } catch(e) {}
    }

    function closeExamModal() {
      if (currentExamState.timerInterval) {
        clearInterval(currentExamState.timerInterval);
        currentExamState.timerInterval = null;
      }

      const page = document.getElementById('dedicatedExamPage');
      if (page) {
        page.classList.add('hidden');
        page.classList.remove('flex');
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      try {
        if (window.location.hash === '#exam') {
          history.pushState(null, '', window.location.pathname + window.location.search);
        }
      } catch(e) {}
    }

    function confirmExitExam() {
      if (currentExamState.isSubmitted) {
        returnToChatWithReport();
        return;
      }
      if (Object.keys(currentExamState.userAnswers).length === 0) {
        closeExamModal();
        return;
      }
      if (confirm("আপনি কি নিশ্চিত পরীক্ষা থেকে প্রস্থান করতে চান? আপনার বর্তমান অগ্রগতি মুছে যাবে।")) {
        closeExamModal();
      }
    }

    function toggleExamFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    function switchDedicatedExamTab(tab) {
      const paneCopilot = document.getElementById('dedicatedExamCoPilotPane');
      const paneArena = document.getElementById('dedicatedExamArenaPane');
      const btnArena = document.getElementById('tabMobileArenaBtn');
      const btnCopilot = document.getElementById('tabMobileCopilotBtn');
      const unreadBadge = document.getElementById('copilotUnreadBadge');
      if (!paneCopilot || !paneArena) return;

      // On desktop (>= 1024px), BOTH PANES MUST ALWAYS BE VISIBLE SIDE-BY-SIDE!
      if (window.innerWidth >= 1024) {
        paneCopilot.classList.remove('hidden');
        paneCopilot.classList.add('flex');
        paneArena.classList.remove('hidden');
        paneArena.classList.add('flex');
        return;
      }

      // Only on mobile (< 1024px) do we toggle panes
      if (tab === 'copilot') {
        paneCopilot.classList.remove('hidden');
        paneCopilot.classList.add('flex');
        paneArena.classList.add('hidden');
        paneArena.classList.remove('flex');

        if (btnCopilot) {
          btnCopilot.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-white text-zinc-950 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm';
        }
        if (btnArena) {
          btnArena.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.06] flex items-center justify-center gap-1.5 transition cursor-pointer';
        }
        if (unreadBadge) unreadBadge.classList.add('hidden');
      } else {
        paneArena.classList.remove('hidden');
        paneArena.classList.add('flex');
        paneCopilot.classList.add('hidden');
        paneCopilot.classList.remove('flex');

        if (btnArena) {
          btnArena.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-white text-zinc-950 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm';
        }
        if (btnCopilot) {
          btnCopilot.className = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.04] border border-white/[0.06] flex items-center justify-center gap-1.5 transition cursor-pointer';
        }
      }
    }

    window.addEventListener('resize', () => {
      const page = document.getElementById('dedicatedExamPage');
      if (page && !page.classList.contains('hidden') && window.innerWidth >= 1024) {
        const paneCopilot = document.getElementById('dedicatedExamCoPilotPane');
        const paneArena = document.getElementById('dedicatedExamArenaPane');
        if (paneCopilot) {
          paneCopilot.classList.remove('hidden');
          paneCopilot.classList.add('flex');
        }
        if (paneArena) {
          paneArena.classList.remove('hidden');
          paneArena.classList.add('flex');
        }
      }
    });

    async function triggerExamCoPilot(action, customText = '') {
      const q = currentExamState.questions[currentExamState.currentIndex];
      if (!q) return;

      // On mobile screen, automatically flip to copilot pane
      if (window.innerWidth < 1024) {
        switchDedicatedExamTab('copilot');
      }

      const feed = document.getElementById('copilotFeedContent');
      const ph = document.getElementById('copilotDefaultPlaceholder');
      const scrollEl = document.getElementById('copilotFeedScroll');
      if (!feed) return;
      if (ph) ph.classList.add('hidden');

      const actionMeta = {
        hint: {
          icon: '<svg class="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>',
          text: 'সোক্রেটিক হিন্ট অনুরোধ'
        },
        concept: {
          icon: '<svg class="w-3.5 h-3.5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v4H8l6 6-6 6h12v4H4"/></svg>',
          text: 'প্রয়োজনীয় সূত্র ও নিয়ম'
        },
        eliminate: {
          icon: '<svg class="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>',
          text: 'অপশন বাদ দেওয়ার যুক্তি'
        },
        simplify: {
          icon: '<svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>',
          text: 'সহজ বাংলায় বোঝাও'
        },
        custom: {
          icon: '<svg class="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
          text: escapeHtml(customText)
        }
      };
      const curMeta = actionMeta[action] || { icon: '', text: 'অনুরোধ' };

      // 1. Append User Action Badge with refined styling
      const userBubbleHtml = `
        <div class="flex justify-end animate-fadeIn">
          <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.1] ring-1 ring-white/[0.03] text-xs font-medium text-zinc-200 shadow-sm">
            ${curMeta.icon}
            <span>${curMeta.text}</span>
          </div>
        </div>
      `;
      feed.insertAdjacentHTML('beforeend', userBubbleHtml);

      // 2. Append AI Streaming Response Card (Double-bezel obsidian card)
      const cardId = 'copilotMsg_' + Date.now();
      const aiCardHtml = `
        <div id="${cardId}" class="p-3.5 sm:p-4 rounded-2xl bg-white/[0.025] border border-white/[0.08] ring-1 ring-white/[0.03] space-y-2.5 animate-fadeIn text-xs text-zinc-200 leading-relaxed font-sans shadow-lg">
          <div class="flex items-center justify-between text-[11px] text-zinc-400 pb-2 border-b border-white/[0.05]">
            <div class="flex items-center gap-1.5 text-zinc-200 font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span id="${cardId}_label">বোধ কো-পাইলট বিশ্লেষণ করছে...</span>
            </div>
            <span class="text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">প্রশ্ন ${toBnDigits(currentExamState.currentIndex + 1)}</span>
          </div>
          <div id="${cardId}_text" class="markdown-body text-xs sm:text-[12.5px] leading-relaxed font-sans pt-0.5 text-zinc-200">
            <span class="streaming-cursor"></span>
          </div>
        </div>
      `;
      feed.insertAdjacentHTML('beforeend', aiCardHtml);
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;

      const textEl = document.getElementById(`${cardId}_text`);
      const labelEl = document.getElementById(`${cardId}_label`);
      const correctAns = normLetter(q.answer || q.correct_answer_bn || 'ক');

      try {
        const res = await fetch('/api/quiz/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: q.question_text || q.stem || '',
            options: [
              q.option_a || q.options?.[0] || '',
              q.option_b || q.options?.[1] || '',
              q.option_c || q.options?.[2] || '',
              q.option_d || q.options?.[3] || ''
            ],
            correct_answer: correctAns,
            subject: currentExamState.subjectName || currentSelectedSubject?.name || '',
            action: action,
            user_query: customText,
            stream: true
          })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.delta) {
                fullText += parsed.delta;
                if (textEl) textEl.innerHTML = renderExamMarkdownAndMath(fullText, true);
                if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
              } else if (parsed.text && parsed.text.length > fullText.length) {
                fullText = parsed.text;
                if (textEl) textEl.innerHTML = renderExamMarkdownAndMath(fullText, true);
                if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
              }
            } catch(e) {}
          }
        }

        if (labelEl) labelEl.innerText = 'বোধ কো-পাইলট';
        if (textEl) textEl.innerHTML = renderExamMarkdownAndMath(fullText, false);
        if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;

        // Save into per-question Co-Pilot conversation history
        currentExamState.copilotHistory[currentExamState.currentIndex] = feed.innerHTML;

      } catch (err) {
        if (textEl) {
          textEl.innerHTML = `<span class="text-rose-400">কো-পাইলট উত্তর প্রদানে সমস্যা: ${escapeHtml(err.message)}</span>`;
        }
      }
    }

    function clearCurrentQuestionCopilot() {
      const idx = currentExamState.currentIndex;
      delete currentExamState.copilotHistory[idx];
      const feed = document.getElementById('copilotFeedContent');
      if (feed) feed.innerHTML = '';
      const ph = document.getElementById('copilotDefaultPlaceholder');
      if (ph) ph.classList.remove('hidden');
    }

    function handleCopilotCustomSubmit(event) {
      if (event) event.preventDefault();
      const input = document.getElementById('copilotCustomInput');
      if (!input) return;
      const val = input.value.trim();
      if (!val) return;
      input.value = '';
      triggerExamCoPilot('custom', val);
    }

    function startExamTimer() {
      updateTimerDisplay();
      currentExamState.timerInterval = setInterval(() => {
        currentExamState.timeLeft--;
        updateTimerDisplay();
        if (currentExamState.timeLeft <= 0) {
          clearInterval(currentExamState.timerInterval);
          currentExamState.timerInterval = null;
          submitExam(true);
        }
      }, 1000);
    }

    function updateTimerDisplay() {
      const el = document.getElementById('examTimerText');
      if (!el) return;
      const m = Math.floor(Math.max(0, currentExamState.timeLeft) / 60);
      const s = Math.max(0, currentExamState.timeLeft) % 60;
      const mStr = m < 10 ? '0' + m : '' + m;
      const sStr = s < 10 ? '0' + s : '' + s;
      el.innerText = toBnDigits(mStr + ':' + sStr);

      const badge = document.getElementById('examTimerBadge');
      if (badge) {
        if (currentExamState.timeLeft <= 60) {
          badge.className = 'flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-mono font-medium animate-pulse';
        } else {
          badge.className = 'flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-zinc-300 text-xs font-mono font-medium';
        }
      }
    }

    function renderExamPalette() {
      const container = document.getElementById('examPaletteButtons');
      if (!container) return;

      const answeredKeys = Object.keys(currentExamState.userAnswers);
      const answeredCount = answeredKeys.length;
      document.getElementById('examAnsweredCount').innerText = toBnDigits(answeredCount);

      container.innerHTML = currentExamState.questions.map((q, idx) => {
        const isCurrent = idx === currentExamState.currentIndex;
        const isAnswered = currentExamState.userAnswers[idx] !== undefined;

        let btnClass = 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono text-xs transition-all cursor-pointer flex items-center justify-center ';
        if (isCurrent) {
          btnClass += 'bg-white text-zinc-950 font-semibold shadow-sm scale-[1.03]';
        } else if (isAnswered) {
          btnClass += 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium hover:bg-emerald-500/25';
        } else {
          btnClass += 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200';
        }

        return `
          <button type="button" onclick="navigateExamQuestion(${idx - currentExamState.currentIndex})" class="${btnClass}">
            ${toBnDigits(idx + 1)}
          </button>
        `;
      }).join('');
    }

    function renderExamQuestion(idx) {
      if (idx < 0 || idx >= currentExamState.questions.length) return;
      currentExamState.currentIndex = idx;
      renderExamPalette();

      const q = currentExamState.questions[idx];
      const qNumBadge = document.getElementById('examQNumBadge');
      if (qNumBadge) qNumBadge.innerText = `${toBnDigits(idx + 1)} / ${toBnDigits(currentExamState.questions.length)}`;

      const activeQBadge = document.getElementById('examActiveQIndexBadge');
      if (activeQBadge) activeQBadge.innerText = `প্রশ্ন ${toBnDigits(idx + 1)}`;

      const copilotBadge = document.getElementById('copilotActiveQBadge');
      if (copilotBadge) copilotBadge.innerText = `প্রশ্ন ${toBnDigits(idx + 1)} ফোকাস`;

      const tabBadge = document.getElementById('tabExamCountBadge');
      if (tabBadge) {
        tabBadge.innerText = `${toBnDigits(idx + 1)}/${toBnDigits(currentExamState.questions.length)}`;
      }

      // Restore Co-Pilot feed for question idx
      const feed = document.getElementById('copilotFeedContent');
      const ph = document.getElementById('copilotDefaultPlaceholder');
      if (feed) {
        if (currentExamState.copilotHistory && currentExamState.copilotHistory[idx]) {
          feed.innerHTML = currentExamState.copilotHistory[idx];
          if (ph) ph.classList.add('hidden');
        } else {
          feed.innerHTML = '';
          if (ph) ph.classList.remove('hidden');
        }
      }

      const boardTagsEl = document.getElementById('examQBoardTags');
      if (boardTagsEl) {
        if (q.tags || q.formatted_source) {
          const formatted = formatFullBoardTags(q.tags || q.formatted_source);
          const tags = formatted.split(',').map(x => x.trim()).filter(Boolean);
          boardTagsEl.innerHTML = tags.map(b => `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08]">${escapeHtml(b)}</span>`).join(' ');
        } else {
          boardTagsEl.innerHTML = '';
        }
      }

      // Question Stem with full KaTeX math support
      const stemEl = document.getElementById('examQStem');
      if (stemEl) {
        stemEl.innerHTML = formatExamMath(q.question_text || q.question || q.stem || q.text || `প্রশ্ন ${idx + 1}`);
      }

      // Options with full KaTeX math support
      const optContainer = document.getElementById('examOptionsGrid');
      const selectedLetter = currentExamState.userAnswers[idx];
      const correctLetter = normLetter(q.answer || q.correct_answer_bn || 'ক');

      const options = [
        { letter: 'ক', key: 'A', text: q.option_a || q.options?.['ক'] || (Array.isArray(q.options) ? q.options[0] : '') || '' },
        { letter: 'খ', key: 'B', text: q.option_b || q.options?.['খ'] || (Array.isArray(q.options) ? q.options[1] : '') || '' },
        { letter: 'গ', key: 'C', text: q.option_c || q.options?.['গ'] || (Array.isArray(q.options) ? q.options[2] : '') || '' },
        { letter: 'ঘ', key: 'D', text: q.option_d || q.options?.['ঘ'] || (Array.isArray(q.options) ? q.options[3] : '') || '' }
      ];

      optContainer.innerHTML = options.map(opt => {
        let optClass = 'mcq-opt group flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl text-left w-full relative overflow-hidden transition-all duration-200 border ';
        let badgeHtml = `
          <div class="flex items-center gap-2 shrink-0">
            <span class="hidden sm:inline-block font-mono text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] group-hover:text-zinc-300 group-hover:border-white/10 transition-colors">${opt.key}</span>
            <span class="opt-badge hidden"></span>
          </div>
        `;

        if (selectedLetter !== undefined) {
          const isThisSelected = opt.letter === selectedLetter;
          const isThisCorrect = opt.letter === correctLetter;

          if (isThisCorrect) {
            optClass += 'correct bg-emerald-500/[0.12] border-emerald-500/50 shadow-[0_0_18px_rgba(16,185,129,0.15)] cursor-default pointer-events-none ';
            badgeHtml = `
              <div class="flex items-center gap-2 shrink-0">
                <span class="hidden sm:inline-block font-mono text-[10px] text-emerald-400/90 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">${opt.key}</span>
                <span class="opt-badge w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-sm">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                </span>
              </div>
            `;
          } else if (isThisSelected && !isThisCorrect) {
            optClass += 'wrong bg-rose-500/[0.12] border-rose-500/50 shadow-[0_0_18px_rgba(244,63,94,0.15)] cursor-default pointer-events-none ';
            badgeHtml = `
              <div class="flex items-center gap-2 shrink-0">
                <span class="hidden sm:inline-block font-mono text-[10px] text-rose-400/90 px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30">${opt.key}</span>
                <span class="opt-badge w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-sm">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </span>
              </div>
            `;
          } else {
            optClass += 'opacity-35 border-white/[0.04] bg-white/[0.01] cursor-default pointer-events-none ';
          }
        } else {
          optClass += 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 hover:scale-[1.008] active:scale-[0.99] ring-1 ring-white/[0.02] cursor-pointer ';
        }

        return `
          <button type="button" ${selectedLetter !== undefined ? 'disabled' : `onclick="selectExamOption('${opt.letter}')"`} class="${optClass}">
            <div class="flex items-center gap-3 min-w-0">
              <span class="opt-letter w-7 h-7 rounded-xl bg-white/[0.05] text-zinc-300 font-mono text-xs flex items-center justify-center font-bold shrink-0 border border-white/[0.08] transition-all group-hover:border-white/20 group-hover:bg-white/[0.08]">
                ${opt.letter}
              </span>
              <span class="opt-text text-xs sm:text-[13.5px] text-zinc-200 transition-colors font-normal leading-snug">${formatExamMath(opt.text)}</span>
            </div>
            ${badgeHtml}
          </button>
        `;
      }).join('');

      // Explanation & Analysis Card with full KaTeX math support
      const expCard = document.getElementById('examExplanationCard');
      if (selectedLetter !== undefined) {
        expCard.classList.remove('hidden');
        document.getElementById('examCorrectAnsBadge').innerText = `সঠিক উত্তর: (${correctLetter})`;

        const isUserCorrect = selectedLetter === correctLetter;
        const statusEl = document.getElementById('examStatusIndicator');
        if (statusEl) {
          if (isUserCorrect) {
            statusEl.innerHTML = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span>উত্তর সঠিক হয়েছে (লকড)</span>
              </span>
            `;
          } else {
            statusEl.innerHTML = `
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>তোমার উত্তর (${selectedLetter}) সঠিক নয় (লকড)</span>
              </span>
            `;
          }
        }

        const rawSol = (q.solution || q.explanation || '').trim();
        const hasValidSol = rawSol && !/^(?:upgrade|premium|none|null|n\/a)$/i.test(rawSol);

        let contentHtml = '';
        if (hasValidSol) {
          contentHtml += `
            <div class="space-y-1.5 pt-0.5">
              <div class="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">পাঠ্যবইয়ের সমাধান:</div>
              <div class="markdown-body text-zinc-200 text-xs sm:text-[13px] leading-relaxed">${renderExamMarkdownAndMath(rawSol)}</div>
            </div>
          `;
        } else if (q._aiExplanation) {
          contentHtml += `
            <div class="space-y-2 pt-0.5">
              <div class="flex items-center justify-between text-[11px] text-zinc-400 pb-1.5 border-b border-white/[0.04]">
                <div class="flex items-center gap-1.5 text-zinc-300 font-medium">
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  <span>সংক্ষিপ্ত সমাধান ও টিপস</span>
                </div>
                <span class="text-[10px] font-mono font-medium bodh-gradient-text inline-flex items-center gap-1"><img src="/assets/bodh-monogram.svg" alt="BODH" class="w-3.5 h-3.5 object-contain" /> BODH AI</span>
              </div>
              <div class="markdown-body text-xs sm:text-[13px] text-zinc-200 leading-relaxed font-sans">${renderExamMarkdownAndMath(q._aiExplanation)}</div>
            </div>
          `;
        } else {
          contentHtml += `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-0.5" id="examExplainActionBox_${idx}">
              <span class="text-xs text-zinc-400">এই প্রশ্নটির সংক্ষিপ্ত কনসেপ্ট বা শর্টকাট সূত্র বুঝতে চাও?</span>
              <button type="button" onclick="requestInlineAiExplanation(${idx})" class="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.98] text-zinc-200 hover:text-white border border-white/[0.1] text-xs font-medium cursor-pointer transition shrink-0">
                <svg class="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>AI ব্যাখ্যা দেখো</span>
              </button>
            </div>
            <div id="examInlineAiBox_${idx}" class="hidden pt-0.5"></div>
          `;
        }

        document.getElementById('examExplanationContent').innerHTML = contentHtml;
      } else {
        expCard.classList.add('hidden');
      }

      // Prev / Next button states
      const prevBtn = document.getElementById('examPrevBtn');
      if (prevBtn) prevBtn.disabled = (idx === 0);

      const nextBtnText = document.getElementById('examNextBtnText');
      if (nextBtnText) {
        if (idx === currentExamState.questions.length - 1) {
          nextBtnText.innerText = 'ফলাফল দেখো';
        } else {
          nextBtnText.innerText = 'পরবর্তী প্রশ্ন';
        }
      }
    }

    function selectExamOption(optLetter) {
      const idx = currentExamState.currentIndex;
      // Strict Exam Rule: Once an option is chosen, the answer is permanently locked and cannot be changed!
      if (currentExamState.userAnswers[idx] !== undefined) return;
      currentExamState.userAnswers[idx] = optLetter;
      renderExamQuestion(idx);
    }

    function navigateExamQuestion(delta) {
      const newIdx = currentExamState.currentIndex + delta;
      if (newIdx >= currentExamState.questions.length) {
        submitExam(false);
      } else if (newIdx >= 0 && newIdx < currentExamState.questions.length) {
        renderExamQuestion(newIdx);
      }
    }

    function submitExam(isTimeOut = false) {
      if (currentExamState.timerInterval) {
        clearInterval(currentExamState.timerInterval);
        currentExamState.timerInterval = null;
      }
      currentExamState.isSubmitted = true;

      const total = currentExamState.questions.length;
      let correct = 0;
      let wrong = 0;
      let unans = 0;

      currentExamState.questions.forEach((q, idx) => {
        const userAns = currentExamState.userAnswers[idx];
        const correctAns = normLetter(q.answer || q.correct_answer_bn || 'ক');
        if (userAns === undefined) {
          unans++;
        } else if (userAns === correctAns) {
          correct++;
        } else {
          wrong++;
        }
      });

      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const timeSpent = currentExamState.totalTime - currentExamState.timeLeft;
      const m = Math.floor(timeSpent / 60);
      const s = timeSpent % 60;
      const timeStr = (m < 10 ? '0' + m : '' + m) + ':' + (s < 10 ? '0' + s : '' + s);

      document.getElementById('resScoreText').innerText = `${toBnDigits(correct)} / ${toBnDigits(total)}`;
      document.getElementById('resAccuracyText').innerText = `${toBnDigits(accuracy)}%`;
      document.getElementById('resTimeText').innerText = toBnDigits(timeStr);

      let remark = "চমৎকার প্রস্তুতি! তোমার ধারণাগত স্পষ্টতা দারুণ।";
      if (accuracy === 100) remark = "অসাধারণ! ১০০% সঠিক উত্তর দিয়েছো। পূর্ণ নম্বর নিশ্চিত!";
      else if (accuracy >= 80) remark = "দারুণ পারফরম্যান্স! এ-প্লাস পাওয়ার জন্য একদম প্রস্তুত।";
      else if (accuracy >= 60) remark = "ভালো চেষ্টা! যেসব প্রশ্নে ভুল হয়েছে সেগুলোর ব্যাখ্যা ও ফাঁদগুলো নিচে দেখে নাও।";
      else remark = "আরেকটু রিভিশন প্রয়োজন। নিচের বিস্তারিত সমাধান ও কনসেপ্টগুলো মনোযোগ দিয়ে পড়ো।";

      if (isTimeOut) remark += " (সময় শেষ হয়েছিল)";
      document.getElementById('examResultRemark').innerText = remark;

      // Render Review List
      const reviewList = document.getElementById('examReviewList');
      if (reviewList) {
        reviewList.innerHTML = currentExamState.questions.map((q, idx) => {
          const userAns = currentExamState.userAnswers[idx];
          const correctAns = normLetter(q.answer || q.correct_answer_bn || 'ক');
          const isCorrect = userAns === correctAns;
          const isSkipped = userAns === undefined;

          let statusBadge = '';
          if (isCorrect) {
            statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-semibold">সঠিক (+১)</span>';
          } else if (isSkipped) {
            statusBadge = '<span class="px-2.5 py-0.5 rounded-full bg-zinc-500/15 border border-zinc-500/30 text-zinc-400 font-mono text-[11px] font-semibold">উত্তর দেওয়া হয়নি</span>';
          } else {
            statusBadge = `<span class="px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-mono text-[11px] font-semibold">ভুল (${userAns})</span>`;
          }

          const rawSol = (q.solution || q.explanation || '').trim();
          const hasValidSol = rawSol && !/^(?:upgrade|premium|none|null|n\/a)$/i.test(rawSol);
          const solHtml = hasValidSol ? `<div class="leading-relaxed text-zinc-400 pt-1">${formatExamMath(rawSol)}</div>` : '';
          const boardTagDisplay = (q.tags || q.formatted_source) ? formatFullBoardTags(q.tags || q.formatted_source) : '';

          return `
            <div class="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs font-mono font-semibold text-zinc-400">প্রশ্ন ${toBnDigits(idx + 1)}</span>
                ${statusBadge}
              </div>
              <h5 class="text-sm font-medium text-white leading-relaxed">${formatExamMath(q.question_text || q.stem || '')}</h5>
              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-300 space-y-1.5">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <div class="flex items-center gap-2 font-medium text-zinc-200">
                    <span>সঠিক উত্তর: (${correctAns})</span>
                  </div>
                  ${boardTagDisplay ? `<span class="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">${escapeHtml(boardTagDisplay)}</span>` : ''}
                </div>
                ${solHtml}
              </div>
            </div>
          `;
        }).join('');
      }

      document.getElementById('examQuestionView').classList.add('hidden');
      document.getElementById('examResultView').classList.remove('hidden');
      document.getElementById('examActiveFooterControls').classList.add('hidden');
      document.getElementById('examResultFooterControls').classList.remove('hidden');
    }

    function restartCurrentExam() {
      openExamModal({
        questions: currentExamState.questions,
        subjectName: currentExamState.subjectName,
        topicName: currentExamState.topicName
      });
    }

    async function requestInlineAiExplanation(idx) {
      const q = currentExamState.questions[idx];
      if (!q) return;

      const actionBox = document.getElementById(`examExplainActionBox_${idx}`);
      const aiBox = document.getElementById(`examInlineAiBox_${idx}`);
      if (!aiBox) return;

      if (actionBox) actionBox.classList.add('hidden');
      aiBox.classList.remove('hidden');

      aiBox.innerHTML = `
        <div class="space-y-2 pt-1">
          <div class="flex items-center justify-between text-[11px] text-zinc-400 pb-1.5 border-b border-white/[0.04]">
            <div class="flex items-center gap-1.5 text-zinc-300 font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <span id="examAiStreamLabel_${idx}">BODH AI নিখুঁত সমাধান প্রস্তুত করছে...</span>
            </div>
            <span class="text-[10px] font-mono font-medium bodh-gradient-text inline-flex items-center gap-1"><img src="/assets/bodh-monogram.svg" alt="BODH" class="w-3.5 h-3.5 object-contain" /> BODH AI</span>
          </div>
          <div id="examAiStreamText_${idx}" class="markdown-body text-xs sm:text-[13px] text-zinc-200 leading-relaxed font-sans min-h-[36px]">
            <div class="space-y-2 animate-pulse pt-1">
              <div class="h-2.5 bg-white/[0.06] rounded w-5/6"></div>
              <div class="h-2.5 bg-white/[0.04] rounded w-4/6"></div>
            </div>
          </div>
        </div>
      `;

      const userAns = currentExamState.userAnswers[idx] || '';
      const correctAns = normLetter(q.answer || q.correct_answer_bn || 'ক');
      const textEl = document.getElementById(`examAiStreamText_${idx}`);
      const labelEl = document.getElementById(`examAiStreamLabel_${idx}`);

      try {
        const res = await fetch('/api/quiz/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: q.question_text || q.stem || '',
            options: [
              q.option_a || q.options?.[0] || '',
              q.option_b || q.options?.[1] || '',
              q.option_c || q.options?.[2] || '',
              q.option_d || q.options?.[3] || ''
            ],
            correct_answer: correctAns,
            user_answer: userAns,
            subject: currentExamState.subjectName || currentSelectedSubject?.name || '',
            board: q.tags || q.board || '',
            stream: true
          })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullExp = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.delta) {
                fullExp += parsed.delta;
                if (textEl) textEl.innerHTML = renderExamMarkdownAndMath(fullExp, true);
              } else if (parsed.text && parsed.text.length > fullExp.length) {
                fullExp = parsed.text;
                if (textEl) textEl.innerHTML = renderExamMarkdownAndMath(fullExp, true);
              }
            } catch (e) {}
          }
        }

        q._aiExplanation = fullExp;
        if (labelEl) labelEl.innerText = 'সংক্ষিপ্ত সমাধান ও টিপস';
        if (textEl) textEl.innerHTML = renderExamMarkdownAndMath(fullExp, false);
      } catch (err) {
        if (textEl) {
          textEl.innerHTML = `<span class="text-rose-400 text-xs">ব্যাখ্যা লোড হতে সমস্যা হয়েছে: ${escapeHtml(err.message)}</span>`;
        }
      }
    }

    function returnToChatWithReport() {
      closeExamModal();
      if (currentExamState.hasReportedToChat) return;
      currentExamState.hasReportedToChat = true;

      const questions = currentExamState.questions || [];
      if (questions.length === 0) return;

      const total = questions.length;
      let correct = 0;
      let wrong = 0;
      let skipped = 0;
      const missedList = [];

      questions.forEach((q, idx) => {
        const userAns = currentExamState.userAnswers[idx];
        const correctAns = normLetter(q.answer || q.correct_answer_bn || 'ক');
        if (userAns === correctAns) {
          correct++;
        } else {
          const stem = (q.question_text || q.stem || '').replace(/\n+/g, ' ').slice(0, 120);
          if (userAns === undefined) {
            skipped++;
            missedList.push(`- প্রশ্ন ${idx + 1}: "${stem}" | উত্তর দেওয়া হয়নি, সঠিক উত্তর: (${correctAns})`);
          } else {
            wrong++;
            missedList.push(`- প্রশ্ন ${idx + 1}: "${stem}" | আমার উত্তর: (${userAns}), সঠিক উত্তর: (${correctAns})`);
          }
        }
      });

      const subjectName = currentExamState.subjectName || currentSelectedSubject?.name || 'এসএসসি প্রস্তুতি';
      const topicName = currentExamState.topicName || 'অধ্যায়ভিত্তিক মূল্যায়ন পরীক্ষা';

      let prompt = `পরীক্ষা সমাপ্তি ও ফলাফল রিপোর্ট:
বিষয়: ${subjectName} (${topicName})
মোট প্রশ্ন: ${toBnDigits(total)}টি | সঠিক হয়েছে: ${toBnDigits(correct)}টি | ভুল হয়েছে: ${toBnDigits(wrong)}টি${skipped > 0 ? ` | বাদ দেওয়া হয়েছে: ${toBnDigits(skipped)}টি` : ''}

${missedList.length > 0 ? `ভুল হওয়া প্রশ্নসমূহ:\n${missedList.join('\n')}\n\nআমি পরীক্ষা শেষ করে চ্যাটে ফিরে এসেছি। অনুগ্রহ করে আমার রেজাল্ট রিপোর্ট দাও এবং বলো আমি কি একটা একটা করে ভুলগুলো ক্লিয়ার করতে চাই কিনা।` : `আমি সবগুলো প্রশ্নের সঠিক উত্তর দিয়েছি! পরীক্ষা শেষ করে চ্যাটে ফিরে এসেছি।`}`;

      submitPrompt(prompt);
    }

    function launchActiveChatExam() {
      if (globalActiveExamQuestions && globalActiveExamQuestions.length > 0) {
        openExamModal({
          questions: globalActiveExamQuestions,
          subjectName: currentSelectedSubject?.name || 'এসএসসি প্রস্তুতি',
          topicName: 'অধ্যায়ভিত্তিক মূল্যায়ন পরীক্ষা'
        });
      }
    }

    async function startExamFromCard(btn) {
      const card = btn.closest('.exam-launcher-card');
      if (!card) return;

      const subj = card.getAttribute('data-subject') || currentSelectedSubject?.name || 'এসএসসি বিষয়';
      const ch = card.getAttribute('data-chapter') || 'মূল্যায়ন পরীক্ষা';
      const total = parseInt(card.getAttribute('data-total')) || 5;

      // 1. Check if questions are already embedded in the card
      const rawQ = card.getAttribute('data-questions');
      if (rawQ) {
        try {
          const qList = JSON.parse(rawQ);
          if (qList && qList.length > 0) {
            openExamModal({
              questions: qList,
              subjectName: subj,
              topicName: ch
            });
            return;
          }
        } catch (e) {}
      }

      // 2. Check if global active questions are available
      if (globalActiveExamQuestions && globalActiveExamQuestions.length > 0) {
        openExamModal({
          questions: globalActiveExamQuestions,
          subjectName: subj,
          topicName: ch
        });
        return;
      }

      // 3. Dynamic fetch from /api/quiz/generate
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="inline-block w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span> <span>লোড হচ্ছে...</span>`;
      btn.disabled = true;

      try {
        const subjId = currentSelectedSubject?.id || 'ssc_physics';
        const res = await fetch(`/api/quiz/generate?subject=${encodeURIComponent(subjId)}&chapter=${encodeURIComponent(ch)}&count=${total}`);
        if (res.ok) {
          const data = await res.json();
          if (data.questions && data.questions.length > 0) {
            card.setAttribute('data-questions', JSON.stringify(data.questions));
            openExamModal({
              questions: data.questions,
              subjectName: subj,
              topicName: ch
            });
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
          }
        }
      } catch (err) {
        console.error("Failed to load exam questions:", err);
      }

      btn.innerHTML = originalText;
      btn.disabled = false;
      alert("দুঃখিত, এই মুহূর্তেই প্রশ্নগুলো লোড করা সম্ভব হয়নি। আবার চেষ্টা করুন।");
    }

    // =========================================================
    // MERGE GATEWAY TELEMETRY & COST CONTROLLERS
    // =========================================================
    const msgGatewayTelemetryMap = {};

