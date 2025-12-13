import { DataSource, Repository } from 'typeorm';
import { Survey, SurveyStatus } from '../entities/Survey.js';
import { SurveyQuestion, QuestionType, QuestionOption } from '../entities/SurveyQuestion.js';
import { SurveyResponse, ResponseStatus, QuestionAnswer } from '../entities/SurveyResponse.js';

/**
 * SurveyService
 *
 * 설문조사 엔진 서비스
 * - CRUD 기능
 * - Publish 기능
 * - Response 저장 기능
 */
export class SurveyService {
  private surveyRepository: Repository<Survey>;
  private questionRepository: Repository<SurveyQuestion>;
  private responseRepository: Repository<SurveyResponse>;
  private initialized = false;

  constructor(private dataSource?: DataSource) {
    if (dataSource) {
      this.initRepositories(dataSource);
    }
  }

  /**
   * Initialize with DataSource
   */
  initService(dataSource: DataSource): void {
    this.initRepositories(dataSource);
  }

  private initRepositories(dataSource: DataSource): void {
    this.surveyRepository = dataSource.getRepository(Survey);
    this.questionRepository = dataSource.getRepository(SurveyQuestion);
    this.responseRepository = dataSource.getRepository(SurveyResponse);
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('SurveyService not initialized. Call initService(dataSource) first.');
    }
  }

  // ============================================
  // Survey CRUD
  // ============================================

  /**
   * Create a new survey
   */
  async create(data: Partial<Survey>): Promise<Survey> {
    this.ensureInitialized();
    const survey = this.surveyRepository.create(data);
    return this.surveyRepository.save(survey);
  }

  /**
   * Find survey by ID
   */
  async findById(id: string): Promise<Survey | null> {
    this.ensureInitialized();
    return this.surveyRepository.findOne({ where: { id } });
  }

  /**
   * List surveys with optional filters
   */
  async list(options: {
    bundleId?: string;
    status?: SurveyStatus;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: Survey[]; total: number }> {
    this.ensureInitialized();

    const { bundleId, status, isPublished, page = 1, limit = 20 } = options;

    const qb = this.surveyRepository.createQueryBuilder('survey');

    if (bundleId) {
      qb.andWhere('survey.bundleId = :bundleId', { bundleId });
    }
    if (status) {
      qb.andWhere('survey.status = :status', { status });
    }
    if (isPublished !== undefined) {
      qb.andWhere('survey.isPublished = :isPublished', { isPublished });
    }

    qb.orderBy('survey.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Update survey
   */
  async update(id: string, data: Partial<Survey>): Promise<Survey | null> {
    this.ensureInitialized();
    await this.surveyRepository.update(id, data);
    return this.findById(id);
  }

  /**
   * Delete survey
   */
  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    // Delete questions first
    await this.questionRepository.delete({ surveyId: id });
    // Delete responses
    await this.responseRepository.delete({ surveyId: id });
    // Delete survey
    const result = await this.surveyRepository.delete(id);
    return result.affected !== 0;
  }

  // ============================================
  // Survey with Questions
  // ============================================

  /**
   * Get survey with all questions
   */
  async getSurveyWithQuestions(id: string): Promise<{
    survey: Survey;
    questions: SurveyQuestion[];
  } | null> {
    this.ensureInitialized();

    const survey = await this.findById(id);
    if (!survey) return null;

    const questions = await this.questionRepository.find({
      where: { surveyId: id },
      order: { order: 'ASC' },
    });

    return { survey, questions };
  }

  // ============================================
  // Survey Questions
  // ============================================

  /**
   * Add a question to survey
   */
  async addQuestion(
    surveyId: string,
    data: Partial<SurveyQuestion>,
  ): Promise<SurveyQuestion | null> {
    this.ensureInitialized();

    const survey = await this.findById(surveyId);
    if (!survey) return null;

    // Get the next order
    const lastQuestion = await this.questionRepository.findOne({
      where: { surveyId },
      order: { order: 'DESC' },
    });

    const question = this.questionRepository.create({
      ...data,
      surveyId,
      order: lastQuestion ? lastQuestion.order + 1 : 0,
    });

    return this.questionRepository.save(question);
  }

  /**
   * Update a question
   */
  async updateQuestion(
    questionId: string,
    data: Partial<SurveyQuestion>,
  ): Promise<SurveyQuestion | null> {
    this.ensureInitialized();
    await this.questionRepository.update(questionId, data);
    return this.questionRepository.findOne({ where: { id: questionId } });
  }

  /**
   * Delete a question
   */
  async deleteQuestion(questionId: string): Promise<boolean> {
    this.ensureInitialized();
    const result = await this.questionRepository.delete(questionId);
    return result.affected !== 0;
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(surveyId: string, questionIds: string[]): Promise<void> {
    this.ensureInitialized();

    for (let i = 0; i < questionIds.length; i++) {
      await this.questionRepository.update(questionIds[i], { order: i });
    }
  }

  /**
   * Get questions for a survey
   */
  async getQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    this.ensureInitialized();
    return this.questionRepository.find({
      where: { surveyId },
      order: { order: 'ASC' },
    });
  }

  // ============================================
  // Publishing
  // ============================================

  /**
   * Publish survey
   */
  async publish(id: string): Promise<Survey | null> {
    this.ensureInitialized();
    const survey = await this.findById(id);
    if (!survey) return null;

    survey.publish();
    return this.surveyRepository.save(survey);
  }

  /**
   * Close survey
   */
  async close(id: string): Promise<Survey | null> {
    this.ensureInitialized();
    const survey = await this.findById(id);
    if (!survey) return null;

    survey.close();
    return this.surveyRepository.save(survey);
  }

  /**
   * Archive survey
   */
  async archive(id: string): Promise<Survey | null> {
    this.ensureInitialized();
    const survey = await this.findById(id);
    if (!survey) return null;

    survey.archive();
    return this.surveyRepository.save(survey);
  }

  // ============================================
  // Survey Responses
  // ============================================

  /**
   * Start a response (create or get existing in-progress response)
   */
  async startResponse(
    surveyId: string,
    userId?: string,
    options: {
      isAnonymous?: boolean;
      ipAddress?: string;
      userAgent?: string;
    } = {},
  ): Promise<SurveyResponse | null> {
    this.ensureInitialized();

    const survey = await this.findById(surveyId);
    if (!survey || !survey.isAcceptingResponses()) return null;

    // Check for existing in-progress response (for non-anonymous)
    if (userId && !options.isAnonymous) {
      const existing = await this.responseRepository.findOne({
        where: {
          surveyId,
          userId,
          status: ResponseStatus.IN_PROGRESS,
        },
      });
      if (existing) return existing;

      // Check multiple response policy
      if (!survey.allowMultipleResponses) {
        const completed = await this.responseRepository.findOne({
          where: {
            surveyId,
            userId,
            status: ResponseStatus.COMPLETED,
          },
        });
        if (completed) {
          throw new Error('User has already completed this survey');
        }
      }
    }

    const response = this.responseRepository.create({
      surveyId,
      userId: options.isAnonymous ? undefined : userId,
      isAnonymous: options.isAnonymous || survey.allowAnonymous,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      status: ResponseStatus.IN_PROGRESS,
    });

    return this.responseRepository.save(response);
  }

  /**
   * Add response (submit an answer to a question)
   */
  async addResponse(
    responseId: string,
    questionId: string,
    value: any,
  ): Promise<SurveyResponse | null> {
    this.ensureInitialized();

    const response = await this.responseRepository.findOne({
      where: { id: responseId },
    });
    if (!response || response.isCompleted()) return null;

    // Validate the answer
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
    });
    if (!question) return null;

    const validation = question.validateAnswer(value);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    response.setAnswer(questionId, value);
    return this.responseRepository.save(response);
  }

  /**
   * Complete a response
   */
  async completeResponse(responseId: string): Promise<SurveyResponse | null> {
    this.ensureInitialized();

    const response = await this.responseRepository.findOne({
      where: { id: responseId },
    });
    if (!response || response.isCompleted()) return null;

    // Validate all required questions are answered
    const questions = await this.getQuestions(response.surveyId);
    const requiredQuestions = questions.filter((q) => q.isRequired);

    for (const question of requiredQuestions) {
      const answer = response.getAnswer(question.id);
      if (answer === undefined || answer === null || answer === '') {
        throw new Error(`Question "${question.question}" is required`);
      }
    }

    response.complete();

    // Increment survey response count
    const survey = await this.findById(response.surveyId);
    if (survey) {
      survey.incrementResponseCount();
      await this.surveyRepository.save(survey);
    }

    return this.responseRepository.save(response);
  }

  /**
   * Get user responses for a survey
   */
  async getUserResponses(
    surveyId: string,
    userId: string,
  ): Promise<SurveyResponse[]> {
    this.ensureInitialized();
    return this.responseRepository.find({
      where: { surveyId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get response by ID
   */
  async getResponse(responseId: string): Promise<SurveyResponse | null> {
    this.ensureInitialized();
    return this.responseRepository.findOne({ where: { id: responseId } });
  }

  /**
   * Get all responses for a survey
   */
  async getSurveyResponses(
    surveyId: string,
    options: {
      status?: ResponseStatus;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ items: SurveyResponse[]; total: number }> {
    this.ensureInitialized();

    const { status, page = 1, limit = 20 } = options;

    const qb = this.responseRepository.createQueryBuilder('response');
    qb.where('response.surveyId = :surveyId', { surveyId });

    if (status) {
      qb.andWhere('response.status = :status', { status });
    }

    qb.orderBy('response.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Get survey statistics
   */
  async getSurveyStats(surveyId: string): Promise<{
    totalResponses: number;
    completedResponses: number;
    inProgressResponses: number;
    abandonedResponses: number;
    avgCompletionTime: number;
    questionStats: Array<{
      questionId: string;
      question: string;
      answerDistribution: Record<string, number>;
    }>;
  }> {
    this.ensureInitialized();

    const allResponses = await this.responseRepository.find({
      where: { surveyId },
    });

    const completedResponses = allResponses.filter(
      (r) => r.status === ResponseStatus.COMPLETED,
    );
    const inProgressResponses = allResponses.filter(
      (r) => r.status === ResponseStatus.IN_PROGRESS,
    );
    const abandonedResponses = allResponses.filter(
      (r) => r.status === ResponseStatus.ABANDONED,
    );

    const avgCompletionTime =
      completedResponses.length > 0
        ? completedResponses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) /
          completedResponses.length
        : 0;

    // Calculate question stats
    const questions = await this.getQuestions(surveyId);
    const questionStats = questions.map((q) => {
      const answerDistribution: Record<string, number> = {};

      for (const response of completedResponses) {
        const answer = response.getAnswer(q.id);
        if (answer !== undefined && answer !== null) {
          const answerKey = Array.isArray(answer)
            ? answer.join(', ')
            : String(answer);
          answerDistribution[answerKey] = (answerDistribution[answerKey] || 0) + 1;
        }
      }

      return {
        questionId: q.id,
        question: q.question,
        answerDistribution,
      };
    });

    return {
      totalResponses: allResponses.length,
      completedResponses: completedResponses.length,
      inProgressResponses: inProgressResponses.length,
      abandonedResponses: abandonedResponses.length,
      avgCompletionTime: Math.round(avgCompletionTime),
      questionStats,
    };
  }
}

// Singleton instance for service registration
let surveyServiceInstance: SurveyService | null = null;

export function getSurveyService(): SurveyService {
  if (!surveyServiceInstance) {
    surveyServiceInstance = new SurveyService();
  }
  return surveyServiceInstance;
}

export function initSurveyService(dataSource: DataSource): SurveyService {
  const service = getSurveyService();
  service.initService(dataSource);
  return service;
}
