/**
 * Drug Access Guard — WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1
 *
 * 의약품(DRUG) 이 **비약국 대상 서비스로 신규 유입되는 것**을 차단하는 공통 판정 모듈.
 *
 * 설계 원칙 (WO 명시):
 *   - 거대한 범용 권한 엔진을 만들지 않는다. 판정 함수 3개 + 최소 action enum 만 제공한다.
 *   - ProductMaster 는 전 서비스 공용 SSOT 로 유지한다. 본 가드는 **소유권이 아니라 행위**를 막는다.
 *   - 의약품 판정 SSOT 는 `product_masters.regulatory_type='DRUG'` 이다.
 *     `product_categories.is_regulated` 는 판정에 **사용하지 않는다**
 *     (실측: DRUG 177,413건 전량 category_id IS NULL → 해당 축은 실효 0%).
 *
 * fail-closed 계약:
 *   - 상품 유형을 확정할 수 없으면(마스터 미존재 등) DRUG 쓰기를 거부한다.
 *   - 서비스 문맥(serviceKey)이 없으면 거부한다.
 *   - `service_audience_policies` 행이 없거나 조회에 실패하면 **거부**한다.
 *     ServiceAudienceService 의 하드코딩 fallback(`['glycopharm','kpa-society']`)은
 *     **DRUG 쓰기 판정에 사용하지 않는다** — fallback 으로 DRUG 쓰기가 허용되면 안 되기 때문이다.
 *     (fallback 전면 제거는 WO-O4O-DRUG-POLICY-LIFECYCLE 로 분리)
 *   - organizationId 가 함께 주어지면 해당 조직이 그 serviceKey 에 실제로 소속돼 있는지 서버에서 확인한다.
 *     요청 body/query 의 serviceKey 만으로 허용하지 않는다.
 *
 * 본 가드는 **비의약품에 대해 항상 no-op** 이다 (기존 유통 계약 불변).
 */

import type { DataSource, QueryRunner } from 'typeorm';

/** DataSource / QueryRunner / EntityManager 어디서든 실행 가능 */
export type DrugGateExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;

/** 게이트가 감시하는 행위 (WO 최소 집합) */
export type DrugGateAction =
  | 'OFFER_CREATE'
  | 'OFFER_UPDATE'
  | 'OFFER_PUBLISH'
  | 'OPL_CREATE'
  | 'OPL_ACTIVATE'
  | 'PUBLIC_AUTO_EXPAND';

/** 거부 사유 코드 — 응답/로그에 그대로 사용 가능한 감사 가능 코드 */
export enum DrugGateErrorCode {
  /** 비약국 대상 서비스로 의약품을 연결하려 함 */
  DRUG_NON_PHARMACY_SERVICE = 'DRUG_NON_PHARMACY_SERVICE',
  /** 서비스 문맥(serviceKey)을 확정할 수 없음 */
  DRUG_SERVICE_CONTEXT_REQUIRED = 'DRUG_SERVICE_CONTEXT_REQUIRED',
  /** 정책 행 부재 또는 정책 조회 실패 (fail-closed) */
  DRUG_POLICY_UNAVAILABLE = 'DRUG_POLICY_UNAVAILABLE',
  /** 조직이 해당 서비스에 실제로 소속돼 있지 않음 */
  DRUG_ORG_CONTEXT_MISMATCH = 'DRUG_ORG_CONTEXT_MISMATCH',
  /** 상품 유형을 확정할 수 없음 (마스터 미존재 등) */
  DRUG_PRODUCT_UNRESOLVED = 'DRUG_PRODUCT_UNRESOLVED',
  /** 의약품을 전체 공개(PUBLIC) 유통으로 등록·전환하려 함 */
  DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN = 'DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN',
}

