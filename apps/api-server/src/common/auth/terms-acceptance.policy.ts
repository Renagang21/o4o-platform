/**
 * Terms Acceptance Policy — 통합 이용약관 acceptance 게이트 중앙 정책 (순수 판정)
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §15 · §18 · §19 · §22
 * 근거 IR: IR-O4O-INTEGRATED-TERMS-RUNTIME-CONTRACT-CENSUS-V1 §4 (동의 기록 TIMESTAMP_ONLY)
 *
 * ── 축 정의 ────────────────────────────────────────────────────────────────
 * "약관 acceptance" 는 **계약상 승낙**이다. 개인정보 동의(consent) · 계정 접근 상태
 * (account-access.policy) · service membership 과 별개 축이다.
 *   - SSOT 는 DB `user_policy_acceptances` (user × service_key × policy_document_id).
 *   - `users.tos_accepted_at` 은 legacy snapshot 이며 판정에 쓰지 않는다 (WO §6).
 *   - JWT claim 에 싣지 않는다. requireAuth 가 매 요청 판정한다 (게이트 우회 불가).
 *
 * ── 판정 규칙 (WO §15 · §22) ───────────────────────────────────────────────
 * required = 사용자의 service_memberships(status ∈ REQUIRED_MEMBERSHIP_STATUSES) 각각에 대해
 *            그 서비스의 **최신 published `terms`** 문서.
 * pending  = required 중 acceptance row 가 없는 것.
 *   - published terms 가 없는 서비스는 요구하지 않는다 → 약관 v1 게시 전에는 게이트가 아무도
 *     막지 않는다 (WO §25 "게시 전 임의 차단 금지").
 *   - membership 이 없는 계정(내부 플랫폼 관리자 등)은 pending 0 → 차단 없음 (WO §22).
 *   - 4 서비스 본문이 동일한 통합약관이므로 프론트는 pending 전부를 한 화면에서 승낙한다.
 *     따라서 서버 게이트는 경로→서비스 매핑 없이 **pending 이 하나라도 있으면** 차단한다
 *     (경로별 매핑은 lms/forum/store 같은 cross-service 경로에서 신뢰할 수 없다).
 *
 * ── default-deny + allowlist (WO §19) ────────────────────────────────────
 * pending 상태의 인증 요청은 아래 allowlist (METHOD, 정확한 경로) 만 통과한다.
 * 정규화 규칙은 account-access.policy 의 normalizeRequestPath 를 그대로 쓴다.
 */

import { normalizeRequestPath } from './account-access.policy.js';

export const TERMS_ACCEPTANCE_REQUIRED_CODE = 'TERMS_ACCEPTANCE_REQUIRED';
export const TERMS_ACCEPTANCE_REQUIRED_MESSAGE = '서비스 이용약관에 동의한 뒤 이용할 수 있습니다.';
/** RFC 6585 428 Precondition Required — 기존 API 계약에 겹치는 status 가 없어 그대로 채택 (WO §18). */
export const TERMS_ACCEPTANCE_REQUIRED_STATUS = 428;

/** 이번 WO 의 필수 acceptance 대상 (WO §14). */
export const REQUIRED_POLICY_DOCUMENT_TYPE = 'terms';
export const ACCEPTANCE_KIND_AGREEMENT = 'agreement';

/**
 * acceptance 를 요구하는 membership 상태.
 * pending(승인 대기) 도 포함한다 — 가입 신청 자체가 약관 승낙을 전제로 하며, 승인 후 첫 진입에서
 * 다시 묻지 않기 위해서다. suspended/rejected/withdrawn 은 서비스 이용 자체가 없으므로 제외.
 */
export const REQUIRED_MEMBERSHIP_STATUSES: ReadonlySet<string> = new Set(['active', 'pending']);

/**
 * pending 상태에서도 허용되는 최소 경로 (WO §19).
 *
 * 원칙 (account-access.policy §5-C 와 동일):
 *   - HTTP method 까지 구분 · 정확 일치만 · `/:id` 임의 자원 경로 금지 · query 는 판정에서 제거.
 * public 경로(`/api/v1/public/**` · 약관/처리방침 조회 · 공개 문의 · 비밀번호 재설정 · refresh)는
 * requireAuth 를 거치지 않으므로 여기 등록할 필요가 없다 — 게이트는 requireAuth 안에서만 동작한다.
 */
export const TERMS_PENDING_ALLOWLIST: ReadonlySet<string> = new Set([
  // ── 공통 인증 (세션 유지 · 로그아웃 · 본인 최소 정보) ──
  'GET /api/v1/auth/me',
  'GET /api/v1/auth/verify',
  'GET /api/v1/auth/status',
  'POST /api/v1/auth/logout',
  'POST /api/v1/auth/logout-all',
  'POST /api/v1/auth/resend-verification',
  'GET /api/v1/auth/services',
  // legacy mount (/api/auth) — 같은 라우터가 두 prefix 에 마운트된다
  'GET /api/auth/me',
  'GET /api/auth/verify',
  'GET /api/auth/status',
  'POST /api/auth/logout',
  'POST /api/auth/logout-all',
  // ── 약관 acceptance 자체 (pending 조회 · 승낙 제출) ──
  'GET /api/v1/auth/policy-acceptances',
  'POST /api/v1/auth/policy-acceptances',
  // ── 서비스별 가입 상태 조회 (제한 로그인 allowlist 와 동일 — 승인 대기 화면 유지) ──
  'GET /api/v1/pharmacy-hub/join/status',
  'GET /api/v1/pharmacy-hub/me/access',
  'GET /api/v1/kpa/me/membership',
  'GET /api/v1/cosmetics/members/me',
]);

