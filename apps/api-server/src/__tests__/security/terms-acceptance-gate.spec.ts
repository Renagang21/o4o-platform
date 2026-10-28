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

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
let supplierCandidateRows: any[] = [];
let legacySupplierRows: any[] = [];
let semiFranchiseRows: any[] = [];
/** user_policy_acceptances policy_document_id set for USER_ID */
let acceptedIds: string[] = [];
let queryShouldThrow = false;
/** demo_accounts 활성 user_id 목록 · 조회 실패 스위치 */
let demoUserIds: string[] = [];
let demoQueryShouldThrow = false;
/** 내 매장(약국) 신청 원장 active 조직의 owner/admin/manager 여부 · active role_assignments */
let ledgerStoreOwner = false;
let activeRoles: string[] = [];
const queryLog: string[] = [];

async function fakeQuery(sql: string, params: any[] = []): Promise<any> {
  queryLog.push(sql.replace(/\s+/g, ' ').trim());
  if (queryShouldThrow) throw new Error('db down');
  const q = sql.replace(/\s+/g, ' ');
  if (q.includes('policy_dynamic_relation')) return [{ related: supplierCandidateRows.length > 0 || legacySupplierRows.length > 0 || semiFranchiseRows.length > 0 || ledgerStoreOwner }];
  if (q.includes('FROM demo_accounts')) {
    if (demoQueryShouldThrow) throw new Error('demo registry down');
    return demoUserIds.includes(params[0]) ? [{ '?column?': 1 }] : [];
  }
  if (q.includes('FROM service_policy_documents WHERE id = $1')) {
    return publishedRows.filter((r) => r.id === params[0]);
  }
  if (q.includes('FROM service_policy_documents')) {
    const ofType = (r: any) => r.status === 'published' && r.document_type === params[0];
    if (q.includes('AND service_key = $2')) return publishedRows.filter((r) => ofType(r) && r.service_key === params[1]);
    return publishedRows.filter(ofType);
  }
  // This agreement fixture is a manually verified pharmacy owner; qualification denial is tested separately.
  if (q.includes('FROM kpa_pharmacist_profiles') && q.includes('AS approved')) return [{ approved: true }];
  if (q.includes('FROM neture_pharmacy_memberships')) return ledgerStoreOwner ? [{ '?column?': 1 }] : [];
  if (q.includes('LEFT JOIN semi_franchises')) return semiFranchiseRows;
  if (q.includes('JOIN neture_suppliers s')) return supplierCandidateRows;
  if (q.includes('FROM neture_suppliers WHERE user_id')) return legacySupplierRows;
  // isStoreOwner('kpa') → resolveStoreOrganization 의 원장 기반 매장 후보
  if (q.includes('JOIN neture_pharmacy_memberships')) return ledgerStoreOwner ? [{ organization_id: 'org-pharmacy', role: 'owner' }] : [];
  if (q.includes('FROM role_assignments')) {
    if (q.includes('AND role = $2')) return activeRoles.includes(params[1]) ? [{ '?column?': 1 }] : [];
    return activeRoles.map((role) => ({ role }));
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
    // Session persistence is separate from the terms-query failure injection.
    manager: { query: async () => [{ live: 1 }] },
    getRepository: () => ({ findOne: async () => currentUser }),
    query: (sql: string, params?: any[]) => fakeQuery(sql, params),
  },
}));

jest.mock('../../utils/token.utils.js', () => ({
  verifyAccessToken: (token: string) => JSON.parse(Buffer.from(token, 'base64').toString('utf8')),
  isServiceToken: () => false,
}));

jest.mock('../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { getRoleNames: jest.fn(async () => activeRoles) },
}));

import { requireAuth } from '../../common/middleware/auth/authentication.middleware.js';
import {
  TERMS_PENDING_ALLOWLIST,
  checkSignupTermsDocument,
  computePendingPolicyAcceptances,
  isTermsPendingRequestAllowed,
  selectPendingPoliciesForRequest,
} from '../../common/auth/terms-acceptance.policy.js';
import {
  PolicyAcceptanceError,
  PolicyAcceptanceService,
  computePolicyContentHash,
  policyAcceptanceService,
} from '../../modules/policy-acceptance/policy-acceptance.service.js';
import policyAcceptanceRoutes from '../../modules/policy-acceptance/policy-acceptance.routes.js';
import { createRequireStoreOwner } from '../../utils/store-owner.utils.js';

function makeToken(serviceKey = 'neture', authMethod?: string, roles: string[] = []): string {
  return Buffer.from(JSON.stringify({ userId: USER_ID, roles, memberships: [], serviceKey, authMethod, sessionId: '33333333-3333-4333-8333-333333333333', tokenFamily: 'user-family' }), 'utf8').toString('base64');
}

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth/policy-acceptances', policyAcceptanceRoutes);
  app.all('/api/*', requireAuth as any, (_req: any, res: any) => res.json({ success: true, reached: true }));
  return app;
}

function publishedDoc(id: string, serviceKey: string, version = serviceKey === 'neture' ? 2 : 1, content = 'v1 본문') {
  return { id, service_key: serviceKey, document_type: 'terms', version, slug: serviceKey === 'neture' ? 'neture-account-terms' : null, title: 'O4O 통합 서비스 이용약관', content, status: 'published', published_at: '2026-09-17' };
}

beforeEach(() => {
  currentUser = { id: USER_ID, status: 'active', isActive: true, roles: [], memberships: [], refreshTokenFamily: 'user-family' };
  publishedRows = [];
  membershipRows = [];
  supplierCandidateRows = [];
  legacySupplierRows = [];
  semiFranchiseRows = [];
  acceptedIds = [];
  queryShouldThrow = false;
  demoUserIds = [];
  demoQueryShouldThrow = false;
  ledgerStoreOwner = false;
  activeRoles = [];
  queryLog.length = 0;
  policyAcceptanceService.invalidateAll();
});

