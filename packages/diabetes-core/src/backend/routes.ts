import { Router } from 'express';
import type { DataSource } from 'typeorm';
import {
  CGMController,
  MetricsController,
  PatternController,
  ReportController,
  CoachingController,
  LifestyleController,
} from './controllers/index.js';

/**
 * DiabetesCare Core 라우트 생성
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // 컨트롤러 초기화
  const cgmController = new CGMController(dataSource);
  const metricsController = new MetricsController(dataSource);
  const patternController = new PatternController(dataSource);
  const reportController = new ReportController(dataSource);
  const coachingController = new CoachingController(dataSource);
  const lifestyleController = new LifestyleController(dataSource);

  // 라우트 등록
  router.use('/cgm', cgmController.createRouter());
  router.use('/metrics', metricsController.createRouter());
  router.use('/patterns', patternController.createRouter());
  router.use('/report', reportController.createRouter());
  router.use('/coaching', coachingController.createRouter());
  router.use('/lifestyle', lifestyleController.createRouter());

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'diabetes-core',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}

export default createRoutes;
