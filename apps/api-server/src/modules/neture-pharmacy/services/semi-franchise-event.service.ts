import { eventIndexState } from '../operations/event-index-transition.js';
/**
 * 세미프랜차이즈 이벤트 — DESIGN §3-5
 *
 * 원장은 기존 이벤트 원장 그대로(OPL, source_type='event-offer') — 수량 · 한도 · 예약 · 복원 함수
 * (reserveEventOfferListing · incrementListingQuantity · STORE_ORDERED_QTY_SQL)를 그대로 쓰기 위해서다.
 *   organization_id = 세미프랜차이즈 운영 조직 (LIMIT 1 임의 선택 대체)
 *   service_key     = 'neture-event-offer'      (최종: 부분 UNIQUE 제외 → 재신청 · 같은 제품 복수 승인 이벤트)
 * 이벤트 가격은 수정하지 않는다 — 취소(삭제 · 종료) 후 새로 신청한다. 종료는 단방향이다.
 *
 * WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1 — 1단계 임시 제한:
 *   idx_org_listing_unique_v2 는 구버전 API 호환을 위해 아직 전체 UNIQUE (organization_id, service_key, offer_id) 다.
 *   그래서 (세미프랜차이즈, 제품) 마다 이벤트 원장 행은 **상태 불문 하나**뿐이다 — 반려 · 종료 뒤 재신청과
 *   같은 제품의 두 번째 이벤트는 `EVENT_REAPPLY_NOT_YET_SUPPORTED`(409)로 막는다(UNIQUE 위반 500 대신 명시 거절).
 *   부분 UNIQUE 전환 migration(2단계)이 배포되면 이 검사를 걷어낸다.
 */
import type { DataSource } from 'typeorm';
import { NeturePharmacyError, SEMI_FRANCHISE_EVENT_SERVICE_KEY,
  rowsOf,
} from '../constants.js';
import type { SemiFranchiseRow } from './semi-franchise.service.js';

/** 1단계 임시 제한 오류 코드 — 2단계(부분 UNIQUE) 배포 후 제거 대상 */
export const EVENT_REAPPLY_NOT_YET_SUPPORTED = 'EVENT_REAPPLY_NOT_YET_SUPPORTED';
const EVENT_REAPPLY_MESSAGE =
  '이 제품은 이 세미프랜차이즈에 이벤트 신청 이력이 있습니다. 같은 제품의 재신청 · 추가 이벤트는 아직 지원하지 않습니다.';

function isListingUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string; driverError?: { code?: string; constraint?: string } };
  const code = e?.driverError?.code ?? e?.code;
  const constraint = e?.driverError?.constraint ?? e?.constraint;
  return code === '23505' && constraint === 'idx_org_listing_unique_v2';
}

export interface SemiFranchiseEventInput {
  offerId?: string;
  semiFranchiseKey?: string;
  eventPrice?: number;
  startAt?: string;
  endAt?: string;
  totalQuantity?: number | null;
  perStoreLimit?: number | null;
  perOrderLimit?: number | null;
}

function optionalInt(v: unknown, min: number, field: string): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) {
    throw new NeturePharmacyError(400, 'INVALID_EVENT_CONDITION', `${field} 는 ${min} 이상의 정수여야 합니다.`);
  }
  return n;
}

/** 입력 검증 — 기존 이벤트 생성 규칙(가격 ≤ 공급가 · 시작 < 종료 · 수량 하한)과 같다. */
export function validateEventInput(input: SemiFranchiseEventInput, priceGeneral: number) {
  const eventPrice = Number(input.eventPrice);
  if (!Number.isFinite(eventPrice) || eventPrice <= 0) {
    throw new NeturePharmacyError(400, 'INVALID_EVENT_PRICE', '이벤트 가격은 0보다 커야 합니다.');
  }
  if (eventPrice > priceGeneral) {
    throw new NeturePharmacyError(400, 'INVALID_EVENT_PRICE', `이벤트 가격(${eventPrice})은 공급가(${priceGeneral}) 이하여야 합니다.`);
  }
  const startAt = new Date(input.startAt ?? '');
  const endAt = new Date(input.endAt ?? '');
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime())) {
    throw new NeturePharmacyError(400, 'INVALID_EVENT_PERIOD', '시작 · 종료 일시가 필요합니다.');
  }
  if (startAt.getTime() >= endAt.getTime()) {
    throw new NeturePharmacyError(400, 'INVALID_EVENT_PERIOD', '시작 일시는 종료 일시보다 이전이어야 합니다.');
  }
  return {
    eventPrice,
    startAt,
    endAt,
    totalQuantity: optionalInt(input.totalQuantity, 0, 'totalQuantity'),
    perStoreLimit: optionalInt(input.perStoreLimit, 1, 'perStoreLimit'),
    perOrderLimit: optionalInt(input.perOrderLimit, 1, 'perOrderLimit'),
  };
}

