/**
 * Community Access Resolver — Community 참여 자격 판정의 단일 지점
 *
 * WO-O4O-COMMUNITY-WORKSPACE-CATALOG-AND-ACCESS-ALIGNMENT-V1 (2026-09-16)
 *
 *   resolveCommunityAccess(user, communityKey)
 *     community catalog lookup → participation policy → 기존 service membership / auth → allowed | denied
 *
 * 규칙:
 *   - **읽기만 한다.** Community 접근을 위해 service_memberships · role · organization enrollment 를
 *     만들거나 바꾸지 않는다 (WO §11). 새 Community membership 테이블 0.
 *   - 판정 소스는 기존 guard(`requireActiveServiceMembership` · membership guard)와 같은
 *     `user.memberships`(JWT payload — `freshenUserContext` 가 만든 것) 다. DB 를 직접 보지 않는다.
 *   - `platform:super_admin` 은 기존 forum write guard 와 같은 예외로 통과한다.
 *   - 참여 자격(participation) ≠ 운영 권한(moderation) — 운영자 권한은 여기서 추론하지 않는다 (WO §19).
 *   - 참여 자격 ≠ 공개 read 정책 — 비로그인 read 는 기존 route 계약 그대로다 (WO §13).
 *
 * 순수 함수라 DB 없이 테스트한다. 서비스별 `if (hasKpaMembership)` 분기를 프런트·라우트에 복제하지 않는다.
 */

import {
  getCommunityDefinition,
  listActiveCommunities,
  type CommunityCapability,
  type CommunityDefinition,
} from '../config/community-catalog.js';
import { resolveCanonicalServiceKey } from '@o4o/security-core';

export interface CommunityAccessUser {
  id?: string;
  roles?: string[];
  memberships?: { serviceKey: string; status: string }[];
}

export type CommunityAccessDeniedReason =
  | 'UNKNOWN_COMMUNITY'
  | 'COMMUNITY_HIDDEN'
  | 'AUTH_REQUIRED'
  | 'SERVICE_MEMBERSHIP_REQUIRED';

export interface CommunityAccessResult {
  communityKey: string;
  allowed: boolean;
  reason: CommunityAccessDeniedReason | null;
  /** service_membership_any 정책일 때, 자격을 만족시킨 서비스 키 (표시용 · 권한 SSOT 아님) */
  via: string | null;
}

const PLATFORM_BYPASS_ROLE = 'platform:super_admin';

function activeMembershipKeys(user: CommunityAccessUser | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const m of user?.memberships ?? []) {
    if (m && m.status === 'active' && m.serviceKey) out.add(resolveCanonicalServiceKey(m.serviceKey));
  }
  return out;
}

function evaluate(def: CommunityDefinition, user: CommunityAccessUser | null | undefined): CommunityAccessResult {
  const communityKey = def.key;
  if (def.status !== 'active') {
    return { communityKey, allowed: false, reason: 'COMMUNITY_HIDDEN', via: null };
  }
  if (!user || !user.id) {
    return { communityKey, allowed: false, reason: 'AUTH_REQUIRED', via: null };
  }
  if (user.roles?.includes(PLATFORM_BYPASS_ROLE)) {
    return { communityKey, allowed: true, reason: null, via: null };
  }
  const policy = def.participationPolicy;
  if (policy.mode === 'authenticated') {
    return { communityKey, allowed: true, reason: null, via: null };
  }
  // service_membership_any
  const active = activeMembershipKeys(user);
  for (const key of policy.serviceKeys) {
    const canonical = resolveCanonicalServiceKey(key);
    if (active.has(canonical)) {
      return { communityKey, allowed: true, reason: null, via: canonical };
    }
  }
  return { communityKey, allowed: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED', via: null };
}

export function resolveCommunityAccess(
  user: CommunityAccessUser | null | undefined,
  communityKey: string,
): CommunityAccessResult {
  const def = getCommunityDefinition(communityKey);
  if (!def) {
    return { communityKey: String(communityKey ?? ''), allowed: false, reason: 'UNKNOWN_COMMUNITY', via: null };
  }
  return evaluate(def, user);
}

export interface CommunityListItem {
  communityKey: string;
  name: string;
  capabilities: readonly CommunityCapability[];
  canParticipate: boolean;
  reason: CommunityAccessDeniedReason | null;
  /** 진입 surface — Community 하나에 여러 URL 이 있을 수 있다 */
  entries: readonly { serviceKey: string; path: string }[];
}

/** 현재 사용자 기준 active Community 목록 + 참여 가능 여부 (`GET /api/v1/communities`) */
export function listCommunitiesForUser(user: CommunityAccessUser | null | undefined): CommunityListItem[] {
  return listActiveCommunities().map((def) => {
    const access = evaluate(def, user);
    return {
      communityKey: def.key,
      name: def.name,
      capabilities: def.capabilities,
      canParticipate: access.allowed,
      reason: access.reason,
      entries: def.entries,
    };
  });
}

/**
 * Forum 원장 adapter — Community 가 읽는 `forum_category_requests.service_code` 집합.
 * 미등록 Community 는 빈 배열(= 아무것도 보이지 않음, fail-closed).
 */
export function communityForumStorageCodes(communityKey: string | null | undefined): string[] {
  const def = getCommunityDefinition(communityKey);
  return def ? [...def.forumStorageCodes] : [];
}
