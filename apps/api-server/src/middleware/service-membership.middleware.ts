/**
 * Active service membership 미들웨어
 *
 * WO-O4O-B2B-REMAINING-DEBT-FINAL-CLOSURE-V1 §13
 *
 * 판정 자체는 `utils/service-membership.ts` 가 SSOT 다(DB 기반 · fail-closed).
 * 이 파일은 그 판정을 **express write 경로에 붙이는 얇은 어댑터**일 뿐이며
 * 새 권한 모델을 만들지 않는다(§13 — Identity/RBAC 전체 재설계로 확대하지 않는다).
 *
 * 배경:
 *   canonical B2B cart · 두 confirm 경로(`/cart/:serviceKey/checkout-confirm*`)는
 *   `resolveScope()` 에서 이미 active membership 을 요구한다.
 *   그런데 구매자 주문 **취소**(`POST /checkout/orders/:orderId/cancel` 계열)는
 *   `requireAuth` + buyerId + serviceKeys 범위만 확인해서, 정지(suspended)된 회원이
 *   canonical `checkout_orders` 상태를 바꾸고 이벤트오퍼 재고 복원까지 유발할 수 있었다.
 *   취소는 조회가 아니라 **write** 이므로 cart/confirm 과 같은 경계를 적용한다.
 *
 * 조회(구매자 주문 목록·상세)에는 붙이지 않는다 — 자기 주문을 읽는 것은 write 가 아니고,
 * 정지 회원이 과거 주문 내역을 못 보게 만들 이유가 없다.
 */
import type { NextFunction, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import type { AuthRequest } from '../types/auth.js';
import { hasActiveServiceMembership } from '../utils/service-membership.js';

/**
 * 지정한 serviceKey 에 active membership 이 있는 사용자만 통과시킨다.
 *
 * serviceKey 는 **호출부가 고정한 상수**를 넘긴다 — 요청 body/query 에서 읽지 않는다
 * (CLAUDE.md §7 Guard Rule 4: serviceKey 스푸핑 금지).
 * 응답 코드는 cart 경로와 동일하게 403 `SERVICE_MEMBERSHIP_REQUIRED` 다.
 */
export function requireActiveServiceMembership(dataSource: DataSource, serviceKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id || authReq.authUser?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated', code: 'UNAUTHORIZED' });
      return;
    }
    // fail-closed — DB 오류도 통과가 아니다(hasActiveServiceMembership 계약).
    if (!(await hasActiveServiceMembership(dataSource, userId, serviceKey))) {
      res.status(403).json({
        success: false,
        error: '해당 서비스의 활성 회원만 이용할 수 있습니다.',
        code: 'SERVICE_MEMBERSHIP_REQUIRED',
      });
      return;
    }
    next();
  };
}
