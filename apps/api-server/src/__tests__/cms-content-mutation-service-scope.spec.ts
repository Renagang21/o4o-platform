/**
 * WO-O4O-CMS-KPA-MUTATION-SERVICEKEY-CANONICALIZATION-V1
 *
 * CMS mutation(`POST /contents`, `PUT /contents/:id`, `PATCH /contents/:id/status`) 의
 * **service identity 계약**을 고정한다.
 *
 * 수정 전 실측(재현):
 *   kpa:operator + serviceKey='kpa-society' row  → 403  ← 정상 운영자가 자기 콘텐츠를 못 고침
 *   kpa:operator + legacy serviceKey='kpa' row   → 200  ← 문자열 우연 일치
 *   kpa:operator + POST serviceKey='kpa-society' → 403
 *   kpa:operator + POST serviceKey='kpa'         → 201, stored 'kpa' (legacy 값 신규 생성)
 *   cosmetics:operator + 'k-cosmetics' row       → 403 (같은 축 어긋남)
 *
 * 원인: 인가가 CMS 원장 축(`kpa-society`)과 role scope 축(`kpa`)을 문자열로 직접 이어
 *   `${serviceKey}:operator` 를 조립했다. KPA/KCos 는 두 축 값이 달라 항상 불일치한다.
 *
 * 계약: security-core canonical SSOT 로 **role 축에 접어서** 비교하고,
 *   신규 write 는 canonical service key 로 저장한다. CMS 로컬 alias map 0.
 */
import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    const roles = req.headers['x-test-roles'];
    if (typeof roles === 'string') req.user = { id: 'u-1', roles: roles ? roles.split(',') : [] };
    next();
  },
}));

jest.mock(
  '@o4o-apps/cms-core',
  () => ({ CmsContent: class CmsContent {}, ContentType: {}, ContentStatus: {} }),
  { virtual: true },
);

/** 인가 근거는 JWT roles → 실패 시 RoleAssignment. DB 폴백은 기본 false 로 둔다. */
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { hasAnyRole: jest.fn(async () => false) },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { createCmsContentMutationRoutes } from '../routes/cms-content/cms-content-mutation.handler.js';

/** 프로덕션 분포를 축약한 픽스처 (canonical + legacy alias row 동거) */
const BASE_ROWS = [
  { id: 'kpa-canon', serviceKey: 'kpa-society', type: 'notice', title: 'KPA' },
  { id: 'kpa-legacy', serviceKey: 'kpa', type: 'notice', title: 'KPA legacy' },
  { id: 'gp', serviceKey: 'glycopharm', type: 'notice', title: 'GP' },
  { id: 'ph', serviceKey: 'pharmacy-hub', type: 'notice', title: 'PH' },
  { id: 'kcos-canon', serviceKey: 'k-cosmetics', type: 'notice', title: 'KCos' },
  { id: 'kcos-legacy', serviceKey: 'cosmetics', type: 'notice', title: 'KCos legacy' },
  { id: 'global', serviceKey: null, type: 'notice', title: 'Global' },
];

let saved: any = null;
let transitioned: any = null;

function makeApp() {
  saved = null;
  transitioned = null;
  const rows = BASE_ROWS.map((r) => ({ ...r }));
  const dataSource: any = {
    getRepository: () => ({
      findOne: jest.fn(async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null),
      create: jest.fn((v: any) => ({ ...v })),
      save: jest.fn(async (v: any) => {
        saved = v;
        return v;
      }),
    }),
  };
  const cmsContentService: any = {
    transitionContentStatus: jest.fn(async (id: string, status: string) => {
      transitioned = { id, status };
      return { id, status };
    }),
  };
  const app = express();
  app.use(express.json());
  app.use('/cms', createCmsContentMutationRoutes({ dataSource, cmsContentService }));
  return app;
}

const KPA_OP = 'kpa:operator';
const KPA_ADMIN = 'kpa:admin';
const GP_OP = 'glycopharm:operator';
const KCOS_OP = 'cosmetics:operator';
const PH_OP = 'pharmacy-hub:operator';
const PLATFORM_ADMIN = 'platform:super_admin';

const put = (id: string, roles: string, body: any = { title: 'edited' }) =>
  request(makeApp()).put(`/cms/contents/${id}`).set('x-test-roles', roles).send(body);
