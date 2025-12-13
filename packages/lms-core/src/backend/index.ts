/**
 * LMS-Core Backend Entry Point
 *
 * AppStore 표준 준수를 위한 backend exports
 */

// Entities
export * from '../entities';

// Services
export * from '../services';

// Controllers
export * from '../controllers';

// Utils
export * from '../utils';

// Routes factory
import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createQuizRoutes } from '../controllers/QuizController.js';
import { createSurveyRoutes } from '../controllers/SurveyController.js';
import { createEngagementRoutes } from '../controllers/EngagementLogController.js';
import { initEngagementLoggingService, getEngagementLoggingService } from '../services/EngagementLoggingService.js';

export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Mount quiz routes
  router.use('/quizzes', createQuizRoutes(dataSource));

  // Mount survey routes
  router.use('/surveys', createSurveyRoutes(dataSource));

  // Mount engagement routes
  router.use('/engagement', createEngagementRoutes(dataSource));

  return router;
}

/**
 * Create hooks for extension apps
 * Extension apps can use these hooks to log engagement without direct DB access
 */
export function createHooks(dataSource: DataSource) {
  const engagementService = initEngagementLoggingService(dataSource);

  return {
    /**
     * Log an engagement event
     * Usage: context.hooks.logEngagement('view', { userId, bundleId, metadata })
     */
    logEngagement: async (
      event: string,
      payload: {
        userId: string;
        bundleId?: string;
        lessonId?: string;
        metadata?: any;
      },
    ) => {
      await engagementService.logEvent(payload.userId, event as any, {
        bundleId: payload.bundleId,
        lessonId: payload.lessonId,
        metadata: payload.metadata,
      });
    },

    /**
     * Log a view event
     */
    logView: async (userId: string, bundleId: string, metadata?: any) => {
      await engagementService.logView(userId, bundleId, metadata);
    },

    /**
     * Log a quiz submission
     */
    logQuizSubmit: async (
      userId: string,
      bundleId: string | undefined,
      quizId: string,
      score: number,
      passed: boolean,
      answers?: any[],
    ) => {
      await engagementService.logQuizSubmit(userId, bundleId, quizId, score, passed, answers);
    },

    /**
     * Log a survey submission
     */
    logSurveySubmit: async (
      userId: string,
      bundleId: string | undefined,
      surveyId: string,
      responseId: string,
    ) => {
      await engagementService.logSurveySubmit(userId, bundleId, surveyId, responseId);
    },

    /**
     * Log an acknowledge event
     */
    logAcknowledge: async (userId: string, bundleId: string, metadata?: any) => {
      await engagementService.logAcknowledge(userId, bundleId, metadata);
    },

    /**
     * Log a completion event
     */
    logComplete: async (userId: string, bundleId: string, lessonId?: string, metadata?: any) => {
      await engagementService.logComplete(userId, bundleId, lessonId, metadata);
    },
  };
}