// ─────────────────────────────────────────────────────
// 순수 판정
// ─────────────────────────────────────────────────────

describe('computePendingPolicyAcceptances (§15 · §22)', () => {
  const published = [
    { id: DOC_KPA, serviceKey: 'kpa-society', documentType: 'terms', version: 1, title: 'T', contentHash: 'h' },
    { id: DOC_NETURE, serviceKey: 'neture', documentType: 'terms', version: 2, slug: 'neture-account-terms', title: 'T', contentHash: 'h' },
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
      new Set([DOC_NETURE]),
    );
    expect(pending).toEqual([]);
  });

  it('published terms 가 없는 서비스는 요구하지 않는다 (§25)', () => {
    expect(computePendingPolicyAcceptances([{ serviceKey: 'k-cosmetics', status: 'active' }], published, new Set([DOC_NETURE]))).toEqual([]);
  });

  it('membership 없는 정상 계정도 공통 약관을 요구한다; 내부 관리 업무 경로는 별도 면제', () => {
    expect(computePendingPolicyAcceptances([], published, new Set()).map(p => p.policyDocumentId)).toEqual([DOC_NETURE]);
    expect(computePendingPolicyAcceptances([], published, new Set([DOC_NETURE]))).toEqual([]);
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
    const auth = `Bearer ${makeToken('kpa-society')}`;

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
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [];
    const res = await request(makeApp())
      .post('/api/v1/auth/policy-acceptances')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ serviceKey: 'kpa-society', policyDocumentId: DOC_KPA });
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

  it('약관 판정 DB 오류는 fail-open (세션 검증 성공 후)', async () => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    policyAcceptanceService.invalidateAll();
    queryShouldThrow = true;
    const res = await request(makeApp()).get('/api/v1/kpa/x').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────
// 매장 경영자 계약 — 요구 판정과 승낙 API 가 같은 기준 (WO-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1)
// ─────────────────────────────────────────────────────

describe('store_owner_agreement — 요구 · 승낙 같은 자격 기준', () => {
  const DOC_KPA_AGREEMENT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const DOC_KCOS_AGREEMENT = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const agreementDoc = (id: string, serviceKey: string) => ({
    ...publishedDoc(id, serviceKey), document_type: 'store_owner_agreement', title: '매장 경영자 이용계약',
  });
  const auth = () => `Bearer ${makeToken()}`;
  const pendingOf = (app: express.Express, serviceKey: string) =>
    request(app).get(`/api/v1/auth/policy-acceptances?documentType=store_owner_agreement&serviceKey=${serviceKey}`).set('Authorization', auth());
  const accept = (app: express.Express, serviceKey: string, policyDocumentId: string) =>
    request(app).post('/api/v1/auth/policy-acceptances').set('Authorization', auth())
      .send({ serviceKey, policyDocumentId, version: 1, documentType: 'store_owner_agreement' });

  it('Neture 원장 약국(kpa-society membership · kpa:store_owner 없음) — 게시 계약 pending 1 → 승낙 200 → pending 0', async () => {
    publishedRows = [agreementDoc(DOC_KPA_AGREEMENT, 'kpa-society')];
    membershipRows = [{ serviceKey: 'neture', status: 'active' }];
    activeRoles = ['neture:store_owner'];
    ledgerStoreOwner = true;
    const app = makeApp();

    const before = await pendingOf(app, 'kpa-society');
    expect(before.body.data.pending).toEqual([expect.objectContaining({ serviceKey: 'kpa-society', policyDocumentId: DOC_KPA_AGREEMENT })]);

    const res = await accept(app, 'kpa-society', DOC_KPA_AGREEMENT);
    expect(res.status).toBe(200);
    expect(res.body.data.accepted).toMatchObject({ documentType: 'store_owner_agreement', policyDocumentId: DOC_KPA_AGREEMENT, created: true });
    expect(res.body.data.pending).toEqual([]);
    expect(acceptedIds).toEqual([DOC_KPA_AGREEMENT]);
    // 승낙 판정은 원장만 본다 — kpa-society membership · role 조회 0
    const acceptQueries = queryLog.filter((q) => q.includes('service_memberships WHERE user_id = $1 AND service_key = $2') || q.includes('AND role = $2'));
    expect(acceptQueries).toEqual([]);
  });

  it('게시 계약 → 내 매장 가드 428 → 승낙 → 같은 가드 통과 (Neture 원장 약국)', async () => {
    publishedRows = [agreementDoc(DOC_KPA_AGREEMENT, 'kpa-society')];
    membershipRows = [{ serviceKey: 'neture', status: 'active' }];
    activeRoles = ['neture:store_owner'];
    ledgerStoreOwner = true;
    const guard = createRequireStoreOwner({ query: (sql: string, params?: any[]) => fakeQuery(sql, params) } as any, 'kpa');
    const runGuard = async () => {
      const req: any = { user: { id: USER_ID, roles: ['neture:store_owner'], memberships: [{ serviceKey: 'neture', status: 'active' }] } };
      const res: any = { status: jest.fn(() => res), json: jest.fn(() => res) };
      const next = jest.fn();
      await guard(req, res, next);
      return { req, res, next };
    };

    const blocked = await runGuard();
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.status).toHaveBeenCalledWith(428);
    expect(blocked.res.json.mock.calls[0][0]).toMatchObject({ code: 'STORE_OWNER_AGREEMENT_REQUIRED' });

    expect((await accept(makeApp(), 'kpa-society', DOC_KPA_AGREEMENT)).status).toBe(200);

    const passed = await runGuard();
    expect(passed.next).toHaveBeenCalled();
    expect(passed.req.organizationId).toBe('org-pharmacy');
  });

  it('원장 대상이 아니면 승낙 403 STORE_OWNER_REQUIRED — kpa-society membership · kpa:store_owner 가 있어도(요구 대상도 아님)', async () => {
    publishedRows = [agreementDoc(DOC_KPA_AGREEMENT, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    activeRoles = ['kpa:store_owner'];
    ledgerStoreOwner = false;
    const app = makeApp();
    expect((await pendingOf(app, 'kpa-society')).body.data.pending).toEqual([]);
    const res = await accept(app, 'kpa-society', DOC_KPA_AGREEMENT);
    expect([res.status, res.body.code]).toEqual([403, 'STORE_OWNER_REQUIRED']);
    expect(acceptedIds).toEqual([]);
  });

  it('k-cosmetics 매장계약은 종전 기준 그대로 — membership 없으면 MEMBERSHIP_NOT_FOUND, role 없으면 STORE_OWNER_REQUIRED, 둘 다 있으면 200', async () => {
    publishedRows = [agreementDoc(DOC_KCOS_AGREEMENT, 'k-cosmetics')];
    ledgerStoreOwner = true; // 원장은 k-cosmetics 판정에 쓰이지 않는다
    const app = makeApp();

    let res = await accept(app, 'k-cosmetics', DOC_KCOS_AGREEMENT);
    expect([res.status, res.body.code]).toEqual([403, 'MEMBERSHIP_NOT_FOUND']);

    membershipRows = [{ serviceKey: 'k-cosmetics', status: 'active' }];
    res = await accept(app, 'k-cosmetics', DOC_KCOS_AGREEMENT);
    expect([res.status, res.body.code]).toEqual([403, 'STORE_OWNER_REQUIRED']);

    activeRoles = ['cosmetics:store_owner'];
    res = await accept(app, 'k-cosmetics', DOC_KCOS_AGREEMENT);
    expect(res.status).toBe(200);
    expect(queryLog.some((q) => q.includes('FROM neture_pharmacy_memberships'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────
// Demo 계정 예외 — raw pending ≠ enforced pending
// (WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1 · 정본 O4O-CANONICAL-DEMO-ACCOUNTS-V1 §8-2)
// ─────────────────────────────────────────────────────

describe('Demo 계정 약관 예외 (enforced pending)', () => {
  const demoQueries = () => queryLog.filter((q) => q.includes('FROM demo_accounts'));

  beforeEach(() => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society'), publishedDoc(DOC_NETURE, 'neture')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }, { serviceKey: 'neture', status: 'active' }];
  });

  it('활성 Demo + raw pending 존재 → enforced pending [] · raw pending 은 그대로 · acceptance 기록 0', async () => {
    demoUserIds = [USER_ID];
    expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toHaveLength(2);
    expect(await policyAcceptanceService.getEnforcedPendingForUser(USER_ID)).toEqual([]);
    expect(acceptedIds).toEqual([]);
    expect(queryLog.some((q) => q.startsWith('INSERT') || q.startsWith('UPDATE'))).toBe(false);
  });

  it('Demo 판정은 demo_accounts.user_id 로만 한다 (email 비교 0)', async () => {
    demoUserIds = [USER_ID];
    await policyAcceptanceService.getEnforcedPendingForUser(USER_ID);
    expect(demoQueries()).toHaveLength(1);
    expect(demoQueries()[0]).toContain('WHERE user_id = $1');
    expect(demoQueries()[0]).not.toMatch(/email/i);
  });

  it('활성 Demo → 보호 API 는 약관 428 없이 다음 단계로 진행 (POST /auth/password 포함)', async () => {
    demoUserIds = [USER_ID];
    const app = makeApp();
    const auth = `Bearer ${makeToken()}`;
    const api = await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth);
    expect(api.status).toBe(200);
    expect(api.body.reached).toBe(true);
    const pw = await request(app).post('/api/v1/auth/password').set('Authorization', auth).send({});
    expect(pw.status).toBe(200);
    expect(pw.body.reached).toBe(true);
  });

  it('GET /auth/policy-acceptances 는 세션 범위의 raw 상태를 보여 준다 (Demo 예외로 동의 기록을 만들지 않는다)', async () => {
    demoUserIds = [USER_ID];
    const res = await request(makeApp()).get('/api/v1/auth/policy-acceptances').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.pending.map((p: any) => p.serviceKey)).toEqual(['neture']);
    expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toHaveLength(2);
    expect(acceptedIds).toEqual([]);
  });

  it('일반 사용자 + 미동의 → enforced = raw · 428 유지', async () => {
    const raw = await policyAcceptanceService.getPendingForUser(USER_ID);
    expect(await policyAcceptanceService.getEnforcedPendingForUser(USER_ID)).toEqual(raw);
    const res = await request(makeApp()).get('/api/v1/kpa/x').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(428);
    expect(res.body.pendingPolicyAcceptances).toHaveLength(2);
  });

  it('일반 사용자 + 동의 완료 → 통과 · Demo registry 조회 0', async () => {
    acceptedIds = [DOC_KPA, DOC_NETURE];
    expect(await policyAcceptanceService.getEnforcedPendingForUser(USER_ID)).toEqual([]);
    const res = await request(makeApp()).get('/api/v1/kpa/x').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(200);
    expect(demoQueries()).toHaveLength(0);
  });

  it('raw pending 0 (published terms 0) → Demo registry 조회 0', async () => {
    publishedRows = [];
    demoUserIds = [USER_ID];
    expect(await policyAcceptanceService.getEnforcedPendingForUser(USER_ID)).toEqual([]);
    expect(demoQueries()).toHaveLength(0);
  });

  it('Demo registry 조회 실패 + raw pending → 예외를 열지 않는다 (raw 유지 · 428)', async () => {
    demoUserIds = [USER_ID];
    demoQueryShouldThrow = true;
    expect(await policyAcceptanceService.getEnforcedPendingForUser(USER_ID)).toHaveLength(2);
    const res = await request(makeApp()).get('/api/v1/kpa/x').set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(428);
  });

  it('비활성 Demo 기록(is_active=false)은 예외 대상이 아니다 — 조회 SQL 이 is_active 를 건다', async () => {
    await policyAcceptanceService.getEnforcedPendingForUser(USER_ID);
    expect(demoQueries()[0]).toMatch(/is_active/);
  });
});

// ─────────────────────────────────────────────────────
// 소비처 계약 — 서비스 접근을 강제하는 3 경로는 enforced pending 을 쓴다
// ─────────────────────────────────────────────────────

describe('enforced pending 소비처 계약', () => {
  const read = (rel: string) => readFileSync(resolve(__dirname, '../..', rel), 'utf8');

  it.each([
    'common/middleware/auth/authentication.middleware.ts',
    'modules/auth/controllers/session-response.ts',
    'modules/auth/controllers/auth-account.controller.ts',
  ])('%s 는 getEnforcedPendingForUser 를 쓰고 raw getPendingForUser 를 직접 부르지 않는다', (rel) => {
    const src = read(rel);
    expect(src).toContain('getEnforcedPendingForUser(');
    expect(src).not.toMatch(/\.getPendingForUser\(/);
  });

  it.each(['email-auth.controller.ts', 'google-auth.controller.ts', 'social-auth.controller.ts'])('%s delegates session responses to the enforced common builder', name => {
    expect(read(`modules/auth/controllers/${name}`)).toContain('SessionResponse.send(');
  });

  it('Demo 예외 판정에 email 문자열 비교가 없다', () => {
    const src = read('modules/policy-acceptance/policy-acceptance.service.ts');
    expect(src).not.toMatch(/@example\.com/);
    expect(src).not.toMatch(/isDemoLoginEmail/);
  });
});


describe('공통 계정·서비스별 약관 범위', () => {
  it('membership 없는 계정은 Neture 공통 약관을 승낙할 수 있고 membership/role을 만들지 않는다', async () => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture')];
    const app = makeApp();
    const auth = `Bearer ${makeToken()}`;
    expect((await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth)).status).toBe(428);
    const accepted = await request(app).post('/api/v1/auth/policy-acceptances').set('Authorization', auth)
      .send({ serviceKey: 'neture', policyDocumentId: DOC_NETURE, version: 2 });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.pending).toEqual([]);
    expect(membershipRows).toEqual([]);
    expect(queryLog.some(sql => /INSERT INTO (service_memberships|role_assignments)/.test(sql))).toBe(false);
    expect((await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth)).status).toBe(200);
  });

  it('약국 약관 미동의는 Neture 보호 API를 막지 않고 약국 보호 API만 막는다', async () => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society'), publishedDoc(DOC_NETURE, 'neture')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    acceptedIds = [DOC_NETURE];
    const app = makeApp();
    const auth = `Bearer ${makeToken()}`;
    expect((await request(app).get('/api/v1/neture/profile').set('Authorization', auth)).status).toBe(200);
    expect((await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth)).status).toBe(428);
  });

  it('서비스 미가입자는 여전히 다른 서비스 약관을 승낙하지 못한다', async () => {
    publishedRows = [publishedDoc(DOC_KPA, 'kpa-society')];
    const response = await request(makeApp()).post('/api/v1/auth/policy-acceptances').set('Authorization', `Bearer ${makeToken()}`)
      .send({ serviceKey: 'kpa-society', policyDocumentId: DOC_KPA, version: 1 });
    expect(response.status).toBe(403);
    expect(acceptedIds).toEqual([]);
  });

  it('공유 API는 서명된 세션 범위를 사용하고 서비스 소유 API는 query나 다른 세션 범위로 우회하지 못한다', () => {
    const items = ['neture', 'kpa-society', 'lecture', 'supplier'].map(serviceKey => ({ serviceKey, documentType: 'terms', policyDocumentId: serviceKey, version: 1, title: 'T', accountPolicy: serviceKey === 'neture' }));
    expect(selectPendingPoliciesForRequest(items, 'neture', '/api/v1/users/me?serviceKey=kpa-society').map(p => p.serviceKey)).toEqual(['neture']);
    expect(selectPendingPoliciesForRequest(items, 'neture', '/api/v1/kpa/forum/posts?serviceKey=neture').map(p => p.serviceKey)).toEqual(['neture', 'kpa-society']);
    expect(selectPendingPoliciesForRequest(items, 'lecture', '/api/v1/kpa-not-a-service').map(p => p.serviceKey)).toEqual(['neture', 'lecture']);
    expect(selectPendingPoliciesForRequest(items, undefined, '/api/v1/users/me')).toEqual(items);
    expect(selectPendingPoliciesForRequest(items, 'neture', '/api/v1/neture/supplier/copilot/query').map(p => p.serviceKey)).toEqual(['neture', 'supplier']);
    expect(selectPendingPoliciesForRequest(items, 'supplier', '/api/v1/neture/supplier/spot-policies').map(p => p.serviceKey)).toEqual(['neture', 'supplier']);
    for (const action of ['approve-supplier', 'audit-review']) {
      expect(selectPendingPoliciesForRequest(items, 'supplier', `/api/v1/neture/hub/trigger/${action}`, 'POST').map(p => p.serviceKey)).toEqual(['neture']);
    }
    expect(selectPendingPoliciesForRequest(items, 'neture', '/api/v1/neture/products/fixture/images', 'GET').map(p => p.serviceKey)).toEqual(['neture']);
  });
});


describe('실제 서비스 소유 mount의 약관 enforcement', () => {
  it.each([
    ['get', '/api/v1/neture/operator/market-trial/fixture', 'funding'],
    ['get', '/api/v1/neture/operator/suppliers/pending', 'supplier'],
    ['get', '/api/v1/neture/admin/suppliers/governance', 'supplier'],
    ['post', '/api/market-trial/fixture/join', 'funding'],
    ['get', '/api/v1/communities/fixture/members', 'community'],
    ['get', '/api/v1/neture/seller-recruitment/recruitments/mine', 'supplier'],
    ['patch', '/api/v1/neture/seller-recruitment/recruitments/fixture/close', 'supplier'],
    ['post', '/api/v1/neture/seller-recruitment/applications/fixture/approve', 'supplier'],
    ['post', '/api/v1/neture/seller-recruitment/applications/fixture/reject', 'supplier'],
    ['post', '/api/v1/neture/seller-recruitment/applications/fixture/terminate', 'supplier'],
    ['get', '/api/v1/neture/library/handoff-targets', 'supplier'],
    ['post', '/api/v1/neture/library/fixture/handoff', 'supplier'],
    ['post', '/api/v1/neture/hub/trigger/review-pending', 'supplier'],
    ['post', '/api/v1/neture/hub/trigger/auto-product', 'supplier'],
    ['post', '/api/v1/neture/hub/trigger/refresh-settlement', 'supplier'],
    ['post', '/api/v1/neture/hub/trigger/ai-refresh', 'supplier'],
    ['post', '/api/v1/kpa/supplier/event-offers', 'supplier'],
    ['post', '/api/v1/kpa/supplier/content-submissions', 'supplier'],
    ['post', '/api/v1/kpa/supplier/signage/media', 'supplier'],
    ['post', '/api/v1/kpa/supplier/signage/campaign-requests', 'supplier'],
    ['get', '/api/v1/kpa/supplier/signage/reports', 'supplier'],
    ['post', '/api/v1/kpa/supplier/screen-sets', 'supplier'],
  ])('%s %s는 다른 세션 범위로 서비스 pending을 제거하지 않는다', async (method, path, serviceKey) => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, serviceKey)];
    membershipRows = [{ serviceKey, status: 'active' }];
    acceptedIds = [DOC_NETURE];
    const app = makeApp();
    const auth = `Bearer ${makeToken('neture')}`;
    expect((await request(app).get('/api/v1/neture/profile').set('Authorization', auth)).status).toBe(200);
    const denied = await (request(app) as any)[method](path).set('Authorization', auth);
    expect(denied.status).toBe(428);
    expect(denied.body.pendingPolicyAcceptances.map((p: any) => p.serviceKey)).toEqual([serviceKey]);
    acceptedIds.push(DOC_KPA);
    policyAcceptanceService.invalidateAll();
    expect((await (request(app) as any)[method](path).set('Authorization', auth)).status).toBe(200);
  });

  it.each(['/api/v1/neture/operator/suppliers-other', '/api/v1/neture/operator/market-trial-other'])('%s는 비슷한 이름만으로 하위 서비스가 되지 않는다', path => {
    const pending = ['neture', 'supplier', 'funding'].map(serviceKey => ({ serviceKey, documentType: 'terms', policyDocumentId: serviceKey, version: 1, title: 'Fixture', accountPolicy: serviceKey === 'neture' }));
    expect(selectPendingPoliciesForRequest(pending, 'supplier', path).map(p => p.serviceKey)).toEqual(['neture']);
  });
});