const patchStatus = (id: string, roles: string, status = 'published') =>
  request(makeApp()).patch(`/cms/contents/${id}/status`).set('x-test-roles', roles).send({ status });
const post = (roles: string, body: any) =>
  request(makeApp()).post('/cms/contents').set('x-test-roles', roles).send(body);

// ============================================================================
// §15 KPA — role scope 'kpa' ↔ canonical service key 'kpa-society'
// ============================================================================
describe('KPA operator — role scope(kpa) 와 CMS service key(kpa-society) 는 같은 서비스다', () => {
  it('PUT: kpa:operator 가 kpa-society row 를 수정한다 (수정 전 403 → 200)', async () => {
    const res = await put('kpa-canon', KPA_OP);
    expect(res.status).toBe(200);
  });

  it('PUT: kpa:admin 도 동일하게 허용된다', async () => {
    const res = await put('kpa-canon', KPA_ADMIN);
    expect(res.status).toBe(200);
  });

  it('PATCH status(lifecycle): kpa:operator 가 kpa-society row 를 publish 한다', async () => {
    const res = await patchStatus('kpa-canon', KPA_OP, 'published');
    expect(res.status).toBe(200);
    expect(transitioned).toEqual({ id: 'kpa-canon', status: 'published' });
  });

  it('PATCH status(lifecycle): archive 도 같은 인가를 통과한다', async () => {
    const res = await patchStatus('kpa-canon', KPA_OP, 'archived');
    expect(res.status).toBe(200);
  });

  it('§9 legacy alias: legacy serviceKey row 도 계속 수정 가능하다', async () => {
    expect((await put('kpa-legacy', KPA_OP)).status).toBe(200);
    expect((await patchStatus('kpa-legacy', KPA_OP)).status).toBe(200);
  });

  it('§9 legacy row 를 조용히 migration 하지 않는다 (alias 재전송은 write 하지 않음)', async () => {
    const res = await put('kpa-legacy', KPA_OP, { title: 'edited', serviceKey: 'kpa-society' });
    expect(res.status).toBe(200);
    expect(saved.serviceKey).toBe('kpa');
  });
});

describe('KPA operator — 타 서비스 콘텐츠는 계속 차단된다', () => {
  it.each([
    ['glycopharm', 'gp'],
    ['pharmacy-hub', 'ph'],
    ['k-cosmetics', 'kcos-canon'],
    ['cosmetics(legacy)', 'kcos-legacy'],
  ])('PUT %s row → 403', async (_label, id) => {
    expect((await put(id, KPA_OP)).status).toBe(403);
  });

  it('PATCH status: GP row → 403 (lifecycle 도 같은 경계)', async () => {
    expect((await patchStatus('gp', KPA_OP)).status).toBe(403);
    expect(transitioned).toBeNull();
  });

  it('POST: 타 서비스 serviceKey 로는 생성할 수 없다', async () => {
    expect((await post(KPA_OP, { serviceKey: 'glycopharm', type: 'notice', title: 't' })).status).toBe(403);
  });

  it('serviceKey=null(global) row 는 service operator 가 수정할 수 없다', async () => {
    expect((await put('global', KPA_OP)).status).toBe(403);
  });
});

// ============================================================================
// §10 Create — canonical 저장
// ============================================================================
describe('§10 create 계약 — 신규 row 는 canonical service key 로 저장된다', () => {
  it('KPA: serviceKey=kpa-society → 201, stored kpa-society', async () => {
    const res = await post(KPA_OP, { serviceKey: 'kpa-society', type: 'notice', title: 't' });
    expect(res.status).toBe(201);
    expect(saved.serviceKey).toBe('kpa-society');
  });

  it('KPA: role prefix 축으로 보내도 legacy 값을 새로 만들지 않는다', async () => {
    const res = await post(KPA_OP, { serviceKey: 'kpa', type: 'notice', title: 't' });
    expect(res.status).toBe(201);
    expect(saved.serviceKey).toBe('kpa-society');
  });

  it('KCos: k-cosmetics / cosmetics 둘 다 canonical k-cosmetics 로 저장된다', async () => {
    expect((await post(KCOS_OP, { serviceKey: 'k-cosmetics', type: 'notice', title: 't' })).status).toBe(201);
    expect(saved.serviceKey).toBe('k-cosmetics');
    expect((await post(KCOS_OP, { serviceKey: 'cosmetics', type: 'notice', title: 't' })).status).toBe(201);
    expect(saved.serviceKey).toBe('k-cosmetics');
  });

  it('self-map 서비스(GP/PH)는 그대로 저장된다 (회귀 0)', async () => {
    expect((await post(GP_OP, { serviceKey: 'glycopharm', type: 'notice', title: 't' })).status).toBe(201);
    expect(saved.serviceKey).toBe('glycopharm');
    expect((await post(PH_OP, { serviceKey: 'pharmacy-hub', type: 'knowledge', title: 't' })).status).toBe(201);
    expect(saved.serviceKey).toBe('pharmacy-hub');
  });

  it('platform admin 이 legacy 축으로 보내도 canonical 로 수렴한다', async () => {
    const res = await post(PLATFORM_ADMIN, { serviceKey: 'kpa', type: 'notice', title: 't' });
    expect(res.status).toBe(201);
    expect(saved.serviceKey).toBe('kpa-society');
  });
});

