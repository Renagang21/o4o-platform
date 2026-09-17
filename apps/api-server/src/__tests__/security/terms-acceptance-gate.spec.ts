/**
 * Terms Acceptance Gate — 통합 이용약관 acceptance 중앙 게이트 테스트
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §9 · §15 · §18 · §19 · §20 · §22 · §25
 *
 * 검증 대상:
 *   - 순수 판정: pending 계산 · allowlist(method + 정확 경로) · 가입 문서 검증
 *   - 서비스: published terms 0 → acceptance 테이블 미조회(게시 전 안전) · 승낙 검증 순서 · 멱등
 *   - requireAuth 게이트: pending 이면 allowlist 외 428 TERMS_ACCEPTANCE_REQUIRED, 승낙 뒤 통과,
 *     membership 없는 내부 계정은 차단 0, 판정 오류는 fail-open
 *
 * DB 미사용 — AppDataSource.query 를 SQL 접두로 분기하는 스텁으로 대체한다.
 */

import express from 'express';
import request from 'supertest';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const DOC_KPA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DOC_NETURE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DOC_DRAFT = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DOC_PRIVACY = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// ─────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────

let currentUser: any = null;
/** service_policy_documents published terms rows */
let publishedRows: any[] = [];
/** service_memberships rows for USER_ID */
let membershipRows: any[] = [];
/** user_policy_acceptances policy_document_id set for USER_ID */
let acceptedIds: string[] = [];
let queryShouldThrow = false;
const queryLog: string[] = [];

async function fakeQuery(sql: string, params: any[] = []): Promise<any> {
  queryLog.push(sql.replace(/\s+/g, ' ').trim());
  if (queryShouldThrow) throw new Error('db down');
  const q = sql.replace(/\s+/g, ' ');
  if (q.includes('FROM service_policy_documents WHERE id = $1')) {
    return publishedRows.filter((r) => r.id === params[0]);
  }
  if (q.includes('FROM service_policy_documents')) {
    if (q.includes('AND service_key = $2')) return publishedRows.filter((r) => r.service_key === params[1] && r.status === 'published');
    return publishedRows.filter((r) => r.status === 'published');
  }
  if (q.includes('FROM service_memberships')) {
    if (q.includes('AND service_key = $2')) return membershipRows.filter((m) => m.serviceKey === params[1]).map((m) => ({ status: m.status }));
    return membershipRows;
  }
  if (q.includes('FROM user_policy_acceptances')) {
    return acceptedIds.filter((id) => (params[1] as string[]).includes(id)).map((id) => ({ id }));
  }
  if (q.startsWith('INSERT INTO user_policy_acceptances')) {
    const id = params[2];
    if (acceptedIds.includes(id)) return [];
    acceptedIds.push(id);
    return [{ id: 'new-row' }];
  }
  if (q.startsWith('UPDATE users SET tos_accepted_at')) return [];
  throw new Error(`unexpected sql: ${q}`);
}

jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    getRepository: () => ({ findOne: async () => currentUser }),
    query: (sql: string, params?: any[]) => fakeQuery(sql, params),
  },
}));

jest.mock('../../utils/token.utils.js', () => ({
  verifyAccessToken: (token: string) => JSON.parse(Buffer.from(token, 'base64').toString('utf8')),
  isServiceToken: () => false,
}));

import { requireAuth } from '../../common/middleware/auth/authentication.middleware.js';
import {
  TERMS_PENDING_ALLOWLIST,
  checkSignupTermsDocument,
  computePendingPolicyAcceptances,
  isTermsPendingRequestAllowed,
} from '../../common/auth/terms-acceptance.policy.js';
import {
  PolicyAcceptanceError,
  PolicyAcceptanceService,
  computePolicyContentHash,
  policyAcceptanceService,
} from '../../modules/policy-acceptance/policy-acceptance.service.js';
import policyAcceptanceRoutes from '../../modules/policy-acceptance/policy-acceptance.routes.js';

