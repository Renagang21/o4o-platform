/**
 * Drug Commerce Guard — WO-O4O-DRUG-COMMERCE-ABSOLUTE-BLOCK-V1
 *
 * 의약품(DRUG)의 **거래(장바구니 담기 / 주문 생성)** 를 절대 차단하는 공통 판정 모듈.
 *
 * `drug-access.guard.ts` 와의 관계 (의도적 분리):
 *   - `drug-access.guard` = **유입(진열·offer·자동확산) 축**. 약국 대상 서비스면 **허용**한다.
 *   - `drug-commerce.guard`(본 모듈) = **거래 축**. 약국 대상 서비스든 아니든, 운영자든 아니든
 *     **예외 없이 거부**한다. 판정에 serviceKey · role · organizationId 를 아예 입력받지 않는다
 *     (입력이 없으면 우회할 표면도 없다).
 *   - 의약품 판정 SSOT 는 두 모듈이 공유한다 — `isDrugRegulatoryType()` 을
 *     `drug-access.guard` 에서 import 한다. 여기서 재정의하지 않는다.
 *
 * fail-closed 계약:
 *   - 상품 참조가 하나도 없으면 거부 (식별 불가 = 비의약품 증명 불가)
 *   - UUID 형식이 아니면 거부
 *   - 어느 축에서도 ProductMaster 로 해석되지 않으면 거부
 *   - 한 항목의 참조들이 **서로 다른 ProductMaster** 를 가리키면 거부 (다형 참조 불일치)
 *   - 조회 자체가 실패하면 전량 거부
 *   - 의약품이 **하나라도** 포함된 요청은 **전체** 거부 (부분 통과 없음)
 *
 * 다형 참조 해석 축 (서버에서만 해석 — 요청값의 자기 신고를 신뢰하지 않는다):
 *   ① product_masters.id
 *   ② supplier_product_offers.id            → master_id
 *   ③ organization_product_listings.id      → master_id
 *   ④ organization_product_listings.id      → offer_id → supplier_product_offers.master_id
 */

import type { DataSource, QueryRunner } from 'typeorm';
import { isDrugRegulatoryType } from './drug-access.guard.js';

/** DataSource / QueryRunner / EntityManager 어디서든 실행 가능 */
export type DrugCommerceExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

/** 거부 사유 코드 — 응답/로그에 그대로 쓰는 감사 가능 코드 */
export enum DrugCommerceErrorCode {
  /** 의약품 거래 시도 (예외 없음) */
  DRUG_COMMERCE_FORBIDDEN = 'DRUG_COMMERCE_FORBIDDEN',
  /** 상품을 확정할 수 없음 — 참조 없음 / UUID 오류 / 미존재 / 조회 실패 */
  DRUG_COMMERCE_PRODUCT_UNRESOLVED = 'DRUG_COMMERCE_PRODUCT_UNRESOLVED',
  /** 다형 참조가 서로 다른 ProductMaster 를 가리킴 */
  DRUG_COMMERCE_REFERENCE_CONFLICT = 'DRUG_COMMERCE_REFERENCE_CONFLICT',
}

