import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Survey, SurveyStatus, SurveyQuestion, SurveyResponse, ResponseStatus } from '@o4o/lms-core';
import type { QuestionOption } from '@o4o/lms-core';
import logger from '../../../utils/logger.js';

/**
 * SurveyService
 * LMS Module - Survey Management (Phase 1 Refoundation)
 *
 * Core Survey Engine - handles Survey CRUD, Questions, and Responses
 */

export interface CreateSurveyRequest {
  title: string;
  description?: string;
  bundleId?: string;
  startAt?: Date;
  endAt?: Date;
  allowAnonymous?: boolean;
  allowMultipleResponses?: boolean;
  maxResponses?: number;
  metadata?: Record<string, any>;
}

export interface UpdateSurveyRequest extends Partial<CreateSurveyRequest> {
  status?: SurveyStatus;
}

export interface SurveyFilters {
  bundleId?: string;
  status?: SurveyStatus;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateQuestionRequest {
  type: string;
  question: string;
  description?: string;
  options?: QuestionOption[];
  isRequired?: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  maxLength?: number;
  conditionalDisplay?: {
    questionId: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: string;
  };
}

export class SurveyService extends BaseService<Survey> {
  private static instance: SurveyService;
  private surveyRepository: Repository<Survey>;
  private questionRepository: Repository<SurveyQuestion>;
  private responseRepository: Repository<SurveyResponse>;

  constructor() {
    const surveyRepository = AppDataSource.getRepository(Survey);
    super(surveyRepository);
    this.surveyRepository = surveyRepository;
    this.questionRepository = AppDataSource.getRepository(SurveyQuestion);
    this.responseRepository = AppDataSource.getRepository(SurveyResponse);
  }

  static getInstance(): SurveyService {
    if (!SurveyService.instance) {
      SurveyService.instance = new SurveyService();
    }
    return SurveyService.instance;
  }

  // ============================================
  // Survey CRUD
  // ============================================

  async createSurvey(data: CreateSurveyRequest): Promise<Survey> {
    const survey = this.surveyRepository.create({
      ...data,
      status: SurveyStatus.DRAFT,
      allowAnonymous: data.allowAnonymous ?? false,
      allowMultipleResponses: data.allowMultipleResponses ?? false,
      metadata: data.metadata || {},
    });
    return this.surveyRepository.save(survey);
  }

  async getSurvey(id: string): Promise<Survey | null> {
    return this.surveyRepository.findOne({ where: { id } });
  }

