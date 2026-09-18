/**
 * Policy Acceptance Service — 통합 이용약관 acceptance 이력 (DB 접근 단일 지점)
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §3 · §6 · §9 · §10 · §15 · §20
 *
 * 저장소: `user_policy_acceptances` (migration 으로 생성 · raw SQL 접근 — work_run_coordination 과
 * 같은 패턴, TypeORM entity 미등록으로 ESM boot 위험 회피). 컬럼:
 *   user_id · service_key · policy_document_id · document_type · version · content_hash ·
 *   acceptance_kind · accepted_at · created_at    (unique: user_id + service_key + policy_document_id)
 *
 * 판정 규칙은 common/auth/terms-acceptance.policy.ts (순수) 에 있고, 이 파일은 그 입력을 DB 에서 읽고
 * 승낙을 기록하는 일만 한다.
 *
 * 캐시 (Cloud Run 다중 인스턴스 안전):
 *   - published terms 목록: 60s. 새 버전 게시는 최대 60s 뒤 전 인스턴스에 반영된다.
 *   - 사용자별 "pending 없음" 결과: 60s **긍정 결과만** 캐시한다. pending 인 사용자는 매 요청 DB 를
 *     보므로 다른 인스턴스에서 승낙한 직후에도 즉시 통과한다(부정 결과를 캐시하면 최대 60s 잘못 차단).
 *   - 약관 게시 전(published terms 0)에는 acceptance 테이블을 전혀 조회하지 않는다 → migration 보다
 *     코드가 먼저 배포되어도 안전하다 (WO §25).
 */

import { createHash } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import {
  ACCEPTANCE_KIND_AGREEMENT,
  REQUIRED_MEMBERSHIP_STATUSES,
  REQUIRED_POLICY_DOCUMENT_TYPE,
  computePendingPolicyAcceptances,
  type PendingPolicyAcceptance,
  type PublishedTermsDocument,
} from '../../common/auth/terms-acceptance.policy.js';

type Queryable = Pick<DataSource, 'query'> | Pick<EntityManager, 'query'>;

const PUBLISHED_TTL_MS = 60_000;
const USER_OK_TTL_MS = 60_000;
export const STORE_OWNER_AGREEMENT_DOCUMENT_TYPE = 'store_owner_agreement' as const;
export type MandatoryAgreementDocumentType = typeof REQUIRED_POLICY_DOCUMENT_TYPE | typeof STORE_OWNER_AGREEMENT_DOCUMENT_TYPE;
const MANDATORY_AGREEMENT_TYPES: ReadonlySet<string> = new Set([REQUIRED_POLICY_DOCUMENT_TYPE, STORE_OWNER_AGREEMENT_DOCUMENT_TYPE]);
const STORE_OWNER_ROLE_BY_SERVICE: Readonly<Record<string, string>> = {
  'kpa-society': 'kpa:store_owner',
  'k-cosmetics': 'cosmetics:store_owner',
  'pharmacy-hub': 'pharmacy-hub:store_owner',
};

/** 승낙 당시 본문 동일성 검증용 안정 hash (WO §5). 게시 도구 sha256 과 같은 입력(원문 그대로). */
export function computePolicyContentHash(content: string): string {
  return createHash('sha256').update(content ?? '', 'utf8').digest('hex');
}

