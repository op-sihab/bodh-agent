// BODH Merge.dev AI Gateway Telemetry & Demo Credit Wallet
    // =========================================================
    const msgGatewayTelemetryMap = {};

    async function refreshGatewayHeaderStats() {
      try {
        const res = await fetch('/api/gateway/stats');
        if (res.ok) {
          const stats = await res.json();
          const badgeEl = document.getElementById('headerTotalCost');
          if (badgeEl) {
            badgeEl.innerText = stats.total_cost_formatted_usd || '$0.00';
          }
        }
      } catch (e) {}
    }

    async function openGatewayDashboardModal() {
      const modal = document.getElementById('gatewayDashboardModal');
      if (!modal) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      try {
        const res = await fetch('/api/gateway/stats');
        if (res.ok) {
          const data = await res.json();
          document.getElementById('gdwTotalCostUsd').innerText = data.total_cost_formatted_usd || '$0.00';
          document.getElementById('gdwTotalCostBdt').innerText = data.total_cost_formatted_bdt || '৳০.০০';
          document.getElementById('gdwTotalTokens').innerText = toBnDigits(data.total_tokens || 0);
          document.getElementById('gdwSavingsPercent').innerText = `${toBnDigits(data.overall_savings_percent || 0)}%`;
          document.getElementById('gdwSavedUsd').innerText = data.total_cost_saved_formatted_usd || '$0.00';
          document.getElementById('gdwTotalQueries').innerText = toBnDigits(data.total_queries || 0);
          document.getElementById('gdwInTokens').innerText = toBnDigits(data.total_input_tokens || 0);
          document.getElementById('gdwOutTokens').innerText = toBnDigits(data.total_output_tokens || 0);
          document.getElementById('gdwAvgCostUsd').innerText = data.avg_cost_formatted_usd || '$0.00';
          document.getElementById('gdwAvgCostBdt').innerText = data.avg_cost_formatted_bdt || '৳০.০০';
          document.getElementById('gdwModelName').innerText = data.model || 'openai/gpt-5.6-luna';
        }
      } catch (e) {}
    }

    function closeGatewayDashboardModal() {
      const modal = document.getElementById('gatewayDashboardModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function openMessageGatewayModal(msgId) {
      const item = msgGatewayTelemetryMap[msgId];
      if (!item || !item.gateway) {
        openGatewayDashboardModal();
        return;
      }
      const gw = item.gateway;
      const modal = document.getElementById('gatewayMessageDetailsModal');
      if (!modal) return;

      const costUsd = gw.cost_formatted_usd || '$0.00';
      const costBdt = gw.cost_formatted_bdt || '৳০.০০';
      const inTokens = gw.input_tokens || 0;
      const outTokens = gw.output_tokens || 0;
      const totalTokens = gw.total_tokens || (inTokens + outTokens);
      const savingsPct = gw.savings_percent || 0;
      const baselineCost = gw.baseline_cost_usd ? `$${gw.baseline_cost_usd.toFixed(6)}` : '$0.00';

      const inPct = totalTokens > 0 ? Math.max(5, Math.round((inTokens / totalTokens) * 100)) : 80;
      const outPct = Math.max(5, 100 - inPct);

      document.getElementById('msgCostUsd').innerText = costUsd;
      document.getElementById('msgCostBdt').innerText = `(${costBdt})`;
      document.getElementById('msgSavingsPercent').innerText = `${toBnDigits(savingsPct)}%`;
      document.getElementById('msgBaselineNote').innerText = `বেসলাইন আনঅপ্টিমাইজড খরচ: ${baselineCost}`;

      document.getElementById('msgInputLegend').innerText = toBnDigits(inTokens);
      document.getElementById('msgInputPct').innerText = `${toBnDigits(inPct)}%`;
      document.getElementById('msgOutputLegend').innerText = toBnDigits(outTokens);
      document.getElementById('msgOutputPct').innerText = `${toBnDigits(outPct)}%`;

      document.getElementById('msgBarInput').style.width = `${inPct}%`;
      document.getElementById('msgBarOutput').style.width = `${outPct}%`;

      document.getElementById('msgInputTokens').innerText = `${toBnDigits(inTokens)}`;
      document.getElementById('msgOutputTokens').innerText = `${toBnDigits(outTokens)}`;
      document.getElementById('msgTotalTokens').innerText = `${toBnDigits(totalTokens)} টোকেন`;

      const lat = gw.gateway_latency_ms || item.latencyMs || 0;
      document.getElementById('msgGatewayLatency').innerText = lat >= 1000 ? `${toBnDigits((lat / 1000).toFixed(1))}s` : `${toBnDigits(lat)} ms`;
      document.getElementById('msgSteps').innerText = toBnDigits(gw.steps_count || 1);
      document.getElementById('msgModel').innerText = gw.model || 'openai/gpt-5.6-luna';

      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeMessageGatewayModal() {
      const modal = document.getElementById('gatewayMessageDetailsModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    // =========================================================
    // DEMO USER CREDIT WALLET CONTROLLER (500 Credits, 1k tokens = 1 credit, strict integers)
    // =========================================================
    let currentUserCredits = 500;

    function updateHeaderCreditDisplay(remaining, total = 500) {
      currentUserCredits = Math.max(0, parseInt(remaining, 10) || 0);
      const el = document.getElementById('headerRemainingCredit');
      const badge = document.getElementById('headerCreditBadge');
      if (el) el.innerText = toBnDigits(currentUserCredits);

      const modalEl = document.getElementById('modalRemainingCredit');
      if (modalEl) modalEl.innerText = toBnDigits(currentUserCredits);

      if (badge) {
        if (currentUserCredits <= 0) {
          badge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/[0.12] hover:bg-rose-500/[0.2] border border-rose-500/30 text-rose-300 text-xs font-mono transition cursor-pointer shadow-sm select-none animate-pulse";
          if (el) el.className = "font-bold text-rose-400 text-[11px]";
        } else if (currentUserCredits <= 50) {
          badge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/[0.12] hover:bg-amber-500/[0.2] border border-amber-500/30 text-amber-300 text-xs font-mono transition cursor-pointer shadow-sm select-none";
          if (el) el.className = "font-bold text-amber-400 text-[11px]";
        } else {
          badge.className = "flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] border border-emerald-500/20 hover:border-emerald-500/35 text-emerald-300 hover:text-emerald-200 text-xs font-mono transition cursor-pointer shadow-sm select-none";
          if (el) el.className = "font-bold text-emerald-400 text-[11px]";
        }
      }
    }

    async function fetchCreditStatus() {
      try {
        const res = await fetch('/api/credit/status');
        if (res.ok) {
          const cred = await res.json();
          updateHeaderCreditDisplay(cred.remaining_credits, cred.total_credits);
        }
      } catch (e) {}
    }

    async function resetUserDemoCredits() {
      try {
        const res = await fetch('/api/credit/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: 500 })
        });
        if (res.ok) {
          const cred = await res.json();
          updateHeaderCreditDisplay(cred.remaining_credits, cred.total_credits);
          showToast('✅ ৫০০ ডেমো ক্রেডিট সফলভাবে যোগ করা হয়েছে!');
          closeCreditModal();
        }
      } catch (e) {
        showToast('ত্রুটি: ক্রেডিট রিসেট করা যায়নি।');
      }
    }

    function openCreditModal() {
      const modal = document.getElementById('creditModal');
      if (!modal) return;
      const modalEl = document.getElementById('modalRemainingCredit');
      if (modalEl) modalEl.innerText = toBnDigits(currentUserCredits);
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeCreditModal() {
      const modal = document.getElementById('creditModal');
      if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      }
    }

    function showCreditExhaustedChatBanner() {
      const area = document.getElementById('messagesArea');
      if (!area) return;
      const bannerHtml = `
        <div class="my-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-500/[0.12] via-[#1a1215] to-[#121218] border border-rose-500/30 shadow-[0_4px_24px_rgba(244,63,94,0.15)] select-none animate-fadeIn">
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
      area.insertAdjacentHTML('beforeend', bannerHtml);
      scrollToBottom();
    }

