import type { EntityManager } from 'typeorm';
import { resolveSessionServiceKey } from '../../utils/session-origin.js';
import { policyAcceptanceService, PolicyAcceptanceError } from '../../modules/policy-acceptance/policy-acceptance.service.js';

export interface SignupTermsReference { policyDocumentId: string; version: number }

// Account signup does not enroll a user in a service. Workspace/branch and the
// Neture bundle's service surfaces use the account center's published agreement.
const ACCOUNT_CENTER_SCOPES = new Set(['neture', 'supplier', 'community', 'funding', 'lecture', 'store', 'kpa-branch']);
export function signupPolicyServiceKey(scope: string | null | undefined): string {
  if (scope === 'kpa-society') return scope;
  if (scope && ACCOUNT_CENTER_SCOPES.has(scope)) return 'neture';
  throw new PolicyAcceptanceError('SIGNUP_ORIGIN_NOT_ALLOWED', '계정 센터에서 회원가입을 시작해 주세요.', 403);
}

export function signupPolicyKeyFromOrigin(origin: string | undefined): string {
  let url: URL;
  try { url = new URL(origin ?? ''); } catch { return signupPolicyServiceKey(null); }
  if (url.origin !== origin || url.username || url.password ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) return signupPolicyServiceKey(null);
  if (process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) return 'neture';
  return signupPolicyServiceKey(resolveSessionServiceKey(origin));
}

export async function recordSignupTerms(userId: string, serviceKey: string, reference: SignupTermsReference | undefined, manager: EntityManager): Promise<void> {
  if (!reference || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference.policyDocumentId) || !Number.isInteger(reference.version) || reference.version < 1) {
    throw new PolicyAcceptanceError('POLICY_ACCEPTANCE_REQUIRED', '현재 이용약관을 확인하고 동의해 주세요.', 400);
  }
  if (!['neture', 'kpa-society'].includes(serviceKey)) throw new PolicyAcceptanceError('SIGNUP_ORIGIN_NOT_ALLOWED', '계정 센터에서 회원가입을 시작해 주세요.', 403);
  // Hold the displayed row through commit; normal publish/unpublish updates it.
  await manager.query('SELECT id FROM service_policy_documents WHERE id = $1 FOR SHARE', [reference.policyDocumentId]);
  // Always query with the signup transaction. Failure rolls back the account,
  // credential/provider link and one-use grant along with the acceptance.
  await policyAcceptanceService.recordAcceptance({ userId, serviceKey, ...reference }, manager);
}
