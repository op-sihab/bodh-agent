import { Controller, Get, Post, All, Query, Body, Res, Req, Inject } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AcademicService } from './academic.service.js';

@Controller('api/academic')
export class AcademicController {
  private academicService: AcademicService;

  constructor(@Inject(AcademicService) academicService?: AcademicService) {
    this.academicService = academicService || new AcademicService();
  }

  @Get('subjects')
  async getSubjects() {
    return this.academicService.getSubjects();
  }

  @Get('chapters')
  async getChapters(@Query('subject_id') subjectId?: string) {
    return this.academicService.getChapters(subjectId);
  }

  @Get('board-exams')
  async getBoardExams(@Query('board') board?: string) {
    return this.academicService.getBoardExams(board);
  }

  @Get('cq')
  async getCQ(
    @Query('subject_id') subjectId?: string,
    @Query('count') count?: string
  ) {
    const parsedCount = parseInt(count || '2', 10) || 2;
    return this.academicService.getCQ(subjectId, parsedCount);
  }

  @Get('frequency')
  async getFrequency(@Query('topic') topic?: string) {
    return this.academicService.getFrequency(topic);
  }

  @Get('quiz')
  async getQuiz(
    @Query('subject_id') subjectId?: string,
    @Query('count') count?: string
  ) {
    const parsedCount = parseInt(count || '5', 10) || 5;
    return this.academicService.getQuiz(subjectId, parsedCount);
  }

  @Get('search')
  async search(@Query('q') q?: string) {
    return this.academicService.searchQuestions(q || '', 10);
  }

  @Get('similar')
  async getSimilar(
    @Query('qid') qid?: string,
    @Query('q') queryText?: string,
    @Query('subject_id') subjectId?: string,
    @Query('limit') limit?: string
  ) {
    const parsedLimit = parseInt(limit || '4', 10) || 4;
    return this.academicService.getSimilarQuestions({
      questionId: qid,
      queryText,
      subjectId,
      limit: parsedLimit
    });
  }

  @All('quiz/generate')
  async generateQuiz(
    @Req() req: Request,
    @Query() query: any,
    @Body() body: any
  ) {
    const combinedParams = { ...(query || {}), ...(body || {}) };
    return this.academicService.generateQuiz(combinedParams);
  }

  @Post('quiz/explain')
  async explainQuiz(@Body() body: any, @Res() res: Response) {
    return this.academicService.explainQuiz(body, res);
  }

  @Post('quiz/copilot')
  async copilotQuiz(@Body() body: any, @Res() res: Response) {
    return this.academicService.copilotQuiz(body, res);
  }
}