/**
 * 플랫폼 관리 콘솔 경로 (WO §22 "내부 플랫폼 관리자의 관리업무를 약관 재동의로 차단하지 않는다").
 *
 * 이 prefix 아래는 전부 platform/admin role guard 가 별도로 지키므로 일반 회원에게는 어차피 403 이다 —
 * 게이트 우회 경로가 되지 않는다. 서비스 운영자 콘솔(`/api/v1/kpa/operator/**` 등)은 "외부 서비스
 * 운영자"(§22 대상)라 여기 두지 않는다.
 */
export const TERMS_GATE_EXEMPT_PREFIXES: readonly string[] = ['/api/v1/admin/', '/api/admin/'];

/** pending 상태의 요청이 허용되는가. fail closed: 판정 불가면 false. */
export function isTermsPendingRequestAllowed(
  method: string | undefined,
  rawUrl: string | undefined,
): boolean {
  const path = normalizeRequestPath(rawUrl);
  if (!path) return false;
  const verb = typeof method === 'string' ? method.toUpperCase() : '';
  if (!verb) return false;
  if (TERMS_GATE_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
  return TERMS_PENDING_ALLOWLIST.has(`${verb} ${path}`);
}

/** 서비스별 최신 published terms 문서 (게이트·가입·/me 가 공유하는 최소 형태). */
export interface PublishedTermsDocument {
  id: string;
  serviceKey: string;
  documentType: string;
  version: number;
  title: string;
  contentHash: string;
}

/** 로그인 응답 · /auth/me 의 `pendingPolicyAcceptances` 항목 (WO §16 — 본문은 싣지 않는다). */
export interface PendingPolicyAcceptance {
  serviceKey: string;
  documentType: string;
  policyDocumentId: string;
  version: number;
  title: string;
}

/**
 * 순수 pending 계산 (WO §15).
 *
 * @param memberships  사용자의 service_memberships (serviceKey · status)
 * @param published    서비스별 최신 published terms (serviceKey 당 1건)
 * @param acceptedIds  사용자가 이미 승낙한 policy_document_id 집합
 */
export function computePendingPolicyAcceptances(
  memberships: ReadonlyArray<{ serviceKey: string; status: string }>,
  published: ReadonlyArray<PublishedTermsDocument>,
  acceptedIds: ReadonlySet<string>,
): PendingPolicyAcceptance[] {
  const byService = new Map<string, PublishedTermsDocument>();
  for (const doc of published) byService.set(doc.serviceKey, doc);

  const seen = new Set<string>();
  const pending: PendingPolicyAcceptance[] = [];
  for (const m of memberships) {
    if (!REQUIRED_MEMBERSHIP_STATUSES.has(m.status)) continue;
    if (seen.has(m.serviceKey)) continue;
    seen.add(m.serviceKey);
    const doc = byService.get(m.serviceKey);
    if (!doc) continue;
    if (acceptedIds.has(doc.id)) continue;
    pending.push({
      serviceKey: doc.serviceKey,
      documentType: doc.documentType,
      policyDocumentId: doc.id,
      version: doc.version,
      title: doc.title,
    });
  }
  return pending;
}

/**
 * 가입 요청이 제출한 약관 문서 식별자 검증 (WO §9).
 *
 * 서비스에 published terms 가 있으면 클라이언트가 보낸 policyDocumentId 가 **그 문서**여야 한다
 * (버전을 함께 보냈다면 버전도 일치). published terms 가 없으면(게시 전 · 4 서비스 외 키)
 * 요구하지 않는다 → legacy `tos` 불리언 흐름 그대로.
 */
export type SignupTermsCheck =
  | { kind: 'not_required' }
  | { kind: 'ok'; document: PublishedTermsDocument }
  | { kind: 'missing'; document: PublishedTermsDocument }
  | { kind: 'mismatch'; document: PublishedTermsDocument };

export function checkSignupTermsDocument(
  published: PublishedTermsDocument | null | undefined,
  submittedId: unknown,
  submittedVersion: unknown,
): SignupTermsCheck {
  if (!published) return { kind: 'not_required' };
  if (typeof submittedId !== 'string' || submittedId.length === 0) {
    return { kind: 'missing', document: published };
  }
  if (submittedId !== published.id) return { kind: 'mismatch', document: published };
  if (submittedVersion !== undefined && submittedVersion !== null) {
    const v = typeof submittedVersion === 'string' ? Number(submittedVersion) : submittedVersion;
    if (v !== published.version) return { kind: 'mismatch', document: published };
  }
  return { kind: 'ok', document: published };
}