export class PolicyAcceptanceError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  constructor(code: string, message: string, httpStatus = 409) {
    super(message);
    this.name = 'PolicyAcceptanceError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

interface PublishedRow {
  id: string;
  service_key: string;
  document_type: string;
  version: number;
  title: string;
  content: string;
}

function toPublished(row: PublishedRow): PublishedTermsDocument {
  return {
    id: row.id,
    serviceKey: row.service_key,
    documentType: row.document_type,
    version: Number(row.version),
    title: row.title,
    contentHash: computePolicyContentHash(row.content),
  };
}

/** 서비스별 최신 published terms 1건 (public API 와 같은 정렬: published_at DESC, version DESC). */
const PUBLISHED_TERMS_SQL = `
  SELECT DISTINCT ON (service_key) id, service_key, document_type, version, title, content
  FROM service_policy_documents
  WHERE document_type = $1 AND status = 'published'
  ORDER BY service_key, published_at DESC NULLS LAST, version DESC`;

export class PolicyAcceptanceService {
  private publishedCache: { at: number; docs: PublishedTermsDocument[] } | null = null;
  private readonly publishedAgreementCache = new Map<string, { at: number; docs: PublishedTermsDocument[] }>();
  private readonly userOkCache = new Map<string, number>();

  constructor(private readonly db: () => Queryable = () => AppDataSource) {}

  /** 테스트·게시 직후 강제 갱신. */
  invalidateAll(): void {
    this.publishedCache = null;
    this.publishedAgreementCache.clear();
    this.userOkCache.clear();
  }

  invalidateUser(userId: string): void {
    this.userOkCache.delete(userId);
  }

  async listPublishedTerms(force = false): Promise<PublishedTermsDocument[]> {
    const now = Date.now();
    if (!force && this.publishedCache && now - this.publishedCache.at < PUBLISHED_TTL_MS) {
      return this.publishedCache.docs;
    }
    const rows = (await this.db().query(PUBLISHED_TERMS_SQL, [REQUIRED_POLICY_DOCUMENT_TYPE])) as PublishedRow[];
    const docs = rows.map(toPublished);
    this.publishedCache = { at: now, docs };
    return docs;
  }

  /** 특정 서비스의 현재 published terms (없으면 null). 가입 검증은 항상 DB 를 다시 읽는다. */
  async getPublishedTermsForService(serviceKey: string, q: Queryable = this.db()): Promise<PublishedTermsDocument | null> {
    const rows = (await q.query(
      `${PUBLISHED_TERMS_SQL.replace('WHERE document_type = $1', 'WHERE document_type = $1 AND service_key = $2')}`,
      [REQUIRED_POLICY_DOCUMENT_TYPE, serviceKey],
    )) as PublishedRow[];
    return rows[0] ? toPublished(rows[0]) : null;
  }

  /** 서비스별 현재 published mandatory agreement. terms 외 계약도 같은 검증 계약을 쓴다. */
  async getPublishedAgreementForService(
    serviceKey: string,
    documentType: MandatoryAgreementDocumentType,
    q: Queryable = this.db(),
  ): Promise<PublishedTermsDocument | null> {
    if (documentType === REQUIRED_POLICY_DOCUMENT_TYPE) return this.getPublishedTermsForService(serviceKey, q);
    const rows = (await q.query(
      `${PUBLISHED_TERMS_SQL.replace('WHERE document_type = $1', 'WHERE document_type = $1 AND service_key = $2')}`,
      [documentType, serviceKey],
    )) as PublishedRow[];
    return rows[0] ? toPublished(rows[0]) : null;
  }

