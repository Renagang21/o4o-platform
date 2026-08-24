/**
 * WO-O4O-CMS-CONTENT-DETAIL-SERVICE-SCOPE-GUARD-V1
 *
 * `GET /api/v1/cms/contents/:id` 의 조회 경계 계약을 고정한다.
 *
 * 배경: 상세 조회가 `findOne({ where: { id } })` 로 **UUID 단독** 조회여서
 *   타 서비스 콘텐츠를 UUID 만 알면 읽을 수 있었다(프로덕션 실측 4/4 200).
 *
 * 이번에 고정하는 계약:
 *   1. `serviceKey` 가 주어지면 **DB 조회 자체가** 그 서비스로 제한된다
 *      (조회 후 응답에서 지우는 방식이 아니다 — WO §13 금지 항목).
 *      → 목록에 없는 row 가 상세에서 보이지 않는다 (§17 list/detail 정합).
 *   2. `serviceKey` 미지정은 **PLATFORM_ADMIN 역할**일 때만 cross-service 로 허용된다
 *      (WO-O4O-CMS-READ-VISIBILITY-AND-SERVICE-SCOPE-CONTRACT-CLOSURE-V1 —
 *       파라미터 생략을 관리자 모드로 해석하지 않는다). 그 외에는 400 SERVICE_KEY_REQUIRED.
 *   3. 잘못된 형식의 id 는 DB 로 가지 않고 **기존 canonical 404** 를 반환한다
 *      (기존에는 500 + Postgres 원문이 노출됐다).
 *   4. 비인증 사용자에게 미게시 콘텐츠는 404 (기존 hardening 계약 유지).
 */
import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    if (req.headers['x-test-user'] === '1') req.user = { id: 'u-1', roles: [] };
    if (req.headers['x-test-admin'] === '1')
      req.user = { id: 'admin-1', roles: ['platform:super_admin'] };
    next();
  },
}));

jest.mock(
  '@o4o-apps/cms-core',
  () => ({ CmsContent: class CmsContent {}, ContentType: {}, ContentStatus: {} }),
  { virtual: true },
);

jest.mock(
  '@o4o/types',
  () => ({
    mapCmsAuthorRole: (v: string) => v,
    mapCmsVisibilityScope: (v: string) => v,
    mapCmsStatus: (v: string) => v,
  }),
  { virtual: true },
);

jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { hasAnyRole: jest.fn(async () => false) },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { createCmsContentQueryRoutes } from '../routes/cms-content/cms-content-query.handler.js';

/** 서비스별 1건씩 — 프로덕션 분포를 축약한 픽스처 */
const ROWS = [
  { id: '11111111-1111-4111-8111-111111111111', serviceKey: 'pharmacy-hub', status: 'published', title: 'PH', organizationId: null },
  { id: '22222222-2222-4222-8222-222222222222', serviceKey: 'kpa-society', status: 'published', title: 'KPA', organizationId: null },
  { id: '33333333-3333-4333-8333-333333333333', serviceKey: 'glycopharm', status: 'published', title: 'GP', organizationId: null },
  { id: '44444444-4444-4444-8444-444444444444', serviceKey: 'kpa-society', status: 'draft', title: 'KPA draft', organizationId: null },
  { id: '55555555-5555-4555-8555-555555555555', serviceKey: 'k-cosmetics', status: 'published', title: 'KCos', organizationId: null },
  { id: '66666666-6666-4666-8666-666666666666', serviceKey: 'cosmetics', status: 'published', title: 'KCos legacy', organizationId: null },
  // §11: visibilityScope='platform' 은 cross-service 공개가 **아니다** (제작 주체 축)
  { id: '77777777-7777-4777-8777-777777777777', serviceKey: 'glycopharm', status: 'published', title: 'GP platform-visibility', organizationId: null, visibilityScope: 'platform' },
];

/** where.serviceKey 는 alias 집합이라 `In([...])` FindOperator 로 들어온다 */
function matchServiceKey(row: any, where: any): boolean {
  const sk = where?.serviceKey;
  if (sk === undefined) return true;
  const values: string[] = sk?._value ?? [sk];
  return values.includes(row.serviceKey);
}

/** 마지막 findOne 이 받은 where — "조회 자체가 제한되는가" 를 검사한다 */
let lastWhere: any = null;