describe('전체관리자 관리 세션의 재동의 예외', () => {
  beforeEach(() => { publishedRows = [publishedDoc(DOC_NETURE, 'neture')]; });

  it.each([
    ['get', '/api/v1/settings/theme'],
    ['put', '/api/v1/settings/theme'],
    ['get', '/api/v1/apps/availability'],
    ['get', '/api/v1/users'],
    ['delete', '/api/v1/users/fixture'],
    ['get', '/api/v1/neture/operator/suppliers/pending'],
  ])('%s %s: 현재 DB 전체관리자 역할 + Google admin 세션은 재동의로 관리업무를 막지 않는다', async (method, path) => {
    activeRoles = ['platform:super_admin'];
    const res = await (request(makeApp()) as any)[method](path).set('Authorization', `Bearer ${makeToken('admin', 'google')}`);
    expect(res.status).toBe(200);
    expect(res.body.reached).toBe(true);
    expect(acceptedIds).toEqual([]);
    expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toHaveLength(1);
  });

  it.each([{ roles: [] }, { roles: ['supplier:operator'] }])('admin scope와 오래된/위조 JWT 역할만으로는 예외가 없다: %p', async ({ roles }) => {
    activeRoles = roles;
    const res = await request(makeApp()).get('/api/v1/apps/availability')
      .set('Authorization', `Bearer ${makeToken('admin', 'google', ['platform:super_admin'])}`);
    expect(res.status).toBe(428);
    expect(res.body.code).toBe('TERMS_ACCEPTANCE_REQUIRED');
    expect(res.body.reached).toBeUndefined();
  });

  it('동일 전체관리자도 일반 서비스 세션에서 서비스 이용 시에는 공통 약관을 요구한다', async () => {
    activeRoles = ['platform:super_admin'];
    const res = await request(makeApp()).get('/api/v1/neture/profile')
      .set('Authorization', `Bearer ${makeToken('neture', 'google')}`).set('Origin', 'https://admin.neture.co.kr');
    expect(res.status).toBe(428);
    expect(res.body.pendingPolicyAcceptances.map((p: any) => p.serviceKey)).toEqual(['neture']);
  });

  it.each(['password', undefined])('Google 증거가 없는 전체관리자 세션은 예외 적용 전에 거부한다: %p', async method => {
    activeRoles = ['platform:super_admin'];
    const res = await request(makeApp()).get('/api/v1/settings/theme')
      .set('Authorization', `Bearer ${makeToken('admin', method)}`);
    expect(res.status).toBe(403);
    expect(res.body.reached).toBeUndefined();
  });
});


