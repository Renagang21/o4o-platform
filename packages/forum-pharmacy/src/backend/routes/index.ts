/**
 * Forum Pharmacy Routes
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';

/**
 * Create pharmacy forum routes
 */
export function createPharmacyRoutes(dataSource?: DataSource): Router {
  const router = Router();

  // Health check
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'forum-pharmacy' });
  });

  // TODO: 알림 관련 API 추가
  // GET /notifications - 알림 목록 조회
  // POST /notifications/:id/read - 알림 읽음 처리
  // POST /notifications/read-all - 모든 알림 읽음 처리

  return router;
}

export default createPharmacyRoutes;
