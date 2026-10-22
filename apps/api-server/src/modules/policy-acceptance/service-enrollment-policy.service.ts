import type { EntityManager } from 'typeorm';
import { PolicyAcceptanceError } from './policy-acceptance.service.js';
import { readCurrentPolicyDocument, recordPublishedPolicyEvidence, type CurrentPolicyDocument, type PolicyEvidence, type PolicyReference } from './policy-document-evidence.service.js';

export interface EnrollmentPolicyReference extends PolicyReference { documentType: 'terms' | 'privacy' }
export const ENROLLMENT_POLICY_SERVICES: ReadonlySet<string> = new Set(['supplier', 'kpa-society', 'community', 'funding', 'lecture', 'carepharm']);

export function isEnrollmentPolicySlug(serviceKey: string, documentType: string, slug: unknown): boolean {
  return ENROLLMENT_POLICY_SERVICES.has(serviceKey) && ['terms', 'privacy'].includes(documentType) && slug === `${serviceKey}-service-${documentType}`;
}

export async function getEnrollmentPolicies(q: Pick<EntityManager, 'query'>, serviceKey: string): Promise<CurrentPolicyDocument[]> {
  if (!ENROLLMENT_POLICY_SERVICES.has(serviceKey)) throw new PolicyAcceptanceError('UNKNOWN_SERVICE', '지원하지 않는 서비스입니다.', 404);
  const docs = await Promise.all(['terms', 'privacy'].map(type => readCurrentPolicyDocument(q, serviceKey, type as 'terms' | 'privacy')));
  const marked = docs.filter((doc): doc is CurrentPolicyDocument => !!doc && isEnrollmentPolicySlug(doc.service_key, doc.document_type, doc.slug));
  if ((serviceKey === 'carepharm' || marked.length > 0) && (marked.length !== 2 || Number(marked[0].version) < 2 || marked[0].version !== marked[1].version)) {
    throw new PolicyAcceptanceError('POLICY_UNAVAILABLE', '서비스 약관과 개인정보 안내를 함께 준비하고 있습니다. 잠시 후 다시 확인해 주세요.', 503);
  }
  return marked;
}

/** Published service documents apply only to this explicit application, inside its transaction. */
export async function recordEnrollmentPolicies(m: Pick<EntityManager, 'query'>, userId: string, serviceKey: string,
  references: EnrollmentPolicyReference[] | undefined): Promise<PolicyEvidence[]> {
  // Publication takes the exclusive counterpart, including the first document.
  await m.query('SELECT pg_advisory_xact_lock_shared(hashtext($1))', [`service-policy:${serviceKey}`]);
  const docs = await getEnrollmentPolicies(m, serviceKey);
  const refs = references ?? [];
  if (!Array.isArray(refs) || refs.length !== docs.length || docs.some(doc => refs.filter(ref => ref?.documentType === doc.document_type).length !== 1)) {
    throw new PolicyAcceptanceError('ENROLLMENT_POLICY_REQUIRED', '해당 서비스의 현재 약관과 개인정보 안내를 확인해 주세요.', 409);
  }
  const evidence: PolicyEvidence[] = [];
  for (const doc of docs) {
    evidence.push(await recordPublishedPolicyEvidence(m, userId, serviceKey, doc.document_type as 'terms' | 'privacy', refs.find(ref => ref.documentType === doc.document_type)));
  }
  return evidence;
}

/** Append an application-specific audit association, without rewriting old agreements. */
export async function recordEnrollmentApplication(m: Pick<EntityManager, 'query'>, userId: string, serviceKey: string,
  application: { type: string; id: string; resourceId?: string; conditions?: Record<string, unknown> }, policies: PolicyEvidence[]): Promise<void> {
  await m.query(`INSERT INTO action_logs (service_key, user_id, action_key, source, status, meta)
    VALUES ($1, $2, 'service:application_policy', 'manual', 'success', $3::jsonb)`,
  [serviceKey, userId, JSON.stringify({ application, policies })]);
}
