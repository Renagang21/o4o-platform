/**
 * Product/organization integrity for drug listings.
 * O4O suppliers and pharmacies can handle drugs. No service-audience setting,
 * policy-table lookup or drug-specific PUBLIC/SERVICE supply restriction applies.
 * Existing supplier ownership, approval, prices and distribution checks stay with callers.
 */
import type { DataSource, QueryRunner } from 'typeorm';

export type DrugGateExecutor = Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>;
export type DrugGateAction = 'OFFER_CREATE' | 'OFFER_UPDATE' | 'OFFER_PUBLISH' | 'OPL_CREATE' | 'OPL_ACTIVATE' | 'PUBLIC_AUTO_EXPAND';
export enum DrugGateErrorCode {
  DRUG_SERVICE_CONTEXT_REQUIRED = 'DRUG_SERVICE_CONTEXT_REQUIRED',
  DRUG_ORG_CONTEXT_MISMATCH = 'DRUG_ORG_CONTEXT_MISMATCH',
  DRUG_PRODUCT_UNRESOLVED = 'DRUG_PRODUCT_UNRESOLVED',
}
export const DRUG_GATE_MESSAGES: Record<DrugGateErrorCode, string> = {
  [DrugGateErrorCode.DRUG_SERVICE_CONTEXT_REQUIRED]: '상품을 등록할 서비스 정보를 확인할 수 없습니다.',
  [DrugGateErrorCode.DRUG_ORG_CONTEXT_MISMATCH]: '조직의 서비스 소속을 확인할 수 없습니다.',
  [DrugGateErrorCode.DRUG_PRODUCT_UNRESOLVED]: '상품 정보를 확인할 수 없습니다.',
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  masterId?: string | null;
  regulatoryType?: string | null;
  serviceKey?: string | null;
  organizationId?: string | null;
}
export interface DrugGateResult {
  allowed: boolean;
  isDrug: boolean;
  code?: DrugGateErrorCode;
  message?: string;
}
function deny(isDrug: boolean, code: DrugGateErrorCode): DrugGateResult {
  return { allowed: false, isDrug, code, message: DRUG_GATE_MESSAGES[code] };
}

export async function assertDrugActionAllowed(executor: DrugGateExecutor, ctx: DrugGateContext): Promise<DrugGateResult> {
  const isDrug = ctx.regulatoryType != null
    ? isDrugRegulatoryType(ctx.regulatoryType)
    : await isDrugProductById(executor, ctx.masterId);
  if (isDrug === null) return deny(false, DrugGateErrorCode.DRUG_PRODUCT_UNRESOLVED);
  if (!isDrug) return { allowed: true, isDrug: false };
  const serviceKey = (ctx.serviceKey ?? '').trim();
  if (!serviceKey) return deny(true, DrugGateErrorCode.DRUG_SERVICE_CONTEXT_REQUIRED);
  if (ctx.organizationId && await organizationBelongsToService(executor, ctx.organizationId, serviceKey) !== true) {
    return deny(true, DrugGateErrorCode.DRUG_ORG_CONTEXT_MISMATCH);
  }
  return { allowed: true, isDrug: true };
}

/** Supply scope is validated by the existing publication flow for all products. */
export async function assertDrugOfferAllowed(executor: DrugGateExecutor, args: {
  action: DrugGateAction;
  masterId?: string | null;
  regulatoryType?: string | null;
  serviceKeys?: string[] | null;
  isPublic?: boolean;
}): Promise<DrugGateResult> {
  const isDrug = args.regulatoryType != null
    ? isDrugRegulatoryType(args.regulatoryType)
    : await isDrugProductById(executor, args.masterId);
  return isDrug === null
    ? deny(false, DrugGateErrorCode.DRUG_PRODUCT_UNRESOLVED)
    : { allowed: true, isDrug };
}
