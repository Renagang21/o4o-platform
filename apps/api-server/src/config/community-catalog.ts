/**
 * O4O Community Catalog — Community Identity 의 단일 소스 (SSOT)
 *
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1 (2026-09-16)
 * 상위 정본: docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md §5
 *
 *   Community Identity ≠ Service Identity
 *
 * Community 는 Service(service-catalog `O4O_SERVICES`)와 **별도 축**이다. Service 는 Community 의
 * 소유자가 아니며, Service membership 은 특정 Community 의 **참여 자격 조건 중 하나**일 뿐이다.
 * 종전 "Industry Community" 방향은 폐기(RETIRED) — Industry / IndustryMembership / Industry-Service
 * mapping 을 만들지 않는다. 필요한 것은 Community + participation policy 뿐이다.
 *
 * 초기 등록값 3개는 고정 enum 이 아니다. 새 Community = 여기 등록 + policy + capability + UI metadata.
 * Forum / Content / Resources / LMS 공통 Core 는 수정하지 않는다. `key` 는 string 이며
 * `'pharmacy' | 'cosmetics' | 'o4o-general'` 같은 고정 union 을 다른 곳에 복제하지 않는다.
 *
 * Policy 는 두 가지만 둔다 (범용 policy engine · rule builder 금지):
 *   - authenticated            : 로그인한 모든 O4O 사용자
 *   - service_membership_any   : 나열된 서비스 중 하나라도 active membership
 *
 * 물리 저장(adapter seam):
 *   Forum 원장 `forum_category_requests.service_code` 는 (a) Community 파티션 (b) 운영자 governance
 *   (어느 서비스 운영자가 승인·중재하는가)를 겸하는 실제 Service scope 라 rename 하지 않는다 (WO §9).
 *   `forumStorageCodes` 가 "이 Community 가 읽는 원장 코드 집합" 이라는 **논리 → 물리 adapter** 이며,
 *   새 business logic 은 `community == serviceKey` 를 가정하지 않는다.
 *   `o4o-general` 의 저장 코드 `neture` 는 구현 seed 일 뿐 identity 가 아니다 (Neture Community 아님).
 */

export type CommunityParticipationPolicy =
  | { mode: 'authenticated' }
  | { mode: 'service_membership_any'; serviceKeys: readonly string[] };

export type CommunityCapability = 'forum' | 'content' | 'resources' | 'education';

/** 서비스 web 안의 진입 경로 (UI metadata · route 가 실재하는 것만) */
export interface CommunityEntry {
  /** canonical service key — 이 web 이 이 Community 의 진입 surface 를 가진다 */
  serviceKey: string;
  /** 그 web 안의 경로 */
  path: string;
}

export interface CommunityDefinition {
  key: string;
  name: string;
  status: 'active' | 'hidden';
  participationPolicy: CommunityParticipationPolicy;
  capabilities: readonly CommunityCapability[];
  /**
   * Forum 원장(`forum_category_requests.service_code`)에서 이 Community 가 읽는 코드 집합 (adapter).
   * 운영 governance(승인·중재)는 각 코드의 서비스 운영자가 그대로 맡는다 — 참여 자격과 별개 (WO §19).
   */
  forumStorageCodes: readonly string[];
  /** 진입 surface (여러 URL 이어도 Community Identity 는 하나) */
  entries: readonly CommunityEntry[];
}

export const O4O_COMMUNITIES: readonly CommunityDefinition[] = Object.freeze([
  {
    key: 'pharmacy',
    name: '약사 커뮤니티',
    status: 'active',
    participationPolicy: { mode: 'service_membership_any', serviceKeys: ['kpa-society', 'pharmacy-hub'] },
    capabilities: ['forum', 'content', 'resources', 'education'],
    // KPA 와 Pharmacy-Hub 가 만든 포럼은 하나의 약사 커뮤니티다 (PH 별도 약사 Community = 0).
    forumStorageCodes: ['kpa-society', 'pharmacy-hub'],
    entries: [
      { serviceKey: 'kpa-society', path: '/forum' },
      { serviceKey: 'pharmacy-hub', path: '/forum' },
    ],
  },
  {
    key: 'cosmetics',
    name: '화장품 커뮤니티',
    status: 'active',
    participationPolicy: { mode: 'service_membership_any', serviceKeys: ['k-cosmetics'] },
    capabilities: ['forum', 'content', 'resources', 'education'],
    forumStorageCodes: ['k-cosmetics'],
    entries: [{ serviceKey: 'k-cosmetics', path: '/forum' }],
  },
  {
    key: 'o4o-general',
    name: 'O4O 공통 커뮤니티',
    status: 'active',
    participationPolicy: { mode: 'authenticated' },
    capabilities: ['forum'],
    // 구현 seed = 종전 Neture 커뮤니티 원장. identity 는 o4o-general 이며 Neture membership 을 요구하지 않는다.
    forumStorageCodes: ['neture'],
    entries: [{ serviceKey: 'neture', path: '/community' }],
  },
]);

export function getCommunityDefinition(key: string | null | undefined): CommunityDefinition | undefined {
  const k = String(key ?? '').trim();
  if (!k) return undefined;
  return O4O_COMMUNITIES.find((c) => c.key === k);
}

export function listActiveCommunities(): CommunityDefinition[] {
  return O4O_COMMUNITIES.filter((c) => c.status === 'active');
}

/**
 * Legacy service-scoped mount(`/kpa/forum`, `/pharmacy-hub/forum`, …)가 자기 Community 를 찾는 adapter.
 * 서비스가 Community 를 소유한다는 뜻이 아니라, "이 서비스 web 의 커뮤니티 surface 가 어느 Community 의
 * 진입인가" 를 catalog `entries` 에서 역으로 읽는 것이다. 없으면 undefined (Community 아님).
 */
export function communityKeyForServiceEntry(serviceKey: string | null | undefined): string | undefined {
  const k = String(serviceKey ?? '').trim();
  if (!k) return undefined;
  return O4O_COMMUNITIES.find((c) => c.entries.some((e) => e.serviceKey === k))?.key;
}
