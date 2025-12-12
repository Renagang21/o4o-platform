import { Request, Response } from 'express';
import { AffiliationService } from '../services/AffiliationService.js';

/**
 * AffiliationController
 *
 * Phase 2: 조직 소속 관리 API 컨트롤러
 */
export class AffiliationController {
  constructor(private affiliationService: AffiliationService) {}

  /**
   * GET /members/:memberId/affiliations
   *
   * 회원의 소속 목록 조회
   */
  async listByMember(req: Request, res: Response) {
    try {
      const { memberId } = req.params;

      const affiliations = await this.affiliationService.listByMember(memberId);

      res.json({
        success: true,
        data: affiliations,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /organizations/:organizationId/members
   *
   * 조직의 회원 목록 조회
   *
   * Query Parameters:
   * - activeOnly: 활성 소속만 (기본: true)
   * - primaryOnly: 주 소속만 (기본: false)
   * - page: 페이지 번호 (기본: 1)
   * - limit: 페이지당 항목 수 (기본: 20)
   */
  async listByOrganization(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;
      const activeOnly = req.query.activeOnly !== 'false';
      const primaryOnly = req.query.primaryOnly === 'true';
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await this.affiliationService.listMembersByOrganization(
        organizationId,
        { activeOnly, primaryOnly, page, limit }
      );

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
   * POST /members/:memberId/affiliations
   *
   * 회원 소속 추가
   */
  async create(req: Request, res: Response) {
    try {
      const { memberId } = req.params;
      const dto = {
        ...req.body,
        memberId,
      };

      const affiliation = await this.affiliationService.create(dto);

      res.status(201).json({
        success: true,
        data: affiliation,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * PUT /affiliations/:id
   *
   * 소속 정보 수정
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const affiliation = await this.affiliationService.update(id, req.body);

      res.json({
        success: true,
        data: affiliation,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * DELETE /affiliations/:id
   *
   * 소속 삭제
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await this.affiliationService.delete(id);

      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /members/:memberId/primary-affiliation
   *
   * 주 소속 할당
   *
   * Request Body:
   * {
   *   organizationId: string,
   *   position?: string,
   *   reason?: string,
   *   organizationName?: string
   * }
   */
  async assignPrimaryAffiliation(req: Request, res: Response) {
    try {
      const { memberId } = req.params;
      const { organizationId, position, reason, organizationName } = req.body;

      // 변경자 정보 (인증된 사용자)
      const changedBy = (req as any).user?.id;
      const changedByName = (req as any).user?.name;

      const result = await this.affiliationService.assignPrimaryAffiliation(
        memberId,
        organizationId,
        {
          position,
          reason,
          changedBy,
          changedByName,
          organizationName,
        }
      );

      res.json({
        success: true,
        data: {
          affiliation: result.affiliation,
          changeLog: result.changeLog,
          previousOrganizationId: result.previousOrganizationId,
        },
        message: result.previousOrganizationId
          ? '주 소속이 변경되었습니다.'
          : '주 소속이 설정되었습니다.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /members/:memberId/transfer
   *
   * 조직 이동 (Transfer)
   *
   * Request Body:
   * {
   *   fromOrganizationId: string,
   *   toOrganizationId: string,
   *   toPosition: string,
   *   reason?: string
   * }
   */
  async transferAffiliation(req: Request, res: Response) {
    try {
      const { memberId } = req.params;
      const { fromOrganizationId, toOrganizationId, toPosition, reason } = req.body;

      // 변경자 정보
      const changedBy = (req as any).user?.id;
      const changedByName = (req as any).user?.name;

      const result = await this.affiliationService.transferAffiliation({
        memberId,
        fromOrganizationId,
        toOrganizationId,
        toPosition,
        reason,
        changedBy,
        changedByName,
      });

      res.json({
        success: true,
        data: {
          newAffiliation: result.newAffiliation,
          oldAffiliation: result.oldAffiliation,
          changeLog: result.changeLog,
        },
        message: '조직 이동이 완료되었습니다.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /members/:memberId/position
   *
   * 직책 변경
   *
   * Request Body:
   * {
   *   organizationId: string,
   *   newPosition: string,
   *   reason?: string
   * }
   */
  async changePosition(req: Request, res: Response) {
    try {
      const { memberId } = req.params;
      const { organizationId, newPosition, reason } = req.body;

      // 변경자 정보
      const changedBy = (req as any).user?.id;
      const changedByName = (req as any).user?.name;

      const result = await this.affiliationService.changePosition(
        memberId,
        organizationId,
        newPosition,
        {
          reason,
          changedBy,
          changedByName,
        }
      );

      res.json({
        success: true,
        data: {
          affiliation: result.affiliation,
          changeLog: result.changeLog,
        },
        message: '직책이 변경되었습니다.',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /members/:memberId/affiliation-history
   *
   * 회원의 조직 변경 이력 조회
   */
  async getAffiliationHistory(req: Request, res: Response) {
    try {
      const { memberId } = req.params;

      const history = await this.affiliationService.getAffiliationHistory(memberId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /organizations/:organizationId/affiliation-history
   *
   * 조직의 회원 변경 이력 조회
   */
  async getOrganizationAffiliationHistory(req: Request, res: Response) {
    try {
      const { organizationId } = req.params;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const result = await this.affiliationService.getOrganizationChangeHistory(
        organizationId,
        { page, limit }
      );

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
   * GET /members/:memberId/primary-affiliation
   *
   * 회원의 주 소속 조회
   */
  async getPrimaryAffiliation(req: Request, res: Response) {
    try {
      const { memberId } = req.params;

      const affiliation = await this.affiliationService.getPrimaryAffiliation(memberId);

      res.json({
        success: true,
        data: affiliation,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
