import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { QuizService, initQuizService } from '../services/QuizService.js';

/**
 * QuizController
 *
 * REST API for Quiz operations
 * Base path: /api/v1/lms/quizzes
 */
export class QuizController {
  private quizService: QuizService;

  constructor(dataSource: DataSource) {
    this.quizService = initQuizService(dataSource);
  }

  /**
   * Create routes
   */
  createRoutes(): Router {
    const router = Router();

    // Quiz CRUD
    router.get('/', this.list.bind(this));
    router.post('/', this.create.bind(this));
    router.get('/:id', this.getById.bind(this));
    router.put('/:id', this.update.bind(this));
    router.delete('/:id', this.delete.bind(this));

    // Quiz Questions
    router.post('/:id/questions', this.addQuestion.bind(this));
    router.delete('/:id/questions/:questionId', this.removeQuestion.bind(this));
    router.put('/:id/questions/reorder', this.reorderQuestions.bind(this));

    // Publishing
    router.post('/:id/publish', this.publish.bind(this));
    router.post('/:id/unpublish', this.unpublish.bind(this));

    // Stats
    router.get('/:id/stats', this.getStats.bind(this));

    // Attempts
    router.post('/:id/attempts', this.startAttempt.bind(this));
    router.get('/:id/attempts', this.getUserAttempts.bind(this));
    router.get('/attempts/:attemptId', this.getAttempt.bind(this));
    router.post('/attempts/:attemptId/answers', this.submitAnswer.bind(this));
    router.post('/attempts/:attemptId/complete', this.completeAttempt.bind(this));

    return router;
  }

  // ============================================
  // Quiz CRUD Handlers
  // ============================================

  private async list(req: Request, res: Response): Promise<void> {
    try {
      const { bundleId, courseId, isPublished, page, limit } = req.query;
      const result = await this.quizService.list({
        bundleId: bundleId as string,
        courseId: courseId as string,
        isPublished: isPublished === 'true' ? true : isPublished === 'false' ? false : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async create(req: Request, res: Response): Promise<void> {
    try {
      const quiz = await this.quizService.create(req.body);
      res.status(201).json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getById(req: Request, res: Response): Promise<void> {
    try {
      const quiz = await this.quizService.findById(req.params.id);
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.json(quiz);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const quiz = await this.quizService.update(req.params.id, req.body);
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.quizService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // Question Handlers
  // ============================================

  private async addQuestion(req: Request, res: Response): Promise<void> {
    try {
      const quiz = await this.quizService.addQuestion(req.params.id, req.body);
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async removeQuestion(req: Request, res: Response): Promise<void> {
    try {
      const quiz = await this.quizService.removeQuestion(
        req.params.id,
        req.params.questionId,
      );
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async reorderQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { questionIds } = req.body;
      const quiz = await this.quizService.reorderQuestions(req.params.id, questionIds);
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================
  // Publishing Handlers
  // ============================================

  private async publish(req: Request, res: Response): Promise<void> {
    try {
      const quiz = await this.quizService.publish(req.params.id);
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async unpublish(req: Request, res: Response): Promise<void> {
    try {
      const quiz = await this.quizService.unpublish(req.params.id);
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.json(quiz);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================
  // Stats Handler
  // ============================================

  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.quizService.getQuizWithStats(req.params.id);
      if (!result) {
        res.status(404).json({ error: 'Quiz not found' });
        return;
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // Attempt Handlers
  // ============================================

  private async startAttempt(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const attempt = await this.quizService.startAttempt(req.params.id, userId);
      if (!attempt) {
        res.status(404).json({ error: 'Quiz not found or not published' });
        return;
      }
      res.status(201).json(attempt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getUserAttempts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req.query.userId as string);
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const attempts = await this.quizService.getUserAttempts(req.params.id, userId);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getAttempt(req: Request, res: Response): Promise<void> {
    try {
      const attempt = await this.quizService.getAttempt(req.params.attemptId);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found' });
        return;
      }
      res.json(attempt);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async submitAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { questionId, answer } = req.body;
      const attempt = await this.quizService.submitAnswer(
        req.params.attemptId,
        questionId,
        answer,
      );
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found or already completed' });
        return;
      }
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async completeAttempt(req: Request, res: Response): Promise<void> {
    try {
      const attempt = await this.quizService.completeAttempt(req.params.attemptId);
      if (!attempt) {
        res.status(404).json({ error: 'Attempt not found or already completed' });
        return;
      }
      res.json(attempt);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

/**
 * Create quiz routes factory
 */
export function createQuizRoutes(dataSource: DataSource): Router {
  const controller = new QuizController(dataSource);
  return controller.createRoutes();
}
