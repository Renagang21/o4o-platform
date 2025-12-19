import type { Router, Request, Response } from 'express';

/**
 * Member-Yaksa Routes (Skeleton)
 *
 * Phase 0: 라우트 존재만 확인 가능
 * 실제 구현은 Phase 1 이후
 *
 * Policy Reminder:
 * - 모든 엔드포인트는 본인 데이터만 접근 가능
 * - 면허번호: 조회만 가능 (수정 불가)
 * - 약국정보: 본인만 수정 가능 (관리자도 수정 불가)
 */

/**
 * Create member-yaksa routes
 */
export function createMemberYaksaRoutes(router: Router): Router {
  // ===== Home Routes =====
  router.get('/member/home', (req: Request, res: Response) => {
    // Phase 0: Skeleton
    res.json({
      success: true,
      message: 'Member Home - Phase 0 Skeleton',
      uxPriority: [
        'organization_notice',
        'groupbuy',
        'lms',
        'forum',
        'banner',
      ],
    });
  });

  // ===== Profile Routes =====
  router.get('/member/profile', (req: Request, res: Response) => {
    // Phase 0: Skeleton
    res.json({
      success: true,
      message: 'Member Profile - Phase 0 Skeleton',
      policy: {
        licenseNumber: 'READ_ONLY',
        personalInfo: 'EDITABLE_BY_SELF',
      },
    });
  });

  router.put('/member/profile', (req: Request, res: Response) => {
    // Phase 0: Skeleton
    res.json({
      success: true,
      message: 'Profile Update - Phase 0 Skeleton',
      note: 'License number cannot be modified by member',
    });
  });

  // ===== Pharmacy Routes =====
  router.get('/member/pharmacy', (req: Request, res: Response) => {
    // Phase 0: Skeleton
    res.json({
      success: true,
      message: 'Pharmacy Info - Phase 0 Skeleton',
      policy: {
        pharmacyRegistrationNumber: 'READ_ONLY',
        otherFields: 'EDITABLE_BY_MEMBER_ONLY',
        adminCanEdit: false,
      },
    });
  });

  router.put('/member/pharmacy', (req: Request, res: Response) => {
    // Phase 0: Skeleton
    // Policy: 수정 시 "본인 책임" 확인 필요
    res.json({
      success: true,
      message: 'Pharmacy Update - Phase 0 Skeleton',
      warning: '약국 정보 수정은 본인 책임입니다.',
      confirmationRequired: true,
    });
  });

  return router;
}

// Alias for backward compatibility
export const createRoutes = createMemberYaksaRoutes;