// ============================================================================
// §15 K-Cosmetics — cosmetics ↔ k-cosmetics
// ============================================================================
describe('K-Cosmetics operator — cosmetics role scope 와 k-cosmetics service key', () => {
  it('PUT: k-cosmetics row 허용 (수정 전 403 → 200)', async () => {
    expect((await put('kcos-canon', KCOS_OP)).status).toBe(200);
  });

  it('PUT: legacy cosmetics row 도 같은 alias 계약으로 허용', async () => {
    expect((await put('kcos-legacy', KCOS_OP)).status).toBe(200);
  });

  it('PATCH status: k-cosmetics row 허용', async () => {
    expect((await patchStatus('kcos-canon', KCOS_OP)).status).toBe(200);
  });

  it('KPA content 는 차단', async () => {
    expect((await put('kpa-canon', KCOS_OP)).status).toBe(403);
    expect((await put('kpa-legacy', KCOS_OP)).status).toBe(403);
  });
});

// ============================================================================
// §11 서비스 이전 / §13 platform admin
// ============================================================================
describe('§11 service ownership 이전', () => {
  it('일반 operator 는 content 의 serviceKey 를 타 서비스로 바꿀 수 없다', async () => {
    const res = await put('kpa-canon', KPA_OP, { title: 't', serviceKey: 'glycopharm' });
    expect(res.status).toBe(403);
    expect(res.body?.error?.message).toMatch(/Cannot change serviceKey/);
  });

  it('alias 쌍 재전송은 이전이 아니므로 허용된다', async () => {
    expect((await put('kpa-canon', KPA_OP, { title: 't', serviceKey: 'kpa' })).status).toBe(200);
    expect((await put('kcos-canon', KCOS_OP, { title: 't', serviceKey: 'cosmetics' })).status).toBe(200);
  });
});

describe('§13 platform admin 계약 유지', () => {
  it.each(['kpa-canon', 'kpa-legacy', 'gp', 'kcos-canon', 'global'])(
    'cross-service PUT %s → 200',
    async (id) => {
      expect((await put(id, PLATFORM_ADMIN)).status).toBe(200);
    },
  );

  it('cross-service lifecycle → 200', async () => {
    expect((await patchStatus('gp', PLATFORM_ADMIN)).status).toBe(200);
  });

  it('platform admin 은 serviceKey 를 타 서비스로 이전할 수 있다 (canonical 저장)', async () => {
    const res = await put('gp', PLATFORM_ADMIN, { title: 't', serviceKey: 'kpa' });
    expect(res.status).toBe(200);
    expect(saved.serviceKey).toBe('kpa-society');
  });
});

describe('비인가 / 비인증 계약 유지', () => {
  it('roles 없는 사용자는 403', async () => {
    expect((await put('kpa-canon', '')).status).toBe(403);
  });

  it('non-operator role 은 403', async () => {
    expect((await put('kpa-canon', 'kpa:member')).status).toBe(403);
    expect((await post('kpa:member', { serviceKey: 'kpa-society', type: 'notice', title: 't' })).status).toBe(403);
  });

  it('존재하지 않는 content 는 404 (인가 이전 계약 유지)', async () => {
    expect((await put('nope', KPA_OP)).status).toBe(404);
    expect((await patchStatus('nope', KPA_OP)).status).toBe(404);
  });
});
