import { Injectable } from '@nestjs/common';
import { runAgenticConversation, globalCreditManager } from '../../agent/loop/index.js';
import { ENV } from '../../config/env.js';
import type { Response } from 'express';

@Injectable()
export class ChatService {
  async handleStream(
    message: string,
    history: any[] = [],
    state: any = null,
    res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Check demo user credits
    if (!globalCreditManager.hasEnoughCredit()) {
      const payload = JSON.stringify({
        type: 'credit_exhausted',
        error: 'আপনার ক্রেডিট শেষ হয়ে গেছে! আর কোনো প্রশ্ন করতে অনুগ্রহ করে ক্রেডিট রিচার্জ করুন।',
        remainingCredits: 0,
        totalCredits: 500,
        credits: globalCreditManager.getStatus()
      });
      res.write(`data: ${payload}\n\n`);
      res.end();
      return;
    }

    try {
      await runAgenticConversation(
        message,
        async (event) => {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        },
        { history, state }
      );
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    } finally {
      res.end();
    }
  }

  async handleChat(message: string, history: any[] = [], state: any = null) {
    if (!globalCreditManager.hasEnoughCredit()) {
      return {
        status: 402,
        data: {
          success: false,
          credit_exhausted: true,
          error: 'আপনার ক্রেডিট শেষ হয়ে গেছে! আর কোনো প্রশ্ন করতে অনুগ্রহ করে ক্রেডিট রিচার্জ করুন।',
          remainingCredits: 0,
          totalCredits: 500,
          credits: globalCreditManager.getStatus()
        }
      };
    }

    let finalResponse = null;
    try {
      await runAgenticConversation(
        message,
        (event) => {
          if (event.type === 'done') {
            finalResponse = event;
          }
        },
        { history, state }
      );

      return {
        status: 200,
        data: {
          success: true,
          ...finalResponse
        }
      };
    } catch (err: any) {
      return {
        status: 500,
        data: {
          success: false,
          error: err.message
        }
      };
    }
  }

  async prewarm() {
    try {
      const aiUrl = ENV.AI_API_URL;
      fetch(aiUrl, { method: 'HEAD' }).catch(() => {});
      return { status: 'warmed', timestamp: Date.now() };
    } catch (e) {
      return { status: 'ok' };
    }
  }
}
