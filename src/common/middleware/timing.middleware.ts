import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class TimingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = performance.now();
    res.on('finish', () => {
      const ms = Math.round(performance.now() - start);
      try {
        if (!res.headersSent) {
          res.setHeader('X-Response-Time', `${ms}ms`);
        }
      } catch (e) {}
    });
    next();
  }
}
