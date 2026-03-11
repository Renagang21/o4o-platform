import { DataSource, Repository } from 'typeorm';
import { Quiz, QuizQuestion } from '../entities/Quiz.js';
import { QuizAttempt, AttemptStatus } from '../entities/QuizAttempt.js';

/**
 * QuizService
 *
 * 퀴즈 엔진 서비스
 * - CRUD 기능
 * - Publish 기능
 * - Attempt 관리
 */
export class QuizService {
  private quizRepository: Repository<Quiz>;
  private attemptRepository: Repository<QuizAttempt>;
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
    this.quizRepository = dataSource.getRepository(Quiz);
    this.attemptRepository = dataSource.getRepository(QuizAttempt);
    this.initialized = true;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('QuizService not initialized. Call initService(dataSource) first.');
    }
  }

  // ============================================
  // Quiz CRUD
  // ============================================

  /**
   * Create a new quiz
   */
  async create(data: Partial<Quiz>): Promise<Quiz> {
    this.ensureInitialized();
    const quiz = this.quizRepository.create(data);
    return this.quizRepository.save(quiz);
  }

  /**
   * Find quiz by ID
   */
  async findById(id: string): Promise<Quiz | null> {
    this.ensureInitialized();
    return this.quizRepository.findOne({ where: { id } });
  }

  /**
   * List quizzes with optional filters
   */
  async list(options: {
    bundleId?: string;
    courseId?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{ items: Quiz[]; total: number }> {
    this.ensureInitialized();

    const { bundleId, courseId, isPublished, page = 1, limit = 20 } = options;

    const qb = this.quizRepository.createQueryBuilder('quiz');

    if (bundleId) {
      qb.andWhere('quiz.bundleId = :bundleId', { bundleId });
    }
    if (courseId) {
      qb.andWhere('quiz.courseId = :courseId', { courseId });
    }
    if (isPublished !== undefined) {
      qb.andWhere('quiz.isPublished = :isPublished', { isPublished });
    }

    qb.orderBy('quiz.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Update quiz
   */
  async update(id: string, data: Partial<Quiz>): Promise<Quiz | null> {
    this.ensureInitialized();
    await this.quizRepository.update(id, data);
    return this.findById(id);
  }

  /**
   * Delete quiz
   */
  async delete(id: string): Promise<boolean> {
    this.ensureInitialized();
    const result = await this.quizRepository.delete(id);
    return result.affected !== 0;
  }

  // ============================================
  // Quiz Questions
  // ============================================

  /**
   * Add a question to quiz
   */
  async addQuestion(
    quizId: string,
    question: Omit<QuizQuestion, 'order'>,
  ): Promise<Quiz | null> {
    this.ensureInitialized();
    const quiz = await this.findById(quizId);
    if (!quiz) return null;

    quiz.addQuestion(question);
    return this.quizRepository.save(quiz);
  }

  /**
   * Remove a question from quiz
   */
  async removeQuestion(quizId: string, questionId: string): Promise<Quiz | null> {
    this.ensureInitialized();
    const quiz = await this.findById(quizId);
    if (!quiz) return null;

    quiz.removeQuestion(questionId);
    return this.quizRepository.save(quiz);
  }

  /**
   * Reorder questions
   */
  async reorderQuestions(quizId: string, questionIds: string[]): Promise<Quiz | null> {
    this.ensureInitialized();
    const quiz = await this.findById(quizId);
    if (!quiz) return null;

    const reorderedQuestions: QuizQuestion[] = [];
    questionIds.forEach((id, index) => {
      const question = quiz.questions.find((q) => q.id === id);
      if (question) {
        reorderedQuestions.push({ ...question, order: index });
      }
    });

    quiz.questions = reorderedQuestions;
    return this.quizRepository.save(quiz);
  }

  // ============================================
  // Publishing
  // ============================================

  /**
   * Publish quiz
   */
  async publish(id: string): Promise<Quiz | null> {
    this.ensureInitialized();
    const quiz = await this.findById(id);
    if (!quiz) return null;

    quiz.publish();
    return this.quizRepository.save(quiz);
  }

  /**
   * Unpublish quiz
   */
  async unpublish(id: string): Promise<Quiz | null> {
    this.ensureInitialized();
    const quiz = await this.findById(id);
    if (!quiz) return null;

    quiz.unpublish();
    return this.quizRepository.save(quiz);
  }

  // ============================================
  // Quiz Attempts
  // ============================================

  /**
   * Start a quiz attempt
   */
  async startAttempt(quizId: string, userId: string): Promise<QuizAttempt | null> {
    this.ensureInitialized();

    const quiz = await this.findById(quizId);
    if (!quiz || !quiz.isPublished) return null;

    // Check max attempts
    if (quiz.maxAttempts) {
      const attemptCount = await this.attemptRepository.count({
        where: { quizId, userId },
      });
      if (attemptCount >= quiz.maxAttempts) {
        throw new Error('Maximum attempts reached');
      }
    }

    // Get attempt number
    const lastAttempt = await this.attemptRepository.findOne({
      where: { quizId, userId },
      order: { attemptNumber: 'DESC' },
    });

    const attempt = this.attemptRepository.create({
      quizId,
      userId,
      status: AttemptStatus.IN_PROGRESS,
      totalPoints: quiz.getTotalPoints(),
      attemptNumber: lastAttempt ? lastAttempt.attemptNumber + 1 : 1,
      startedAt: new Date(),
    });

    return this.attemptRepository.save(attempt);
  }

  /**
   * Submit an answer
   */
  async submitAnswer(
    attemptId: string,
    questionId: string,
    answer: any,
  ): Promise<QuizAttempt | null> {
    this.ensureInitialized();

    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
    });
    if (!attempt || !attempt.isInProgress()) return null;

    const quiz = await this.findById(attempt.quizId);
    if (!quiz) return null;

    // Find the question and check the answer
    const question = quiz.questions.find((q) => q.id === questionId);
    if (!question) return null;

    let isCorrect = false;
    if (question.type === 'single' || question.type === 'text') {
      isCorrect = question.answer === answer;
    } else if (question.type === 'multi' && Array.isArray(question.answer)) {
      const expectedAnswers = question.answer.sort();
      const givenAnswers = Array.isArray(answer) ? answer.sort() : [];
      isCorrect = JSON.stringify(expectedAnswers) === JSON.stringify(givenAnswers);
    }

    attempt.submitAnswer(questionId, answer, isCorrect, question.points);
    return this.attemptRepository.save(attempt);
  }

  /**
   * Complete an attempt
   */
  async completeAttempt(attemptId: string): Promise<QuizAttempt | null> {
    this.ensureInitialized();

    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
    });
    if (!attempt || !attempt.isInProgress()) return null;

    const quiz = await this.findById(attempt.quizId);
    if (!quiz) return null;

    attempt.complete(quiz.passingScore);
    return this.attemptRepository.save(attempt);
  }

  /**
   * Get user attempts for a quiz
   */
  async getUserAttempts(
    quizId: string,
    userId: string,
  ): Promise<QuizAttempt[]> {
    this.ensureInitialized();
    return this.attemptRepository.find({
      where: { quizId, userId },
      order: { attemptNumber: 'DESC' },
    });
  }

  /**
   * Get attempt by ID
   */
  async getAttempt(attemptId: string): Promise<QuizAttempt | null> {
    this.ensureInitialized();
    return this.attemptRepository.findOne({ where: { id: attemptId } });
  }

  /**
   * Get quiz with attempt stats
   */
  async getQuizWithStats(quizId: string): Promise<{
    quiz: Quiz;
    stats: {
      totalAttempts: number;
      avgScore: number;
      passRate: number;
    };
  } | null> {
    this.ensureInitialized();

    const quiz = await this.findById(quizId);
    if (!quiz) return null;

    const attempts = await this.attemptRepository.find({
      where: { quizId, status: AttemptStatus.COMPLETED },
    });

    const totalAttempts = attempts.length;
    const avgScore =
      totalAttempts > 0
        ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts
        : 0;
    const passRate =
      totalAttempts > 0
        ? (attempts.filter((a) => a.passed).length / totalAttempts) * 100
        : 0;

    return {
      quiz,
      stats: {
        totalAttempts,
        avgScore: Math.round(avgScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
      },
    };
  }
}

// Singleton instance for service registration
let quizServiceInstance: QuizService | null = null;

export function getQuizService(): QuizService {
  if (!quizServiceInstance) {
    quizServiceInstance = new QuizService();
  }
  return quizServiceInstance;
}

export function initQuizService(dataSource: DataSource): QuizService {
  const service = getQuizService();
  service.initService(dataSource);
  return service;
}