function makeApp() {
  lastWhere = null;
  const dataSource: any = {
    getRepository: () => ({
      findOne: jest.fn(async ({ where }: any) => {
        lastWhere = where;
        return ROWS.find((r) => r.id === where.id && matchServiceKey(r, where)) ?? null;
      }),
      findAndCount: jest.fn(async ({ where }: any) => {
        lastWhere = where;
        const rows = ROWS.filter(
          (r) =>
            matchServiceKey(r, where) && (where.status === undefined || r.status === where.status),
        );
        return [rows, rows.length];
      }),
      count: jest.fn(async ({ where }: any) => {
        lastWhere = where;
        return ROWS.filter((r) => matchServiceKey(r, where)).length;
      }),
    }),
  };
  const app = express();
  app.use('/cms', createCmsContentQueryRoutes({ dataSource }));
  return app;
}

const PH = ROWS[0].id;
const KPA = ROWS[1].id;
const GP = ROWS[2].id;
const KPA_DRAFT = ROWS[3].id;
const KCOS = ROWS[4].id;
const KCOS_LEGACY = ROWS[5].id;
const GP_PLATFORM = ROWS[6].id;
const MISSING = '99999999-9999-4999-8999-999999999999';

describe('§17 list/detail 정합 — 목록에 없는 타 서비스 row 는 상세로도 못 본다', () => {
  it('pharmacy-hub context 로 KPA content UUID → 404', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}?serviceKey=pharmacy-hub`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('NOT_FOUND');
  });

  it('pharmacy-hub context 로 GlycoPharm content UUID → 404', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${GP}?serviceKey=pharmacy-hub`);
    expect(res.status).toBe(404);
  });

  it('kpa-society context 로 PH content UUID → 404 (반대 방향)', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${PH}?serviceKey=kpa-society`);
    expect(res.status).toBe(404);
  });

  it('차단이 응답 가공이 아니라 **DB 조회 조건**으로 이루어진다', async () => {
    await request(makeApp()).get(`/cms/contents/${KPA}?serviceKey=pharmacy-hub`);
    expect(lastWhere.id).toBe(KPA);
    expect(lastWhere.serviceKey).toBeDefined();
    expect(matchServiceKey({ serviceKey: 'pharmacy-hub' }, lastWhere)).toBe(true);
    expect(matchServiceKey({ serviceKey: 'kpa-society' }, lastWhere)).toBe(false);
  });
});

describe('자기 서비스 상세는 기존대로 정상', () => {
  it('pharmacy-hub context + PH content → 200', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${PH}?serviceKey=pharmacy-hub`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(PH);
    expect(res.body.data.serviceKey).toBe('pharmacy-hub');
  });

  it('kpa-society context + KPA content → 200', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}?serviceKey=kpa-society`);
    expect(res.status).toBe(200);
  });
});

describe('serviceKey 미지정 = 역할 근거로만 cross-service (WO-...-CONTRACT-CLOSURE-V1)', () => {
  it('비인증 + serviceKey 없음 → 400 SERVICE_KEY_REQUIRED (DB 까지 가지 않는다)', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}`);
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('SERVICE_KEY_REQUIRED');
    expect(lastWhere).toBeNull();
  });

  it('일반 인증 사용자도 serviceKey 없으면 400 (로그인이 cross-service 근거가 아니다)', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}`).set('x-test-user', '1');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('SERVICE_KEY_REQUIRED');
  });

  it('platform:super_admin 은 serviceKey 없이 cross-service 조회 가능', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}`).set('x-test-admin', '1');
    expect(res.status).toBe(200);
    expect(lastWhere.serviceKey).toBeUndefined();
  });
});