const EVENT_VIEW = `
  SELECT opl.id, opl.status, opl.is_active AS "isActive", opl.event_price AS "eventPrice", opl.price AS "priceGeneral",
         opl.start_at AS "startAt", opl.end_at AS "endAt", opl.total_quantity AS "totalQuantity",
         opl.per_store_limit AS "perStoreLimit", opl.per_order_limit AS "perOrderLimit",
         opl.rejected_reason AS "reason", opl.created_at AS "createdAt", opl.decided_at AS "decidedAt",
         sf.key AS "semiFranchiseKey", sf.name AS "semiFranchiseName",
         spo.id AS "offerId", pm.name AS "productName", spo.supplier_id AS "supplierId",
         COALESCE(so.name, ns.slug) AS "supplierName"
    FROM organization_product_listings opl
    JOIN semi_franchises sf ON sf.organization_id = opl.organization_id
    JOIN supplier_product_offers spo ON spo.id = opl.offer_id
    JOIN product_masters pm ON pm.id = spo.master_id
    JOIN neture_suppliers ns ON ns.id = spo.supplier_id
    LEFT JOIN organizations so ON so.id = ns.organization_id`;
const EVENT_SCOPE = `opl.service_key = '${SEMI_FRANCHISE_EVENT_SERVICE_KEY}' AND opl.source_type = 'event-offer'`;

export type EventAction = 'approve' | 'reject' | 'cancel';
const EVENT_TRANSITIONS: Record<EventAction, { from: string[]; to: string; active: boolean }> = {
  approve: { from: ['pending'], to: 'approved', active: true },
  reject: { from: ['pending'], to: 'rejected', active: false },
  cancel: { from: ['pending', 'approved'], to: 'canceled', active: false },
};

export function nextEventStatus(current: string, action: EventAction): { status: string; active: boolean } | null {
  const t = EVENT_TRANSITIONS[action];
  return t && t.from.includes(current) ? { status: t.to, active: t.active } : null;
}

export class SemiFranchiseEventService {
  constructor(private readonly dataSource: DataSource) {}

  async supplierCreate(supplierId: string, userId: string, input: SemiFranchiseEventInput) {
    const [offer] = await this.dataSource.query(
      `SELECT id, master_id, price_general, approval_status FROM supplier_product_offers
        WHERE id = $1::uuid AND supplier_id = $2::uuid AND deleted_at IS NULL`,
      [input.offerId, supplierId],
    );
    if (!offer) throw new NeturePharmacyError(404, 'OFFER_NOT_FOUND', '공급 제품을 찾을 수 없습니다.');
    if (offer.approval_status !== 'APPROVED') {
      throw new NeturePharmacyError(409, 'PRODUCT_NOT_APPROVED', '제품 등록 승인 후 이벤트를 신청할 수 있습니다.');
    }
    const [sf] = await this.dataSource.query(
      `SELECT id, organization_id FROM semi_franchises WHERE key = $1 AND status = 'active'`,
      [input.semiFranchiseKey],
    );
    if (!sf) throw new NeturePharmacyError(404, 'SEMI_FRANCHISE_NOT_FOUND', '세미프랜차이즈를 찾을 수 없습니다.');
    const v = validateEventInput(input, Number(offer.price_general));
    // 1단계 임시 제한(파일 머리말) — 같은 제품 · 같은 세미프랜차이즈의 원장 행이 이미 있으면(상태 불문) 거절한다.
    //   기존 행을 고치지 않는다(주문이 jsonb 로 참조한다).
    const [existing] = await this.dataSource.query(
      `SELECT id FROM organization_product_listings
        WHERE organization_id = $1 AND service_key = $2 AND offer_id = $3::uuid LIMIT 1`,
      [sf.organization_id, SEMI_FRANCHISE_EVENT_SERVICE_KEY, offer.id],
    );
    if (existing && await eventIndexState(this.dataSource.manager) === 'phase-one') {
      throw new NeturePharmacyError(409, EVENT_REAPPLY_NOT_YET_SUPPORTED, EVENT_REAPPLY_MESSAGE);
    }
    const [row] = await this.dataSource.query(
      `INSERT INTO organization_product_listings
         (id, organization_id, service_key, master_id, offer_id, is_active, status, price, event_price,
          start_at, end_at, total_quantity, per_store_limit, per_order_limit, source_type, requested_by, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, false, 'pending', $5, $6,
               $7::timestamptz::timestamp, $8::timestamptz::timestamp, $9, $10, $11, 'event-offer', $12, NOW(), NOW())
       RETURNING id, status`,
      [
        sf.organization_id, SEMI_FRANCHISE_EVENT_SERVICE_KEY, offer.master_id, offer.id, Number(offer.price_general),
        // timestamp(without tz) 컬럼 — 세션 시간대로 변환해 NOW() 비교와 같은 기준으로 저장한다.
        v.eventPrice, v.startAt.toISOString(), v.endAt.toISOString(), v.totalQuantity, v.perStoreLimit, v.perOrderLimit, userId,
      ],
    ).catch((err: unknown) => {
      // 동시 신청이 위 검사를 함께 통과한 경우 — 같은 거절로 돌려준다.
      if (isListingUniqueViolation(err)) throw new NeturePharmacyError(409, EVENT_REAPPLY_NOT_YET_SUPPORTED, EVENT_REAPPLY_MESSAGE);
      throw err;
    });
    return row;
  }

