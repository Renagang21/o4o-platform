/**
 * Terms Acceptance — 격리 PostgreSQL 실 SQL 검증
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §4 · §15 · §20 · §26
 *
 * `O4O_ISOLATED_PG_URL` 이 있을 때만 실행된다(bootstrap + incremental 이 적용된 격리 DB — migrate.ts 로 준비).
 * jest 스텁(terms-acceptance-gate.spec)이 보지 못하는 것을 본다: DISTINCT ON 정렬 · ANY($2::uuid[]) ·
 * ON CONFLICT 멱등 · unique/FK 제약 · 새 버전 게시 후 pending 재발생. 모든 write 는 트랜잭션 안에서 ROLLBACK.
 */

jest.mock('../../database/connection.js', () => ({ AppDataSource: { isInitialized: false } }));

import { Client } from 'pg';
import {
  PolicyAcceptanceService,
  computePolicyContentHash,
} from '../../modules/policy-acceptance/policy-acceptance.service.js';

const isolatedUrl = process.env.O4O_ISOLATED_PG_URL;
const describeIsolated = isolatedUrl ? describe : describe.skip;

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

describeIsolated('user_policy_acceptances — 격리 PG 실 SQL', () => {
  let client: Client;
  let svc: PolicyAcceptanceService;
  const q = { query: async (sql: string, params?: unknown[]) => (await client.query(sql, params as never)).rows };

  const insertDoc = async (sk: string, type: string, version: number, status: string, content: string): Promise<string> => {
    const r = await client.query(
      `INSERT INTO service_policy_documents (service_key, document_type, title, content, version, status, published_at)
       VALUES ($1,$2,'O4O 통합 서비스 이용약관',$3,$4,$5::varchar, CASE WHEN $5::varchar='published' THEN NOW() ELSE NULL END) RETURNING id`,
      [sk, type, content, version, status],
    );
    return r.rows[0].id as string;
  };

  beforeAll(async () => {
    client = new Client({ connectionString: isolatedUrl });
    await client.connect();
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, email, password, name, status, "isActive")
       VALUES ($1,'terms-t1@example.test','h','t1','active',true),($2,'terms-t2@example.test','h','t2','active',true)`,
      [U1, U2],
    );
    await client.query(
      `INSERT INTO service_memberships (user_id, service_key, status, role) VALUES
       ($1,'kpa-society','active','member'),($1,'neture','pending','member'),($1,'k-cosmetics','suspended','member'),
       ($2,'kpa-society','active','member')`,
      [U1, U2],
    );
    svc = new PolicyAcceptanceService(() => q);
  });

  afterAll(async () => {
    try { await client.query('ROLLBACK'); } finally { await client.end(); }
  });

  it('게시 전: pending [] · acceptance 테이블 미조회', async () => {
    expect(await svc.getPendingForUser(U1)).toEqual([]);
  });

  it('published 최신 1건/서비스 · membership 상태별 pending · 거부 케이스 · 승낙 멱등 · 새 버전 재발생 · FK', async () => {
    const kpaOld = await insertDoc('kpa-society', 'terms', 1, 'draft', 'old');
    const kpa = await insertDoc('kpa-society', 'terms', 2, 'published', 'v2 본문');
    const neture = await insertDoc('neture', 'terms', 1, 'published', 'v1 본문');
    await insertDoc('k-cosmetics', 'terms', 1, 'published', 'v1 본문');
    const privacy = await insertDoc('kpa-society', 'privacy', 1, 'published', 'privacy');
    svc.invalidateAll();

    const published = await svc.listPublishedTerms(true);
    expect(published.map((d) => d.serviceKey).sort()).toEqual(['k-cosmetics', 'kpa-society', 'neture']);
    expect(published.find((d) => d.serviceKey === 'kpa-society')?.id).toBe(kpa);

    const pending = await svc.getPendingForUser(U1);
    expect(pending.map((p) => p.serviceKey).sort()).toEqual(['kpa-society', 'neture']); // suspended 제외

    await expect(svc.recordAcceptance({ userId: U1, serviceKey: 'kpa-society', policyDocumentId: kpaOld })).rejects.toMatchObject({ code: 'POLICY_NOT_PUBLISHED' });
    await expect(svc.recordAcceptance({ userId: U1, serviceKey: 'kpa-society', policyDocumentId: privacy })).rejects.toMatchObject({ code: 'POLICY_TYPE_MISMATCH' });
    await expect(svc.recordAcceptance({ userId: U1, serviceKey: 'neture', policyDocumentId: kpa })).rejects.toMatchObject({ code: 'POLICY_SERVICE_MISMATCH' });
    await expect(svc.recordAcceptance({ userId: U1, serviceKey: 'kpa-society', policyDocumentId: '99999999-9999-4999-8999-999999999999' })).rejects.toMatchObject({ code: 'POLICY_NOT_FOUND' });
    await expect(svc.recordAcceptance({ userId: U1, serviceKey: 'kpa-society', policyDocumentId: kpa, version: 1 })).rejects.toMatchObject({ code: 'POLICY_VERSION_MISMATCH' });

    const first = await svc.recordAcceptance({ userId: U1, serviceKey: 'kpa-society', policyDocumentId: kpa, version: 2 });
    expect(first.created).toBe(true);
    const again = await svc.recordAcceptance({ userId: U1, serviceKey: 'kpa-society', policyDocumentId: kpa });
    expect(again.created).toBe(false);

    const rows = await q.query(`SELECT service_key, version, content_hash, acceptance_kind FROM user_policy_acceptances WHERE user_id=$1`, [U1]);
    expect(rows).toEqual([{ service_key: 'kpa-society', version: 2, content_hash: computePolicyContentHash('v2 본문'), acceptance_kind: 'agreement' }]);
    const tos = await q.query(`SELECT tos_accepted_at FROM users WHERE id=$1`, [U1]);
    expect(tos[0].tos_accepted_at).toBeTruthy();

    expect((await svc.getPendingForUser(U1)).map((p) => p.serviceKey)).toEqual(['neture']);
    await svc.recordAcceptance({ userId: U1, serviceKey: 'neture', policyDocumentId: neture });
    expect(await svc.getPendingForUser(U1)).toEqual([]);
    expect(await svc.getPendingForUser(U2)).toHaveLength(1);

    // 새 버전 게시(구 published → draft) → 다시 pending
    const kpa3 = await insertDoc('kpa-society', 'terms', 3, 'published', 'v3 본문');
    await client.query(`UPDATE service_policy_documents SET status='draft' WHERE id=$1`, [kpa]);
    svc.invalidateAll();
    const p3 = await svc.getPendingForUser(U1);
    expect(p3).toHaveLength(1);
    expect(p3[0]).toMatchObject({ policyDocumentId: kpa3, version: 3 });
    // 구 published 문서를 다시 승낙하려 하면 현재 적용 약관이 아니다
    await expect(svc.recordAcceptance({ userId: U1, serviceKey: 'kpa-society', policyDocumentId: kpa })).rejects.toMatchObject({ code: 'POLICY_NOT_PUBLISHED' });

    // FK RESTRICT: 승낙된 문서·사용자 물리 삭제 차단
    await client.query('SAVEPOINT fk1');
    await expect(client.query(`DELETE FROM service_policy_documents WHERE id=$1`, [neture])).rejects.toBeTruthy();
    await client.query('ROLLBACK TO SAVEPOINT fk1');
    await client.query('SAVEPOINT fk2');
    await expect(client.query(`DELETE FROM users WHERE id=$1`, [U1])).rejects.toBeTruthy();
    await client.query('ROLLBACK TO SAVEPOINT fk2');
  });
});