describe('혼합 소비 Neture API는 서명된 서비스 세션 범위를 유지한다', () => {
  it.each([['neture', 200], ['kpa-society', 428]] as const)('%s 세션의 공용 API 판정', async (serviceKey, expectedStatus) => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    acceptedIds = [DOC_NETURE];
    const app = makeApp();
    for (const [method, path] of [
      ['get', '/api/v1/neture/seller-recruitment/applications/mine'],
      ['post', '/api/v1/neture/seller-recruitment/applications/fixture/cancel'],
      ['get', '/api/v1/neture/suppliers'],
    ]) {
      const res = await (request(app) as any)[method](path).set('Authorization', `Bearer ${makeToken(serviceKey)}`);
      expect(res.status).toBe(expectedStatus);
      if (expectedStatus === 428) expect(res.body.pendingPolicyAcceptances.map((p: any) => p.serviceKey)).toEqual(['kpa-society']);
      else expect(res.body.reached).toBe(true);
    }
  });
});


describe('공급자 심사 경로는 Express의 슬래시/대소문자 매칭과 일치한다', () => {
  it.each(['approve', 'reject', 'terminate'])('%s의 후행 슬래시 및 대문자 경로도 supplier 약관을 요구한다', async action => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, 'supplier')];
    membershipRows = [{ serviceKey: 'supplier', status: 'active' }];
    acceptedIds = [DOC_NETURE];
    const app = express();
    app.post(`/api/v1/neture/seller-recruitment/applications/:id/${action}`, requireAuth as any, (_req, res) => res.json({ reached: true }));
    const path = `/api/v1/neture/seller-recruitment/applications/fixture/${action}`;
    const variants = [`${path}/?serviceKey=neture`, `${path.toUpperCase()}/`];
    for (const variant of variants) {
      const denied = await request(app).post(variant).set('Authorization', `Bearer ${makeToken()}`);
      expect(denied.status).toBe(428);
      expect(denied.body.pendingPolicyAcceptances.map((p: any) => p.serviceKey)).toEqual(['supplier']);
    }
    acceptedIds.push(DOC_KPA);
    policyAcceptanceService.invalidateAll();
    for (const variant of variants) {
      const accepted = await request(app).post(variant).set('Authorization', `Bearer ${makeToken()}`);
      expect(accepted.status).toBe(200);
      expect(accepted.body.reached).toBe(true);
    }
  });
});