  async listSurveys(filters: SurveyFilters): Promise<{ surveys: Survey[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.surveyRepository.createQueryBuilder('survey');

    if (filters.bundleId) {
      queryBuilder.andWhere('survey.bundleId = :bundleId', { bundleId: filters.bundleId });
    }

    if (filters.status) {
      queryBuilder.andWhere('survey.status = :status', { status: filters.status });
    }

    if (filters.isPublished !== undefined) {
      queryBuilder.andWhere('survey.isPublished = :isPublished', { isPublished: filters.isPublished });
    }

    if (filters.search) {
      queryBuilder.andWhere('survey.title ILIKE :search', { search: `%${filters.search}%` });
    }

    queryBuilder.orderBy('survey.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [surveys, total] = await queryBuilder.getManyAndCount();
    return { surveys, total };
  }

  async updateSurvey(id: string, data: UpdateSurveyRequest): Promise<Survey | null> {
    const survey = await this.getSurvey(id);
    if (!survey) return null;

    Object.assign(survey, data);
    return this.surveyRepository.save(survey);
  }

  async deleteSurvey(id: string): Promise<boolean> {
    const result = await this.surveyRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // Publishing
  // ============================================

  async publishSurvey(id: string): Promise<Survey | null> {
    const survey = await this.getSurvey(id);
    if (!survey) return null;

    survey.publish();
    return this.surveyRepository.save(survey);
  }

  async closeSurvey(id: string): Promise<Survey | null> {
    const survey = await this.getSurvey(id);
    if (!survey) return null;

    survey.close();
    return this.surveyRepository.save(survey);
  }

  async archiveSurvey(id: string): Promise<Survey | null> {
    const survey = await this.getSurvey(id);
    if (!survey) return null;

    survey.archive();
    return this.surveyRepository.save(survey);
  }

  // ============================================
  // Questions Management
  // ============================================

  async getQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    return this.questionRepository.find({
      where: { surveyId },
      order: { order: 'ASC' },
    });
  }

  async addQuestion(surveyId: string, data: CreateQuestionRequest): Promise<SurveyQuestion | null> {
    const survey = await this.getSurvey(surveyId);
    if (!survey) return null;

    const existingQuestions = await this.getQuestions(surveyId);
    const order = existingQuestions.length;

    const question = this.questionRepository.create({
      surveyId,
      ...data,
      options: data.options || [],
      order,
      isRequired: data.isRequired ?? false,
    } as any);

    return this.questionRepository.save(question) as unknown as Promise<SurveyQuestion>;
  }

  async updateQuestion(questionId: string, data: Partial<CreateQuestionRequest>): Promise<SurveyQuestion | null> {
    const question = await this.questionRepository.findOne({ where: { id: questionId } });
    if (!question) return null;

    Object.assign(question, data);
    return this.questionRepository.save(question);
  }

  async deleteQuestion(questionId: string): Promise<boolean> {
    const question = await this.questionRepository.findOne({ where: { id: questionId } });
    if (!question) return false;

    const result = await this.questionRepository.delete(questionId);

    // Reorder remaining questions
    const remainingQuestions = await this.getQuestions(question.surveyId);
    for (let i = 0; i < remainingQuestions.length; i++) {
      remainingQuestions[i].order = i;
      await this.questionRepository.save(remainingQuestions[i]);
    }

    return (result.affected ?? 0) > 0;
  }

  async reorderQuestions(surveyId: string, questionIds: string[]): Promise<boolean> {
    for (let i = 0; i < questionIds.length; i++) {
      await this.questionRepository.update(questionIds[i], { order: i });
    }
    return true;
  }

  // ============================================
  // Responses
  // ============================================

  async startResponse(surveyId: string, userId?: string, options?: {
    isAnonymous?: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SurveyResponse | null> {
    const survey = await this.getSurvey(surveyId);
    if (!survey || !survey.isAcceptingResponses()) return null;

    // Check if user already responded (if not allowing multiple)
    if (!survey.allowMultipleResponses && userId) {
      const existing = await this.responseRepository.findOne({
        where: { surveyId, userId, status: ResponseStatus.COMPLETED },
      });
      if (existing) {
        throw new Error('User has already completed this survey');
      }
    }

    const response = this.responseRepository.create({
      surveyId,
      userId: options?.isAnonymous ? undefined : userId,
      isAnonymous: options?.isAnonymous || false,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      status: ResponseStatus.IN_PROGRESS,
    });

    return this.responseRepository.save(response);
  }

  async getResponse(responseId: string): Promise<SurveyResponse | null> {
    return this.responseRepository.findOne({ where: { id: responseId } });
  }

  async getSurveyResponses(surveyId: string, filters?: {
    status?: ResponseStatus;
    page?: number;
    limit?: number;
  }): Promise<{ responses: SurveyResponse[]; total: number }> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.responseRepository.createQueryBuilder('response')
      .where('response.surveyId = :surveyId', { surveyId });

    if (filters?.status) {
      queryBuilder.andWhere('response.status = :status', { status: filters.status });
    }

    queryBuilder.orderBy('response.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [responses, total] = await queryBuilder.getManyAndCount();
    return { responses, total };
  }

  async submitAnswer(responseId: string, questionId: string, value: any): Promise<SurveyResponse | null> {
    const response = await this.getResponse(responseId);
    if (!response || response.isCompleted()) return null;

    const question = await this.questionRepository.findOne({ where: { id: questionId } });
    if (!question || question.surveyId !== response.surveyId) return null;

    // Validate answer
    const validation = question.validateAnswer(value);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    response.setAnswer(questionId, value);
    return this.responseRepository.save(response);
  }

  async completeResponse(responseId: string): Promise<SurveyResponse | null> {
    const response = await this.getResponse(responseId);
    if (!response || response.isCompleted()) return null;

    // Validate all required questions are answered
    const questions = await this.getQuestions(response.surveyId);
    const requiredQuestions = questions.filter(q => q.isRequired);

    for (const question of requiredQuestions) {
      const answer = response.getAnswer(question.id);
      if (answer === undefined || answer === null || answer === '') {
        throw new Error(`Required question "${question.question}" is not answered`);
      }
    }

    response.complete();

    // Increment survey response count
    const survey = await this.getSurvey(response.surveyId);
    if (survey) {
      survey.incrementResponseCount();
      await this.surveyRepository.save(survey);
    }

    return this.responseRepository.save(response);
  }

  // ============================================
  // Stats
  // ============================================

  async getSurveyStats(surveyId: string): Promise<{
    totalResponses: number;
    completedResponses: number;
    completionRate: number;
    averageTimeSpent: number;
  }> {
    const responses = await this.responseRepository.find({
      where: { surveyId },
    });

    const completed = responses.filter(r => r.status === ResponseStatus.COMPLETED);
    const timeSpents = completed.map(r => r.timeSpent || 0).filter(t => t > 0);

    return {
      totalResponses: responses.length,
      completedResponses: completed.length,
      completionRate: responses.length > 0 ? (completed.length / responses.length) * 100 : 0,
      averageTimeSpent: timeSpents.length > 0 ? timeSpents.reduce((a, b) => a + b, 0) / timeSpents.length : 0,
    };
  }

  async getQuestionStats(surveyId: string): Promise<Array<{
    questionId: string;
    question: string;
    type: string;
    responseCount: number;
    answerDistribution: Record<string, number>;
  }>> {
    const questions = await this.getQuestions(surveyId);
    const responses = await this.responseRepository.find({
      where: { surveyId, status: ResponseStatus.COMPLETED },
    });

    return questions.map(q => {
      const answers = responses
        .map(r => r.getAnswer(q.id))
        .filter(a => a !== undefined && a !== null);

      const distribution: Record<string, number> = {};
      answers.forEach(answer => {
        const key = Array.isArray(answer) ? answer.join(', ') : String(answer);
        distribution[key] = (distribution[key] || 0) + 1;
      });

      return {
        questionId: q.id,
        question: q.question,
        type: q.type,
        responseCount: answers.length,
        answerDistribution: distribution,
      };
    });
  }
}
