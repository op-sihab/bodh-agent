import { Controller, Post, Body, Res, BadRequestException, Inject } from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service.js';

@Controller('api/chat')
export class ChatController {
  private chatService: ChatService;

  constructor(@Inject(ChatService) chatService?: ChatService) {
    this.chatService = chatService || new ChatService();
  }

  @Post('stream')
  async streamChat(
    @Body() body: any,
    @Res() res: Response
  ) {
    const message = body?.message || '';
    const history = body?.history || [];
    const state = body?.state || null;

    if (!message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    await this.chatService.handleStream(message, history, state, res);
  }

  @Post()
  async chat(@Body() body: any, @Res() res: Response) {
    const message = body?.message || '';
    const history = body?.history || [];
    const state = body?.state || null;

    if (!message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await this.chatService.handleChat(message, history, state);
    return res.status(result.status).json(result.data);
  }

  @Post('prewarm')
  async prewarm() {
    return this.chatService.prewarm();
  }
}