  /** store_owner role + active membership 를 모두 가진 서비스 중 미승낙 매장계약 목록. */
  async getPendingStoreOwnerAgreementsForUser(
    userId: string,
    serviceKey?: string,
    q: Queryable = this.db(),
  ): Promise<PendingPolicyAcceptance[]> {
    if (!userId) return [];
    const now = Date.now();
    let cached = this.publishedAgreementCache.get(STORE_OWNER_AGREEMENT_DOCUMENT_TYPE);
    if (!cached || now - cached.at >= PUBLISHED_TTL_MS) {
      // 호출자가 준 Queryable 을 쓴다 — isStoreOwner(dataSource) 의 DataSource 주입 계약을 따른다.
      const rows = ((await q.query(PUBLISHED_TERMS_SQL, [STORE_OWNER_AGREEMENT_DOCUMENT_TYPE])) ?? []) as PublishedRow[];
      cached = { at: now, docs: rows.map(toPublished) };
      this.publishedAgreementCache.set(STORE_OWNER_AGREEMENT_DOCUMENT_TYPE, cached);
    }
    let published = cached.docs;
    if (serviceKey) published = published.filter((d) => d.serviceKey === serviceKey);
    if (published.length === 0) return [];

    const memberships = (await q.query(
      `SELECT service_key AS "serviceKey", status FROM service_memberships
       WHERE user_id = $1 AND status = 'active'`,
      [userId],
    )) as { serviceKey: string; status: string }[];
    const activeServices = new Set(memberships.map((m) => m.serviceKey));
    const roles = (await q.query(
      `SELECT role FROM role_assignments WHERE user_id = $1 AND is_active = true`,
      [userId],
    )) as { role: string }[];
    const activeRoles = new Set(roles.map((r) => r.role));

    const required = published.filter((doc) => {
      const role = STORE_OWNER_ROLE_BY_SERVICE[doc.serviceKey];
      return !!role && activeServices.has(doc.serviceKey) && activeRoles.has(role);
    });
    if (required.length === 0) return [];

    const ids = required.map((d) => d.id);
    const acceptedRows = (await q.query(
      `SELECT policy_document_id AS id FROM user_policy_acceptances
       WHERE user_id = $1 AND policy_document_id = ANY($2::uuid[])`,
      [userId, ids],
    )) as { id: string }[];
    const accepted = new Set(acceptedRows.map((r) => r.id));
    return required
      .filter((doc) => !accepted.has(doc.id))
      .map((doc) => ({
        serviceKey: doc.serviceKey,
        documentType: doc.documentType,
        policyDocumentId: doc.id,
        version: doc.version,
        title: doc.title,
      }));
  }