describe('공급자 이미지 변경과 공용 조회의 method 경계', () => {
  it.each([
    ['post', '/api/v1/neture/products/fixture/images'],
    ['post', '/api/v1/neture/products/fixture/images/from-url'],
    ['patch', '/api/v1/neture/products/images/fixture/primary'],
    ['delete', '/api/v1/neture/products/images/fixture'],
  ])('%s %s 변경은 supplier pending을 요구하고 공용 GET은 그대로 허용한다', async (method, path) => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, 'supplier')];
    membershipRows = [{ serviceKey: 'supplier', status: 'active' }];
    acceptedIds = [DOC_NETURE];
    const app = makeApp();
    const auth = `Bearer ${makeToken()}`;
    expect((await request(app).get('/api/v1/neture/products/fixture/images').set('Authorization', auth)).status).toBe(200);
    for (const variant of [path, `${path.toUpperCase()}/`]) {
      const denied = await (request(app) as any)[method](variant).set('Authorization', auth).send({ method: 'GET', serviceKey: 'neture' });
      expect(denied.status).toBe(428);
      expect(denied.body.pendingPolicyAcceptances.map((p: any) => p.serviceKey)).toEqual(['supplier']);
    }
    acceptedIds.push(DOC_KPA);
    policyAcceptanceService.invalidateAll();
    expect((await (request(app) as any)[method](path).set('Authorization', auth)).status).toBe(200);
  });
});


