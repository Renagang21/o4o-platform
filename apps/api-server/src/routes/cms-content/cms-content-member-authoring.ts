/**
 * Common CMS member authoring capability.
 * PH member authoring has retired. Historical content and membership identifiers remain,
 * but active legacy membership no longer permits create, edit or status transitions.
 * KPA/KCos member content uses each service's existing ledger and is unchanged.
 */

import { resolveCanonicalServiceKey } from '@o4o/security-core';
import type { ContentAuthorRole, ContentVisibilityScope } from './cms-content-utils.js';

/** 회원이 저작할 수 있는 CMS 콘텐츠의 생성·편집 계약. */
export interface CmsMemberAuthoringCapability {
  /** 회원이 만들 수 있는 `cms_contents.type` 화이트리스트. 그 외 type 은 회원 경로로 생성 불가. */
  readonly types: readonly string[];
  /**
   * 원장 안의 하위 축. KPA/KCos 원장의 `sub_type` 컬럼과 **같은 의미**다
   *   'content'  → 커뮤니티 콘텐츠 (`/content`)
   *   'resource' → 자료실 (`/resources`)
   * `cms_contents` 에는 컬럼이 없으므로 기존 `metadata` jsonb 안에 둔다 — schema/migration 0.
   */
  readonly subTypes: readonly string[];
  readonly defaultSubType: string;
  /** 생성되는 행의 제작 주체 축 — 항상 community. 요청 본문으로 바꿀 수 없다. */
  readonly authorRole: Extract<ContentAuthorRole, 'community'>;
  /** 생성되는 행의 노출 축 — 항상 service. 회원이 platform 범위를 만들 수 없다. */
  readonly visibilityScope: Extract<ContentVisibilityScope, 'service'>;
  /** 생성 직후 상태. 운영자 create 와 동일하게 draft 에서 시작한다. */
  readonly initialStatus: 'draft';
  /** 작성자 본인이 본문을 수정할 수 있는 상태. published 본문은 운영자 축이 관리한다. */
  readonly editableStatuses: readonly string[];
  /**
   * 작성자 본인이 스스로 수행할 수 있는 상태 전이.
   * 서버 정본(`CMS_ALLOWED_TRANSITIONS`)의 **부분집합**이어야 한다 — 불가능한 전이를 만들지 않는다.
   *   draft → pending   : 검토 요청(제출)
   *   draft → archived  : 회수(회원 축의 "삭제")
   *   pending → draft   : 제출 취소
   *   published → archived : 회원 축의 "삭제" — 게시본 내리기
   */
  readonly selfTransitions: Readonly<Record<string, readonly string[]>>;
}

/** 현재 공통 CMS 회원 저작을 제공하는 원장. PH 퇴역 후 등록된 대상은 없다. */
const CMS_MEMBER_AUTHORING_LEDGERS: Readonly<Record<string, CmsMemberAuthoringCapability>> = {};

/** 요청 subType 을 capability 화이트리스트로 정규화한다. 미지정·미허용은 기본 축으로 떨어진다. */
export function normalizeCmsMemberSubType(
  capability: CmsMemberAuthoringCapability,
  requested: unknown,
): string {
  return typeof requested === 'string' && capability.subTypes.includes(requested)
    ? requested
    : capability.defaultSubType;
}

/** serviceKey(canonical 또는 role-prefix)에 대한 회원 저작 계약. 없으면 null. */
export function resolveCmsMemberAuthoring(
  serviceKey: string | null | undefined,
): CmsMemberAuthoringCapability | null {
  if (!serviceKey || !serviceKey.trim()) return null;
  const canonical = resolveCanonicalServiceKey(serviceKey.trim());
  return CMS_MEMBER_AUTHORING_LEDGERS[canonical] ?? CMS_MEMBER_AUTHORING_LEDGERS[serviceKey.trim()] ?? null;
}

export interface CmsAuthUserLike {
  id: string;
  roles?: string[];
  memberships?: { serviceKey: string; status: string }[];
}

/**
 * 활성 서비스 멤버십 판정.
 *
 * 근거를 새로 만들지 않는다 — 포럼 write gate(`requireActiveServiceMembership`)와
 * **같은 JWT `user.memberships` 축**이며 role scope 를 요구하지 않는다.
 * (일반 회원이 커뮤니티에 글을 쓸 수 있어야 한다 — 그 계약과 동일해야 일관된다.)
 */
export function hasActiveCmsServiceMembership(
  user: CmsAuthUserLike | undefined,
  serviceKey: string | null | undefined,
): boolean {
  if (!user || !serviceKey) return false;
  const membershipKey = resolveCanonicalServiceKey(serviceKey);
  const memberships = user.memberships || [];
  return memberships.some((m) => m.serviceKey === membershipKey && m.status === 'active');
}

export type CmsMemberCreateDecision =
  | { allowed: true; capability: CmsMemberAuthoringCapability }
  | { allowed: false; reason: 'NO_CAPABILITY' | 'TYPE_NOT_ALLOWED' | 'MEMBERSHIP_REQUIRED' };

/** 회원 create 인가. operator/admin 판정에서 떨어진 요청만 여기로 온다. */
export function authorizeCmsMemberCreate(
  user: CmsAuthUserLike | undefined,
  serviceKey: string | null | undefined,
  type: string | null | undefined,
): CmsMemberCreateDecision {
  const capability = resolveCmsMemberAuthoring(serviceKey);
  if (!capability) return { allowed: false, reason: 'NO_CAPABILITY' };
  if (!type || !capability.types.includes(type)) return { allowed: false, reason: 'TYPE_NOT_ALLOWED' };
  if (!hasActiveCmsServiceMembership(user, serviceKey)) {
    return { allowed: false, reason: 'MEMBERSHIP_REQUIRED' };
  }
  return { allowed: true, capability };
}

export interface CmsContentLike {
  serviceKey: string | null;
  authorRole?: string | null;
  status: string;
  createdBy?: string | null;
}

/** 이 행이 "이 회원이 저작한 community 콘텐츠"인가. */
export function isOwnCommunityContent(
  user: CmsAuthUserLike | undefined,
  content: CmsContentLike,
): boolean {
  if (!user?.id) return false;
  if ((content.authorRole ?? 'admin') !== 'community') return false;
  if (!content.createdBy || content.createdBy !== user.id) return false;
  return !!resolveCmsMemberAuthoring(content.serviceKey);
}

/** 본문 수정 인가 (작성자 본인 · community · editableStatuses). */
export function authorizeCmsMemberUpdate(
  user: CmsAuthUserLike | undefined,
  content: CmsContentLike,
): boolean {
  if (!isOwnCommunityContent(user, content)) return false;
  const capability = resolveCmsMemberAuthoring(content.serviceKey)!;
  if (!hasActiveCmsServiceMembership(user, content.serviceKey)) return false;
  return capability.editableStatuses.includes(content.status);
}

/** 상태 전이 인가 (작성자 본인 · selfTransitions 부분집합). */
export function authorizeCmsMemberTransition(
  user: CmsAuthUserLike | undefined,
  content: CmsContentLike,
  nextStatus: string | null | undefined,
): boolean {
  if (!nextStatus) return false;
  if (!isOwnCommunityContent(user, content)) return false;
  const capability = resolveCmsMemberAuthoring(content.serviceKey)!;
  if (!hasActiveCmsServiceMembership(user, content.serviceKey)) return false;
  return (capability.selfTransitions[content.status] ?? []).includes(nextStatus);
}
