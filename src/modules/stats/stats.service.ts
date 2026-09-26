import { Injectable } from '@nestjs/common';
import { appCache } from '../../core/cache.js';
import { ENV } from '../../config/env.js';
import { getGatewayGlobalStats } from '../../agent/loop/gateway-metrics.js';
import { globalCreditManager } from '../../agent/loop/credit-manager.js';

@Injectable()
export class StatsService {
  getStats() {
    return {
      status: 'online',
      name: ENV.APP_NAME,
      tagline: ENV.APP_TAGLINE,
      mode: ENV.APP_MODE,
      model: `${ENV.MODEL_NAME} (Merge.dev Gateway)`,
      database: 'BODH Local HSC SQLite (299,432 Questions + 299,419 Vectors)',
      cache: appCache.getStats(),
      gateway: getGatewayGlobalStats(),
      credits: globalCreditManager.getStatus(),
      timestamp: new Date().toISOString()
    };
  }

  getGatewayStats() {
    return getGatewayGlobalStats();
  }

  getCreditStatus() {
    return globalCreditManager.getStatus();
  }

  resetCredits(amount?: any) {
    const parsedAmount = typeof amount === 'number' 
      ? amount 
      : (parseInt(amount, 10) >= 0 ? parseInt(amount, 10) : 500);
    return globalCreditManager.resetCredits(parsedAmount);
  }
}