describe('Store 업무공간과 실제 공급자 원장 약관 대상', () => {
  it('Store 세션은 가입한 Store-capable 서비스 문서를 표시하고 승낙하며 무관한 공급자 pending은 제외한다', async () => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, 'kpa-society'), publishedDoc(DOC_PRIVACY, 'supplier')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }, { serviceKey: 'supplier', status: 'active' }];
    const app = makeApp();
    const auth = `Bearer ${makeToken('store')}`;
    const pending = await request(app).get('/api/v1/auth/policy-acceptances').set('Authorization', auth);
    expect(pending.body.data.pending.map((p: any) => p.serviceKey)).toEqual(['neture', 'kpa-society']);
    expect((await policyAcceptanceService.getEnforcedPendingForUser(USER_ID, 'store')).map(p => p.serviceKey)).toEqual(['neture', 'kpa-society']);
    for (const [serviceKey, policyDocumentId] of [['neture', DOC_NETURE], ['kpa-society', DOC_KPA]]) {
      expect((await request(app).post('/api/v1/auth/policy-acceptances').set('Authorization', auth)
        .send({ serviceKey, policyDocumentId, version: serviceKey === 'neture' ? 2 : 1 })).status).toBe(200);
    }
    expect(await policyAcceptanceService.getEnforcedPendingForUser(USER_ID, 'store')).toEqual([]);
    expect((await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth)).status).toBe(200);
    expect((await policyAcceptanceService.getPendingForUser(USER_ID)).map(p => p.serviceKey)).toEqual(['supplier']);
  });

  it.each([
    ['canonical active', ['ACTIVE'], [], true],
    ['canonical pending', ['PENDING'], [], true],
    ['multiple canonical suppliers', ['INACTIVE', 'ACTIVE'], [], true],
    ['canonical inactive', ['INACTIVE'], [], false],
    ['no supplier relation', [], [], false],
    ['legacy compatibility supplier', [], ['ACTIVE'], true],
  ])('%s: supplier 운영자 membership 없이 실제 원장 기준으로 pending과 승낙 자격이 일치한다', async (_label, statuses, legacyStatuses, eligible) => {
    supplierCandidateRows = (statuses as string[]).map((status, i) => ({ supplier_id: `fixture-supplier-${i}`, organization_id: `fixture-org-${i}`, status, organization_name: 'Fixture' }));
    legacySupplierRows = (legacyStatuses as string[]).map(status => ({ id: 'fixture-legacy', organization_id: null, status }));
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, 'supplier')];
    acceptedIds = [DOC_NETURE];
    const app = makeApp();
    const auth = `Bearer ${makeToken('supplier')}`;
    const before = await request(app).get('/api/v1/auth/policy-acceptances').set('Authorization', auth);
    expect(before.body.data.pending.map((p: any) => p.serviceKey)).toEqual(eligible ? ['supplier'] : []);
    if (eligible) expect((await request(app).post('/api/v1/neture/products/fixture/images').set('Authorization', auth)).status).toBe(428);
    const accepted = await request(app).post('/api/v1/auth/policy-acceptances').set('Authorization', auth)
      .send({ serviceKey: 'supplier', policyDocumentId: DOC_KPA, version: 1 });
    expect(accepted.status).toBe(eligible ? 200 : 403);
    expect(membershipRows).toEqual([]);
    expect(queryLog.some(q => /^INSERT INTO (service_memberships|organization_members)/.test(q))).toBe(false);
    if (eligible) {
      expect(accepted.body.data.pending).toEqual([]);
      expect((await request(app).post('/api/v1/neture/products/fixture/images').set('Authorization', auth)).status).toBe(200);
    } else expect(acceptedIds).toEqual([DOC_NETURE]);
  });
});


