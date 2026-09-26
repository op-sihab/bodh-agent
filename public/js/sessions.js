// BODH Chat Sessions & Subject Selection Engine
    function toggleSubjectGrid(forceState = null) {
      isSubjectGridOpen = (forceState !== null) ? forceState : !isSubjectGridOpen;
      const wrapper = document.getElementById('subjectGridWrapper');
      const chevron = document.getElementById('subjectChevron');
      const toggleBtn = document.getElementById('subjectToggleText');
      if (!wrapper) return;

      if (isSubjectGridOpen) {
        wrapper.classList.remove('max-h-0', 'opacity-0', 'pointer-events-none');
        wrapper.classList.add('max-h-[500px]', 'opacity-100');
        if (chevron) chevron.classList.add('rotate-180');
        if (toggleBtn) toggleBtn.innerText = 'সংক্ষেপ করো ▴';
      } else {
        wrapper.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
        wrapper.classList.remove('max-h-[500px]', 'opacity-100');
        if (chevron) chevron.classList.remove('rotate-180');
        if (toggleBtn) toggleBtn.innerText = 'বিষয়সমূহ ▾';
      }
    }

    function renderSubjectGrid() {
      const container = document.getElementById('subjectGrid');
      if (!container) return;

      const isAllSelected = !currentSelectedSubject;
      const allOptionHtml = `
        <button type="button" onclick="selectSubject(null)"
          class="group relative p-2.5 sm:p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer overflow-hidden ${
            isAllSelected 
              ? 'bg-indigo-500/10 border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-[0_4px_16px_rgba(79,70,229,0.2)]'
              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/20 text-zinc-300 hover:text-white'
          }">
          <div class="flex items-center justify-between w-full">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-150 ${
              isAllSelected 
                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' 
                : 'bg-white/[0.03] border-white/[0.05] text-zinc-400 group-hover:text-zinc-100'
            }">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>
            </div>
            <span class="text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded-md border text-indigo-300 bg-indigo-500/10 border-indigo-500/20">ডিফল্ট</span>
          </div>
          <div class="mt-2.5 flex items-center justify-between">
            <span class="font-medium text-[12.5px] sm:text-[13px] truncate tracking-tight transition-colors ${isAllSelected ? 'text-white font-semibold' : 'text-zinc-300 group-hover:text-white'}">সকল বিষয় (স্মার্ট)</span>
            ${isAllSelected ? `
              <svg class="w-3.5 h-3.5 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ` : ''}
          </div>
        </button>
      `;

      container.innerHTML = allOptionHtml + SUBJECTS_LIST.map(s => {
        const isSelected = currentSelectedSubject && s.id === currentSelectedSubject.id;
        return `
          <button type="button" onclick="selectSubject('${s.id}')"
            class="group relative p-2.5 sm:p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer overflow-hidden ${
              isSelected 
                ? 'bg-white/[0.08] border-white/25 ring-1 ring-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'
                : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/20 text-zinc-300 hover:text-white'
            }">
            <div class="flex items-center justify-between w-full">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-150 ${
                isSelected 
                  ? s.iconBg + ' ' + s.iconColor + ' border-white/10 ring-1 ring-current/20' 
                  : 'bg-white/[0.03] border-white/[0.05] text-zinc-400 group-hover:text-zinc-100 group-hover:bg-white/[0.06]'
              }">
                ${s.svgIcon}
              </div>
              <span class="text-[10px] font-mono tracking-tight px-1.5 py-0.5 rounded-md border transition-all duration-150 ${
                isSelected 
                  ? s.iconBg + ' ' + s.iconColor + ' border-current/20 font-medium' 
                  : 'text-zinc-500 bg-white/[0.02] border-white/[0.04] group-hover:text-zinc-400'
              }">${s.tag}</span>
            </div>
            <div class="mt-2.5 flex items-center justify-between">
              <span class="font-medium text-[12.5px] sm:text-[13px] truncate tracking-tight transition-colors ${isSelected ? 'text-white font-semibold' : 'text-zinc-300 group-hover:text-white'}">${s.name}</span>
              ${isSelected ? `
                <svg class="w-3.5 h-3.5 ${s.iconColor} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ` : ''}
            </div>
          </button>
        `;
      }).join('');

      renderQuickChips();

      // Update the sleek toggle pill in the hero bar
      const iconEl = document.getElementById('selectedSubjectIcon');
      if (iconEl) {
        if (currentSelectedSubject) {
          iconEl.className = `w-4 h-4 flex items-center justify-center ${currentSelectedSubject.iconColor}`;
          iconEl.innerHTML = currentSelectedSubject.svgIcon;
        } else {
          iconEl.className = `w-4 h-4 flex items-center justify-center text-indigo-400`;
          iconEl.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
        }
      }
      const labelEl = document.getElementById('selectedSubjectLabel');
      if (labelEl) labelEl.innerText = currentSelectedSubject ? currentSelectedSubject.name : 'সকল বিষয় (অটো-ডিটেক্ট)';
      const tagEl = document.getElementById('selectedSubjectTag');
      if (tagEl) tagEl.innerText = currentSelectedSubject ? currentSelectedSubject.tag : 'HSC & SSC';
    }

    function renderQuickChips() {
      const chipsEl = document.getElementById('quickPromptChips');
      if (!chipsEl) return;
      const prompts = (currentSelectedSubject && currentSelectedSubject.quickPrompts && currentSelectedSubject.quickPrompts.length) 
        ? currentSelectedSubject.quickPrompts 
        : [
          "গতির ৪টি মৌলিক সমীকরণ বুঝিয়ে দাও",
          "পর্যায় সারণির মূল ভিত্তি কী?",
          "কোষ বিভাজনের ধাপগুলো আলোচনা করো",
          "ত্রিকোণমিতিক অনুপাতের সূত্রাবলি",
          "হাদিস ও শরিয়ত অংশের মূল শিক্ষা"
        ];
      chipsEl.innerHTML = prompts.map(p => `
        <button onclick="submitPrompt('${escapeHtml(p)}')" 
          class="group text-xs px-3.5 py-1.5 rounded-full border border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 hover:text-white transition-all duration-200 shadow-sm hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer backdrop-blur-sm">
          <span class="text-zinc-500 group-hover:text-zinc-300 transition-colors text-[11px]">✦</span>
          <span>${escapeHtml(p)}</span>
        </button>
      `).join('');
    }

    function selectSubject(id) {
      if (!id || id === 'all') {
        currentSelectedSubject = null;
      } else {
        const found = SUBJECTS_LIST.find(s => s.id === id);
        currentSelectedSubject = found || null;
      }
      renderSubjectGrid();
      toggleSubjectGrid(false); // smoothly collapse once chosen!
      const heroInp = document.getElementById('heroInput');
      if (heroInp) {
        if (currentSelectedSubject) {
          heroInp.placeholder = currentSelectedSubject.placeholder || 'যেকোনো প্রশ্ন লিখো...';
        } else {
          heroInp.placeholder = 'এইচএসসি বা এসএসসি যেকোনো বিষয়ের প্রশ্ন, অধ্যায় বা কনসেপ্ট লিখো...';
        }
        heroInp.focus();
      }
    }

    function saveSessions() {
      try {
        if (chatSessions.length > 35) chatSessions = chatSessions.slice(0, 35);
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(chatSessions));
      } catch (e) {
        console.warn("Could not save sessions to localStorage:", e);
      }
    }

    function generateSessionTitle(prompt) {
      if (!prompt) return "নতুন আলোচনা";
      let clean = prompt.trim().split('\n')[0].replace(/\s+/g, ' ');
      clean = clean.replace(/(?:ei chapter er jonno|chapter er jonno|theke|theika)\s*(?:ekta|akta)?\s*(?:mcq|cq|prosno|question)\s*(?:dio|dao|den)?/gi, (m) => {
        if (/mcq/i.test(m)) return ' (MCQ)';
        if (/cq/i.test(m)) return ' (CQ)';
        return '';
      });
      clean = clean.replace(/\s+(?:dao|dio|den|bolen|koren|bolo|chai|lagbe)$/i, '');
      clean = clean.replace(/\s+/g, ' ').trim();
      if (clean.length > 34) {
        clean = clean.slice(0, 32) + '...';
      }
      return clean || "একাডেমিক আলোচনা";
    }


    function renderRecentChats() {
      const container = document.getElementById('recentChatsList');
      if (!container) return;
      if (!chatSessions || chatSessions.length === 0) {
        container.innerHTML = '<div class="px-3 py-4 text-zinc-500 text-xs italic text-center">কোনো পূর্ববর্তী আলোচনা নেই</div>';
        return;
      }

      container.innerHTML = chatSessions.map((session) => {
        const isActive = session.id === currentSessionId;
        const activeClass = isActive 
          ? 'bg-white/[0.08] text-white border-white/[0.12] font-medium shadow-sm' 
          : 'text-zinc-300 hover:bg-white/[0.04] hover:text-white border-transparent';
        
        return `
          <div class="group relative flex items-center w-full rounded-xl border transition-all duration-150 ${activeClass}">
            <button onclick="loadSession('${session.id}'); if(window.innerWidth < 768) toggleSidebar();" 
              class="flex-1 flex items-center gap-2 px-3 py-2 text-left min-w-0 cursor-pointer" 
              title="${escapeHtml(session.title)}">
              <span class="w-4 h-4 shrink-0 flex items-center justify-center text-zinc-400">
                ${SUBJECTS_LIST.find(s => s.id === session.subject_id)?.svgIcon || '<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'}
              </span>
              <span class="truncate text-[13.55px] leading-tight flex-1">${escapeHtml(session.title)}</span>
            </button>
            <button onclick="deleteSession('${session.id}', event)" 
              class="opacity-0 group-hover:opacity-100 p-1.5 mr-1 text-zinc-500 hover:text-rose-400 hover:bg-white/[0.08] rounded-lg transition-opacity cursor-pointer shrink-0" 
              title="আলোচনা মুছুন">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>
        `;
      }).join('');
    }

    function loadSession(id) {
      if (isProcessing) return;
      const session = chatSessions.find(s => s.id === id);
      if (!session) return;

      currentSessionId = session.id;
      if (session.subject_id) {
        const found = SUBJECTS_LIST.find(s => s.id === session.subject_id);
        if (found) currentSelectedSubject = found;
        else currentSelectedSubject = null;
      } else {
        currentSelectedSubject = null;
      }
      updateActiveSubjectBadge();

      conversationHistory = Array.isArray(session.conversationHistory) 
        ? JSON.parse(JSON.stringify(session.conversationHistory)) 
        : [];

      const msgs = document.getElementById('messagesArea');
      if (msgs) {
        msgs.innerHTML = session.html || '';
      }

      activateChatView();
      renderRecentChats();
      scrollToBottom();
    }

    function deleteSession(id, event) {
      if (event) event.stopPropagation();
      chatSessions = chatSessions.filter(s => s.id !== id);
      saveSessions();

      if (currentSessionId === id) {
        resetToHome();
      } else {
        renderRecentChats();
      }
    }

    function clearAllSessions() {
      if (!chatSessions || chatSessions.length === 0) return;
      if (!confirm('আপনি কি নিশ্চিত যে সকল পূর্ববর্তী আলোচনা মুছে ফেলতে চান?')) return;
      chatSessions = [];
      saveSessions();
      resetToHome();
    }

    function toggleSidebar() {
      const sb = document.getElementById('sidebar');
      const bd = document.getElementById('sidebarBackdrop');
      if (window.innerWidth >= 768) {
        sb.classList.toggle('md:-ml-[260px]');
        sb.classList.toggle('md:opacity-0');
        sb.classList.toggle('md:pointer-events-none');
      } else {
        sb.classList.toggle('-translate-x-full');
        bd.classList.toggle('hidden');
      }
    }

    function openProfileModal() {
      const m = document.getElementById('profileModal');
      if (m) m.classList.remove('hidden');
    }

    function closeProfileModal() {
      const m = document.getElementById('profileModal');
      if (m) m.classList.add('hidden');
    }

    function resetToHome() {
      if (isProcessing) return;
      currentSessionId = null;
      isChatActive = false;
      currentSelectedSubject = null;
      conversationHistory = [];
      const hero = document.getElementById('heroView');
      const chat = document.getElementById('chatView');
      const docked = document.getElementById('dockedBar');
      const msgs = document.getElementById('messagesArea');
      const badge = document.getElementById('activeSubjectHeaderBadge');
      
      if (badge) {
        badge.classList.add('hidden');
        badge.classList.remove('flex');
      }

      if (msgs) msgs.innerHTML = '';
      if (chat) chat.classList.add('hidden');
      if (docked) docked.classList.add('hidden');
      
      if (hero) {
        hero.classList.remove('hidden');
        hero.classList.add('flex');
      }
      renderSubjectGrid();
      toggleSubjectGrid(false);
      const heroInp = document.getElementById('heroInput');
      if (heroInp) {
        heroInp.value = '';
        setTimeout(() => heroInp.focus(), 50);
      }
      renderRecentChats();
    }

    function updateActiveSubjectBadge() {
      const badge = document.getElementById('activeSubjectHeaderBadge');
      const icon = document.getElementById('activeSubjectHeaderIcon');
      const txt = document.getElementById('activeSubjectHeaderText');
      if (!badge) return;
      if (currentSelectedSubject) {
        badge.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium select-none animate-fadeIn';
        if (icon) {
          icon.className = `w-3.5 h-3.5 flex items-center justify-center ${currentSelectedSubject.iconColor}`;
          icon.innerHTML = currentSelectedSubject.svgIcon;
        }
        if (txt) txt.innerText = currentSelectedSubject.name;
        badge.classList.remove('hidden');
        badge.classList.add('flex');
      } else {
        badge.className = 'flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium select-none animate-fadeIn';
        if (icon) {
          icon.className = `w-3.5 h-3.5 flex items-center justify-center text-amber-400`;
          icon.innerHTML = `<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`;
        }
        if (txt) txt.innerText = 'বিষয় পর্যালোচনাধীন';
        badge.classList.remove('hidden');
        badge.classList.add('flex');
      }
    }

    function activateChatView() {
      if (isChatActive) {
        updateActiveSubjectBadge();
        return;
      }
      isChatActive = true;
      const hero = document.getElementById('heroView');
      const chat = document.getElementById('chatView');
      const docked = document.getElementById('dockedBar');

      hero.classList.add('hidden');
      hero.classList.remove('flex');
      chat.classList.remove('hidden');
      docked.classList.remove('hidden');

      updateActiveSubjectBadge();

      setTimeout(() => {
        const dockedInp = document.getElementById('dockedInput');
        if (dockedInp) dockedInp.focus();
      }, 50);
    }