  /** 사용자의 pending 목록 (WO §15 · §16). published terms 0 → 즉시 [] (테이블 미조회). */
  async getPendingForUser(userId: string): Promise<PendingPolicyAcceptance[]> {
    if (!userId) return [];
    const published = await this.listPublishedTerms();
    if (published.length === 0) return [];

    const okAt = this.userOkCache.get(userId);
    if (okAt !== undefined && Date.now() - okAt < USER_OK_TTL_MS) return [];

    const q = this.db();
    const memberships = (await q.query(
      `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
      [userId],
    )) as { serviceKey: string; status: string }[];
    const relevant = memberships.filter((m) => REQUIRED_MEMBERSHIP_STATUSES.has(m.status));
    if (relevant.length === 0) {
      this.userOkCache.set(userId, Date.now());
      return [];
    }

    const requiredIds = published
      .filter((d) => relevant.some((m) => m.serviceKey === d.serviceKey))
      .map((d) => d.id);
    let acceptedIds = new Set<string>();
    if (requiredIds.length > 0) {
      const rows = (await q.query(
        `SELECT policy_document_id AS id FROM user_policy_acceptances
         WHERE user_id = $1 AND policy_document_id = ANY($2::uuid[])`,
        [userId, requiredIds],
      )) as { id: string }[];
      acceptedIds = new Set(rows.map((r) => r.id));
    }

    const pending = computePendingPolicyAcceptances(relevant, published, acceptedIds);
    if (pending.length === 0) this.userOkCache.set(userId, Date.now());
    return pending;
  }

  /**
   * 승낙 기록 (WO §10 · §20). 호출측이 트랜잭션 manager 를 넘기면 그 안에서 실행된다.
   *
   * 검증: 문서 존재 · document_type=terms · status=published · service_key 일치 · (버전 일치).
   * 클라이언트 값(serviceKey/version)은 문서 row 로 재검증한다 — 임의 문서 승낙 불가.
   * 이미 같은 문서를 승낙했으면 멱등(중복 row 없음, WO §4 unique).
   */
  async recordAcceptance(
    input: { userId: string; serviceKey: string; policyDocumentId: string; version?: number | null; documentType?: MandatoryAgreementDocumentType },
    q: Queryable = this.db(),
  ): Promise<{ created: boolean; document: PublishedTermsDocument }> {
    const documentType = input.documentType ?? REQUIRED_POLICY_DOCUMENT_TYPE;
    if (!MANDATORY_AGREEMENT_TYPES.has(documentType)) {
      throw new PolicyAcceptanceError('POLICY_TYPE_NOT_ALLOWED', '승낙할 수 없는 문서 유형입니다.', 400);
    }
    const { userId, serviceKey, policyDocumentId } = input;
    if (!userId) throw new PolicyAcceptanceError('AUTH_REQUIRED', '인증이 필요합니다.', 401);
    if (typeof policyDocumentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(policyDocumentId)) {
      throw new PolicyAcceptanceError('VALIDATION_ERROR', 'policyDocumentId 가 필요합니다.', 400);
    }
    if (typeof serviceKey !== 'string' || serviceKey.length === 0) {
      throw new PolicyAcceptanceError('VALIDATION_ERROR', 'serviceKey 가 필요합니다.', 400);
    }

    const rows = (await q.query(
      `SELECT id, service_key, document_type, version, title, content, status
       FROM service_policy_documents WHERE id = $1`,
      [policyDocumentId],
    )) as (PublishedRow & { status: string })[];
    const row = rows[0];
    if (!row) throw new PolicyAcceptanceError('POLICY_NOT_FOUND', '약관 문서를 찾을 수 없습니다.', 404);
    if (row.document_type !== documentType) {
      throw new PolicyAcceptanceError('POLICY_TYPE_MISMATCH', '요청한 계약 문서 유형과 일치하지 않습니다.', 409);
    }
    if (row.status !== 'published') {
      throw new PolicyAcceptanceError('POLICY_NOT_PUBLISHED', '게시 중인 약관만 승낙할 수 있습니다.', 409);
    }
    if (row.service_key !== serviceKey) {
      throw new PolicyAcceptanceError('POLICY_SERVICE_MISMATCH', '서비스와 약관 문서가 일치하지 않습니다.', 409);
    }
    // 같은 서비스의 "현재 적용 약관" 이어야 한다 (구 published 는 publish 시 draft 로 내려가므로
    // status 검사로 대부분 걸러지지만, 정렬 기준으로 한 번 더 확정한다).
    const current = await this.getPublishedAgreementForService(serviceKey, documentType, q);
    if (!current || current.id !== row.id) {
      throw new PolicyAcceptanceError('POLICY_NOT_CURRENT', '현재 적용 중인 약관이 아닙니다.', 409);
    }
    if (input.version !== undefined && input.version !== null && Number(input.version) !== Number(row.version)) {
      throw new PolicyAcceptanceError('POLICY_VERSION_MISMATCH', '약관 버전이 일치하지 않습니다.', 409);
    }

    const document = toPublished(row);
    const inserted = (await q.query(
      `INSERT INTO user_policy_acceptances
         (user_id, service_key, policy_document_id, document_type, version, content_hash, acceptance_kind, accepted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id, service_key, policy_document_id) DO NOTHING
       RETURNING id`,
      [userId, serviceKey, row.id, row.document_type, row.version, document.contentHash, ACCEPTANCE_KIND_AGREEMENT],
    )) as { id: string }[];
    const created = inserted.length > 0;
    if (created && documentType === REQUIRED_POLICY_DOCUMENT_TYPE) {
      // terms 전용 legacy snapshot. 매장 경영자 계약 acceptance 로 tos_accepted_at 을 오염시키지 않는다.
      await q.query(`UPDATE users SET tos_accepted_at = NOW() WHERE id = $1`, [userId]);
    }
    this.invalidateUser(userId);
    return { created, document };
  }
}

export const policyAcceptanceService = new PolicyAcceptanceService();
