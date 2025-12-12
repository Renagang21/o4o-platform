import { Request, Response } from 'express';
import { MemberService } from '../services/MemberService.js';

/**
 * MemberController
 *
 * 회원 관리 API 컨트롤러
 */
export class MemberController {
  constructor(private memberService: MemberService) {}

  /**
   * GET /members
   *
   * Query Parameters:
   * - organizationId: 조직 ID
   * - categoryId: 분류 ID
   * - isVerified: 검증 여부 (true/false)
   * - isActive: 활성 여부 (true/false)
   * - search: 통합 검색 (이름 또는 면허번호)
   * - name: 이름 검색
   * - licenseNumber: 면허번호 검색
   * - year: 연회비 연도
   * - paid: 연회비 납부 여부 (true/false)
   * - verificationStatus: 검증 상태 (pending/approved/rejected)
   * - createdFrom: 가입일 시작 (ISO 8601)
   * - createdTo: 가입일 종료 (ISO 8601)
   * - page: 페이지 번호 (기본: 1)
   * - limit: 페이지당 항목 수 (기본: 20)
   */
  async list(req: Request, res: Response) {
    try {
      const filter = {
        organizationId: req.query.organizationId as string | undefined,
        categoryId: req.query.categoryId as string | undefined,
        isVerified: req.query.isVerified === 'true' ? true : req.query.isVerified === 'false' ? false : undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
        name: req.query.name as string | undefined,
        licenseNumber: req.query.licenseNumber as string | undefined,
        year: req.query.year ? parseInt(req.query.year as string, 10) : undefined,
        paid: req.query.paid === 'true' ? true : req.query.paid === 'false' ? false : undefined,
        verificationStatus: req.query.verificationStatus as 'pending' | 'approved' | 'rejected' | undefined,
        createdFrom: req.query.createdFrom ? new Date(req.query.createdFrom as string) : undefined,
        createdTo: req.query.createdTo ? new Date(req.query.createdTo as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await this.memberService.list(filter);

      // Enrich members with computed status
      const enrichedData = result.data.map(member =>
        this.memberService.enrichMemberWithStatus(member)
      );

      res.json({
        success: true,
        data: enrichedData,
        total: result.total,
        page: filter.page,
        limit: filter.limit,
        totalPages: Math.ceil(result.total / filter.limit),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /members/:id
   */
  async get(req: Request, res: Response) {
    try {
      const member = await this.memberService.findById(req.params.id);
      if (!member) {
        return res.status(404).json({
          success: false,
          error: 'Member not found'
        });
      }

      // Enrich with computed status
      const enrichedMember = this.memberService.enrichMemberWithStatus(member);

      res.json({
        success: true,
        data: enrichedMember,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /members
   */
  async create(req: Request, res: Response) {
    try {
      const member = await this.memberService.create(req.body);
      res.status(201).json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PUT /members/:id
   *
   * Phase 2: officialRole 변경 시 자동 역할 동기화 결과 포함
   */
  async update(req: Request, res: Response) {
    try {
      const updatedBy = (req as any).user?.id;
      const result = await this.memberService.update(req.params.id, req.body, updatedBy);

      res.json({
        success: true,
        data: result.member,
        roleSyncResult: result.roleSyncResult,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /members/:id
   */
  async delete(req: Request, res: Response) {
    try {
      await this.memberService.delete(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * PATCH /members/:id/verify
   */
  async verify(req: Request, res: Response) {
    try {
      const member = await this.memberService.setVerified(req.params.id, true);
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /members/bulk-update
   *
   * 일괄 업데이트
   *
   * Request Body:
   * {
   *   memberIds: string[],
   *   action: 'set-category' | 'verify' | 'toggle-active' | 'update',
   *   value?: any // action에 따라 다름
   * }
   */
  async bulkUpdate(req: Request, res: Response) {
    try {
      const { memberIds, action, value } = req.body;

      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'memberIds는 필수이며 배열이어야 합니다.',
        });
      }

      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'action은 필수입니다.',
        });
      }

      let result: { success: number; failed: number; errors: string[] };

      switch (action) {
        case 'set-category':
          if (!value) {
            return res.status(400).json({
              success: false,
              error: 'set-category action은 value (categoryId)가 필요합니다.',
            });
          }
          result = await this.memberService.bulkSetCategory(memberIds, value);
          break;

        case 'verify':
          const isVerified = value === true || value === 'true';
          result = await this.memberService.bulkSetVerified(memberIds, isVerified);
          break;

        case 'toggle-active':
          const isActive = value === true || value === 'true';
          result = await this.memberService.bulkSetActive(memberIds, isActive);
          break;

        case 'update':
          if (!value || typeof value !== 'object') {
            return res.status(400).json({
              success: false,
              error: 'update action은 value (UpdateMemberDto 객체)가 필요합니다.',
            });
          }
          result = await this.memberService.bulkUpdate(memberIds, value);
          break;

        default:
          return res.status(400).json({
            success: false,
            error: `알 수 없는 action: ${action}. 허용된 action: set-category, verify, toggle-active, update`,
          });
      }

      res.json({
        success: true,
        message: `${result.success}개 성공, ${result.failed}개 실패`,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
