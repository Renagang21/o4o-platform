/**
 * ActionController
 *
 * Action 관련 API 엔드포인트
 *
 * @package @o4o/diabetes-pharmacy
 */

import type { Router, Request, Response } from 'express';
import { ActionService } from '../services/ActionService.js';

/**
 * ActionController
 *
 * Endpoints:
 * - GET /api/v1/diabetes-pharmacy/actions
 * - GET /api/v1/diabetes-pharmacy/actions/:id
 * - POST /api/v1/diabetes-pharmacy/actions/:id/execute
 */
export class ActionController {
  private actionService: ActionService;

  constructor() {
    this.actionService = new ActionService();
  }

  /**
   * Action 목록 조회
   * GET /api/v1/diabetes-pharmacy/actions
   */
  async getActions(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const result = await this.actionService.getActions(pharmacyId);
      res.json(result);
    } catch (error) {
      console.error('[ActionController] getActions error:', error);
      res.status(500).json({
        error: 'Action 목록 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 특정 Action 조회
   * GET /api/v1/diabetes-pharmacy/actions/:id
   */
  async getAction(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const { id } = req.params;
      const action = await this.actionService.getAction(pharmacyId, id);

      if (!action) {
        res.status(404).json({ error: 'Action을 찾을 수 없습니다.' });
        return;
      }

      res.json(action);
    } catch (error) {
      console.error('[ActionController] getAction error:', error);
      res.status(500).json({
        error: 'Action 조회 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Action 실행
   * POST /api/v1/diabetes-pharmacy/actions/:id/execute
   */
  async executeAction(req: Request, res: Response): Promise<void> {
    try {
      const pharmacyId = this.getPharmacyId(req);
      if (!pharmacyId) {
        res.status(401).json({ error: '약국 인증이 필요합니다.' });
        return;
      }

      const { id } = req.params;
      const result = await this.actionService.executeAction({
        actionId: id,
        pharmacyId,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('[ActionController] executeAction error:', error);
      res.status(500).json({
        error: 'Action 실행 중 오류가 발생했습니다.',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 요청에서 약국 ID 추출
   */
  private getPharmacyId(req: Request): string | null {
    // Phase 2: 요청에서 약국 ID 추출
    // 실제 구현 시 JWT 토큰에서 조직 ID 추출
    return (req as any).user?.organizationId || (req as any).pharmacyId || 'mock-pharmacy-id';
  }
}

/**
 * Action 라우트 생성
 */
export function createActionRoutes(router: Router): void {
  const controller = new ActionController();

  router.get('/actions', (req, res) => controller.getActions(req, res));
  router.get('/actions/:id', (req, res) => controller.getAction(req, res));
  router.post('/actions/:id/execute', (req, res) => controller.executeAction(req, res));
}

export default ActionController;
