/**
 * Pharmacy-Hub Store Owner Dashboard Controller (읽기 전용 요약)
 *
 * WO-PHARMACY-HUB-STORE-HOME-DASHBOARD-V1
 *
 *   GET /api/v1/pharmacy-hub/store-owner/dashboard   내 매장 홈 요약
 *
 * 이 엔드포인트는 **SELECT 전용**이다. 어떤 상태도 변경하지 않으며, 집계 테이블도 만들지 않는다.
 * 기존 원장(service_memberships / organizations / store_cart_items / checkout_orders)을
 * 그대로 읽는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 매장 조직 식별 원칙 (WO §데이터 SSOT — 임시 편법이 아니라 확정 정책)
 *
 *   Pharmacy-Hub 의 매장 조직은
 *     organization_service_enrollments(service_code='pharmacy-hub', status='active')
 *   로 식별한다. **일반 조직 멤버십만으로 다른 서비스의 조직을 Pharmacy-Hub 매장으로
 *   추정하지 않는다.**
 *
 *   해석 규칙:
 *     로그인 사용자
 *     → organization_members 활성 매장 역할(owner/admin/manager, left_at IS NULL) 후보
 *     → 위 enrollment 로 한정
 *     → 정확히 1개  : organizations.name 사용            (status='connected')
 *     → 0개         : "매장 정보 미연결"                  (status='not_connected')
 *     → 2개 이상    : 임의 선택 금지, 명시적 오류         (status='ambiguous',
 *                                                        code='AMBIGUOUS_STORE_CONNECTION')
 *
 *   폴백 금지 대상 (하나라도 매장명으로 대신 쓰지 않는다):
 *     K-Cosmetics 조직 · KPA 약국 조직 · Neture 공급자 조직 ·
 *     users.businessInfo · 일반 organization_members LIMIT 1
 *
 *   왜 공통 resolveStoreAccess() 를 쓰지 않는가:
 *     utils/store-owner.utils.ts 의 isStoreOwner() 는 organization_members 를
 *     ORDER BY 없이 LIMIT 1 로 읽으므로 다중 조직 계정에서 **비결정적**이며,
 *     서비스 스코프도 걸지 않는다(프로덕션 실측: PH store_owner 3계정 중 1계정이
 *     타 서비스 조직 3개 보유). 공통 해석기 정비는 KPA/GlycoPharm/K-Cosmetics 까지
 *     영향을 주는 별도 작업이므로 **본 WO 는 공통 해석기를 변경하지 않고**
 *     Pharmacy-Hub 전용 읽기 경로에서만 enrollment 스코프를 적용한다.
 *
 *   WO-PHARMACY-HUB-STORE-INFO-AND-ACCOUNT-V1 (2026-08-05):
 *     위 규칙을 store-organization.resolver.ts 로 옮겨 매장 정보 조회·수정과 **동일한
 *     해석기**를 쓰게 했다. 규칙·SQL·반환 의미는 그대로이며(홈 요약 동작 불변),
 *     "보이는 매장"과 "저장되는 매장"이 갈라질 여지를 구조적으로 없앤 것이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 장바구니·주문 경계는 기존 저장 계약 그대로 (조직 기준으로 바꾸지 않는다)
 *
 *   장바구니 = store_cart_items.buyer_id + service_key='pharmacy-hub'
 *   주문     = checkout_orders."buyerId" + metadata->>'serviceKey'='pharmacy-hub'
 *   매장명   = 위 enrollment 조직
 *
 * 조회 실패는 삼키지 않는다 — 실패한 영역은 error 로 표시하고 정상 0건과 구분한다.
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { SERVICE_KEYS } from '../../constants/service-keys.js';
import logger from '../../utils/logger.js';
import { resolvePharmacyHubStoreOrganization } from './store-organization.resolver.js';

const SERVICE_KEY = SERVICE_KEYS.PHARMACY_HUB;

/** 홈에 노출하는 최근 주문 개수 */
const RECENT_ORDER_LIMIT = 5;

interface StoreBlock {
  status: 'connected' | 'not_connected' | 'ambiguous';
  organizationId: string | null;
  name: string | null;
  code: string | null;
  slug: string | null;
  /** enrollment 스코프를 통과한 후보 조직 수 (0 / 1 / 2 이상) */
  candidateCount: number;
  errorCode?: 'AMBIGUOUS_STORE_CONNECTION';
}

