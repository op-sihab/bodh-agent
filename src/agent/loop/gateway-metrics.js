// Merge Gateway Metrics, Token Accounting, and Cost Optimization Telemetry Engine
import { toBnDigits } from "../../config/subject-map.js";
import { ENV } from "../../config/env.js";

// Global In-Memory Cumulative Tracker (Per process runtime)
const globalGatewayStats = {
  totalQueries: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  totalCostUsd: 0,
  totalCostSavedUsd: 0,
  jevDecisionsCount: 0,
  startedAt: Date.now(),
  lastQueryAt: null
};

export function trackGatewayCost(costUsd = 0, inTokens = 0, outTokens = 0) {
  globalGatewayStats.jevDecisionsCount++;
  globalGatewayStats.totalCostUsd += costUsd;
  globalGatewayStats.totalInputTokens += inTokens;
  globalGatewayStats.totalOutputTokens += outTokens;
  globalGatewayStats.totalTokens += (inTokens + outTokens);
}

// Exchange rate: 1 USD = 122.50 BDT (Live market reference for Bangladesh)
export const USD_TO_BDT_RATE = 122.50;

// Pricing benchmarks per 1M tokens (USD)
export const MODEL_PRICING = {
  "openai/gpt-5.6-luna": {
    inputPer1M: 0.20,
    outputPer1M: 0.80
  },
  "default": {
    inputPer1M: 0.25,
    outputPer1M: 1.00
  }
};

/**
 * Format USD amount with high decimal precision for micro-costs
 */
export function formatCostUsd(usd) {
  if (usd === null || usd === undefined || isNaN(usd)) return "$0.000000";
  if (usd === 0) return "$0.000000";
  if (usd < 0.00001) return "$" + usd.toFixed(7);
  if (usd < 0.001) return "$" + usd.toFixed(6);
  if (usd < 0.01) return "$" + usd.toFixed(5);
  return "$" + usd.toFixed(4);
}

/**
 * Format BDT amount in Bengali digits with micro-paisa precision
 */
export function formatCostBdt(bdt) {
  if (bdt === null || bdt === undefined || isNaN(bdt)) return "৳০.০০০০";
  if (bdt === 0) return "৳০.০০০০";
  const str = bdt < 0.01 ? bdt.toFixed(5) : bdt.toFixed(3);
  return "৳" + toBnDigits(str);
}

/**
 * Estimate or calculate step cost based on tokens or direct Merge Gateway figures
 */
export function calculateStepCost({ inputTokens = 0, outputTokens = 0, gatewayCostUsd = null, model = ENV.MODEL_NAME }) {
  if (typeof gatewayCostUsd === "number" && gatewayCostUsd > 0) {
    return gatewayCostUsd;
  }

  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const inCost = (inputTokens / 1000000) * pricing.inputPer1M;
  const outCost = (outputTokens / 1000000) * pricing.outputPer1M;
  return +(inCost + outCost).toFixed(8);
}

/**
 * Calculate baseline cost (what it would have cost with unoptimized legacy 76KB prompt + all 10 tools)
 */
export function calculateBaselineCost(outputTokens = 0, model = ENV.MODEL_NAME) {
  const BASELINE_INPUT_TOKENS = 18760; // 76,071 bytes / 4
  const pricing = MODEL_PRICING[model] || MODEL_PRICING.default;
  const inCost = (BASELINE_INPUT_TOKENS / 1000000) * pricing.inputPer1M;
  const outCost = (outputTokens / 1000000) * pricing.outputPer1M;
  return +(inCost + outCost).toFixed(8);
}

/**
 * Record a completed query in global telemetry
 */
export function recordGatewayCall({
  inputTokens = 0,
  outputTokens = 0,
  totalTokens = 0,
  costUsd = 0,
  costSavedUsd = 0
}) {
  globalGatewayStats.totalQueries++;
  globalGatewayStats.totalInputTokens += inputTokens;
  globalGatewayStats.totalOutputTokens += outputTokens;
  globalGatewayStats.totalTokens += (totalTokens || (inputTokens + outputTokens));
  globalGatewayStats.totalCostUsd += costUsd;
  globalGatewayStats.totalCostSavedUsd += costSavedUsd;
  globalGatewayStats.lastQueryAt = Date.now();
}

/**
 * Return global telemetry snapshot for API endpoints and dashboard
 */
export function getGatewayGlobalStats() {
  const costBdt = globalGatewayStats.totalCostUsd * USD_TO_BDT_RATE;
  const savedBdt = globalGatewayStats.totalCostSavedUsd * USD_TO_BDT_RATE;
  const avgCostUsd = globalGatewayStats.totalQueries > 0
    ? globalGatewayStats.totalCostUsd / globalGatewayStats.totalQueries
    : 0;
  const avgCostBdt = avgCostUsd * USD_TO_BDT_RATE;

  const totalBaseline = globalGatewayStats.totalCostUsd + globalGatewayStats.totalCostSavedUsd;
  const overallSavingsPercent = totalBaseline > 0
    ? Math.round((globalGatewayStats.totalCostSavedUsd / totalBaseline) * 100)
    : 0;

  return {
    gateway: "Merge.dev AI Gateway",
    model: ENV.MODEL_NAME,
    total_queries: globalGatewayStats.totalQueries,
    jev_decisions: globalGatewayStats.jevDecisionsCount,
    total_input_tokens: globalGatewayStats.totalInputTokens,
    total_output_tokens: globalGatewayStats.totalOutputTokens,
    total_tokens: globalGatewayStats.totalTokens,
    total_cost_usd: +globalGatewayStats.totalCostUsd.toFixed(6),
    total_cost_bdt: +costBdt.toFixed(4),
    total_cost_formatted_usd: formatCostUsd(globalGatewayStats.totalCostUsd),
    total_cost_formatted_bdt: formatCostBdt(costBdt),
    total_cost_saved_usd: +globalGatewayStats.totalCostSavedUsd.toFixed(6),
    total_cost_saved_bdt: +savedBdt.toFixed(4),
    total_cost_saved_formatted_usd: formatCostUsd(globalGatewayStats.totalCostSavedUsd),
    total_cost_saved_formatted_bdt: formatCostBdt(savedBdt),
    overall_savings_percent: overallSavingsPercent,
    avg_cost_per_query_usd: +avgCostUsd.toFixed(6),
    avg_cost_per_query_bdt: +avgCostBdt.toFixed(4),
    avg_cost_formatted_usd: formatCostUsd(avgCostUsd),
    avg_cost_formatted_bdt: formatCostBdt(avgCostBdt),
    usd_to_bdt_rate: USD_TO_BDT_RATE,
    uptime_seconds: Math.round((Date.now() - globalGatewayStats.startedAt) / 1000)
  };
}
