/**
 * Store Product Request Notifications (P3)
 *
 * WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (Phase 3)
 *
 * 매장 신규 상품 등록 요청 알림. 전부 **best-effort**(내부 try/catch) — 알림 실패가 제출/승인
 * 트랜잭션을 롤백하지 않는다(커밋 후 호출). member.registration / pharmacy.request 패턴 재사용.
 *
 * 수신자 해석: role_assignments (role 은 role-prefix 형식 'kpa:operator'/'kpa:admin').
 * candidate.serviceKey 는 role-prefix 형식('kpa') 이므로 그대로 `${sk}:operator|admin` 로 사용.
 * Notification.serviceKey 는 canonical('kpa-society') 로 저장(기존 알림과 정합).
 */

import type { DataSource } from 'typeorm';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { notificationService } from '../../../services/NotificationService.js';
import logger from '../../../utils/logger.js';

// ── target route 계약 (WO-O4O-CROSSSERVICE-NOTIFICATION-TARGET-ROUTE-CONTRACT-AUDIT-AND-CLOSURE-V1) ──
// 알림은 notification.serviceKey 로 필터되어 **해당 서비스 web 앱 헤더에서만** 노출되고, 헤더는
// metadata.targetUrl 로 자기 origin 내부 경로만 navigate 한다(resolveNotificationTarget 는 내부 절대
// 경로만 통과시킨다). 따라서 target 은 serviceKey 별 route tree 에 실재하는 경로여야 한다.
// partner-contract.service.ts 의 resolveRecruitmentApplicationTargetUrl 선례와 동일 패턴.
//
// 검토 화면 현황:
//   - neture : /operator/product-candidates (ProductCandidateReviewPage — sourceType 'store_web' 포함) ✅
//   - kpa / glycopharm / cosmetics : 서비스 web 에 검토 화면 없음. 유일한 검토 콘솔은
//     admin-dashboard `/admin/o4o-product-db/store-requests` 이며 **다른 origin(admin.neture.co.kr)** 이라
//     서비스 web 알림의 내부 경로 target 으로 표현할 수 없다 → targetUrl 미지정(이동 없음).
//     새 서비스측 검토 route 신설은 본 WO 범위 밖(§26) → FOLLOWUP.
const ADMIN_TARGET_URL_BY_SERVICE: Record<string, string> = {
  neture: '/operator/product-candidates',
};

// 매장 요청 목록(handled-products 상단 '내 등록 요청') — KPA 매장 web 에만 실재한다.
const STORE_TARGET_URL_BY_SERVICE: Record<string, string> = {
  kpa: '/store/handled-products',
};

/** role-prefix serviceKey → 검토 화면 경로. 없으면 undefined(= targetUrl 미지정). */
function adminTargetUrl(sk: string | null): string | undefined {
  return sk ? ADMIN_TARGET_URL_BY_SERVICE[sk] : undefined;
}

/** role-prefix serviceKey → 매장 요청 목록 경로. 없으면 undefined(= targetUrl 미지정). */
function storeTargetUrl(sk: string | null): string | undefined {
  return sk ? STORE_TARGET_URL_BY_SERVICE[sk] : undefined;
}

function canonical(sk: string | null): string | undefined {
  if (!sk) return undefined;
  try { return resolveCanonicalServiceKey(sk); } catch { return sk; }
}

/** 요청 제출/재제출 → 서비스 운영자·관리자 브로드캐스트 */
export async function notifyAdminsOfStoreProductRequest(
  dataSource: DataSource,
  input: { serviceKey: string | null; requestId: string; productName: string | null; actorId?: string | null; organizationId?: string | null },
): Promise<void> {
  try {
    const sk = input.serviceKey;
    if (!sk) return;
    const roles = [`${sk}:operator`, `${sk}:admin`];
    const operators: Array<{ userId: string }> = await dataSource.query(
      `SELECT DISTINCT user_id AS "userId" FROM role_assignments
        WHERE role = ANY($1) AND is_active = true LIMIT 30`,
      [roles],
    );
    if (operators.length === 0) return;
    const name = input.productName || '신규 상품';
    await Promise.allSettled(
      operators.map((op) =>
        notificationService.createNotification({
          userId: op.userId,
          type: 'store.product_request_submitted',
          title: '신규 상품 등록 요청 접수',
          message: `매장에서 '${name}' 신규 상품 등록을 요청했습니다.`,
          serviceKey: canonical(sk),
          organizationId: input.organizationId ?? undefined,
          actorId: input.actorId ?? undefined,
          metadata: {
            requestId: input.requestId,
            productName: name,
            ...(adminTargetUrl(sk) ? { targetUrl: adminTargetUrl(sk) } : {}),
          },
        }),
      ),
    );
  } catch (e) {
    logger.warn('[StoreProductRequestNotify] admin broadcast failed (best-effort)', e);
  }
}

type Decision = 'revision_requested' | 'approved' | 'rejected';

const DECISION_MSG: Record<Decision, { type: any; title: string; body: (name: string, note?: string | null) => string }> = {
  revision_requested: {
    type: 'store.product_request_revision_requested',
    title: '상품 등록 요청 보완 필요',
    body: (name, note) => `'${name}' 등록 요청에 보완이 필요합니다.${note ? ` 사유: ${note}` : ''}`,
  },
  approved: {
    type: 'store.product_request_approved',
    title: '상품 등록 요청 승인',
    body: (name) => `'${name}' 등록 요청이 승인되어 매장 경영활용 제품에 추가되었습니다.`,
  },
  rejected: {
    type: 'store.product_request_rejected',
    title: '상품 등록 요청 등록 불가',
    body: (name, note) => `'${name}' 등록 요청이 등록 불가 처리되었습니다.${note ? ` 사유: ${note}` : ''}`,
  },
};

/** 관리자 처리(보완/승인/등록불가) → 요청 제출 매장(제출자) 알림 */
export async function notifySubmitterOfStoreProductRequestDecision(
  input: {
    submittedBy: string | null;
    serviceKey: string | null;
    organizationId?: string | null;
    requestId: string;
    productName: string | null;
    decision: Decision;
    note?: string | null;
    actorId?: string | null;
  },
): Promise<void> {
  try {
    if (!input.submittedBy) return;
    const name = input.productName || '신규 상품';
    const d = DECISION_MSG[input.decision];
    await notificationService.createNotification({
      userId: input.submittedBy,
      type: d.type,
      title: d.title,
      message: d.body(name, input.note),
      serviceKey: canonical(input.serviceKey),
      organizationId: input.organizationId ?? undefined,
      actorId: input.actorId ?? undefined,
      metadata: {
        requestId: input.requestId,
        productName: name,
        ...(storeTargetUrl(input.serviceKey) ? { targetUrl: storeTargetUrl(input.serviceKey) } : {}),
      },
    });
  } catch (e) {
    logger.warn('[StoreProductRequestNotify] submitter notify failed (best-effort)', e);
  }
}
