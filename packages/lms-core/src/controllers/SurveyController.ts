import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { SurveyService, initSurveyService } from '../services/SurveyService.js';
import { SurveyStatus } from '../entities/Survey.js';
import { ResponseStatus } from '../entities/SurveyResponse.js';

/**
 * SurveyController
 *
 * REST API for Survey operations
 * Base path: /api/v1/lms/surveys
 */
export class SurveyController {
  private surveyService: SurveyService;

  constructor(dataSource: DataSource) {
    this.surveyService = initSurveyService(dataSource);
  }

  /**
   * Create routes
   */
  createRoutes(): Router {
    const router = Router();

    // Survey CRUD
    router.get('/', this.list.bind(this));
    router.post('/', this.create.bind(this));
    router.get('/:id', this.getById.bind(this));
    router.get('/:id/full', this.getWithQuestions.bind(this));
    router.put('/:id', this.update.bind(this));
    router.delete('/:id', this.delete.bind(this));

    // Survey Questions
    router.get('/:id/questions', this.getQuestions.bind(this));
    router.post('/:id/questions', this.addQuestion.bind(this));
    router.put('/:id/questions/:questionId', this.updateQuestion.bind(this));
    router.delete('/:id/questions/:questionId', this.deleteQuestion.bind(this));
    router.put('/:id/questions/reorder', this.reorderQuestions.bind(this));

    // Publishing
    router.post('/:id/publish', this.publish.bind(this));
    router.post('/:id/close', this.close.bind(this));
    router.post('/:id/archive', this.archive.bind(this));

    // Stats
    router.get('/:id/stats', this.getStats.bind(this));

    // Responses
    router.post('/:id/responses', this.startResponse.bind(this));
    router.get('/:id/responses', this.getSurveyResponses.bind(this));
    router.get('/responses/:responseId', this.getResponse.bind(this));
    router.post('/responses/:responseId/answers', this.addAnswer.bind(this));
    router.post('/responses/:responseId/complete', this.completeResponse.bind(this));

    return router;
  }

  // ============================================
  // Survey CRUD Handlers
  // ============================================

  private async list(req: Request, res: Response): Promise<void> {
    try {
      const { bundleId, status, isPublished, page, limit } = req.query;
      const result = await this.surveyService.list({
        bundleId: bundleId as string,
        status: status as SurveyStatus,
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
      const survey = await this.surveyService.create(req.body);
      res.status(201).json(survey);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getById(req: Request, res: Response): Promise<void> {
    try {
      const survey = await this.surveyService.findById(req.params.id);
      if (!survey) {
        res.status(404).json({ error: 'Survey not found' });
        return;
      }
      res.json(survey);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getWithQuestions(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.surveyService.getSurveyWithQuestions(req.params.id);
      if (!result) {
        res.status(404).json({ error: 'Survey not found' });
        return;
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async update(req: Request, res: Response): Promise<void> {
    try {
      const survey = await this.surveyService.update(req.params.id, req.body);
      if (!survey) {
        res.status(404).json({ error: 'Survey not found' });
        return;
      }
      res.json(survey);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async delete(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.surveyService.delete(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Survey not found' });
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

  private async getQuestions(req: Request, res: Response): Promise<void> {
    try {
      const questions = await this.surveyService.getQuestions(req.params.id);
      res.json(questions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async addQuestion(req: Request, res: Response): Promise<void> {
    try {
      const question = await this.surveyService.addQuestion(req.params.id, req.body);
      if (!question) {
        res.status(404).json({ error: 'Survey not found' });
        return;
      }
      res.status(201).json(question);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async updateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const question = await this.surveyService.updateQuestion(
        req.params.questionId,
        req.body,
      );
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }
      res.json(question);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async deleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.surveyService.deleteQuestion(req.params.questionId);
      if (!deleted) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async reorderQuestions(req: Request, res: Response): Promise<void> {
    try {
      const { questionIds } = req.body;
      await this.surveyService.reorderQuestions(req.params.id, questionIds);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================
  // Publishing Handlers
  // ============================================

  private async publish(req: Request, res: Response): Promise<void> {
    try {
      const survey = await this.surveyService.publish(req.params.id);
      if (!survey) {
        res.status(404).json({ error: 'Survey not found' });
        return;
      }
      res.json(survey);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async close(req: Request, res: Response): Promise<void> {
    try {
      const survey = await this.surveyService.close(req.params.id);
      if (!survey) {
        res.status(404).json({ error: 'Survey not found' });
        return;
      }
      res.json(survey);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async archive(req: Request, res: Response): Promise<void> {
    try {
      const survey = await this.surveyService.archive(req.params.id);
      if (!survey) {
        res.status(404).json({ error: 'Survey not found' });
        return;
      }
      res.json(survey);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // ============================================
  // Stats Handler
  // ============================================

  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.surveyService.getSurveyStats(req.params.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // Response Handlers
  // ============================================

  private async startResponse(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      const { isAnonymous } = req.body;

      const response = await this.surveyService.startResponse(
        req.params.id,
        userId,
        {
          isAnonymous,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      );
      if (!response) {
        res.status(404).json({ error: 'Survey not found or not accepting responses' });
        return;
      }
      res.status(201).json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getSurveyResponses(req: Request, res: Response): Promise<void> {
    try {
      const { status, page, limit } = req.query;
      const result = await this.surveyService.getSurveyResponses(req.params.id, {
        status: status as ResponseStatus,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getResponse(req: Request, res: Response): Promise<void> {
    try {
      const response = await this.surveyService.getResponse(req.params.responseId);
      if (!response) {
        res.status(404).json({ error: 'Response not found' });
        return;
      }
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async addAnswer(req: Request, res: Response): Promise<void> {
    try {
      const { questionId, value } = req.body;
      const response = await this.surveyService.addResponse(
        req.params.responseId,
        questionId,
        value,
      );
      if (!response) {
        res.status(404).json({ error: 'Response not found or already completed' });
        return;
      }
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async completeResponse(req: Request, res: Response): Promise<void> {
    try {
      const response = await this.surveyService.completeResponse(req.params.responseId);
      if (!response) {
        res.status(404).json({ error: 'Response not found or already completed' });
        return;
      }
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

/**
 * Create survey routes factory
 */
export function createSurveyRoutes(dataSource: DataSource): Router {
  const controller = new SurveyController(dataSource);
  return controller.createRoutes();
}
