import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import {
  EngagementLoggingService,
  initEngagementLoggingService,
} from '../services/EngagementLoggingService.js';
import { EngagementEventType } from '../entities/EngagementLog.js';

/**
 * EngagementLogController
 *
 * REST API for Engagement Logging operations
 * Base path: /api/v1/lms/engagement
 */
export class EngagementLogController {
  private engagementService: EngagementLoggingService;

  constructor(dataSource: DataSource) {
    this.engagementService = initEngagementLoggingService(dataSource);
  }

  /**
   * Create routes
   */
  createRoutes(): Router {
    const router = Router();

    // Logging endpoints
    router.post('/log', this.logEvent.bind(this));
    router.post('/log/view', this.logView.bind(this));
    router.post('/log/click', this.logClick.bind(this));
    router.post('/log/reaction', this.logReaction.bind(this));
    router.post('/log/quiz-submit', this.logQuizSubmit.bind(this));
    router.post('/log/survey-submit', this.logSurveySubmit.bind(this));
    router.post('/log/acknowledge', this.logAcknowledge.bind(this));
    router.post('/log/complete', this.logComplete.bind(this));

    // Query endpoints
    router.get('/logs', this.getLogs.bind(this));
    router.get('/logs/user/:userId', this.getLogsByUser.bind(this));
    router.get('/logs/bundle/:bundleId', this.getLogsByBundle.bind(this));

    // Stats endpoints
    router.get('/stats/bundle/:bundleId', this.getBundleStats.bind(this));
    router.get('/stats/user/:userId', this.getUserStats.bind(this));

    // Check endpoints
    router.get('/check/viewed', this.checkViewed.bind(this));
    router.get('/check/completed', this.checkCompleted.bind(this));

    return router;
  }

  // ============================================
  // Logging Handlers
  // ============================================

  private async logEvent(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const { event, bundleId, lessonId, metadata } = req.body;

      if (!event || !Object.values(EngagementEventType).includes(event)) {
        res.status(400).json({ error: 'Valid event type required' });
        return;
      }

      const log = await this.engagementService.logEvent(userId, event, {
        bundleId,
        lessonId,
        metadata,
      });

      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async logView(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const { bundleId, metadata } = req.body;
      if (!bundleId) {
        res.status(400).json({ error: 'Bundle ID required' });
        return;
      }

      const log = await this.engagementService.logView(userId, bundleId, metadata);
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async logClick(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const { bundleId, metadata } = req.body;
      if (!bundleId) {
        res.status(400).json({ error: 'Bundle ID required' });
        return;
      }

      const log = await this.engagementService.logClick(userId, bundleId, metadata);
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async logReaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const { bundleId, reactionType, metadata } = req.body;
      if (!bundleId || !reactionType) {
        res.status(400).json({ error: 'Bundle ID and reaction type required' });
        return;
      }

      const log = await this.engagementService.logReaction(
        userId,
        bundleId,
        reactionType,
        metadata,
      );
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async logQuizSubmit(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const { bundleId, quizId, score, passed, answers, metadata } = req.body;
      if (!quizId) {
        res.status(400).json({ error: 'Quiz ID required' });
        return;
      }

      const log = await this.engagementService.logQuizSubmit(
        userId,
        bundleId,
        quizId,
        score || 0,
        passed || false,
        answers,
        metadata,
      );
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async logSurveySubmit(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const { bundleId, surveyId, responseId, metadata } = req.body;
      if (!surveyId || !responseId) {
        res.status(400).json({ error: 'Survey ID and response ID required' });
        return;
      }

      const log = await this.engagementService.logSurveySubmit(
        userId,
        bundleId,
        surveyId,
        responseId,
        metadata,
      );
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async logAcknowledge(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const { bundleId, metadata } = req.body;
      if (!bundleId) {
        res.status(400).json({ error: 'Bundle ID required' });
        return;
      }

      const log = await this.engagementService.logAcknowledge(userId, bundleId, metadata);
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async logComplete(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body.userId;
      if (!userId) {
        res.status(400).json({ error: 'User ID required' });
        return;
      }

      const { bundleId, lessonId, metadata } = req.body;
      if (!bundleId) {
        res.status(400).json({ error: 'Bundle ID required' });
        return;
      }

      const log = await this.engagementService.logComplete(
        userId,
        bundleId,
        lessonId,
        metadata,
      );
      res.status(201).json(log);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // Query Handlers
  // ============================================

  private async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const { userId, bundleId, event, startDate, endDate, page, limit } = req.query;

      if (userId) {
        const result = await this.engagementService.getLogsByUser(userId as string, {
          bundleId: bundleId as string,
          event: event as EngagementEventType,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        });
        res.json(result);
      } else if (bundleId) {
        const result = await this.engagementService.getLogsByBundle(bundleId as string, {
          event: event as EngagementEventType,
          startDate: startDate ? new Date(startDate as string) : undefined,
          endDate: endDate ? new Date(endDate as string) : undefined,
          page: page ? parseInt(page as string, 10) : undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        });
        res.json(result);
      } else {
        res.status(400).json({ error: 'Either userId or bundleId is required' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getLogsByUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { bundleId, event, startDate, endDate, page, limit } = req.query;

      const result = await this.engagementService.getLogsByUser(userId, {
        bundleId: bundleId as string,
        event: event as EngagementEventType,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getLogsByBundle(req: Request, res: Response): Promise<void> {
    try {
      const { bundleId } = req.params;
      const { event, startDate, endDate, page, limit } = req.query;

      const result = await this.engagementService.getLogsByBundle(bundleId, {
        event: event as EngagementEventType,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // Stats Handlers
  // ============================================

  private async getBundleStats(req: Request, res: Response): Promise<void> {
    try {
      const { bundleId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await this.engagementService.getBundleStats(bundleId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await this.engagementService.getUserEngagementSummary(userId, {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // ============================================
  // Check Handlers
  // ============================================

  private async checkViewed(req: Request, res: Response): Promise<void> {
    try {
      const { userId, bundleId } = req.query;

      if (!userId || !bundleId) {
        res.status(400).json({ error: 'userId and bundleId are required' });
        return;
      }

      const viewed = await this.engagementService.hasUserViewed(
        userId as string,
        bundleId as string,
      );

      res.json({ viewed });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  private async checkCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { userId, bundleId } = req.query;

      if (!userId || !bundleId) {
        res.status(400).json({ error: 'userId and bundleId are required' });
        return;
      }

      const completed = await this.engagementService.hasUserCompleted(
        userId as string,
        bundleId as string,
      );

      res.json({ completed });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * Create engagement routes factory
 */
export function createEngagementRoutes(dataSource: DataSource): Router {
  const controller = new EngagementLogController(dataSource);
  return controller.createRoutes();
}
