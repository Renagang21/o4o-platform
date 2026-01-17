import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { QuizService } from '../services/QuizService.js';
import logger from '../../../utils/logger.js';

/**
 * QuizController
 * LMS Module - Quiz Management (Phase 1 Refoundation)
 *
 * REST API for Quiz Core Engine
 * Base path: /api/v1/lms/quizzes
 */
export class QuizController extends BaseController {
  // ============================================
  // Quiz CRUD
  // ============================================

  static async createQuiz(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const service = QuizService.getInstance();

      const quiz = await service.createQuiz(data);

      return BaseController.created(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.createQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizService.getInstance();

      const quiz = await service.getQuiz(id);

      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.getQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listQuizzes(req: Request, res: Response): Promise<any> {
    try {
      const filters = req.query;
      const service = QuizService.getInstance();

      const { quizzes, total } = await service.listQuizzes(filters as any);

      return BaseController.okPaginated(res, quizzes, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[QuizController.listQuizzes] Quiz tables not found - returning empty');
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0
        });
      }
      logger.error('[QuizController.listQuizzes] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const service = QuizService.getInstance();

      const quiz = await service.updateQuiz(id, data);

      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.updateQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizService.getInstance();

      const deleted = await service.deleteQuiz(id);

      if (!deleted) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      return BaseController.noContent(res);
    } catch (error: any) {
      logger.error('[QuizController.deleteQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Publishing
  // ============================================

  static async publishQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizService.getInstance();

      const quiz = await service.publishQuiz(id);

      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.publishQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async unpublishQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizService.getInstance();

      const quiz = await service.unpublishQuiz(id);

      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.unpublishQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Questions
  // ============================================

  static async addQuestion(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const question = req.body;
      const service = QuizService.getInstance();

      const quiz = await service.addQuestion(id, question);

      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.addQuestion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async removeQuestion(req: Request, res: Response): Promise<any> {
    try {
      const { id, questionId } = req.params;
      const service = QuizService.getInstance();

      const quiz = await service.removeQuestion(id, questionId);

      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.removeQuestion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async reorderQuestions(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { questionIds } = req.body;
      const service = QuizService.getInstance();

      const quiz = await service.reorderQuestions(id, questionIds);

      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.reorderQuestions] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Attempts
  // ============================================

  static async startAttempt(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || req.body.userId;
      const service = QuizService.getInstance();

      if (!userId) {
        return BaseController.error(res, 'User ID required');
      }

      const attempt = await service.startAttempt(id, userId);

      if (!attempt) {
        return BaseController.notFound(res, 'Quiz not found or not published');
      }

      return BaseController.created(res, { attempt });
    } catch (error: any) {
      logger.error('[QuizController.startAttempt] Error', { error: error.message });
      return BaseController.error(res, error.message);
    }
  }

  static async getAttempt(req: Request, res: Response): Promise<any> {
    try {
      const { attemptId } = req.params;
      const service = QuizService.getInstance();

      const attempt = await service.getAttempt(attemptId);

      if (!attempt) {
        return BaseController.notFound(res, 'Attempt not found');
      }

      return BaseController.ok(res, { attempt });
    } catch (error: any) {
      logger.error('[QuizController.getAttempt] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getUserAttempts(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || (req.query.userId as string);
      const service = QuizService.getInstance();

      if (!userId) {
        return BaseController.error(res, 'User ID required');
      }

      const attempts = await service.getUserAttempts(id, userId);

      return BaseController.ok(res, { attempts });
    } catch (error: any) {
      logger.error('[QuizController.getUserAttempts] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async submitAnswer(req: Request, res: Response): Promise<any> {
    try {
      const { attemptId } = req.params;
      const { questionId, answer } = req.body;
      const service = QuizService.getInstance();

      const attempt = await service.submitAnswer(attemptId, questionId, answer);

      if (!attempt) {
        return BaseController.notFound(res, 'Attempt not found or already completed');
      }

      return BaseController.ok(res, { attempt });
    } catch (error: any) {
      logger.error('[QuizController.submitAnswer] Error', { error: error.message });
      return BaseController.error(res, error.message);
    }
  }

  static async completeAttempt(req: Request, res: Response): Promise<any> {
    try {
      const { attemptId } = req.params;
      const service = QuizService.getInstance();

      const attempt = await service.completeAttempt(attemptId);

      if (!attempt) {
        return BaseController.notFound(res, 'Attempt not found or already completed');
      }

      return BaseController.ok(res, { attempt });
    } catch (error: any) {
      logger.error('[QuizController.completeAttempt] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Bundle Queries (Frontend Compatibility)
  // ============================================

  static async getQuizzesByBundle(req: Request, res: Response): Promise<any> {
    try {
      const { bundleId } = req.params;
      const service = QuizService.getInstance();

      const { quizzes, total } = await service.listQuizzes({
        bundleId,
        isPublished: true,
        limit: 100,
      });

      return BaseController.ok(res, { quizzes, total });
    } catch (error: any) {
      // Graceful fallback: return empty data if table doesn't exist
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        logger.warn('[QuizController.getQuizzesByBundle] Quiz tables not found - returning empty');
        return BaseController.ok(res, { quizzes: [], total: 0 });
      }
      logger.error('[QuizController.getQuizzesByBundle] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getMyAttempts(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const service = QuizService.getInstance();

      if (!userId) {
        return BaseController.error(res, 'User ID required');
      }

      const attempts = await service.getUserAttempts(id, userId);

      return BaseController.ok(res, { attempts });
    } catch (error: any) {
      logger.error('[QuizController.getMyAttempts] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Stats
  // ============================================

  static async getQuizStats(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = QuizService.getInstance();

      const quiz = await service.getQuiz(id);
      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found');
      }

      const stats = await service.getQuizStats(id);

      return BaseController.ok(res, { quiz, stats });
    } catch (error: any) {
      logger.error('[QuizController.getQuizStats] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
