import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { StatsModule } from './modules/stats/stats.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { AcademicModule } from './modules/academic/academic.module.js';
import { TimingMiddleware } from './common/middleware/timing.middleware.js';

@Module({
  imports: [
    StatsModule,
    ChatModule,
    AcademicModule
  ],
  controllers: [AppController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TimingMiddleware)
      .forRoutes('*');
  }
}
