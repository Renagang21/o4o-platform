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
 *   2. `serviceKey` 미지정 시 기존 동작(공개 published 조회 · admin cross-service)을 유지한다.
 *   3. 잘못된 형식의 id 는 DB 로 가지 않고 **기존 canonical 404** 를 반환한다
 *      (기존에는 500 + Postgres 원문이 노출됐다).
 *   4. 비인증 사용자에게 미게시 콘텐츠는 404 (기존 hardening 계약 유지).
 */
import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    if (req.headers['x-test-user'] === '1') req.user = { id: 'u-1', roles: [] };
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

import { createCmsContentQueryRoutes } from '../routes/cms-content/cms-content-query.handler.js';

/** 서비스별 1건씩 — 프로덕션 분포를 축약한 픽스처 */
const ROWS = [
  { id: '11111111-1111-4111-8111-111111111111', serviceKey: 'pharmacy-hub', status: 'published', title: 'PH', organizationId: null },
  { id: '22222222-2222-4222-8222-222222222222', serviceKey: 'kpa-society', status: 'published', title: 'KPA', organizationId: null },
  { id: '33333333-3333-4333-8333-333333333333', serviceKey: 'glycopharm', status: 'published', title: 'GP', organizationId: null },
  { id: '44444444-4444-4444-8444-444444444444', serviceKey: 'kpa-society', status: 'draft', title: 'KPA draft', organizationId: null },
];

/** 마지막 findOne 이 받은 where — "조회 자체가 제한되는가" 를 검사한다 */
let lastWhere: any = null;

function makeApp() {
  lastWhere = null;
  const dataSource: any = {
    getRepository: () => ({
      findOne: jest.fn(async ({ where }: any) => {
        lastWhere = where;
        return (
          ROWS.find(
            (r) =>
              r.id === where.id &&
              (where.serviceKey === undefined || r.serviceKey === where.serviceKey),
          ) ?? null
        );
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
    expect(lastWhere).toEqual({ id: KPA, serviceKey: 'pharmacy-hub' });
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

describe('serviceKey 미지정 = 기존 계약 유지 (공개/admin cross-service)', () => {
  it('serviceKey 없으면 종전처럼 조회된다 (하위호환)', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${KPA}`);
    expect(res.status).toBe(200);
    expect(lastWhere).toEqual({ id: KPA });
  });
});

describe('not-found / 형식 오류 계약', () => {
  it('존재하지 않는 valid UUID → 404 (기존 계약)', async () => {
    const res = await request(makeApp()).get(`/cms/contents/${MISSING}`);
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
