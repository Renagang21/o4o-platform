import type { DataSource, EntityManager } from 'typeorm';
import { resolveSessionServiceKey } from '../../utils/session-origin.js';
import { policyAcceptanceService, PolicyAcceptanceError } from '../../modules/policy-acceptance/policy-acceptance.service.js';
import { isCommonAccountTermsDocument, type PublishedTermsDocument } from '../../common/auth/terms-acceptance.policy.js';
import { readCurrentPolicyDocument, recordPublishedPolicyEvidence } from '../../modules/policy-acceptance/policy-document-evidence.service.js';

export interface SignupTermsReference { policyDocumentId: string; version: number }

// Account signup does not enroll a user in a service. Preserve the pharmacy
// agreement until a marked common-account document is actually published.
const ACCOUNT_CENTER_SCOPES = new Set(['neture', 'supplier', 'community', 'funding', 'lecture', 'store', 'kpa-branch']);
export function signupPolicyServiceKey(scope: string | null | undefined): string {
  if (scope === 'kpa-society') return scope;
  if (scope && ACCOUNT_CENTER_SCOPES.has(scope)) return 'neture';
  throw new PolicyAcceptanceError('SIGNUP_ORIGIN_NOT_ALLOWED', '계정 센터에서 회원가입을 시작해 주세요.', 403);
}

export async function resolveSignupPolicyServiceKey(scope: string | null | undefined, manager?: EntityManager): Promise<string> {
  const legacyKey = signupPolicyServiceKey(scope);
  if (legacyKey === 'neture') return legacyKey;
  return isCommonAccountTermsDocument(await policyAcceptanceService.getPublishedTermsForService('neture', manager)) ? 'neture' : legacyKey;
}

export function signupPolicyKeyFromOrigin(origin: string | undefined): string {
  let url: URL;
  try { url = new URL(origin ?? ''); } catch { return signupPolicyServiceKey(null); }
  if (url.origin !== origin || url.username || url.password ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) return signupPolicyServiceKey(null);
  if (process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) return 'neture';
  return signupPolicyServiceKey(resolveSessionServiceKey(origin));
}

export async function resolveSignupPolicyKeyFromOrigin(origin: string | undefined): Promise<string> {
  return resolveSignupPolicyServiceKey(signupPolicyKeyFromOrigin(origin));
}

export async function recordSignupTerms(userId: string, serviceKey: string, reference: SignupTermsReference | undefined, manager: EntityManager): Promise<void> {
  await manager.query('SELECT pg_advisory_xact_lock_shared(hashtext($1))', ['service-policy:neture']);
  if (serviceKey !== 'neture') await manager.query('SELECT pg_advisory_xact_lock_shared(hashtext($1))', [`service-policy:${serviceKey}`]);
  if (!reference || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference.policyDocumentId) || !Number.isInteger(reference.version) || reference.version < 1) {
    throw new PolicyAcceptanceError('POLICY_ACCEPTANCE_REQUIRED', '현재 이용약관을 확인하고 동의해 주세요.', 400);
  }
  if (!['neture', 'kpa-society'].includes(serviceKey)) throw new PolicyAcceptanceError('SIGNUP_ORIGIN_NOT_ALLOWED', '계정 센터에서 회원가입을 시작해 주세요.', 403);
  if (serviceKey === 'kpa-society' && await resolveSignupPolicyServiceKey(serviceKey, manager) !== serviceKey) {
    throw new PolicyAcceptanceError('POLICY_VERSION_MISMATCH', '공통 계정 약관이 갱신되었습니다. 최신 약관을 확인해 주세요.', 409);
  }
  // Hold the displayed row through commit; normal publish/unpublish updates it.
  await manager.query('SELECT id FROM service_policy_documents WHERE id = $1 FOR SHARE', [reference.policyDocumentId]);
  // Always query with the signup transaction. Failure rolls back the account,
  // credential/provider link and one-use grant along with the acceptance.
  await policyAcceptanceService.recordAcceptance({ userId, serviceKey, ...reference }, manager);
}

export async function recordSignupPrivacy(userId: string, reference: SignupTermsReference | undefined, manager: EntityManager): Promise<void> {
  // Old clients remain compatible until the marked common policy rollout. Never manufacture a privacy version for them.
  const terms = await policyAcceptanceService.getPublishedTermsForService('neture', manager);
  if (!reference && !isCommonAccountTermsDocument(terms)) return;
  await readSignupPrivacyPolicy(manager, terms);
  await recordPublishedPolicyEvidence(manager, userId, 'neture', 'privacy', reference);
}

/** A marked account rollout requires a matching privacy document, never legacy privacy. */
export async function readSignupPrivacyPolicy(q: Pick<DataSource, 'query'> | Pick<EntityManager, 'query'>, terms: PublishedTermsDocument | null) {
  const privacy = await readCurrentPolicyDocument(q, 'neture', 'privacy');
  if (isCommonAccountTermsDocument(terms) && (!privacy || privacy.slug !== 'neture-account-privacy'
    || Number(privacy.version) !== Number(terms?.version) || Number(privacy.version) < 2
    || !privacy.title?.trim() || !privacy.content?.trim())) {
    throw new PolicyAcceptanceError('POLICY_UNAVAILABLE', '공통 약관과 개인정보 처리방침을 함께 준비하고 있습니다.', 503);
  }
  return privacy;
}
