/**
 * KPA-Society — content/resource Core config
 *
 * WO-O4O-COMMUNITY-CONTENT-RESOURCE-BACKEND-CORE-COMMONIZATION-V1
 *
 * KPA 는 GP/K-Cosmetics 와 **같은 원장 모델**이지만 다음이 다르다. 전부 config 로 재현한다.
 *
 *   - select 컬럼: `content_type` 포함 (KPA 전용 컬럼)
 *   - 회원 목록 필터: `content_type` · `sub_type` (usage_type/source_type 은 읽지 않는다)
 *   - 운영자 목록 필터: `source_type` · `usage_type`
 *   - 목록 응답: ContentMeta enrichment (producer/visibility/serviceKey/metaStatus)
 *   - `status=all` 운영자 전체 관리 목록 분기
 *   - 모든 변경에 감사 로그
 *
 * ⚠️ `status=all` 은 KPA 고유 계약이다 (WO-O4O-KPA-OPERATOR-CONTENT-LIST-STATUS-FILTER-UX-FIX-V1).
 *    Core 로 일반화하거나 삭제하지 않는다 — 여기 훅에서만 표현한다.
 */

import type {
  AuditHook,
  ContentResourceConfig,
  ListStatusContext,
  ListVisibilityDecision,
} from '../../common/content-resource/content-resource-core.js';

export const KPA_CONTENT_LIST_COLUMNS = `c.id, c.title, c.summary, c.category, c.tags, c.status,
                  c.source_type, c.usage_type, c.thumbnail_url, c.created_by, c.created_at, c.updated_at,
                  c.content_type, c.sub_type, c.like_count, c.view_count, c.author_name,
                  c.reusable_policy, c.source_url, c.source_file_name`;

/**
 * 운영자 자료 목록 select — **기존 KPA 응답 필드 그대로**.
 * GP/KCos 와 달리 `reusable_policy` 를 포함하지 않는다. 추가하면 응답 DTO 가 바뀌므로
 * 계약 보존을 위해 원본과 1:1 로 맞춘다 (필드 순서까지 동일).
 */
export const KPA_OPERATOR_RESOURCE_COLUMNS = `c.id, c.title, c.summary, c.tags, c.category, c.status,
                    c.source_type, c.usage_type, c.source_url, c.source_file_name,
                    c.thumbnail_url, c.created_by, c.author_name,
                    c.view_count, c.like_count, c.created_at, c.updated_at`;

/** kpa:operator 이상 판정 — 기존 `isKpaOperatorOrAdmin` 와 동일 */
export const KPA_OPERATOR_ROLES = ['kpa:operator', 'kpa:admin', 'platform:super_admin'];

/**
 * KPA 목록 가시성.
 *
 * 기존 동작 그대로:
 *   my=true + 로그인       → 내 것만
 *   비로그인               → 공개만
 *   status=all + 운영자     → **status 조건 없음** (전체 관리 목록)
 *   status=all + 일반회원   → 공개 + 내 것
 *   status 미지정          → 공개 + 내 것
 *   그 외 status 지정       → 그 status 만
 *
 * `status=all` 은 필터 값이 아니라 모드 지시자라 `applyExplicitStatus=false` 다.
 */
export function resolveKpaListVisibility(ctx: ListStatusContext): ListVisibilityDecision {
  const isAllStatus = ctx.statusFilter === 'all';
  const isOperator =
    Array.isArray(ctx.user?.roles) && ctx.user.roles.some((r: string) => KPA_OPERATOR_ROLES.includes(r));
  const applyExplicitStatus = Boolean(ctx.statusFilter) && !isAllStatus;

  if (ctx.my === 'true' && ctx.userId) return { visibility: 'owner-only', applyExplicitStatus };
  if (!ctx.userId) return { visibility: 'published-only', applyExplicitStatus };
  if (isAllStatus) {
    return isOperator
      ? { visibility: 'none', applyExplicitStatus }
      : { visibility: 'published-or-own', applyExplicitStatus };
  }
  if (!ctx.statusFilter) return { visibility: 'published-or-own', applyExplicitStatus };
  return { visibility: 'none', applyExplicitStatus };
}

/**
 * KPA 목록 행 후처리 — ContentMeta (WO-CONTENT-META-API-ENRICHMENT-V1).
 * `mapCmsStatus` 는 KPA 라우터가 갖고 있어 주입받는다.
 */
export function createKpaListRowMapper(mapCmsStatus: (s: string) => unknown) {
  return (row: any) => ({
    ...row,
    producer: 'service_admin' as const,
    producerRef: row.created_by ?? '',
    visibility: 'service' as const,
    serviceKey: 'kpa-society' as const,
    contentType: 'document' as const,
    metaStatus: mapCmsStatus(row.status === 'published' ? 'pending' : (row.status ?? 'draft')),
  });
}

export function createKpaContentResourceConfig(options: {
  mapCmsStatus: (s: string) => unknown;
  audit: AuditHook;
}): ContentResourceConfig {
  return {
    // 물리 테이블 분리가 서비스 경계다 — 명시 주입 (Core 에 기본값 없음)
    tableName: 'kpa_contents',
    logPrefix: 'KPA',
    operatorRoles: KPA_OPERATOR_ROLES,
    listColumns: KPA_CONTENT_LIST_COLUMNS,
    operatorListColumns: KPA_OPERATOR_RESOURCE_COLUMNS,
    // 회원 목록이 실제로 읽던 필터만 — usage_type/source_type 은 KPA 회원 목록에 없었다
    listFilters: [
      { param: 'content_type', column: 'content_type' },
      { param: 'sub_type', column: 'sub_type' },
    ],
    operatorListFilters: [
      { param: 'source_type', column: 'source_type' },
      { param: 'usage_type', column: 'usage_type' },
    ],
    resolveListVisibility: resolveKpaListVisibility,
    mapListRow: createKpaListRowMapper(options.mapCmsStatus),
    audit: options.audit,
    auditEntityType: 'kpa_content',
  };
}
