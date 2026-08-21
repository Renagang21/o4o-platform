/**
 * WO-O4O-SIGNAGE-FORCED-CONTENT-DELETE-NOT-FOUND-NORMALIZATION-V1
 *
 * 결함: `DELETE /hq/forced-content/:id` 가 **존재하지 않는 정상 UUID** 에도
 *       `200 { deleted: true }` 를 반환했다 (DB 변경 0행).
 *
 * 근본 원인: TypeORM(postgres) 의 `query()` 는 UPDATE/DELETE 명령에 한해
 *   `[rows, affectedRowCount]` 형태로 반환한다. controller 는 이를 rows 배열로 보고
 *   `rows.length === 0` 으로 not-found 를 판정했으므로 length 가 항상 2 → 판정 불능.
 *   같은 이유로 `PATCH /hq/forced-content/:id` 도 대상이 없을 때 `200 {data: []}` 였다.
 *
 * 계약 고정:
 *  1) invalid UUID           → 400 `INVALID_ID` (route layer · handler 미진입)
 *  2) valid UUID + 대상 없음 → 404 `NOT_FOUND` (0행 판정)
 *  3) valid UUID + 대상 존재 → 기존 성공 (DELETE 200 · PATCH 200 + 객체 1건)
 *  4) 미인증 → 401 · 잘못된 serviceKey → 400 · 권한 없음 → 403 (모두 not-found 판정보다 앞선다)
 *
 * DB 는 붙이지 않는다. dataSource.query 를 postgres 반환 형태 그대로 흉내낸다.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../database/connection.js', () => ({
  AppDataSource: { query: jest.fn() },
}));

jest.mock(
  '@o4o-apps/digital-signage-core/entities',
  () => new Proxy({}, { get: () => class {} }),
  { virtual: true }
);

/** forced-content 외 controller 는 stub (entity import 회피) */
const stubController = () =>
  jest.fn().mockImplementation(
    () =>
      new Proxy({} as Record<string, unknown>, {
        get: () => (_req: any, res: any) => res.status(200).json({ stub: true }),
      })
  );

jest.mock('../routes/signage/controllers/media.controller.js', () => ({
  SignageMediaController: stubController(),
}));
jest.mock('../routes/signage/controllers/playlist.controller.js', () => ({
  SignagePlaylistController: stubController(),
}));
jest.mock('../routes/signage/controllers/schedule.controller.js', () => ({
  SignageScheduleController: stubController(),
}));
jest.mock('../routes/signage/controllers/template.controller.js', () => ({
  SignageTemplateController: stubController(),
}));
jest.mock('../routes/signage/controllers/content.controller.js', () => ({
  SignageContentController: stubController(),
}));
jest.mock('../routes/signage/controllers/global-content.controller.js', () => ({
  SignageGlobalContentController: stubController(),
}));

/** 역할은 테스트마다 바꾼다 (권한 회귀 검증용) */
let currentRoles: string[] = ['kpa:operator'];

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!req.headers.authorization) {
      return res
        .status(401)
        .json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }
    req.user = { id: 'u1', roles: currentRoles, isActive: true };
    next();
  },
}));

import { createSignageRoutes } from '../routes/signage/signage.routes.js';

const MISSING = '11111111-1111-1111-1111-111111111111';
const EXISTING = '22222222-2222-2222-2222-222222222222';

/** postgres 가 UPDATE ... RETURNING 에 대해 돌려주는 형태: [rows, rowCount] */
const pgWriteResult = (rows: any[]) => [rows, rows.length];

const query = jest.fn();
const fakeDataSource = { query, getRepository: jest.fn(() => ({})) } as any;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/signage/:serviceKey', createSignageRoutes(fakeDataSource));
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: String(err?.message ?? err) },
    });
  });
  return app;
};

const app = buildApp();
const authed = (r: request.Test) => r.set('authorization', 'Bearer t');

const row = (id: string) => ({
  id,
  title: 'forced',
  videoUrl: 'https://youtu.be/aaaaaaaaaaa',
  sourceType: 'youtube',
  embedId: 'aaaaaaaaaaa',
  isActive: true,
});

beforeEach(() => {
  currentRoles = ['kpa:operator'];
  query.mockReset();
});

describe('DELETE /hq/forced-content/:id — invalid UUID (기존 400 유지)', () => {
  it.each(['not-a-uuid', '123', 'undefined', '00000000-0000-0000-0000-00000000000'])(
    '%s → 400 INVALID_ID · DB 미도달',
    async id => {
      const res = await authed(request(app).delete(`/api/signage/kpa-society/hq/forced-content/${id}`));
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_ID');
      expect(query).not.toHaveBeenCalled();
    }
  );
});

