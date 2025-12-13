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

export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // Mount quiz routes
  router.use('/quizzes', createQuizRoutes(dataSource));

  // Mount survey routes
  router.use('/surveys', createSurveyRoutes(dataSource));

  return router;
}
