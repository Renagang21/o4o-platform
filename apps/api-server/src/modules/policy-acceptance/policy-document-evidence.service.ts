import type { DataSource, EntityManager } from 'typeorm';
import { computePolicyContentHash, PolicyAcceptanceError } from './policy-acceptance.service.js';

type Queryable = Pick<DataSource, 'query'> | Pick<EntityManager, 'query'>;
export interface PolicyReference { policyDocumentId: string; version: number }
export interface CurrentPolicyDocument {
  id: string; service_key: string; document_type: string; version: number; title: string; content: string; slug?: string | null;
}
export interface PolicyEvidence extends PolicyReference {
  serviceKey: string; documentType: string; contentHash: string; acceptanceKind: 'agreement' | 'acknowledgement';
}

export async function readCurrentPolicyDocument(q: Queryable, serviceKey: string, documentType: 'terms' | 'privacy', lock = false): Promise<CurrentPolicyDocument | null> {
  const rows = await q.query(`SELECT id, service_key, document_type, version, title, content, slug
    FROM service_policy_documents WHERE service_key = $1 AND document_type = $2 AND status = 'published'
    ORDER BY published_at DESC NULLS LAST, version DESC LIMIT 1${lock ? ' FOR SHARE' : ''}`, [serviceKey, documentType]);
  return rows[0] ?? null;
}

/** Use the application's own transaction. No acknowledgement is inferred from historic checkbox timestamps. */
export async function recordPublishedPolicyEvidence(m: Pick<EntityManager, 'query'>, userId: string, serviceKey: string,
  documentType: 'terms' | 'privacy', reference: PolicyReference | undefined): Promise<PolicyEvidence> {
  if (!reference || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference.policyDocumentId)
    || !Number.isInteger(reference.version) || reference.version < 1) {
    throw new PolicyAcceptanceError('POLICY_ACCEPTANCE_REQUIRED', '현재 정책 문서를 확인해 주세요.', 400);
  }
  const doc = await readCurrentPolicyDocument(m, serviceKey, documentType, true);
  if (!doc) throw new PolicyAcceptanceError('POLICY_UNAVAILABLE', '정책 문서를 불러올 수 없습니다.', 503);
  if ([doc.title, doc.content].some(value => typeof value !== 'string' || !value.trim())) {
    throw new PolicyAcceptanceError('POLICY_UNAVAILABLE', '정책 문서를 불러올 수 없습니다.', 503);
  }
  if (doc.id !== reference.policyDocumentId || Number(doc.version) !== reference.version) {
    throw new PolicyAcceptanceError('POLICY_VERSION_MISMATCH', '정책 문서가 변경되었습니다. 다시 확인해 주세요.', 409);
  }
  const evidence: PolicyEvidence = { serviceKey, documentType, policyDocumentId: doc.id, version: Number(doc.version),
    contentHash: computePolicyContentHash(doc.content), acceptanceKind: documentType === 'privacy' ? 'acknowledgement' : 'agreement' };
  await m.query(`INSERT INTO user_policy_acceptances
    (user_id, service_key, policy_document_id, document_type, version, content_hash, acceptance_kind, accepted_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()) ON CONFLICT (user_id, service_key, policy_document_id) DO NOTHING`,
  [userId, serviceKey, doc.id, documentType, evidence.version, evidence.contentHash, evidence.acceptanceKind]);
  return evidence;
}
