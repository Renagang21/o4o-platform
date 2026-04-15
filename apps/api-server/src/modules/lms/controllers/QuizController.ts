import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { QuizService } from '../services/QuizService.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';

/**
 * QuizController
 * LMS Module - Quiz System
 *
 * WO-O4O-QUIZ-SYSTEM-V1
 * Handles quiz retrieval, submission, grading, and CRUD
 */
export class QuizController extends BaseController {
  /**
   * GET /api/v1/lms/lessons/:lessonId/quiz
   * Get quiz for a lesson (questions without correct answers)
   */
  static async getQuizForLesson(req: Request, res: Response): Promise<any> {
    try {
      const { lessonId } = req.params;
      const service = QuizService.getInstance();

      const quiz = await service.getQuizForLesson(lessonId);

      if (!quiz) {
        return BaseController.notFound(res, 'Quiz not found for this lesson');
      }

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.getQuizForLesson] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/lms/quizzes/:quizId/submit
   * Submit quiz answers
   */
  static async submitQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { quizId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const { answers } = req.body;

      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return BaseController.error(res, 'answers array is required', 400);
      }

      const service = QuizService.getInstance();
      const result = await service.submitQuiz(quizId, userId, { answers });

      return BaseController.ok(res, result);
    } catch (error: any) {
      logger.error('[QuizController.submitQuiz] Error', { error: error.message });

      if (error.message?.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }
      if (error.message?.includes('Maximum attempts') || error.message?.includes('not available')) {
        return BaseController.error(res, error.message, 400);
      }

      return BaseController.error(res, error);
    }
  }

  /**
   * GET /api/v1/lms/quizzes/:quizId/attempts
   * Get user's attempts for a quiz
   */
  static async getAttempts(req: Request, res: Response): Promise<any> {
    try {
      const { quizId } = req.params;
      const userId = (req as any).user?.id;

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const service = QuizService.getInstance();
      const attempts = await service.getUserAttempts(quizId, userId);

      return BaseController.ok(res, { attempts });
    } catch (error: any) {
      logger.error('[QuizController.getAttempts] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/lms/quizzes
   * Create a quiz (instructor)
   */
  static async createQuiz(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      if (!userId) {
        return BaseController.unauthorized(res, 'User not authenticated');
      }

      const { title, description, questions, lessonId, courseId, passingScore } = req.body;

      if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return BaseController.error(res, 'title and questions array are required', 400);
      }

      // Verify course ownership if courseId provided
      if (courseId) {
        const courseService = CourseService.getInstance();
        const course = await courseService.getCourse(courseId);
        if (!course) {
          return BaseController.notFound(res, 'Course not found');
        }
        if (course.instructorId !== userId && !userRoles.includes('kpa:admin')) {
          return BaseController.forbidden(res, 'You can only create quizzes for your own courses');
        }
      }

      const service = QuizService.getInstance();
      const quiz = await service.createQuiz({
        title,
        description,
        questions,
        lessonId,
        courseId,
        passingScore,
        createdBy: userId,
      });

      return BaseController.created(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.createQuiz] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * PATCH /api/v1/lms/quizzes/:quizId
   * Update a quiz (instructor)
   */
  static async updateQuiz(req: Request, res: Response): Promise<any> {
    try {
      const { quizId } = req.params;
      const data = req.body;

      const service = QuizService.getInstance();
      const quiz = await service.updateQuiz(quizId, data);

      return BaseController.ok(res, { quiz });
    } catch (error: any) {
      logger.error('[QuizController.updateQuiz] Error', { error: error.message });

      if (error.message?.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }
}
