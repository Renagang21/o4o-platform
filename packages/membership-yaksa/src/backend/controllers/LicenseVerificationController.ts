import { Request, Response } from 'express';
import { LicenseVerificationService } from '../services/LicenseVerificationService.js';

/**
 * LicenseVerificationController
 *
 * Phase 2: 면허 진위 확인 API 컨트롤러
 */
export class LicenseVerificationController {
  constructor(private verificationService: LicenseVerificationService) {}

  /**
   * POST /license-verification/requests
   *
   * 면허 검증 요청 생성
   *
   * Request Body:
   * {
   *   memberId: string,
   *   licenseNumber: string,
   *   name: string,
   *   birthdate?: string,
   *   provider?: 'manual' | 'kpai' | 'hira' | 'mohw'
   * }
   */
  async createRequest(req: Request, res: Response) {
    try {
      const requestedBy = (req as any).user?.id;

      const request = await this.verificationService.createRequest({
        ...req.body,
        requestedBy,
      });

      res.status(201).json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /license-verification/requests
   *
   * 대기 중인 검증 요청 목록 조회
   *
   * Query Parameters:
   * - page: 페이지 번호 (기본: 1)
   * - limit: 페이지당 항목 수 (기본: 20)
   */
  async listPending(req: Request, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await this.verificationService.getPendingRequests({ page, limit });

      res.json({
        success: true,
        data: result.data,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /license-verification/requests/:id
   *
   * 검증 요청 상세 조회
   */
  async getRequest(req: Request, res: Response) {
    try {
      const request = await this.verificationService.findById(req.params.id);

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Verification request not found',
        });
      }

      res.json({
        success: true,
        data: request,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /members/:memberId/license-verification
   *
   * 회원의 면허 검증 이력 조회
   */
  async getMemberVerifications(req: Request, res: Response) {
    try {
      const { memberId } = req.params;

      const requests = await this.verificationService.findByMember(memberId);

      res.json({
        success: true,
        data: requests,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /members/:memberId/license-verification/status
   *
   * 회원의 면허 검증 상태 조회
   */
  async getMemberVerificationStatus(req: Request, res: Response) {
    try {
      const { memberId } = req.params;

      const status = await this.verificationService.getMemberVerificationStatus(memberId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /license-verification/requests/:id/verify
   *
   * 검증 수행 (외부 API 사용)
   *
   * Phase 3에서 실제 외부 API 연동 구현 예정
   */
  async performVerification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { provider } = req.body;

      const request = await this.verificationService.performVerification(id, provider);

      res.json({
        success: true,
        data: request,
        message: request.status === 'verified'
          ? '면허가 검증되었습니다.'
          : request.status === 'invalid'
          ? '무효한 면허입니다.'
          : '검증 결과를 확인하세요.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /license-verification/requests/:id/manual-verify
   *
   * 수동 검증 처리
   *
   * Request Body:
   * {
   *   isValid: boolean,
   *   licenseType?: string,
   *   issueDate?: string,
   *   expiryDate?: string,
   *   remarks?: string
   * }
   */
  async processManualVerification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const verifiedBy = (req as any).user?.id;

      if (!verifiedBy) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다.',
        });
      }

      const request = await this.verificationService.processManualVerification({
        requestId: id,
        verifiedBy,
        ...req.body,
      });

      res.json({
        success: true,
        data: request,
        message: request.verificationResult?.isValid
          ? '면허가 검증되었습니다.'
          : '면허가 무효로 처리되었습니다.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /license-verification/requests/:id/fail
   *
   * 검증 실패 처리
   *
   * Request Body:
   * {
   *   reason: string
   * }
   */
  async markAsFailed(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const verifiedBy = (req as any).user?.id;

      const request = await this.verificationService.markAsFailed(id, reason, verifiedBy);

      res.json({
        success: true,
        data: request,
        message: '검증 실패로 처리되었습니다.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /license-verification/stats
   *
   * 검증 통계 조회
   *
   * Query Parameters:
   * - organizationId: 조직 ID (선택)
   */
  async getStats(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const stats = await this.verificationService.getVerificationStats(organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /license-verification/bulk-requests
   *
   * 일괄 검증 요청 생성
   *
   * Request Body:
   * {
   *   memberIds: string[]
   * }
   */
  async createBulkRequests(req: Request, res: Response) {
    try {
      const { memberIds } = req.body;
      const requestedBy = (req as any).user?.id;

      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'memberIds는 필수이며 배열이어야 합니다.',
        });
      }

      const result = await this.verificationService.createBulkRequests(memberIds, requestedBy);

      res.json({
        success: true,
        data: result,
        message: `${result.success}개 요청 생성됨, ${result.failed}개 실패`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
