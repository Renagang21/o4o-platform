/**
 * Delete Policy — Domain-level deletion strategy definitions
 *
 * WO-O4O-TABLE-STANDARD-V4 Phase 4
 *
 * 각 도메인의 삭제 전략을 표준화하여 일관된 UX 제공.
 * - deactivate: isActive=false 전환 (커뮤니티 드롭다운에서 숨김)
 * - archive: 상태를 'archived'로 변경 (목록에서 분리)
 * - soft: DB 소프트 삭제 (복구 가능)
 * - hard: DB 완전 삭제 (복구 불가)
 */

export type DeleteLevel = 'deactivate' | 'archive' | 'soft' | 'hard';

export interface DeletePolicy {
  /** Available delete levels for this domain */
  levels: DeleteLevel[];
  /** Must deactivate/archive/soft-delete before hard delete */
  requireSoftFirst?: boolean;
  /** Must run pre-flight validation before hard delete */
  requirePreCheck?: boolean;
}

/** Standard delete policy presets */
export const DELETE_POLICIES = {
  /** Toggle isActive only, no actual delete (signage categories) */
  DEACTIVATE_ONLY: {
    levels: ['deactivate'],
  } satisfies DeletePolicy,

  /** Archive first, then allow hard delete on archived items (content/news) */
  ARCHIVE_THEN_HARD: {
    levels: ['archive', 'hard'],
    requireSoftFirst: true,
  } satisfies DeletePolicy,

  /** Deactivate first, then hard delete with pre-check (forum categories) */
  DEACTIVATE_THEN_HARD: {
    levels: ['deactivate', 'hard'],
    requireSoftFirst: true,
    requirePreCheck: true,
  } satisfies DeletePolicy,

  /** Soft delete first, then hard delete (neture members) */
  SOFT_THEN_HARD: {
    levels: ['soft', 'hard'],
    requireSoftFirst: true,
  } satisfies DeletePolicy,

  /** Direct hard delete — low-risk resources (signage assets, templates) */
  HARD_ONLY: {
    levels: ['hard'],
  } satisfies DeletePolicy,

  /** No delete operations (approval flows, brands) */
  NONE: {
    levels: [],
  } satisfies DeletePolicy,
} as const;

/** Per-domain delete policy assignments */
export const DOMAIN_DELETE_POLICIES: Record<string, DeletePolicy> = {
  // KPA Society
  'kpa:content': DELETE_POLICIES.ARCHIVE_THEN_HARD,
  'kpa:users': DELETE_POLICIES.HARD_ONLY,
  'kpa:forum-category': DELETE_POLICIES.DEACTIVATE_THEN_HARD,
  'kpa:signage-category': DELETE_POLICIES.DEACTIVATE_ONLY,
  'kpa:signage-media': DELETE_POLICIES.HARD_ONLY,
  'kpa:signage-playlist': DELETE_POLICIES.HARD_ONLY,
  'kpa:signage-template': DELETE_POLICIES.HARD_ONLY,
  'kpa:join-request': DELETE_POLICIES.NONE,
  // Neture
  'neture:product': DELETE_POLICIES.SOFT_THEN_HARD,
  'neture:brand': DELETE_POLICIES.NONE,
  'neture:member': DELETE_POLICIES.SOFT_THEN_HARD,
  // GlycoPharm
  'glycopharm:ads': DELETE_POLICIES.HARD_ONLY,
  'glycopharm:sponsors': DELETE_POLICIES.HARD_ONLY,
};

/**
 * Determine which delete levels are currently available for a row
 * based on the policy and row's current state.
 */
export function getAvailableDeleteLevels<T>(
  policy: DeletePolicy,
  row: T,
  /** Return true if the row is already soft-deleted/archived/deactivated */
  isSoftDeleted?: (row: T) => boolean,
): DeleteLevel[] {
  if (policy.levels.length === 0) return [];
  if (!policy.requireSoftFirst) return [...policy.levels];

  const softDone = isSoftDeleted?.(row) ?? false;
  if (softDone) {
    // Already soft-deleted → only hard delete available
    return policy.levels.filter((l) => l === 'hard');
  }
  // Not yet soft-deleted → only soft levels
  return policy.levels.filter((l) => l !== 'hard');
}
