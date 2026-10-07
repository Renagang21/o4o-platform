/**
 * Supplier Context Resolver — canonical Supplier authorization
 *
 * WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §A · §B
 *
 * canonical relation (SSOT):
 *   user → organization_members(active) → organizations(type='supplier') → neture_suppliers.organization_id
 *
 * `neture_suppliers.user_id` 는 **LEGACY compatibility pointer** 다. canonical 로 resolve 되지
 * 않을 때만 fallback 으로 쓰고, 쓸 때마다 `LEGACY_SUPPLIER_USER_ID_FALLBACK` 경고를 남긴다
 * (silent fallback 금지 — 운영에서 사용량을 관측할 수 있어야 한다).
 *
 * 1 User : N Supplier 를 지원한다:
 *   0개  → NO_SUPPLIER
 *   1개  → 자동 resolve
 *   N개  → **임의 선택 금지**. explicit context(`x-organization-id` 헤더 또는 `?organizationId=`)가 필요하며
 *          없으면 SUPPLIER_CONTEXT_REQUIRED, 내 membership 밖 organization 이면 FORBIDDEN.
 *
 * 별도 User↔Supplier 다대다 테이블을 만들지 않는다 — `organization_members` 가 이미 N:M 이다.
 */
import type { Request } from 'express';
import type { DataSource } from 'typeorm';
import logger from '../../../utils/logger.js';

/** 조직에서 공급자 업무를 수행할 수 있는 member role (현행: 등록 시 setOwner 가 만드는 owner) */
export const SUPPLIER_WORK_MEMBER_ROLES: readonly string[] = ['owner'];

export interface SupplierCandidate {
  supplierId: string;
  organizationId: string;
  status: string;
  organizationName: string | null;
}

export type SupplierResolution =
  | { kind: 'resolved'; supplierId: string; organizationId: string | null; status: string; via: 'canonical' | 'legacy_user_id' }
  | { kind: 'none' }
  | { kind: 'context_required'; candidates: SupplierCandidate[] }
  | { kind: 'forbidden_context'; requestedOrganizationId: string };

/** explicit context — 기존 repo 선례(`x-organization-id` / `?organizationId=`) 재사용 */
export function readOrganizationContext(req: Request): string | null {
  // 방어: 단위테스트/내부 호출에서 headers·query 가 없는 request-like 객체가 올 수 있다.
  const fromHeader = req?.headers?.['x-organization-id'];
  if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader.trim();
  const fromQuery = (req?.query as Record<string, unknown> | undefined)?.organizationId;
  if (typeof fromQuery === 'string' && fromQuery.trim()) return fromQuery.trim();
  return null;
}

/**
 * canonical 후보 조회 — 이 사용자가 업무를 수행할 수 있는 supplier 전부.
 * **LIMIT 1 을 쓰지 않는다**(정책 3). 호출자가 개수로 분기한다.
 */
export async function listSupplierCandidates(
  dataSource: DataSource,
  userId: string,
): Promise<SupplierCandidate[]> {
  const rows = await dataSource.query(
    `SELECT s.id::text            AS supplier_id,
            s.organization_id::text AS organization_id,
            s.status              AS status,
            o.name                AS organization_name
       FROM organization_members om
       JOIN organizations o        ON o.id = om.organization_id
       JOIN neture_suppliers s     ON s.organization_id = o.id
      WHERE om.user_id = $1
        AND om.left_at IS NULL
        AND om.role = ANY($2::text[])
        AND o.type = 'supplier'
      ORDER BY om.is_primary DESC NULLS LAST, o.name ASC`,
    [userId, SUPPLIER_WORK_MEMBER_ROLES],
  );
  return rows.map((r: Record<string, unknown>) => ({
    supplierId: String(r.supplier_id),
    organizationId: String(r.organization_id),
    status: String(r.status),
    organizationName: (r.organization_name as string) ?? null,
  }));
}

/** legacy fallback — `neture_suppliers.user_id`. canonical 실패 시에만 호출한다. */
async function resolveByLegacyUserId(
  dataSource: DataSource,
  userId: string,
): Promise<{ supplierId: string; organizationId: string | null; status: string } | null> {
  const rows = await dataSource.query(
    `SELECT id::text AS id, organization_id::text AS organization_id, status
       FROM neture_suppliers WHERE user_id = $1`,
    [userId],
  );
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    // legacy 경로에서도 임의 선택하지 않는다 — canonical 로 올라오도록 유도한다.
    logger.warn('[SupplierContext] LEGACY_SUPPLIER_USER_ID_FALLBACK multiple rows; refusing arbitrary pick', {
      userId,
      count: rows.length,
    });
    return null;
  }
  return {
    supplierId: String(rows[0].id),
    organizationId: rows[0].organization_id ? String(rows[0].organization_id) : null,
    status: String(rows[0].status),
  };
}

/**
 * Supplier resolve — canonical 우선, 실패 시에만 legacy fallback.
 * 응답 계약(401/403/409)은 호출하는 middleware 가 만든다.
 */