function makeToken(): string {
  return Buffer.from(JSON.stringify({ userId: USER_ID, roles: [], memberships: [] }), 'utf8').toString('base64');
}

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth/policy-acceptances', policyAcceptanceRoutes);
  app.all('/api/v1/*', requireAuth as any, (_req: any, res: any) => res.json({ success: true, reached: true }));
  return app;
}

function publishedDoc(id: string, serviceKey: string, version = 1, content = 'v1 본문') {
  return { id, service_key: serviceKey, document_type: 'terms', version, title: 'O4O 통합 서비스 이용약관', content, status: 'published', published_at: '2026-09-17' };
}

beforeEach(() => {
  currentUser = { id: USER_ID, status: 'active', isActive: true, roles: [], memberships: [] };
  publishedRows = [];
  membershipRows = [];
  acceptedIds = [];
  queryShouldThrow = false;
  queryLog.length = 0;
  policyAcceptanceService.invalidateAll();
});

// ─────────────────────────────────────────────────────
// 순수 판정
// ─────────────────────────────────────────────────────

describe('computePendingPolicyAcceptances (§15 · §22)', () => {
  const published = [
    { id: DOC_KPA, serviceKey: 'kpa-society', documentType: 'terms', version: 1, title: 'T', contentHash: 'h' },
    { id: DOC_NETURE, serviceKey: 'neture', documentType: 'terms', version: 1, title: 'T', contentHash: 'h' },
  ];

  it('active·pending membership 의 published terms 중 미승낙만 pending', () => {
    const pending = computePendingPolicyAcceptances(
      [{ serviceKey: 'kpa-society', status: 'active' }, { serviceKey: 'neture', status: 'pending' }],
      published,
      new Set([DOC_NETURE]),
    );
    expect(pending).toEqual([
      { serviceKey: 'kpa-society', documentType: 'terms', policyDocumentId: DOC_KPA, version: 1, title: 'T' },
    ]);
  });

  it('suspended/rejected/withdrawn membership 은 요구하지 않는다', () => {
    const pending = computePendingPolicyAcceptances(
      [{ serviceKey: 'kpa-society', status: 'suspended' }, { serviceKey: 'neture', status: 'withdrawn' }],
      published,
      new Set(),
    );
    expect(pending).toEqual([]);
  });

  it('published terms 가 없는 서비스는 요구하지 않는다 (§25)', () => {
    expect(computePendingPolicyAcceptances([{ serviceKey: 'k-cosmetics', status: 'active' }], published, new Set())).toEqual([]);
  });

  it('membership 이 없는 계정(내부 관리자)은 pending 0 (§22)', () => {
    expect(computePendingPolicyAcceptances([], published, new Set())).toEqual([]);
  });
});

describe('isTermsPendingRequestAllowed — allowlist (§19)', () => {
  it('약관 조회·승낙·세션 유지 경로는 method 까지 일치할 때만 통과', () => {
    expect(isTermsPendingRequestAllowed('GET', '/api/v1/auth/me')).toBe(true);
    expect(isTermsPendingRequestAllowed('POST', '/api/v1/auth/policy-acceptances')).toBe(true);
    expect(isTermsPendingRequestAllowed('GET', '/api/v1/auth/policy-acceptances?x=1')).toBe(true);
    expect(isTermsPendingRequestAllowed('POST', '/api/v1/auth/logout')).toBe(true);
    expect(isTermsPendingRequestAllowed('DELETE', '/api/v1/auth/me')).toBe(false);
    expect(isTermsPendingRequestAllowed('GET', '/api/v1/kpa/forum/posts')).toBe(false);
    expect(isTermsPendingRequestAllowed('GET', '/api/v1/auth/me/../../kpa/x')).toBe(false);
  });

  it('플랫폼 관리 콘솔 prefix(/api/v1/admin/**)는 pending 이어도 통과 (§22 · role guard 가 별도로 지킨다)', () => {
    expect(isTermsPendingRequestAllowed('GET', '/api/v1/admin/users')).toBe(true);
    expect(isTermsPendingRequestAllowed('PATCH', '/api/v1/admin/services/kpa-society/policies/x/publish')).toBe(true);
    expect(isTermsPendingRequestAllowed('GET', '/api/v1/kpa/operator/approvals')).toBe(false);
    expect(isTermsPendingRequestAllowed('GET', '/api/v1/admin/../kpa/x')).toBe(false);
  });

  it('allowlist 는 /:id 임의 자원 경로를 포함하지 않는다', () => {
    for (const entry of TERMS_PENDING_ALLOWLIST) expect(entry).not.toMatch(/:\w+/);
  });
});

