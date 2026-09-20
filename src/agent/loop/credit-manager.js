// BODH AI Demo User Credit Management Engine
// Rule: Initial 500 credits; 1 credit per 1k tokens; Strictly integer deductions (no fractions like 0.5)

import { toBnDigits } from "../../config/subject-map.js";

const DEFAULT_TOTAL_CREDITS = 500;
const TOKENS_PER_CREDIT = 1000;

class CreditManager {
  constructor(totalCredits = DEFAULT_TOTAL_CREDITS) {
    this.totalCredits = totalCredits;
    this.remainingCredits = totalCredits;
    this.usedCredits = 0;
    this.totalTokensConsumed = 0;
    this.history = [];
  }

  /**
   * Check if user has at least 1 credit to proceed
   */
  hasEnoughCredit() {
    return this.remainingCredits > 0;
  }

  /**
   * Deduct credit based on total tokens used in a turn.
   * STRICT RULE: Never deduct fractions (e.g. 0.5).
   * Direct integer deductions: Math.max(1, Math.ceil(totalTokens / 1000)).
   */
  deductCredits(totalTokens = 0) {
    if (this.remainingCredits <= 0) {
      return {
        deducted: 0,
        remainingCredits: 0,
        totalCredits: this.totalCredits,
        usedCredits: this.usedCredits,
        isExhausted: true
      };
    }

    // Minimum 1 credit per query, integer ceiling for every 1k tokens
    const tokens = Math.max(0, parseInt(totalTokens, 10) || 0);
    const creditCost = Math.max(1, Math.ceil(tokens / TOKENS_PER_CREDIT));

    // Deduct whole integer credits
    const actualDeduction = Math.min(this.remainingCredits, creditCost);
    this.remainingCredits -= actualDeduction;
    this.usedCredits += actualDeduction;
    this.totalTokensConsumed += tokens;

    const record = {
      timestamp: Date.now(),
      tokens,
      deducted: actualDeduction,
      remaining: this.remainingCredits
    };
    this.history.push(record);

    return {
      deducted: actualDeduction,
      remainingCredits: this.remainingCredits,
      totalCredits: this.totalCredits,
      usedCredits: this.usedCredits,
      totalTokensConsumed: this.totalTokensConsumed,
      isExhausted: this.remainingCredits <= 0
    };
  }

  /**
   * Return status snapshot with formatted Bengali digits
   */
  getStatus() {
    return {
      total_credits: this.totalCredits,
      remaining_credits: this.remainingCredits,
      used_credits: this.usedCredits,
      total_tokens_consumed: this.totalTokensConsumed,
      tokens_per_credit: TOKENS_PER_CREDIT,
      is_exhausted: this.remainingCredits <= 0,
      total_credits_bn: toBnDigits(this.totalCredits),
      remaining_credits_bn: toBnDigits(this.remainingCredits),
      used_credits_bn: toBnDigits(this.usedCredits)
    };
  }

  /**
   * Reset credits back to 500 for demo user
   */
  resetCredits(amount = DEFAULT_TOTAL_CREDITS) {
    this.totalCredits = amount;
    this.remainingCredits = amount;
    this.usedCredits = 0;
    this.totalTokensConsumed = 0;
    this.history = [];
    return this.getStatus();
  }
}

export const globalCreditManager = new CreditManager();