describe('DELETE /hq/forced-content/:id — valid UUID + 대상 없음 → 404', () => {
  it('affected 0 → 404 NOT_FOUND (200 deleted:true 아님)', async () => {
    query.mockResolvedValue(pgWriteResult([]));

    const res = await authed(request(app).delete(`/api/signage/kpa-society/hq/forced-content/${MISSING}`));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Forced content not found' },
    });
    expect(res.body.data).toBeUndefined();
  });

  it('soft delete UPDATE 는 정확히 1회 · id/serviceKey 로 바인딩된다 (별도 SELECT 추가 없음)', async () => {
    query.mockResolvedValue(pgWriteResult([]));

    await authed(request(app).delete(`/api/signage/kpa-society/hq/forced-content/${MISSING}`));

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain('UPDATE signage_forced_content');
    expect(sql).toContain('deleted_at = NOW()');
    expect(params).toEqual([MISSING, 'kpa-society']);
  });
});

describe('DELETE /hq/forced-content/:id — valid UUID + 대상 존재 → 기존 성공 유지', () => {
  it('affected 1 → 200 { deleted: true }', async () => {
    query.mockResolvedValue(pgWriteResult([{ id: EXISTING }]));

    const res = await authed(request(app).delete(`/api/signage/kpa-society/hq/forced-content/${EXISTING}`));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: EXISTING, deleted: true } });
  });
});

describe('PATCH /hq/forced-content/:id — 같은 근본 원인', () => {
  it('invalid UUID → 400 INVALID_ID', async () => {
    const res = await authed(
      request(app).patch('/api/signage/kpa-society/hq/forced-content/not-a-uuid').send({ note: 'x' })
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ID');
    expect(query).not.toHaveBeenCalled();
  });

  it('valid UUID + 대상 없음 → 404 NOT_FOUND (200 data:[] 아님)', async () => {
    query.mockResolvedValue(pgWriteResult([]));

    const res = await authed(
      request(app).patch(`/api/signage/kpa-society/hq/forced-content/${MISSING}`).send({ note: 'x' })
    );

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('valid UUID + 대상 존재 → 200 · data 는 배열이 아니라 객체 1건', async () => {
    query.mockResolvedValue(pgWriteResult([row(EXISTING)]));

    const res = await authed(
      request(app).patch(`/api/signage/kpa-society/hq/forced-content/${EXISTING}`).send({ note: 'x' })
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(false);
    expect(res.body.data.id).toBe(EXISTING);
  });

  it('업데이트할 필드가 없으면 400 (기존 계약)', async () => {
    const res = await authed(
      request(app).patch(`/api/signage/kpa-society/hq/forced-content/${EXISTING}`).send({})
    );
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});

describe('GET/POST — 나머지 forced-content endpoint 회귀', () => {
  it('GET collection → 200 (SELECT 는 rows 배열 그대로)', async () => {
    query.mockResolvedValue([row(EXISTING)]);
    const res = await authed(request(app).get('/api/signage/kpa-society/hq/forced-content'));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('POST create → 201 (INSERT 는 rows 배열 그대로 · 객체 1건 반환)', async () => {
    query.mockResolvedValue([row(EXISTING)]);
    const res = await authed(
      request(app).post('/api/signage/kpa-society/hq/forced-content').send({
        title: 'forced',
        videoUrl: 'https://youtu.be/aaaaaaaaaaa',
        startAt: '2026-01-01T00:00:00.000Z',
        endAt: '2026-01-02T00:00:00.000Z',
      })
    );
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(EXISTING);
  });
});

describe('authorization / serviceKey 우선순위 (not-found 판정보다 앞선다)', () => {
  it('미인증 + valid missing UUID → 401 · DB 미도달', async () => {
    const res = await request(app).delete(`/api/signage/kpa-society/hq/forced-content/${MISSING}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
    expect(query).not.toHaveBeenCalled();
  });

  it('잘못된 serviceKey → 400 · DB 미도달', async () => {
    const res = await authed(request(app).delete(`/api/signage/nope/hq/forced-content/${MISSING}`));
    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });

  it('operator 권한 없음 → 403 · DB 미도달', async () => {
    currentRoles = ['kpa:store_owner'];
    const res = await authed(request(app).delete(`/api/signage/kpa-society/hq/forced-content/${MISSING}`));
    expect(res.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('serviceKey canonicalization 회귀', () => {
  it.each([
    ['kpa-society', 'kpa-society'],
    ['kpa', 'kpa-society'],
    ['k-cosmetics', 'k-cosmetics'],
    ['cosmetics', 'k-cosmetics'],
    ['glycopharm', 'glycopharm'],
  ])('%s → canonical %s 로 scope 되고 대상 없음이면 404', async (raw, canonical) => {
    currentRoles = ['kpa:operator', 'cosmetics:operator', 'glycopharm:operator'];
    query.mockResolvedValue(pgWriteResult([]));

    const res = await authed(request(app).delete(`/api/signage/${raw}/hq/forced-content/${MISSING}`));

    expect(res.status).toBe(404);
    expect(query.mock.calls[0][1]).toEqual([MISSING, canonical]);
  });
});