describe('checkSignupTermsDocument (§9)', () => {
  const doc = { id: DOC_KPA, serviceKey: 'kpa-society', documentType: 'terms', version: 2, title: 'T', contentHash: 'h' };
  it('published terms 없음 → not_required (legacy tos 흐름)', () => {
    expect(checkSignupTermsDocument(null, undefined, undefined).kind).toBe('not_required');
  });
  it('id 누락 → missing · 다른 문서/버전 → mismatch · 일치 → ok', () => {
    expect(checkSignupTermsDocument(doc, undefined, undefined).kind).toBe('missing');
    expect(checkSignupTermsDocument(doc, '', undefined).kind).toBe('missing');
    expect(checkSignupTermsDocument(doc, DOC_NETURE, 2).kind).toBe('mismatch');
    expect(checkSignupTermsDocument(doc, DOC_KPA, 1).kind).toBe('mismatch');
    expect(checkSignupTermsDocument(doc, DOC_KPA, '2').kind).toBe('ok');
    expect(checkSignupTermsDocument(doc, DOC_KPA, undefined).kind).toBe('ok');
  });
});

// ─────────────────────────────────────────────────────
// 서비스
// ─────────────────────────────────────────────────────

describe('PolicyAcceptanceService', () => {
  it('published terms 0 이면 acceptance 테이블을 조회하지 않는다 (§25 — migration 전 배포 안전)', async () => {
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    const svc = new PolicyAcceptanceService(() => ({ query: fakeQuery } as any));
    expect(await svc.getPendingForUser(USER_ID)).toEqual([]);
    expect(queryLog.some((q) => q.includes('user_policy_acceptances'))).toBe(false);
    expect(queryLog.some((q) => q.includes('service_memberships'))).toBe(false);
  });

  it('pending 계산 · 승낙 후 pending 해소 · 중복 승낙은 멱등', async () => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    const svc = new PolicyAcceptanceService(() => ({ query: fakeQuery } as any));
    expect(await svc.getPendingForUser(USER_ID)).toHaveLength(1);

    const first = await svc.recordAcceptance({ userId: USER_ID, serviceKey: 'kpa-society', policyDocumentId: DOC_KPA, version: 1 });
    expect(first.created).toBe(true);
    expect(first.document.contentHash).toBe(computePolicyContentHash('v1 본문'));
    expect(queryLog.some((q) => q.startsWith('UPDATE users SET tos_accepted_at'))).toBe(true);

    expect(await svc.getPendingForUser(USER_ID)).toEqual([]);

    const second = await svc.recordAcceptance({ userId: USER_ID, serviceKey: 'kpa-society', policyDocumentId: DOC_KPA });
    expect(second.created).toBe(false);
  });

  it.each([
    ['없는 문서', DOC_NETURE, 'kpa-society', 1, 'POLICY_NOT_FOUND', 404],
    ['draft 문서', DOC_DRAFT, 'kpa-society', 1, 'POLICY_NOT_PUBLISHED', 409],
    ['privacy 문서', DOC_PRIVACY, 'kpa-society', 1, 'POLICY_TYPE_MISMATCH', 409],
    ['다른 서비스 키', DOC_KPA, 'neture', 1, 'POLICY_SERVICE_MISMATCH', 409],
    ['버전 불일치', DOC_KPA, 'kpa-society', 9, 'POLICY_VERSION_MISMATCH', 409],
    ['잘못된 id', 'not-a-uuid', 'kpa-society', 1, 'VALIDATION_ERROR', 400],
  ])('임의 문서 승낙 거부 — %s (§20)', async (_label, docId, serviceKey, version, code, status) => {
    publishedRows = [
      publishedDoc(DOC_KPA, 'kpa-society'),
      { ...publishedDoc(DOC_DRAFT, 'kpa-society', 2), status: 'draft' },
      { ...publishedDoc(DOC_PRIVACY, 'kpa-society'), document_type: 'privacy' },
    ];
    const svc = new PolicyAcceptanceService(() => ({ query: fakeQuery } as any));
    await expect(svc.recordAcceptance({ userId: USER_ID, serviceKey, policyDocumentId: docId, version }))
      .rejects.toMatchObject({ code, httpStatus: status });
    expect(acceptedIds).toEqual([]);
  });

  it('PolicyAcceptanceError 는 code/httpStatus 를 가진다', () => {
    const e = new PolicyAcceptanceError('X', 'msg', 418);
    expect(e.code).toBe('X');
    expect(e.httpStatus).toBe(418);
  });
});

