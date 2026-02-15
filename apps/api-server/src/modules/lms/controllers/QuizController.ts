import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { QuizService } from '../services/QuizService.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';

/**
 * QuizController
 * LMS Module - Quiz Management (Phase 1 Refoundation)
 *
 * WO-KPA-A-LMS-COURSE-OWNERSHIP-GUARD-V1:
 * - Instructor write ops verify quiz.createdBy === userId OR quiz.course.instructorId === userId
 * - kpa:admin bypasses ownership check
 */
export class QuizController extends BaseController {
  private static async checkQuizOwnership(quizId: string, userId: string, userRoles: string[]): Promise<{ allowed: boolean; notFound: boolean }> {
    if (userRoles.includes('kpa:admin')) return { allowed: true, notFound: false };
    const service = QuizService.getInstance();
    const quiz = await service.getQuiz(quizId);
    if (!quiz) return { allowed: false, notFound: true };
    if (quiz.createdBy === userId) return { allowed: true, notFound: false };
    if (quiz.courseId) {
      const courseService = CourseService.getInstance();
      const course = await courseService.getCourse(quiz.courseId);
      if (course && course.instructorId === userId) return { allowed: true, notFound: false };
    }
    return { allowed: false, notFound: false };
  }

  // ============================================
  // Quiz CRUD
  // ============================================

  static async createQuiz(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;

      // Set createdBy to current user
      if (!data.createdBy && userId) {
        data.createdBy = userId;
      }

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
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await QuizController.checkQuizOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Quiz not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only modify your own quizzes');

      const service = QuizService.getInstance();
      const quiz = await service.updateQuiz(id, data);

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.updateQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async deleteQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await QuizController.checkQuizOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Quiz not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only delete your own quizzes');

      const service = QuizService.getInstance();
      await service.deleteQuiz(id);

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
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await QuizController.checkQuizOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Quiz not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only publish your own quizzes');

      const service = QuizService.getInstance();
      const quiz = await service.publishQuiz(id);

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.publishQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async unpublishQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await QuizController.checkQuizOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Quiz not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only unpublish your own quizzes');

      const service = QuizService.getInstance();
      const quiz = await service.unpublishQuiz(id);

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
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await QuizController.checkQuizOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Quiz not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only add questions to your own quizzes');

      const service = QuizService.getInstance();
      const quiz = await service.addQuestion(id, question);

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.addQuestion] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async removeQuestion(req: Request, res: Response): Promise<any> {
    try {
      const { id, questionId } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await QuizController.checkQuizOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Quiz not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only remove questions from your own quizzes');

      const service = QuizService.getInstance();
      const quiz = await service.removeQuestion(id, questionId);

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
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await QuizController.checkQuizOwnership(id, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Quiz not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only reorder questions in your own quizzes');

      const service = QuizService.getInstance();
      const quiz = await service.reorderQuestions(id, questionIds);

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.reorderQuestions] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ============================================
  // Attempts (user-initiated, no ownership check)
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