/** 사용자 노출 메시지 (한국어) */
export const DRUG_COMMERCE_MESSAGES: Record<DrugCommerceErrorCode, string> = {
  [DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN]:
    '의약품은 장바구니에 담거나 주문할 수 없습니다.',
  [DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED]:
    '상품 정보를 확인할 수 없어 요청을 진행할 수 없습니다.',
  [DrugCommerceErrorCode.DRUG_COMMERCE_REFERENCE_CONFLICT]:
    '상품 참조가 서로 일치하지 않아 요청을 진행할 수 없습니다.',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 거래 판정 대상 1건.
 *
 * 필드는 **참조일 뿐 신뢰 대상이 아니다** — 어떤 필드로 들어왔든 서버가 4개 축 모두에
 * 대조해 ProductMaster 로 해석한다. 여러 필드가 채워지면 **모두** 해석해 일치를 요구한다.
 */
export interface CommerceProductRef {
  /** 로그/보고용 라벨 (상품명 등). 판정에 쓰지 않는다. */
  label?: string | null;
  productMasterId?: string | null;
  supplierProductOfferId?: string | null;
  organizationProductListingId?: string | null;
  /**
   * 무엇을 가리키는지 서버가 모르는 단일 id.
   * `checkout_orders.items[].productId` 처럼 offer / master / listing 이 섞여 들어오는 축.
   */
  ambiguousIds?: Array<string | null | undefined>;
}

export interface DrugCommerceResult {
  allowed: boolean;
  code?: DrugCommerceErrorCode;
  message?: string;
  /** 거부를 유발한 항목의 index (0-based) */
  offendingIndex?: number;
  /** 거부를 유발한 항목의 라벨 */
  offendingLabel?: string | null;
}

/** createOrder 등 throw 계약이 필요한 호출부용 오류 */
export class DrugCommerceBlockedError extends Error {
  readonly code: DrugCommerceErrorCode;
  readonly status = 403;

  constructor(result: DrugCommerceResult) {
    super(result.message ?? DRUG_COMMERCE_MESSAGES[DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN]);
    this.name = 'DrugCommerceBlockedError';
    this.code = result.code ?? DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN;
  }
}

interface MasterCandidate {
  masterId: string;
  regulatoryType: string | null;
}

/**
 * id 집합을 4개 축 전부에 대조해 ProductMaster 후보를 batch 로 해석한다.
 * 한 id 가 여러 축에 걸리면 후보가 여러 개 나온다 (불일치 판정의 입력).
 *
 * @returns ref → 후보 목록. 조회 실패 시 `null` (→ 전량 fail-closed)
 */
async function resolveMasterCandidates(
  executor: DrugCommerceExecutor,
  ids: string[],
): Promise<Map<string, MasterCandidate[]> | null> {
  const unique = [...new Set(ids)];
  const map = new Map<string, MasterCandidate[]>();
  if (unique.length === 0) return map;

  try {
    const rows: Array<{ ref: string; master_id: string; regulatory_type: string | null }> =
      await executor.query(
        `WITH refs AS (SELECT DISTINCT unnest($1::uuid[]) AS ref)
           SELECT r.ref::text AS ref, pm.id::text AS master_id, pm.regulatory_type AS regulatory_type
             FROM refs r
             JOIN product_masters pm ON pm.id = r.ref
         UNION
           SELECT r.ref::text, pm.id::text, pm.regulatory_type
             FROM refs r
             JOIN supplier_product_offers spo ON spo.id = r.ref
             JOIN product_masters pm ON pm.id = spo.master_id
         UNION
           SELECT r.ref::text, pm.id::text, pm.regulatory_type
             FROM refs r
             JOIN organization_product_listings opl ON opl.id = r.ref
             JOIN product_masters pm ON pm.id = opl.master_id
         UNION
           SELECT r.ref::text, pm.id::text, pm.regulatory_type
             FROM refs r
             JOIN organization_product_listings opl ON opl.id = r.ref
             JOIN supplier_product_offers spo ON spo.id = opl.offer_id
             JOIN product_masters pm ON pm.id = spo.master_id`,
        [unique],
      );

    for (const row of rows || []) {
      const bucket = map.get(row.ref);
      const candidate: MasterCandidate = {
        masterId: row.master_id,
        regulatoryType: row.regulatory_type,
      };
      if (bucket) bucket.push(candidate);
      else map.set(row.ref, [candidate]);
    }
    return map;
  } catch {
    return null; // 조회 실패 → 확정 불가 → fail-closed
  }
}

/** 한 항목이 들고 있는 모든 참조 id (중복 제거 전) */
function collectRefIds(ref: CommerceProductRef): Array<string | null | undefined> {
  return [
    ref.productMasterId,
    ref.supplierProductOfferId,
    ref.organizationProductListingId,
    ...(ref.ambiguousIds ?? []),
  ];
}

function deny(
  code: DrugCommerceErrorCode,
  index: number,
  label?: string | null,
): DrugCommerceResult {
  return {
    allowed: false,
    code,
    message: DRUG_COMMERCE_MESSAGES[code],
    offendingIndex: index,
    offendingLabel: label ?? null,
  };
}

/**
 * 거래 요청 전체를 일괄 판정한다.
 *
 * 판정 순서 — **의약품 탐지가 최우선**이다. 의약품이 섞인 요청은 다른 결함(식별 불가 등)이
 * 함께 있어도 `DRUG_COMMERCE_FORBIDDEN` 으로 보고한다(보안 신호를 삼키지 않기 위해).
 *
 * @param refs 판정 대상. 비어 있으면 허용(판정할 거래가 없음 — 호출부의 기존 검증에 맡긴다).
 */
export async function assertNoDrugInCommerce(
  executor: DrugCommerceExecutor,
  refs: CommerceProductRef[],
): Promise<DrugCommerceResult> {
  const list = refs ?? [];
  if (list.length === 0) return { allowed: true };

  // ── 1. 참조 수집 + 형식 검증 (조회 전에 확정 가능한 거부) ──────────────
  const perItem: string[][] = [];
  for (let i = 0; i < list.length; i++) {
    const raw = collectRefIds(list[i])
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v.length > 0);

    if (raw.length === 0) {
      // 참조가 하나도 없다 = 비의약품임을 증명할 수 없다 → 거부
      return deny(DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED, i, list[i].label);
    }
    if (raw.some((v) => !UUID_RE.test(v))) {
      return deny(DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED, i, list[i].label);
    }
    perItem.push([...new Set(raw.map((v) => v.toLowerCase()))]);
  }

  // ── 2. batch 해석 ──────────────────────────────────────────────────────
  const resolved = await resolveMasterCandidates(executor, perItem.flat());
  if (resolved === null) {
    return deny(DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED, 0, list[0].label);
  }

  const candidatesOf = (refIds: string[]): MasterCandidate[] =>
    refIds.flatMap((id) => resolved.get(id) ?? []);

  // ── 3. 의약품 탐지 (최우선) — 하나라도 있으면 전체 거부 ─────────────────
  for (let i = 0; i < perItem.length; i++) {
    const found = candidatesOf(perItem[i]);
    if (found.some((c) => isDrugRegulatoryType(c.regulatoryType))) {
      return deny(DrugCommerceErrorCode.DRUG_COMMERCE_FORBIDDEN, i, list[i].label);
    }
  }

  // ── 4. 식별 불가 · 다형 참조 불일치 ────────────────────────────────────
  for (let i = 0; i < perItem.length; i++) {
    const refIds = perItem[i];

    // 참조 중 하나라도 어느 축에서도 해석되지 않으면 거부
    if (refIds.some((id) => (resolved.get(id) ?? []).length === 0)) {
      return deny(DrugCommerceErrorCode.DRUG_COMMERCE_PRODUCT_UNRESOLVED, i, list[i].label);
    }

    const masters = new Set(candidatesOf(refIds).map((c) => c.masterId));
    if (masters.size > 1) {
      return deny(DrugCommerceErrorCode.DRUG_COMMERCE_REFERENCE_CONFLICT, i, list[i].label);
    }
  }

  return { allowed: true };
}