// ─────────────────────────────────────────────────────
// requireAuth 게이트 (§18 · §19)
// ─────────────────────────────────────────────────────

describe('requireAuth 약관 게이트', () => {
  it('published terms 0 → 기존 회원 차단 0 (§25)', async () => {
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    const res = await request(makeApp()).get('/api/v1/kpa/forum/posts').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.reached).toBe(true);
  });

  it('pending → 보호 API 428 TERMS_ACCEPTANCE_REQUIRED + pending 목록, allowlist 는 통과', async () => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    const app = makeApp();
    const auth = `Bearer ${makeToken()}`;

    const denied = await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth);
    expect(denied.status).toBe(428);
    expect(denied.body.code).toBe('TERMS_ACCEPTANCE_REQUIRED');
    expect(denied.body.pendingPolicyAcceptances).toEqual([
      { serviceKey: 'kpa-society', documentType: 'terms', policyDocumentId: DOC_KPA, version: 1, title: 'O4O 통합 서비스 이용약관' },
    ]);
    expect(denied.body.pendingPolicyAcceptances[0]).not.toHaveProperty('content');

    const me = await request(app).get('/api/v1/auth/me').set('Authorization', auth);
    expect(me.status).toBe(200);

    const pendingList = await request(app).get('/api/v1/auth/policy-acceptances').set('Authorization', auth);
    expect(pendingList.status).toBe(200);
    expect(pendingList.body.data.pending).toHaveLength(1);
  });

  it('승낙 제출 → 즉시 통과 (부정 결과는 캐시하지 않는다)', async () => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    const app = makeApp();
    const auth = `Bearer ${makeToken()}`;

    expect((await request(app).get('/api/v1/kpa/x').set('Authorization', auth)).status).toBe(428);

    const accept = await request(app)
      .post('/api/v1/auth/policy-acceptances')
      .set('Authorization', auth)
      .send({ serviceKey: 'kpa-society', policyDocumentId: DOC_KPA, version: 1 });
    expect(accept.status).toBe(200);
    expect(accept.body.data.accepted).toMatchObject({ policyDocumentId: DOC_KPA, version: 1, created: true });
    expect(accept.body.data.pending).toEqual([]);

    expect((await request(app).get('/api/v1/kpa/x').set('Authorization', auth)).status).toBe(200);
  });

  it('membership 이 없는 서비스의 약관은 승낙할 수 없다 (§20)', async () => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    const res = await request(makeApp())
      .post('/api/v1/auth/policy-acceptances')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ serviceKey: 'neture', policyDocumentId: DOC_NETURE });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MEMBERSHIP_NOT_FOUND');
    expect(acceptedIds).toEqual([]);
  });

  it('membership 없는 내부 관리자 계정은 약관이 게시되어도 차단 0 (§22)', async () => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [];
    const res = await request(makeApp()).get('/api/v1/admin/x').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });

  it('판정 DB 오류는 fail-open (인증 hot path 를 500 으로 만들지 않는다)', async () => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    policyAcceptanceService.invalidateAll();
    queryShouldThrow = true;
    const res = await request(makeApp()).get('/api/v1/kpa/x').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });
});