describe('Store/KPA 약관의 실제 세미프랜차이즈 자격', () => {
  it.each([
    ['same organization active', [{ basic: 'active', semi: 'active' }], true],
    ['one qualified among multiple organizations', [{ basic: 'pending', semi: null }, { basic: 'active', semi: 'active' }], true],
    ['approvals split across organizations', [{ basic: 'active', semi: 'suspended' }, { basic: 'suspended', semi: 'active' }], false],
    ['pharmacy approval alone', [{ basic: 'active', semi: null }], false],
    ['pharmacy pending', [{ basic: 'pending', semi: 'active' }], false],
    ['semi-franchise pending', [{ basic: 'active', semi: 'pending' }], false],
    ['pharmacy suspended', [{ basic: 'suspended', semi: 'active' }], false],
    ['semi-franchise suspended', [{ basic: 'active', semi: 'suspended' }], false],
    ['no related organization', [], false],
  ])('%s: membership 없이 pending과 승낙은 실제 서비스 접근 자격을 함께 사용한다', async (_label, rows, eligible) => {
    semiFranchiseRows = rows as any[];
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, 'kpa-society')];
    acceptedIds = [DOC_NETURE];
    const app = makeApp();
    const auth = `Bearer ${makeToken('store')}`;
    const pending = await request(app).get('/api/v1/auth/policy-acceptances').set('Authorization', auth);
    expect(pending.body.data.pending.map((p: any) => p.serviceKey)).toEqual(eligible ? ['kpa-society'] : []);
    if (eligible) expect((await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth)).status).toBe(428);
    const accepted = await request(app).post('/api/v1/auth/policy-acceptances').set('Authorization', auth)
      .send({ serviceKey: 'kpa-society', policyDocumentId: DOC_KPA, version: 1 });
    expect(accepted.status).toBe(eligible ? 200 : 403);
    expect(membershipRows).toEqual([]);
    expect(queryLog.some(q => /^INSERT INTO (service_memberships|organization_members)/.test(q))).toBe(false);
    const accessQuery = queryLog.find(q => q.includes('LEFT JOIN semi_franchises'))!;
    expect(accessQuery).toContain('om.left_at IS NULL');
    expect(accessQuery).toContain('om.role = ANY');
    expect(accessQuery).toContain('"isEmailVerified" = true');
    if (eligible) {
      expect(accepted.body.data.pending).toEqual([]);
      expect((await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth)).status).toBe(200);
    } else expect(acceptedIds).toEqual([DOC_NETURE]);
  });
});