describe('KPA serviceKey alias — kpa / kpa-society 는 같은 경계다', () => {
  it('serviceKey=kpa 로도 kpa-society row 를 조회한다', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}?serviceKey=kpa`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(KPA);
  });

  it('serviceKey=kpa-society 로도 legacy kpa 축이 같은 집합이다', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}?serviceKey=kpa-society`);
    expect(res.status).toBe(200);
    expect(matchServiceKey({ serviceKey: 'kpa' }, lastWhere)).toBe(true);
  });

  it('alias 는 KPA 축에만 적용된다 (kpa 로 GP 는 못 본다)', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${GP}?serviceKey=kpa`);
    expect(res.status).toBe(404);
  });
});

describe('K-Cosmetics alias — cosmetics / k-cosmetics 도 같은 canonical 축이다 (WO §10)', () => {
  it('serviceKey=cosmetics 로 k-cosmetics row 를 조회한다', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KCOS}?serviceKey=cosmetics`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(KCOS);
  });

  it('serviceKey=k-cosmetics 로 legacy cosmetics row 를 조회한다', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KCOS_LEGACY}?serviceKey=k-cosmetics`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(KCOS_LEGACY);
  });

  it('KCos context 로 KPA row 는 못 본다 (alias 가 경계를 넓히지 않는다)', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}?serviceKey=cosmetics`);
    expect(res.status).toBe(404);
  });

  it('self-map 서비스는 자기 키 1개다 (alias 발명 금지)', async () => {
    await request(makeApp()).get(`/cms/contents/${PH}?serviceKey=pharmacy-hub`);
    expect(lastWhere.serviceKey?._value).toEqual(['pharmacy-hub']);
  });
});

describe('§7 list/detail invariant — 목록·집계도 같은 경계로 닫힌다', () => {
  it('GET /cms/contents 는 serviceKey 없으면 400', async () => {
    const res = await request(makeApp()).get('/cms/contents');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('SERVICE_KEY_REQUIRED');
  });

  it('GET /cms/contents?serviceKey=pharmacy-hub 는 타 서비스 row 를 반환하지 않는다', async () => {
    const res = await request(makeApp()).get('/cms/contents?serviceKey=pharmacy-hub');
    expect(res.status).toBe(200);
    expect(res.body.data.every((c: any) => c.serviceKey === 'pharmacy-hub')).toBe(true);
  });

  it('GET /cms/stats 는 serviceKey 없으면 400 (집계도 read 다)', async () => {
    const res = await request(makeApp()).get('/cms/stats');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('SERVICE_KEY_REQUIRED');
  });

  it('GET /cms/stats?serviceKey=kpa 는 alias 집합으로 집계한다', async () => {
    const res = await request(makeApp()).get('/cms/stats?serviceKey=kpa');
    expect(res.status).toBe(200);
    expect(res.body.scope.serviceKeys).toEqual(['kpa-society', 'kpa']);
    expect(res.body.scope.crossService).toBe(false);
  });
});

describe("§11 visibilityScope='platform' 은 cross-service global 이 아니다", () => {
  it('GP platform-visibility row 는 KPA context 에서 보이지 않는다', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${GP_PLATFORM}?serviceKey=kpa-society`);
    expect(res.status).toBe(404);
  });

  it('GP platform-visibility row 는 자기 서비스에서는 정상 조회된다', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${GP_PLATFORM}?serviceKey=glycopharm`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(GP_PLATFORM);
  });

  it('service boundary 가 visibilityScope 보다 먼저 적용된다 (조회 조건 자체)', async () => {
    await request(makeApp()).get(`/cms/contents/${GP_PLATFORM}?serviceKey=kpa-society`);
    expect(lastWhere.serviceKey?._value).toEqual(['kpa-society', 'kpa']);
  });
});

describe('not-found / 형식 오류 계약', () => {
  it('존재하지 않는 valid UUID → 404 (기존 계약)', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${MISSING}?serviceKey=kpa-society`);
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('NOT_FOUND');
  });

  it('invalid UUID → 404 (기존에는 500 + DB 원문 노출)', async () => {
    const res = await request(makeApp()).get('/cms/contents/not-a-uuid');
    expect(res.status).toBe(404);
    expect(res.body?.error?.code).toBe('NOT_FOUND');
    expect(JSON.stringify(res.body)).not.toContain('invalid input syntax');
  });

  it('invalid UUID 는 DB 까지 가지 않는다', async () => {
    await request(makeApp()).get('/cms/contents/not-a-uuid');
    expect(lastWhere).toBeNull();
  });
});

describe('비인증 visibility hardening 회귀 없음', () => {
  it('비인증 사용자에게 draft 는 404', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA_DRAFT}?serviceKey=kpa-society`);
    expect(res.status).toBe(404);
  });

  it('인증 사용자는 draft 조회 가능 (기존 동작)', async () => {
    const res = await request(makeApp())
      .get(`/cms/contents/${KPA_DRAFT}?serviceKey=kpa-society`)
      .set('x-test-user', '1');
    expect(res.status).toBe(200);
  });
});