/**
 * 판정 후 거부면 throw. `createOrder` 처럼 결과 객체를 다룰 자리가 없는 호출부용.
 */
export async function assertNoDrugInCommerceOrThrow(
  executor: DrugCommerceExecutor,
  refs: CommerceProductRef[],
): Promise<void> {
  const result = await assertNoDrugInCommerce(executor, refs);
  if (!result.allowed) throw new DrugCommerceBlockedError(result);
}

/**
 * 장바구니 항목(입력 DTO 또는 저장된 row) → 판정 참조.
 *
 * `eventOfferId` 도 참조 축에 포함한다 — 이벤트오퍼 cart item 의 `eventOfferId` 는
 * `organization_product_listings.id` 이며(event-offer checkout 의 `ctx.listingId` 축),
 * 이 항목이 유일한 상품 참조인 경우가 있다. 빠뜨리면 정상 흐름이 오탐으로 막힌다.
 */
export function toCommerceRefFromCartItem(item: {
  productName?: string | null;
  productMasterId?: string | null;
  supplierProductOfferId?: string | null;
  organizationProductListingId?: string | null;
  eventOfferId?: string | null;
}): CommerceProductRef {
  return {
    label: item.productName ?? null,
    productMasterId: item.productMasterId ?? null,
    supplierProductOfferId: item.supplierProductOfferId ?? null,
    organizationProductListingId: item.organizationProductListingId ?? null,
    ambiguousIds: [item.eventOfferId ?? null],
  };
}

/**
 * 주문 라인 → 판정 참조.
 *
 * `productId` 는 호출부마다 offer / master / listing 이 섞이는 다형 축이라 `ambiguousIds`
 * 로 넣는다. `metadata` 의 상품 참조도 함께 대조해 **자기 신고와 실제 상품이 어긋난 라인**
 * (예: metadata 는 비의약품 offer, productId 는 의약품 master)을 잡는다.
 */
export function toCommerceRefFromOrderItem(item: {
  productId?: string | null;
  productName?: string | null;
  metadata?: Record<string, any> | null;
}): CommerceProductRef {
  const meta = item.metadata ?? {};
  const pick = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

  return {
    label: item.productName ?? null,
    productMasterId: pick(meta.productMasterId) ?? pick(meta.masterId),
    supplierProductOfferId: pick(meta.supplierProductOfferId) ?? pick(meta.offerId),
    organizationProductListingId: pick(meta.organizationProductListingId),
    ambiguousIds: [pick(item.productId), pick(meta.eventOfferId)],
  };
}