export async function resolveSupplierForUser(
  dataSource: DataSource,
  userId: string,
  requestedOrganizationId: string | null,
): Promise<SupplierResolution> {
  const candidates = await listSupplierCandidates(dataSource, userId);

  if (candidates.length > 0) {
    if (requestedOrganizationId) {
      const picked = candidates.find((c) => c.organizationId === requestedOrganizationId);
      if (!picked) {
        // 내 membership 밖의 organization 을 지정했다 — 스푸핑 차단
        return { kind: 'forbidden_context', requestedOrganizationId };
      }
      return {
        kind: 'resolved',
        supplierId: picked.supplierId,
        organizationId: picked.organizationId,
        status: picked.status,
        via: 'canonical',
      };
    }
    if (candidates.length === 1) {
      const only = candidates[0];
      return {
        kind: 'resolved',
        supplierId: only.supplierId,
        organizationId: only.organizationId,
        status: only.status,
        via: 'canonical',
      };
    }
    // N 개 — 임의 선택 금지
    return { kind: 'context_required', candidates };
  }

  // ── canonical 미해결 → legacy compatibility pointer ──
  const legacy = await resolveByLegacyUserId(dataSource, userId);
  if (!legacy) return { kind: 'none' };

  if (requestedOrganizationId && legacy.organizationId !== requestedOrganizationId) {
    return { kind: 'forbidden_context', requestedOrganizationId };
  }

  logger.warn('[SupplierContext] LEGACY_SUPPLIER_USER_ID_FALLBACK used', {
    userId,
    supplierId: legacy.supplierId,
    organizationId: legacy.organizationId,
    hint: 'organization_members(owner) 관계가 없다. canonical 관계 복구 대상.',
  });

  return {
    kind: 'resolved',
    supplierId: legacy.supplierId,
    organizationId: legacy.organizationId,
    status: legacy.status,
    via: 'legacy_user_id',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1
//   middleware 밖의 Supplier runtime(controller · service · notification)이 각자
//   `neture_suppliers WHERE user_id = $1 LIMIT 1` 을 다시 쓰지 않도록 이 파일의 의미를
//   그대로 재사용하는 얇은 adapter 3개. 새 resolver framework 가 아니다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * controller 용 — resolved 면 `{ supplierId, status }`, 아니면 null.
 * N 개(context_required) · 스푸핑(forbidden_context) 도 null 이다(임의 선택 0).
 * 응답 코드는 호출자가 기존 계약대로 만든다.
 */
export async function resolveSupplierIdForUser(
  dataSource: DataSource,
  userId: string | null | undefined,
  requestedOrganizationId: string | null = null,
): Promise<{ supplierId: string; status: string } | null> {
  if (!userId) return null;
  const r = await resolveSupplierForUser(dataSource, userId, requestedOrganizationId);
  return r.kind === 'resolved' ? { supplierId: r.supplierId, status: r.status } : null;
}

/**
 * ownership 판정용 — "이 자원이 이 사용자의 공급자 소유인가".
 * 선택이 아니라 소속 판정이므로 N 개면 전부 반환한다. canonical 이 없을 때만 legacy fallback(경고).
 */
export async function listOwnedSupplierIds(
  dataSource: DataSource,
  userId: string | null | undefined,
): Promise<string[]> {
  if (!userId) return [];
  const candidates = await listSupplierCandidates(dataSource, userId);
  if (candidates.length > 0) return candidates.map((c) => c.supplierId);
  const legacy = await resolveByLegacyUserId(dataSource, userId);
  if (!legacy) return [];
  logger.warn('[SupplierContext] LEGACY_SUPPLIER_USER_ID_FALLBACK used (ownership)', {
    userId,
    supplierId: legacy.supplierId,
  });
  return [legacy.supplierId];
}

/**
 * 알림 수신자 — 공급자 사업자 본인 = 현재 organization_members(owner) 전부.
 * owner 가 하나도 없을 때만 legacy `neture_suppliers.user_id` 로 fallback(경고).
 */
export async function listSupplierOwnerUserIds(
  dataSource: DataSource,
  supplierId: string | null | undefined,
): Promise<string[]> {
  if (!supplierId) return [];
  const rows: Array<{ user_id: string | null; legacy_user_id: string | null }> = await dataSource.query(
    `SELECT om.user_id::text AS user_id, s.user_id::text AS legacy_user_id
       FROM neture_suppliers s
       LEFT JOIN organizations o         ON o.id = s.organization_id AND o.type = 'supplier'
       LEFT JOIN organization_members om ON om.organization_id = o.id
                                        AND om.left_at IS NULL
                                        AND om.role = ANY($2::text[])
      WHERE s.id = $1`,
    [supplierId, SUPPLIER_WORK_MEMBER_ROLES],
  );
  const owners = [...new Set(rows.map((r) => r.user_id).filter((v): v is string => !!v))];
  if (owners.length > 0) return owners;
  const legacy = rows[0]?.legacy_user_id;
  if (!legacy) return [];
  logger.warn('[SupplierContext] LEGACY_SUPPLIER_USER_ID_FALLBACK used (recipient)', { supplierId });
  return [legacy];
}
