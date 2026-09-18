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
import {
  STORE_OWNER_AGREEMENT_DOCUMENT_TYPE,
  STORE_OWNER_AGREEMENT_SERVICE_KEYS,
  STORE_OWNER_ROLE_BY_SERVICE,
} from '../../common/auth/store-owner-agreement.policy.js';

type Queryable = Pick<DataSource, 'query'> | Pick<EntityManager, 'query'>;

const PUBLISHED_TTL_MS = 60_000;
const USER_OK_TTL_MS = 60_000;

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
  private readonly userOkCache = new Map<string, number>();

  constructor(private readonly db: () => Queryable = () => AppDataSource) {}

  /** 테스트·게시 직후 강제 갱신. */
  invalidateAll(): void {
    this.publishedCache = null;
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

  /** 특정 서비스의 현재 published 문서 1건. 가입/승낙 검증은 항상 DB 를 다시 읽는다. */
  async getPublishedDocumentForService(
    serviceKey: string,
    documentType: string,
    q: Queryable = this.db(),
  ): Promise<PublishedTermsDocument | null> {
    const rows = (await q.query(
      `${PUBLISHED_TERMS_SQL.replace('WHERE document_type = $1', 'WHERE document_type = $1 AND service_key = $2')}`,
      [documentType, serviceKey],
    )) as PublishedRow[];
    return rows[0] ? toPublished(rows[0]) : null;
  }

  /** 기존 terms 전용 공개 계약 유지. */
  async getPublishedTermsForService(serviceKey: string, q: Queryable = this.db()): Promise<PublishedTermsDocument | null> {
    return this.getPublishedDocumentForService(serviceKey, REQUIRED_POLICY_DOCUMENT_TYPE, q);
  }

  /**
   * 현재 사용자가 반드시 동의해야 할 store_owner_agreement 목록.
   * published 문서가 없으면 [] — 코드 선배포 시 기존 Store Workspace 접근을 차단하지 않는다.
   */
  async getPendingStoreOwnerAgreements(
    userId: string,
    serviceKey?: string,
  ): Promise<PendingPolicyAcceptance[]> {
    if (!userId) return [];
    const targetKeys = serviceKey
      ? (STORE_OWNER_AGREEMENT_SERVICE_KEYS.includes(serviceKey) ? [serviceKey] : [])
      : [...STORE_OWNER_AGREEMENT_SERVICE_KEYS];
    if (targetKeys.length === 0) return [];

    const q = this.db();
    const docs: PublishedTermsDocument[] = [];
    for (const key of targetKeys) {
      const doc = await this.getPublishedDocumentForService(key, STORE_OWNER_AGREEMENT_DOCUMENT_TYPE, q);
      if (doc) docs.push(doc);
    }
    if (docs.length === 0) return [];

    // store_owner 계약은 active membership + 해당 서비스 store_owner role 을 모두 가진 사용자만 요구한다.
    const memberships = (await q.query(
      `SELECT sm.service_key AS "serviceKey"
         FROM service_memberships sm
        WHERE sm.user_id = $1
          AND sm.status = 'active'
          AND sm.service_key = ANY($2::text[])`,
      [userId, targetKeys],
    )) as { serviceKey: string }[];
    if (memberships.length === 0) return [];

    const roleRows = (await q.query(
      `SELECT role FROM role_assignments
        WHERE user_id = $1 AND is_active = true
          AND role = ANY($2::text[])`,
      [userId, memberships.map((m) => STORE_OWNER_ROLE_BY_SERVICE[m.serviceKey]).filter(Boolean)],
    )) as { role: string }[];
    const activeRoles = new Set(roleRows.map((r) => r.role));
    const applicable = docs.filter((doc) => {
      const membership = memberships.some((m) => m.serviceKey === doc.serviceKey);
      const role = STORE_OWNER_ROLE_BY_SERVICE[doc.serviceKey];
      return membership && !!role && activeRoles.has(role);
    });
    if (applicable.length === 0) return [];

    const rows = (await q.query(
      `SELECT policy_document_id AS id FROM user_policy_acceptances
        WHERE user_id = $1
          AND policy_document_id = ANY($2::uuid[])`,
      [userId, applicable.map((d) => d.id)],
    )) as { id: string }[];
    const acceptedIds = new Set(rows.map((r) => r.id));

    return applicable
      .filter((doc) => !acceptedIds.has(doc.id))
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
  async recordRequiredAgreement(
    input: {
      userId: string;
      serviceKey: string;
      policyDocumentId: string;
      documentType: string;
      version?: number | null;
    },
    q: Queryable = this.db(),
  ): Promise<{ created: boolean; document: PublishedTermsDocument }> {
    const { userId, serviceKey, policyDocumentId, documentType } = input;
    if (!userId) throw new PolicyAcceptanceError('AUTH_REQUIRED', '인증이 필요합니다.', 401);
    if (![REQUIRED_POLICY_DOCUMENT_TYPE, STORE_OWNER_AGREEMENT_DOCUMENT_TYPE].includes(documentType)) {
      throw new PolicyAcceptanceError('POLICY_TYPE_NOT_ALLOWED', '승낙할 수 없는 정책 문서 유형입니다.', 400);
    }
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
    if (!row) throw new PolicyAcceptanceError('POLICY_NOT_FOUND', '정책 문서를 찾을 수 없습니다.', 404);
    if (row.document_type !== documentType) {
      throw new PolicyAcceptanceError('POLICY_TYPE_MISMATCH', '정책 문서 유형이 일치하지 않습니다.', 409);
    }
    if (row.status !== 'published') {
      throw new PolicyAcceptanceError('POLICY_NOT_PUBLISHED', '게시 중인 문서만 승낙할 수 있습니다.', 409);
    }
    if (row.service_key !== serviceKey) {
      throw new PolicyAcceptanceError('POLICY_SERVICE_MISMATCH', '서비스와 정책 문서가 일치하지 않습니다.', 409);
    }

    const current = await this.getPublishedDocumentForService(serviceKey, documentType, q);
    if (!current || current.id !== row.id) {
      throw new PolicyAcceptanceError('POLICY_NOT_CURRENT', '현재 적용 중인 문서가 아닙니다.', 409);
    }
    if (input.version !== undefined && input.version !== null && Number(input.version) !== Number(row.version)) {
      throw new PolicyAcceptanceError('POLICY_VERSION_MISMATCH', '문서 버전이 일치하지 않습니다.', 409);
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

    // legacy snapshot 은 통합 이용약관에만 해당한다. 매장 경영자 계약 동의로 tos_accepted_at 을 바꾸지 않는다.
    if (created && documentType === REQUIRED_POLICY_DOCUMENT_TYPE) {
      await q.query(`UPDATE users SET tos_accepted_at = NOW() WHERE id = $1`, [userId]);
      this.invalidateUser(userId);
    }
    return { created, document };
  }

  /** 기존 terms API 계약 유지. */
  async recordAcceptance(
    input: { userId: string; serviceKey: string; policyDocumentId: string; version?: number | null },
    q: Queryable = this.db(),
  ): Promise<{ created: boolean; document: PublishedTermsDocument }> {
    return this.recordRequiredAgreement(
      { ...input, documentType: REQUIRED_POLICY_DOCUMENT_TYPE },
      q,
    );
  }

}

export const policyAcceptanceService = new PolicyAcceptanceService();