describe('공통 계정 약관의 명시적 게시 전환과 원장 캐시', () => {
  it.each([{ version: 1, slug: null }, { version: 2, slug: 'legacy-neture' }, { version: 1, slug: 'neture-account-terms' }])('%j: 기존 Neture 약관을 다른 서비스 계정의 새 공통 약관으로 재해석하지 않는다', async marker => {
    publishedRows = [{ ...publishedDoc(DOC_NETURE, 'neture'), ...marker }, publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    acceptedIds = [DOC_KPA];
    const app = makeApp();
    const auth = `Bearer ${makeToken('kpa-society')}`;
    expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toEqual([]);
    expect((await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth)).status).toBe(200);
    const result = await request(app).post('/api/v1/auth/policy-acceptances').set('Authorization', auth)
      .send({ serviceKey: 'neture', policyDocumentId: DOC_NETURE, version: marker.version });
    expect(result.status).toBe(403);
    expect(acceptedIds).toEqual([DOC_KPA]);
  });

  it('draft는 적용하지 않고 새 ID/version/marker의 공통 문서 게시 뒤에만 요구한다', async () => {
    const legacy = { ...publishedDoc(DOC_NETURE, 'neture', 1), slug: null };
    const common = { ...publishedDoc(DOC_DRAFT, 'neture', 2), status: 'draft' };
    publishedRows = [legacy, common, publishedDoc(DOC_KPA, 'kpa-society')];
    membershipRows = [{ serviceKey: 'kpa-society', status: 'active' }];
    acceptedIds = [DOC_KPA];
    expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toEqual([]);
    legacy.status = 'draft'; common.status = 'published'; policyAcceptanceService.invalidateAll();
    const app = makeApp();
    const auth = `Bearer ${makeToken('kpa-society')}`;
    const denied = await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth);
    expect(denied.status).toBe(428);
    expect(denied.body.pendingPolicyAcceptances).toEqual([expect.objectContaining({ policyDocumentId: DOC_DRAFT, version: 2, serviceKey: 'neture' })]);
    expect((await request(app).post('/api/v1/auth/policy-acceptances').set('Authorization', auth)
      .send({ serviceKey: 'neture', policyDocumentId: DOC_DRAFT, version: 2 })).status).toBe(200);
    expect((await request(app).get('/api/v1/kpa/forum/posts').set('Authorization', auth)).status).toBe(200);
    expect(acceptedIds).toEqual([DOC_KPA, DOC_DRAFT]);
    expect(membershipRows).toEqual([{ serviceKey: 'kpa-society', status: 'active' }]);
  });

  it.each(['kpa-society', 'supplier'])('%s: 승인/소유 자격 변경은 invalidateUser 없이도 즉시 pending에 반영한다', async serviceKey => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, serviceKey)];
    acceptedIds = [DOC_NETURE];
    expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toEqual([]);
    if (serviceKey === 'supplier') supplierCandidateRows = [{ supplier_id: 'fixture', organization_id: 'fixture-org', status: 'ACTIVE', organization_name: 'Fixture' }];
    else semiFranchiseRows = [{ basic: 'active', semi: 'active' }];
    expect((await policyAcceptanceService.getPendingForUser(USER_ID)).map(p => p.serviceKey)).toEqual([serviceKey]);
  });

  it.each(['kpa-society', 'lecture'])('%s: Neture membership의 기존 v1 미동의는 무관 서비스 응답/API를 막지 않는다', async serviceKey => {
    publishedRows = [{ ...publishedDoc(DOC_NETURE, 'neture', 1), slug: null }, publishedDoc(DOC_KPA, serviceKey)];
    membershipRows = [{ serviceKey: 'neture', status: 'active' }, { serviceKey, status: 'active' }];
    acceptedIds = [DOC_KPA];
    expect((await policyAcceptanceService.getPendingForUser(USER_ID)).map(p => p.serviceKey)).toEqual(['neture']);
    expect(await policyAcceptanceService.getEnforcedPendingForUser(USER_ID, serviceKey)).toEqual([]);
    const app = makeApp();
    app.get('/api/v1/lecture/fixture', requireAuth as any, (_req, res) => res.json({ reached: true }));
    const path = serviceKey === 'lecture' ? '/api/v1/lecture/fixture' : '/api/v1/kpa/forum/posts';
    expect((await request(app).get(path).set('Authorization', `Bearer ${makeToken(serviceKey)}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/neture/profile').set('Authorization', `Bearer ${makeToken('neture')}`)).status).toBe(428);
  });

  it.each(['kpa-society', 'supplier'])('%s 문서가 있어도 관계 없는 사용자 캐시는 membership/resolver 조회를 반복하지 않는다', async serviceKey => {
    publishedRows = [publishedDoc(DOC_NETURE, 'neture'), publishedDoc(DOC_KPA, serviceKey)];
    acceptedIds = [DOC_NETURE];
    expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toEqual([]);
    const start = queryLog.length;
    expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toEqual([]);
    const repeated = queryLog.slice(start);
    expect(repeated).toHaveLength(1);
    expect(repeated[0]).toContain('policy_dynamic_relation');
    expect(repeated[0]).not.toContain('FROM service_memberships');
    expect(repeated[0]).not.toContain('LEFT JOIN semi_franchises');
  });

  it('일반 빈 결과 캐시는 유지하지만 새 게시 문서 세트에는 재사용하지 않는다', async () => {
    let clock = 100000;
    const time = jest.spyOn(Date, 'now').mockImplementation(() => clock);
    try {
      publishedRows = [publishedDoc(DOC_NETURE, 'neture')]; acceptedIds = [DOC_NETURE];
      await policyAcceptanceService.listPublishedTerms();
      clock += 59000;
      expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toEqual([]);
      const count = queryLog.length;
      expect(await policyAcceptanceService.getPendingForUser(USER_ID)).toEqual([]);
      expect(queryLog.length).toBe(count);
      publishedRows = [publishedDoc(DOC_DRAFT, 'neture', 3)]; clock += 2000;
      expect((await policyAcceptanceService.getPendingForUser(USER_ID)).map(p => p.policyDocumentId)).toEqual([DOC_DRAFT]);
    } finally { time.mockRestore(); }
  });
});
