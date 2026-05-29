/**
 * GlycoPharm MyPage Controller
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-GLYCO-KCOS-ROUTE-V1
 *
 * Routes:
 *   GET /mypage/my-requests  — 통합 신청 내역 (membership + service applications)
 *
 * 반환 shape: MyRequestItem[] (canonicalStatus 기준)
 * Read-only. 상태 변경 없음.
 */

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import { GlycopharmMemberService } from '../services/glycopharm-member.service.js';
import { GlycopharmApplication } from '../entities/glycopharm-application.entity.js';
import {
  glycopharmMemberToCanonical,
  glycopharmApplicationToCanonical,
} from '../utils/canonical-status.js';

interface AuthRequest extends Request {
  user?: { userId?: string; id?: string };
}

function getUserId(req: AuthRequest): string | null {
  return req.user?.userId ?? req.user?.id ?? null;
}

export function createGlycopharmMypageController(
  dataSource: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router();
  const memberService = new GlycopharmMemberService(dataSource);

  /**
   * GET /glycopharm/mypage/my-requests
   *
   * 현재 로그인 사용자의 통합 신청 내역을 반환한다.
   * - membership (glycopharm_members)
   * - service applications (glycopharm_applications)
   * createdAt DESC 정렬.
   */
  router.get('/my-requests', requireAuth, async (req: Request, res: Response) => {
    const userId = getUserId(req as AuthRequest);
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }

    try {
      const [member, applications] = await Promise.all([
        memberService.getMyMembership(userId),
        dataSource.getRepository(GlycopharmApplication).find({
          where: { userId },
          order: { submittedAt: 'DESC' },
        }),
      ]);

      const items: Record<string, unknown>[] = [];

      if (member) {
        const subRoleLabel =
          member.subRole === 'pharmacy_owner' ? '약국경영자' :
          member.subRole === 'staff_pharmacist' ? '근무약사' : null;

        items.push({
          id: member.id,
          entityType: 'membership',
          status: glycopharmMemberToCanonical(member.status),
          displayTitle: '약사 회원 신청',
          displayDescription: subRoleLabel,
          reviewComment: member.rejectionReason ?? null,
          revisionNote: null,
          reviewedAt: member.approvedAt?.toISOString() ?? null,
          resultEntityId: null,
          resultMetadata: null,
          submittedAt: member.createdAt.toISOString(),
          createdAt: member.createdAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
          payload: {
            subRole: member.subRole ?? null,
            membershipType: member.membershipType,
          },
          serviceKey: 'glycopharm',
        });
      }

      for (const app of applications) {
        const serviceTypesLabel = Array.isArray(app.serviceTypes)
          ? app.serviceTypes.join(', ')
          : null;

        items.push({
          id: app.id,
          entityType: 'service_application',
          status: glycopharmApplicationToCanonical(app.status),
          displayTitle: app.organizationName || '약국 참여 신청',
          displayDescription: serviceTypesLabel,
          reviewComment: app.rejectionReason ?? null,
          revisionNote: null,
          reviewedAt: app.decidedAt?.toISOString() ?? null,
          resultEntityId: null,
          resultMetadata: null,
          submittedAt: app.submittedAt?.toISOString() ?? null,
          createdAt: app.submittedAt?.toISOString() ?? new Date().toISOString(),
          updatedAt: app.decidedAt?.toISOString() ?? app.submittedAt?.toISOString() ?? new Date().toISOString(),
          payload: {
            organizationType: app.organizationType,
            organizationName: app.organizationName,
            serviceTypes: app.serviceTypes,
            note: app.note ?? null,
          },
          serviceKey: 'glycopharm',
        });
      }

      // createdAt DESC
      items.sort((a, b) =>
        new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime(),
      );

      res.json({ success: true, data: items });
    } catch (err) {
      res.status(500).json({ success: false, error: '신청 내역 조회 중 오류가 발생했습니다.' });
    }
  });

  return router;
}