export class PharmacyHubStoreDashboardController {
  /** GET /store-owner/dashboard — 홈 요약 (읽기 전용) */
  static async summary(req: Request, res: Response): Promise<any> {
    const userId = (req as any).user?.id;
    if (typeof userId !== 'string' || userId.length === 0) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
      const [store, membership, cart, orders] = await Promise.all([
        PharmacyHubStoreDashboardController.resolveStore(userId),
        PharmacyHubStoreDashboardController.loadMembership(userId),
        PharmacyHubStoreDashboardController.loadCart(userId),
        PharmacyHubStoreDashboardController.loadOrders(userId),
      ]);

      return res.json({ success: true, data: { store, membership, cart, orders } });
    } catch (error) {
      logger.error('[PharmacyHubStoreDashboard] summary failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({
        success: false,
        error: '매장 요약 정보를 불러오지 못했습니다.',
        code: 'DASHBOARD_SUMMARY_FAILED',
      });
    }
  }

  /**
   * 매장 조직 해석 — enrollment 스코프 한정. 0개는 빈 상태, 2개 이상은 명시적 오류.
   * 어떤 경우에도 후보를 임의로 고르지 않는다.
   */
  private static async resolveStore(userId: string): Promise<StoreBlock> {
    const resolution = await resolvePharmacyHubStoreOrganization(userId);

    if (resolution.status === 'not_connected') {
      return {
        status: 'not_connected',
        organizationId: null,
        name: null,
        code: null,
        slug: null,
        candidateCount: 0,
      };
    }
    if (resolution.status === 'ambiguous') {
      // 2개 이상은 사람이 판단할 대상이다. 이름을 하나 골라 보여주지 않는다.
      return {
        status: 'ambiguous',
        organizationId: null,
        name: null,
        code: null,
        slug: null,
        candidateCount: resolution.candidateCount,
        errorCode: resolution.errorCode,
      };
    }

    const org = resolution.org;
    return {
      status: 'connected',
      organizationId: org.id,
      name: org.name,
      code: org.code,
      slug: org.slug,
      candidateCount: 1,
    };
  }

  /** 가입·이용 상태 — /join/status 와 동일한 원장·동일 의미 (판정 로직 이중화 없음) */
  private static async loadMembership(userId: string) {
    const rows = await AppDataSource.query(
      `SELECT status, role, approved_at, created_at
         FROM service_memberships
        WHERE user_id = $1::uuid AND service_key = $2
        LIMIT 1`,
      [userId, SERVICE_KEY],
    );
    if (rows.length === 0) {
      return { status: 'none', role: null, roleType: null, approvedAt: null, appliedAt: null };
    }
    const m = rows[0];
    const role = m.role ?? null;
    const roleType =
      typeof role === 'string' && role.startsWith(`${SERVICE_KEY}:`)
        ? role.slice(SERVICE_KEY.length + 1)
        : role;
    return {
      status: m.status,
      role,
      roleType,
      approvedAt: m.approved_at ?? null,
      appliedAt: m.created_at ?? null,
    };
  }

  /** 장바구니 현황 — 경계는 buyer_id + service_key (조직 아님) */
  private static async loadCart(userId: string) {
    const [row] = await AppDataSource.query(
      `SELECT COUNT(*)::int                    AS "itemCount",
              COALESCE(SUM(quantity), 0)::int  AS "totalQuantity"
         FROM store_cart_items
        WHERE buyer_id = $1::uuid AND service_key = $2`,
      [userId, SERVICE_KEY],
    );
    return { itemCount: row?.itemCount ?? 0, totalQuantity: row?.totalQuantity ?? 0 };
  }

  /**
   * 주문 요약 + 최근 주문.
   *
   * 상태 분류는 주문 원장 값만으로 계산한다 (추정 금지):
   *   awaitingPayment = 취소·환불이 아니고 결제가 완료되지 않은 주문
   *   inFulfillment   = 결제 완료 + 취소·환불 아님 (공급자 처리 대기 또는 배송 진행)
   *   cancelled       = 취소 또는 환불
   */
  private static async loadOrders(userId: string) {
    const [counts] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (
                WHERE status NOT IN ('cancelled', 'refunded')
                  AND "paymentStatus" <> 'paid'
              )::int AS "awaitingPayment",
              COUNT(*) FILTER (
                WHERE status NOT IN ('cancelled', 'refunded')
                  AND "paymentStatus" = 'paid'
              )::int AS "inFulfillment",
              COUNT(*) FILTER (WHERE status IN ('cancelled', 'refunded'))::int AS cancelled
         FROM checkout_orders
        WHERE "buyerId" = $1::uuid
          AND metadata->>'serviceKey' = $2`,
      [userId, SERVICE_KEY],
    );

    const recent = await AppDataSource.query(
      `SELECT co.id::text                     AS "orderId",
              co."orderNumber",
              co.status,
              co."paymentStatus",
              co."totalAmount",
              jsonb_array_length(co.items)    AS "itemCount",
              co."createdAt"
         FROM checkout_orders co
        WHERE co."buyerId" = $1::uuid
          AND co.metadata->>'serviceKey' = $2
        ORDER BY co."createdAt" DESC
        LIMIT ${RECENT_ORDER_LIMIT}`,
      [userId, SERVICE_KEY],
    );

    return {
      total: counts?.total ?? 0,
      awaitingPayment: counts?.awaitingPayment ?? 0,
      inFulfillment: counts?.inFulfillment ?? 0,
      cancelled: counts?.cancelled ?? 0,
      // 공급자 전달 여부 판정은 기존 목록 계약(GET /store-owner/orders)과 동일하게 둔다 —
      // 같은 주문이 홈과 목록에서 다른 배지로 보이면 안 된다.
      recent: recent.map((it: any) => ({ ...it, supplierNotified: it.paymentStatus === 'paid' })),
      recentLimit: RECENT_ORDER_LIMIT,
    };
  }
}
