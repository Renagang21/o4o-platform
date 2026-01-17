import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Quiz, QuizAttempt, AttemptStatus } from '@o4o/lms-core';
import type { QuizQuestion } from '@o4o/lms-core';
import logger from '../../../utils/logger.js';

/**
 * QuizService
 * LMS Module - Quiz Management (Phase 1 Refoundation)
 *
 * Core Quiz Engine - handles Quiz CRUD and Attempts
 */

export interface CreateQuizRequest {
  title: string;
  description?: string;
  questions?: QuizQuestion[];
  bundleId?: string;
  courseId?: string;
  passingScore?: number;
  timeLimit?: number;
  maxAttempts?: number;
  showResultsImmediately?: boolean;
  showCorrectAnswers?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateQuizRequest extends Partial<CreateQuizRequest> {
  isPublished?: boolean;
}

export interface QuizFilters {
  bundleId?: string;
  courseId?: string;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export class QuizService extends BaseService<Quiz> {
  private static instance: QuizService;
  private quizRepository: Repository<Quiz>;
  private attemptRepository: Repository<QuizAttempt>;

  constructor() {
    const quizRepository = AppDataSource.getRepository(Quiz);
    super(quizRepository);
    this.quizRepository = quizRepository;
    this.attemptRepository = AppDataSource.getRepository(QuizAttempt);
  }

  static getInstance(): QuizService {
    if (!QuizService.instance) {
      QuizService.instance = new QuizService();
    }
    return QuizService.instance;
  }

  // ============================================
  // Quiz CRUD
  // ============================================

  async createQuiz(data: CreateQuizRequest): Promise<Quiz> {
    const quiz = this.quizRepository.create({
      ...data,
      questions: data.questions || [],
      passingScore: data.passingScore ?? 70,
      showResultsImmediately: data.showResultsImmediately ?? true,
      showCorrectAnswers: data.showCorrectAnswers ?? false,
      metadata: data.metadata || {},
    });
    return this.quizRepository.save(quiz);
  }

  async getQuiz(id: string): Promise<Quiz | null> {
    return this.quizRepository.findOne({ where: { id } });
  }

  async listQuizzes(filters: QuizFilters): Promise<{ quizzes: Quiz[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.quizRepository.createQueryBuilder('quiz');

    if (filters.bundleId) {
      queryBuilder.andWhere('quiz.bundleId = :bundleId', { bundleId: filters.bundleId });
    }

    if (filters.courseId) {
      queryBuilder.andWhere('quiz.courseId = :courseId', { courseId: filters.courseId });
    }

    if (filters.isPublished !== undefined) {
      queryBuilder.andWhere('quiz.isPublished = :isPublished', { isPublished: filters.isPublished });
    }

    if (filters.search) {
      queryBuilder.andWhere('quiz.title ILIKE :search', { search: `%${filters.search}%` });
    }

    queryBuilder.orderBy('quiz.createdAt', 'DESC');
    queryBuilder.skip(skip).take(limit);

    const [quizzes, total] = await queryBuilder.getManyAndCount();
    return { quizzes, total };
  }

  async updateQuiz(id: string, data: UpdateQuizRequest): Promise<Quiz | null> {
    const quiz = await this.getQuiz(id);
    if (!quiz) return null;

    Object.assign(quiz, data);
    return this.quizRepository.save(quiz);
  }

  async deleteQuiz(id: string): Promise<boolean> {
    const result = await this.quizRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // Publishing
  // ============================================

  async publishQuiz(id: string): Promise<Quiz | null> {
    const quiz = await this.getQuiz(id);
    if (!quiz) return null;

    quiz.publish();
    return this.quizRepository.save(quiz);
  }

  async unpublishQuiz(id: string): Promise<Quiz | null> {
    const quiz = await this.getQuiz(id);
    if (!quiz) return null;

    quiz.unpublish();
    return this.quizRepository.save(quiz);
  }

  // ============================================
  // Questions Management
  // ============================================

  async addQuestion(quizId: string, question: Omit<QuizQuestion, 'order'>): Promise<Quiz | null> {
    const quiz = await this.getQuiz(quizId);
    if (!quiz) return null;

    quiz.addQuestion(question);
    return this.quizRepository.save(quiz);
  }

  async removeQuestion(quizId: string, questionId: string): Promise<Quiz | null> {
    const quiz = await this.getQuiz(quizId);
    if (!quiz) return null;

    quiz.removeQuestion(questionId);
    return this.quizRepository.save(quiz);
  }

  async reorderQuestions(quizId: string, questionIds: string[]): Promise<Quiz | null> {
    const quiz = await this.getQuiz(quizId);
    if (!quiz) return null;

    const reordered: QuizQuestion[] = [];
    questionIds.forEach((qId, index) => {
      const question = quiz.questions.find(q => q.id === qId);
      if (question) {
        reordered.push({ ...question, order: index });
      }
    });

    quiz.questions = reordered;
    return this.quizRepository.save(quiz);
  }

  // ============================================
  // Attempts
  // ============================================

  async startAttempt(quizId: string, userId: string): Promise<QuizAttempt | null> {
    const quiz = await this.getQuiz(quizId);
    if (!quiz || !quiz.isPublished) return null;

    // Check max attempts
    if (quiz.maxAttempts) {
      const existingAttempts = await this.attemptRepository.count({
        where: { quizId, userId },
      });
      if (existingAttempts >= quiz.maxAttempts) {
        throw new Error('Maximum attempts reached');
      }
    }

    const attemptNumber = await this.attemptRepository.count({
      where: { quizId, userId },
    }) + 1;

    const attempt = this.attemptRepository.create({
      quizId,
      userId,
      totalPoints: quiz.getTotalPoints(),
      attemptNumber,
      status: AttemptStatus.IN_PROGRESS,
    });

    return this.attemptRepository.save(attempt);
  }

  async getAttempt(attemptId: string): Promise<QuizAttempt | null> {
    return this.attemptRepository.findOne({ where: { id: attemptId } });
  }

  async getUserAttempts(quizId: string, userId: string): Promise<QuizAttempt[]> {
    return this.attemptRepository.find({
      where: { quizId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async submitAnswer(
    attemptId: string,
    questionId: string,
    answer: any
  ): Promise<QuizAttempt | null> {
    const attempt = await this.getAttempt(attemptId);
    if (!attempt || !attempt.isInProgress()) return null;

    const quiz = await this.getQuiz(attempt.quizId);
    if (!quiz) return null;

    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return null;

    // Check if answer is correct
    let isCorrect = false;
    if (question.answer) {
      if (Array.isArray(question.answer)) {
        isCorrect = Array.isArray(answer) &&
          question.answer.length === answer.length &&
          question.answer.every(a => answer.includes(a));
      } else {
        isCorrect = question.answer === answer;
      }
    }

    attempt.submitAnswer(questionId, answer, isCorrect, question.points);
    return this.attemptRepository.save(attempt);
  }

  async completeAttempt(attemptId: string): Promise<QuizAttempt | null> {
    const attempt = await this.getAttempt(attemptId);
    if (!attempt || !attempt.isInProgress()) return null;

    const quiz = await this.getQuiz(attempt.quizId);
    if (!quiz) return null;

    attempt.complete(quiz.passingScore);
    return this.attemptRepository.save(attempt);
  }

  // ============================================
  // Stats
  // ============================================

  async getQuizStats(quizId: string): Promise<{
    totalAttempts: number;
    completedAttempts: number;
    passRate: number;
    averageScore: number;
  }> {
    const attempts = await this.attemptRepository.find({
      where: { quizId },
    });

    const completed = attempts.filter(a => a.status === AttemptStatus.COMPLETED);
    const passed = completed.filter(a => a.passed);
    const scores = completed.map(a => a.score || 0);

    return {
      totalAttempts: attempts.length,
      completedAttempts: completed.length,
      passRate: completed.length > 0 ? (passed.length / completed.length) * 100 : 0,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    };
  }
}
