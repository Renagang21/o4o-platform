/**
 * Alert Controller
 *
 * 위험 알림 관리 API 엔드포인트
 */

import type { Request, Response } from 'express';
import { alertService } from '../services/AlertService.js';

export class AlertController {
  /**
   * GET /api/v1/cgm-pharmacist/alerts
   * 전체 알림 조회
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const result = await alertService.getAlerts();
      res.json(result);
    } catch (error) {
      console.error('[AlertController] getAlerts error:', error);
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  }

  /**
   * GET /api/v1/cgm-pharmacist/alerts/unacknowledged
   * 미확인 알림 조회
   */
  async getUnacknowledgedAlerts(req: Request, res: Response): Promise<void> {
    try {
      const alerts = await alertService.getUnacknowledgedAlerts();
      res.json({ alerts, count: alerts.length });
    } catch (error) {
      console.error('[AlertController] getUnacknowledgedAlerts error:', error);
      res.status(500).json({ error: 'Failed to get unacknowledged alerts' });
    }
  }

  /**
   * POST /api/v1/cgm-pharmacist/alerts/:alertId/acknowledge
   * 알림 확인 처리
   */
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      // TODO: 실제 로그인 약사 ID 사용
      const pharmacistId = 'pharmacist-001';

      const alert = await alertService.acknowledgeAlert(alertId, pharmacistId);

      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json(alert);
    } catch (error) {
      console.error('[AlertController] acknowledgeAlert error:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }

  /**
   * GET /api/v1/cgm-pharmacist/alerts/count/high-risk
   * 고위험 알림 개수 조회
   */
  async getHighRiskAlertCount(req: Request, res: Response): Promise<void> {
    try {
      const count = await alertService.getHighRiskAlertCount();
      res.json({ count });
    } catch (error) {
      console.error('[AlertController] getHighRiskAlertCount error:', error);
      res.status(500).json({ error: 'Failed to get high risk alert count' });
    }
  }
}

export const alertController = new AlertController();
