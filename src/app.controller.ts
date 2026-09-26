import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

@Controller()
export class AppController {
  @Get()
  getIndex(@Res() res: Response) {
    const htmlPath = join(process.cwd(), 'public', 'index.html');
    if (existsSync(htmlPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(readFileSync(htmlPath, 'utf-8'));
    }
    return res.send('BODH AI (Autonomous Academic Intelligence) running!');
  }
}
