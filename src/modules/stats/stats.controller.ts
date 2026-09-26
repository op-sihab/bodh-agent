import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { StatsService } from './stats.service.js';

@Controller('api')
export class StatsController {
  private statsService: StatsService;

  constructor(@Inject(StatsService) statsService?: StatsService) {
    this.statsService = statsService || new StatsService();
  }

  @Get('stats')
  getStats() {
    return this.statsService.getStats();
  }

  @Get('gateway/stats')
  getGatewayStats() {
    return this.statsService.getGatewayStats();
  }

  @Get('credit/status')
  getCreditStatus() {
    return this.statsService.getCreditStatus();
  }

  @Post('credit/reset')
  resetCredit(@Body() body: any) {
    return this.statsService.resetCredits(body?.amount);
  }
}
