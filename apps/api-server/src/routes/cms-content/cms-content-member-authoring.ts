/**
 * CMS 회원 저작(member authoring) capability — config 축 단독
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 판정 근거 (§6 — "제품 정책 + 실제 KPA capability" 기준)
 *
 *   KPA   : `contentRouter.post('/', authenticate, ...)`  (kpa.routes.ts)
 *   GP    : `router.post('/', authenticate, write.create)` (resources.controller.ts)
 *   KCos  : `router.post('/', authenticate, write.create)` (resources.controller.ts)
 *
 *   → 회원 콘텐츠 작성은 KPA 단독 특례가 아니라 **3개 원장 서비스 공통의 회원 capability**
 *     다. operator role 을 요구하지 않는다. 따라서 PH 미보유는 INTENTIONAL_DIFFERENCE 가
 *     아니라 MISSING_ADOPTION 이다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 registry 가 "서비스 분기"가 아닌가
 *
 *   등록 기준은 선호가 아니라 **원장 결합(ledger binding)** 이라는 사실이다:
 *
 *     서비스        회원 콘텐츠 원장          이 파일 등록 여부
 *     KPA/GP/KCos   `{service}_contents`      ✗ (자기 원장에 이미 회원 write 보유)
 *     PharmacyHub   공통 `cms_contents`       ✓ (원장이 공통이라 공통 경로에 필요)
 *
 *   즉 3서비스가 비어 있는 것은 권한 차별이 아니라 **원장이 다르기 때문**이다.
 *   신규 table(`pharmacy_hub_contents`) 을 만들지 않는다는 §6 제약과 정확히 같은 결론이다.
 *
 *   기본값이 없으므로(등록되지 않은 serviceKey 는 null) **기존 서비스의 CMS write 정책
 *   변화는 0** 이다 — KPA/GP/KCos/Neture 의 cms_contents 는 종전대로 operator/admin 전용.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * type 축
 *
 *   `packages/cms-core` 의 `ContentType` 은 동결이다 — 신규 type 을 만들지 않는다.
 *   공통 CMS 는 제작 주체를 `authorRole` 로 구분하도록 이미 설계돼 있고
 *   (`'admin' | 'service_admin' | 'supplier' | 'community'`), `GET /cms/contents` 는
 *   `authorRole` 필터를 이미 지원한다. 따라서:
 *
 *     자료실(운영자 등록)   type='knowledge' · authorRole ∈ {admin, service_admin}
 *     커뮤니티 콘텐츠(회원)  type='knowledge' · authorRole = 'community'
 *
 *   두 축은 같은 원장 안에서 authorRole 로 분리된다 — schema/migration 0.
 */

import { resolveCanonicalServiceKey } from '@o4o/security-core';
import type { ContentAuthorRole, ContentVisibilityScope } from './cms-content-utils.js';

/** 회원이 저작할 수 있는 CMS 콘텐츠의 생성·편집 계약. */
export interface CmsMemberAuthoringCapability {
  /** 회원이 만들 수 있는 `cms_contents.type` 화이트리스트. 그 외 type 은 회원 경로로 생성 불가. */
  readonly types: readonly string[];
  /**
   * 원장 안의 하위 축. KPA/GP/KCos 원장의 `sub_type` 컬럼과 **같은 의미**다
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

const CMS_CONTENTS_MEMBER_LEDGER: CmsMemberAuthoringCapability = {
  types: ['knowledge'],
  subTypes: ['content', 'resource'],
  defaultSubType: 'content',
  authorRole: 'community',
  visibilityScope: 'service',
  initialStatus: 'draft',
  editableStatuses: ['draft', 'pending'],
  selfTransitions: {
    draft: ['pending', 'archived'],
    pending: ['draft'],
    published: ['archived'],
    archived: [],
  },
};

/**
 * 회원 콘텐츠 원장이 공통 `cms_contents` 인 서비스.
 * key 는 canonical serviceKey (`resolveCanonicalServiceKey` 결과)로 정규화해 조회한다.
 */
const CMS_MEMBER_AUTHORING_LEDGERS: Readonly<Record<string, CmsMemberAuthoringCapability>> = {
  'pharmacy-hub': CMS_CONTENTS_MEMBER_LEDGER,
};

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
