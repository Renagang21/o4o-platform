import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { MemberFeeService } from '../services/MemberFeeService.js';
import { MemberFeeContext } from '../services/FeeCalculationService.js';

/**
 * MemberFeeController
 *
 * 회원 회비 조회 API (회원 포털용)
 */
export function createMemberFeeController(dataSource: DataSource): Router {
  const router = Router();
  const service = new MemberFeeService(dataSource);

  /**
   * GET /api/annualfee/members/me
   * 내 회비 상태 조회
   */
  router.get('/me', async (req: Request, res: Response) => {
    try {
      // 인증된 사용자의 memberId 가져오기
      const user = (req as any).user;
      if (!user || !user.memberId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { year } = req.query;
      const targetYear = year ? parseInt(year as string, 10) : undefined;

      const status = await service.getMemberFeeStatus(user.memberId, targetYear);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/members/me/history
   * 내 회비 이력 조회
   */
  router.get('/me/history', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.memberId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const history = await service.getMemberFeeHistory(user.memberId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/members/me/receipts
   * 내 영수증 목록 조회
   */
  router.get('/me/receipts', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.memberId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const receipts = await service.getMemberReceipts(user.memberId);

      res.json({
        success: true,
        data: receipts,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/members/me/summary
   * 내 회비 요약 정보
   */
  router.get('/me/summary', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user || !user.memberId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const summary = await service.getMemberFeeSummary(user.memberId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/members/:memberId
   * 특정 회원 회비 상태 조회 (관리자용)
   */
  router.get('/:memberId', async (req: Request, res: Response) => {
    try {
      const { year } = req.query;
      const targetYear = year ? parseInt(year as string, 10) : undefined;

      const status = await service.getMemberFeeStatus(
        req.params.memberId,
        targetYear
      );

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/members/:memberId/history
   * 특정 회원 회비 이력 조회 (관리자용)
   */
  router.get('/:memberId/history', async (req: Request, res: Response) => {
    try {
      const history = await service.getMemberFeeHistory(req.params.memberId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/annualfee/members/:memberId/summary
   * 특정 회원 회비 요약 (관리자용)
   */
  router.get('/:memberId/summary', async (req: Request, res: Response) => {
    try {
      const summary = await service.getMemberFeeSummary(req.params.memberId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/annualfee/members/:memberId/calculate
   * 회원 회비 계산 (관리자용)
   */
  router.post('/:memberId/calculate', async (req: Request, res: Response) => {
    try {
      const { memberContext, year } = req.body as {
        memberContext: MemberFeeContext;
        year?: number;
      };

      if (!memberContext) {
        return res.status(400).json({
          success: false,
          error: 'Member context is required',
        });
      }

      // memberId 일치 확인
      if (memberContext.memberId !== req.params.memberId) {
        return res.status(400).json({
          success: false,
          error: 'Member ID mismatch',
        });
      }

      const result = await service.calculateMemberFee(memberContext, year);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