/** 사용자 노출 메시지 (한국어) */
export const DRUG_GATE_MESSAGES: Record<DrugGateErrorCode, string> = {
  [DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE]:
    '의약품은 약국 대상 서비스에만 연결할 수 있습니다.',
  [DrugGateErrorCode.DRUG_SERVICE_CONTEXT_REQUIRED]:
    '서비스 정보를 확인할 수 없어 의약품 작업을 진행할 수 없습니다.',
  [DrugGateErrorCode.DRUG_POLICY_UNAVAILABLE]:
    '서비스의 약국 대상 정책이 설정되어 있지 않아 의약품 작업을 진행할 수 없습니다.',
  [DrugGateErrorCode.DRUG_ORG_CONTEXT_MISMATCH]:
    '조직의 서비스 소속을 확인할 수 없어 의약품 작업을 진행할 수 없습니다.',
  [DrugGateErrorCode.DRUG_PRODUCT_UNRESOLVED]:
    '상품 정보를 확인할 수 없어 의약품 작업을 진행할 수 없습니다.',
  [DrugGateErrorCode.DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN]:
    '의약품은 전체 공개(PUBLIC) 유통으로 등록하거나 전환할 수 없습니다. 약국 대상 서비스로만 제공할 수 있습니다.',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ① 의약품 판정 (SSOT) — regulatory_type 문자열 기준.
 *
 * `regulatory_type` 은 DB enum 이 아니라 varchar(50) 이며 운영 데이터에 한글 표기가 섞여 있다
 * (실측: 'DRUG' 177,413 / '건강기능식품' / 'QUASI_DRUG' / 'MEDICAL_DEVICE' / '일반' / 'GENERAL').
 * 따라서 대소문자·공백을 정규화하고 한글 표기('의약품')도 함께 인정한다.
 *
 * 의약외품(QUASI_DRUG)은 의약품이 아니므로 **포함하지 않는다** (기존 유통 계약 보존).
 */
export function isDrugRegulatoryType(regulatoryType?: string | null): boolean {
  const v = (regulatoryType ?? '').toString().trim().toUpperCase();
  return v === 'DRUG' || v === '의약품';
}

/** ProductMaster-like 객체에서 의약품 판정 */
export function isDrugProduct(master?: { regulatoryType?: string | null } | null): boolean {
  return isDrugRegulatoryType(master?.regulatoryType ?? null);
}

/**
 * masterId 로 의약품 여부 조회.
 * @returns true=의약품 · false=비의약품 · null=**확정 불가**(미존재/잘못된 id/조회 실패) → fail-closed 대상
 */
export async function isDrugProductById(
  executor: DrugGateExecutor,
  masterId?: string | null,
): Promise<boolean | null> {
  if (!masterId || !UUID_RE.test(masterId)) return null;
  try {
    const rows: Array<{ regulatory_type: string | null }> = await executor.query(
      `SELECT regulatory_type FROM product_masters WHERE id = $1 LIMIT 1`,
      [masterId],
    );
    if (!rows || rows.length === 0) return null;
    return isDrugRegulatoryType(rows[0].regulatory_type);
  } catch {
    return null; // 조회 실패 → 확정 불가 → fail-closed
  }
}

/**
 * ② 약국 대상 서비스 문맥 판정 (strict).
 *
 * `service_audience_policies` 의 **실제 행만** 신뢰한다. 행이 없거나 조회 실패면 `null`.
 * ServiceAudienceService 의 하드코딩 fallback 을 의도적으로 사용하지 않는다.
 *
 * @returns true=약국 대상 · false=비약국 · null=정책 확정 불가 → fail-closed 대상
 */
export async function isPharmacyAudienceServiceStrict(
  executor: DrugGateExecutor,
  serviceKey?: string | null,
): Promise<boolean | null> {
  const key = (serviceKey ?? '').trim();
  if (!key) return null;
  try {
    const rows: Array<{ is_pharmacy_target_service: boolean }> = await executor.query(
      `SELECT is_pharmacy_target_service FROM service_audience_policies WHERE service_key = $1 LIMIT 1`,
      [key],
    );
    if (!rows || rows.length === 0) return null; // 정책 행 부재 → fail-closed
    return !!rows[0].is_pharmacy_target_service;
  } catch {
    return null;
  }
}

/**
 * 조직이 해당 serviceKey 에 실제로 소속돼 있는지 서버에서 확인.
 * 요청값 serviceKey 위조 방지 (정책 11).
 *
 * @returns true=소속 확인 · false=불일치 · null=조회 실패
 */
export async function organizationBelongsToService(
  executor: DrugGateExecutor,
  organizationId?: string | null,
  serviceKey?: string | null,
): Promise<boolean | null> {
  const org = (organizationId ?? '').trim();
  const key = (serviceKey ?? '').trim();
  if (!org || !UUID_RE.test(org) || !key) return null;
  try {
    const rows: Array<{ ok: number }> = await executor.query(
      `SELECT 1 AS ok FROM organization_service_enrollments
        WHERE organization_id = $1 AND service_code = $2 AND status = 'active' LIMIT 1`,
      [org, key],
    );
    return !!(rows && rows.length > 0);
  } catch {
    return null;
  }
}

export interface DrugGateContext {
  action: DrugGateAction;
  /** 대상 ProductMaster. regulatoryType 을 이미 알고 있으면 함께 넘겨 조회를 아낀다. */
  masterId?: string | null;
  regulatoryType?: string | null;
  /** 연결 대상 서비스. 없으면 DRUG 쓰기는 거부된다. */
  serviceKey?: string | null;
  /** 주어지면 서비스 소속을 서버에서 재확인한다. */
  organizationId?: string | null;
}

export interface DrugGateResult {
  allowed: boolean;
  /** 대상이 의약품인지 (false 면 본 가드는 no-op 으로 통과) */
  isDrug: boolean;
  code?: DrugGateErrorCode;
  message?: string;
}

/**
 * ③ 공통 게이트 — 의약품 행위 허용 판정.
 *
 * 비의약품이면 **항상 허용**(no-op). 의약품이면 아래를 모두 만족해야 허용한다.
 *   1. serviceKey 가 존재한다
 *   2. `service_audience_policies` 에 행이 있고 `is_pharmacy_target_service = true`
 *   3. organizationId 가 주어졌다면 그 조직이 해당 서비스에 active 로 소속돼 있다
 */
export async function assertDrugActionAllowed(
  executor: DrugGateExecutor,
  ctx: DrugGateContext,
): Promise<DrugGateResult> {
  // ── 1. 의약품 여부 확정 ────────────────────────────────────────────────
  let isDrug: boolean | null;
  if (ctx.regulatoryType !== undefined && ctx.regulatoryType !== null) {
    isDrug = isDrugRegulatoryType(ctx.regulatoryType);
  } else if (ctx.masterId) {
    isDrug = await isDrugProductById(executor, ctx.masterId);
  } else {
    // master 도 유형도 없다 → 판정 대상 자체가 없음. 비의약품 흐름으로 간주(기존 동작 보존).
    return { allowed: true, isDrug: false };
  }

  if (isDrug === null) {
    return deny(false, DrugGateErrorCode.DRUG_PRODUCT_UNRESOLVED);
  }
  if (!isDrug) {
    return { allowed: true, isDrug: false }; // 비의약품 → no-op
  }

  // ── 2. 서비스 문맥 필수 ────────────────────────────────────────────────
  const serviceKey = (ctx.serviceKey ?? '').trim();
  if (!serviceKey) {
    return deny(true, DrugGateErrorCode.DRUG_SERVICE_CONTEXT_REQUIRED);
  }

  // ── 3. 약국 대상 서비스 판정 (strict, fallback 금지) ───────────────────
  const isPharmacy = await isPharmacyAudienceServiceStrict(executor, serviceKey);
  if (isPharmacy === null) {
    return deny(true, DrugGateErrorCode.DRUG_POLICY_UNAVAILABLE);
  }
  if (!isPharmacy) {
    return deny(true, DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE);
  }

  // ── 4. 조직 소속 재확인 (요청값 신뢰 금지) ─────────────────────────────
  if (ctx.organizationId) {
    const belongs = await organizationBelongsToService(executor, ctx.organizationId, serviceKey);
    if (belongs !== true) {
      return deny(true, DrugGateErrorCode.DRUG_ORG_CONTEXT_MISMATCH);
    }
  }

  return { allowed: true, isDrug: true };
}

function deny(isDrug: boolean, code: DrugGateErrorCode): DrugGateResult {
  return { allowed: false, isDrug, code, message: DRUG_GATE_MESSAGES[code] };
}

/**
 * 여러 serviceKey 중 **의약품 연결이 허용되는 것만** 남긴다.
 * PUBLIC/SERVICE 자동확산에서 대상 서비스를 좁히는 데 사용한다.
 * 정책 행이 없는 serviceKey 는 제외한다 (fail-closed).
 */
export async function filterPharmacyAudienceServiceKeys(
  executor: DrugGateExecutor,
  serviceKeys: string[],
): Promise<string[]> {
  const keys = (serviceKeys || []).map((k) => (k ?? '').trim()).filter(Boolean);
  if (keys.length === 0) return [];
  try {
    const rows: Array<{ service_key: string }> = await executor.query(
      `SELECT service_key FROM service_audience_policies
        WHERE service_key = ANY($1::text[]) AND is_pharmacy_target_service = true`,
      [keys],
    );
    const allowed = new Set((rows || []).map((r) => r.service_key));
    return keys.filter((k) => allowed.has(k));
  } catch {
    return []; // 조회 실패 → 확산 대상 없음 (fail-closed)
  }
}

/**
 * Offer 축 공통 판정 — createSupplierOffer / updateSupplierOffer / updateDistribution /
 * setServiceDelivery 가 **같은 계약**을 쓰도록 한 곳에 모은다.
 *
 * 의약품 offer 규칙:
 *   1. PUBLIC(전체 공개) 유통 금지 — PUBLIC 은 전 서비스 확산을 뜻하므로 약국 한정과 양립 불가
 *   2. serviceKeys 가 비어 있으면 거부 (기존 no-op 을 fail-closed 로 반전)
 *   3. 모든 serviceKey 가 약국 대상 서비스여야 함 (정책 행 없으면 거부)
 *
 * 비의약품이면 항상 허용(no-op).
 */
export async function assertDrugOfferAllowed(
  executor: DrugGateExecutor,
  args: {
    action: DrugGateAction;
    masterId?: string | null;
    regulatoryType?: string | null;
    serviceKeys?: string[] | null;
    isPublic?: boolean;
  },
): Promise<DrugGateResult> {
  // 의약품 여부 확정
  let isDrug: boolean | null;
  if (args.regulatoryType !== undefined && args.regulatoryType !== null) {
    isDrug = isDrugRegulatoryType(args.regulatoryType);
  } else {
    isDrug = await isDrugProductById(executor, args.masterId);
  }
  if (isDrug === null) return deny(false, DrugGateErrorCode.DRUG_PRODUCT_UNRESOLVED);
  if (!isDrug) return { allowed: true, isDrug: false };

  // 1. PUBLIC 금지 — 명시적 거부 (조용한 skip 없음)
  if (args.isPublic === true) {
    return deny(true, DrugGateErrorCode.DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN);
  }

  // 2. serviceKeys 필수 (빈 배열 = fail-closed)
  const keys = (args.serviceKeys || []).map((k) => (k ?? '').trim()).filter(Boolean);
  if (keys.length === 0) {
    return deny(true, DrugGateErrorCode.DRUG_SERVICE_CONTEXT_REQUIRED);
  }

  // 3. 전 key 가 약국 대상이어야 함
  const allowedKeys = await filterPharmacyAudienceServiceKeys(executor, keys);
  const violating = keys.filter((k) => !allowedKeys.includes(k));
  if (violating.length > 0) {
    return deny(true, DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE);
  }

  return { allowed: true, isDrug: true };
}

/** 약국 대상 서비스 key 전체 (자동확산 대상 축소용). 조회 실패 시 빈 배열(fail-closed). */
export async function listPharmacyAudienceServiceKeys(
  executor: DrugGateExecutor,
): Promise<string[]> {
  try {
    const rows: Array<{ service_key: string }> = await executor.query(
      `SELECT service_key FROM service_audience_policies WHERE is_pharmacy_target_service = true`,
    );
    return (rows || []).map((r) => r.service_key);
  } catch {
    return [];
  }
}
