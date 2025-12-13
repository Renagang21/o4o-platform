import { Router, Request, Response } from 'express';
import { MemberController } from '../controllers/MemberController.js';
import { MemberService } from '../services/MemberService.js';
import { DataSource } from 'typeorm';

/**
 * Create Member Routes
 */
export function createMemberRoutes(dataSource: DataSource): Router {
  const router = Router();
  const memberService = new MemberService(dataSource);
  const controller = new MemberController(memberService);

  // ===== 회원용 라우트 (인증된 사용자 본인 정보) =====
  // NOTE: /me 라우트는 /:id 보다 먼저 정의해야 함

  // GET /api/membership/members/me
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const member = await memberService.findByUserId(user.id);
      if (!member) {
        return res.status(404).json({
          success: false,
          error: 'Member not found',
        });
      }

      const enrichedMember = memberService.enrichMemberWithStatus(member);
      res.json({ success: true, data: enrichedMember });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/membership/members/me/summary
  router.get('/me/summary', async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const member = await memberService.findByUserId(user.id);
      if (!member) {
        return res.status(404).json({
          success: false,
          error: 'Member not found',
        });
      }

      const enriched = memberService.enrichMemberWithStatus(member);

      // 면허 상태 계산
      let licenseStatus: 'valid' | 'expiring_soon' | 'expired' = 'valid';
      if (member.licenseRenewalAt) {
        const renewalDate = new Date(member.licenseRenewalAt);
        const daysUntilRenewal = Math.floor(
          (renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilRenewal < 0) {
          licenseStatus = 'expired';
        } else if (daysUntilRenewal <= 90) {
          licenseStatus = 'expiring_soon';
        }
      }

      // 회원 상태 계산
      let memberStatus: 'active' | 'inactive' | 'pending' = 'inactive';
      if (member.isActive && member.isVerified) {
        memberStatus = 'active';
      } else if (!member.isVerified) {
        memberStatus = 'pending';
      }

      const summary = {
        id: member.id,
        name: member.name,
        licenseNumber: member.licenseNumber,
        isVerified: member.isVerified,
        isActive: member.isActive,
        memberStatus,
        licenseStatus,
        lastVerifiedAt: enriched.computedStatus?.lastVerificationDate?.toISOString(),
      };

      res.json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===== 관리자용 라우트 =====

  // GET /api/membership/members
  router.get('/', (req, res) => controller.list(req, res));

  // GET /api/membership/members/:id
  router.get('/:id', (req, res) => controller.get(req, res));

  // POST /api/membership/members
  router.post('/', (req, res) => controller.create(req, res));

  // PUT /api/membership/members/:id
  router.put('/:id', (req, res) => controller.update(req, res));

  // DELETE /api/membership/members/:id
  router.delete('/:id', (req, res) => controller.delete(req, res));

  // PATCH /api/membership/members/:id/verify
  router.patch('/:id/verify', (req, res) => controller.verify(req, res));

  // POST /api/membership/members/bulk-update
  router.post('/bulk-update', (req, res) => controller.bulkUpdate(req, res));

  return router;
}