  async supplierList(supplierId: string) {
    return this.dataSource.query(`${EVENT_VIEW} WHERE ${EVENT_SCOPE} AND spo.supplier_id = $1::uuid ORDER BY opl.created_at DESC`, [supplierId]);
  }

  /** 공급자 삭제 · 종료 — 대기 · 진행 중 이벤트를 canceled 로. 주문은 OPL 을 jsonb 로만 참조하므로 기록이 남는다. */
  async supplierCancel(supplierId: string, listingId: string) {
    const rows = rowsOf(await this.dataSource.query(
      `UPDATE organization_product_listings opl SET status = 'canceled', is_active = false, updated_at = NOW()
         FROM supplier_product_offers spo
        WHERE opl.id = $1::uuid AND ${EVENT_SCOPE} AND spo.id = opl.offer_id AND spo.supplier_id = $2::uuid
          AND opl.status IN ('pending','approved')
      RETURNING opl.id, opl.status`,
      [listingId, supplierId],
    ));
    if (!rows[0]) throw new NeturePharmacyError(404, 'EVENT_NOT_FOUND', '종료할 수 있는 이벤트가 없습니다.');
    return rows[0];
  }

  async operatorList(sf: SemiFranchiseRow, status?: string) {
    const s = status && status !== 'all' ? status : null;
    return this.dataSource.query(
      `${EVENT_VIEW} WHERE ${EVENT_SCOPE} AND opl.organization_id = $1 AND ($2::text IS NULL OR opl.status = $2)
       ORDER BY opl.created_at DESC`,
      [sf.organization_id, s],
    );
  }

  async operatorDecide(sf: SemiFranchiseRow, operatorId: string, listingId: string, action: EventAction, reason?: string | null) {
    return this.dataSource.transaction(async (m) => {
      const [current] = await m.query(
        `SELECT opl.id, opl.status FROM organization_product_listings opl
          WHERE opl.id = $1::uuid AND ${EVENT_SCOPE} AND opl.organization_id = $2 FOR UPDATE`,
        [listingId, sf.organization_id],
      );
      if (!current) throw new NeturePharmacyError(404, 'EVENT_NOT_FOUND', '이벤트를 찾을 수 없습니다.');
      const next = nextEventStatus(current.status, action);
      if (!next) throw new NeturePharmacyError(409, 'INVALID_TRANSITION', `현재 상태(${current.status})에서 처리할 수 없습니다.`);
      const [row] = rowsOf(await m.query(
        `UPDATE organization_product_listings
            SET status = $2, is_active = $3, decided_by = $4, decided_at = NOW(), rejected_reason = $5, updated_at = NOW()
          WHERE id = $1 RETURNING id, status`,
        [listingId, next.status, next.active, operatorId, reason?.trim()?.slice(0, 1000) || null],
      ));
      return row;
    });
  }
}
