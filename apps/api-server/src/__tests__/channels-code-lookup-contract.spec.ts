/**
 * WO-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1
 *
 * 계약 분리(§11·§12):
 *   ENUMERATION  `GET /channels`            → serviceKey 필수 (없으면 400)
 *   EXACT LOOKUP `GET /channels/code/:code` → 익명 단건 조회 허용 (canonical)
 *
 * `?code=` 를 목록 handler 의 예외로 되살려 enumeration 을 우회하지 않는다.
 * player 는 목록이 아니라 canonical 단건 endpoint 를 호출한다(§14, 정적 계약 테스트 포함).
 */
import 'reflect-metadata';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

let currentUser: { id: string; roles: string[] } | undefined;

jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: jest.fn(async (userId: string, roles: string[]) => {
      if (!currentUser || currentUser.id !== userId) return false;
      return currentUser.roles.some((r) => roles.includes(r));
    }),
  },
}));

jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    if (currentUser) req.user = currentUser;
    next();
  },
  requireAdmin: (_req: any, res: any) => {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@o4o-apps/cms-core', () => require('@o4o-apps/cms-core/entities'), { virtual: true });

import { createChannelRoutes } from '../routes/channels/channels.routes.js';

const CODE = 'KPA-LOBBY-01';
const UUID_LIKE_CODE = '11111111-1111-4111-8111-111111111111';
const CHANNEL_ID = '99999999-9999-4999-8999-999999999999';

function channelRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CHANNEL_ID,
    serviceKey: 'kpa-society',
    organizationId: null,
    name: 'KPA Lobby',
    code: CODE,
    description: null,
    type: 'tv',
    slotKey: 'intranet-hero',
    status: 'active',
    resolution: null,
    orientation: 'landscape',
    autoplay: true,
    refreshIntervalSec: null,
    defaultDurationSec: 10,
    location: null,
    metadata: {},
    createdBy: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

interface Calls {
  listWhere: any[];
  findOneOpts: any[];
  slotParams: Record<string, unknown>;
}
let calls: Calls;

function buildApp(row: any = channelRow()) {
  calls = { listWhere: [], findOneOpts: [], slotParams: {} };

  const channelRepo = {
    findAndCount: jest.fn(async (opts: any) => {
      calls.listWhere.push(opts.where);
      return [[row], 1];
    }),
    findOne: jest.fn(async (opts: any) => {
      calls.findOneOpts.push(opts);
      const where = opts.where || {};
      if (where.code !== undefined) return where.code === row.code ? row : null;
      if (where.id !== undefined) return where.id === row.id ? row : null;
      return null;
    }),
  };

  const slotRepo = {
    createQueryBuilder: jest.fn(() => {
      const qb: any = {
        leftJoinAndSelect: () => qb,
        where: (_s: string, p?: Record<string, unknown>) => {
          Object.assign(calls.slotParams, p || {});
          return qb;
        },
        andWhere: (_s: string, p?: Record<string, unknown>) => {
          Object.assign(calls.slotParams, p || {});
          return qb;
        },
        orderBy: () => qb,
        getMany: async () => [],
      };
      return qb;
    }),
  };

  const dataSource: any = {
    getRepository: (entity: any) => (entity?.name === 'Channel' ? channelRepo : slotRepo),
  };

  const app = express();
  app.use(express.json());
  app.use('/api/v1/channels', createChannelRoutes(dataSource));
  return app;
}

beforeEach(() => {
  currentUser = undefined;
});

// ============================================================================
// §12 enumeration 계약은 code 로 우회되지 않는다
// ============================================================================
describe('ENUMERATION: ?code= 는 목록 경계를 우회하지 않는다', () => {
  it('GET /channels (serviceKey 없음) → 400 SERVICE_KEY_REQUIRED', async () => {
    const res = await request(buildApp()).get('/api/v1/channels');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SERVICE_KEY_REQUIRED');
  });

  it('GET /channels?code=foo (serviceKey 없음) → 400 (익명 목록 우회 불가)', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/channels?code=foo');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SERVICE_KEY_REQUIRED');
    expect(calls.listWhere).toHaveLength(0);
  });

  it('목록 handler 는 code 를 필터로 취급하지 않는다 (예외 분기 신설 금지)', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/channels?serviceKey=kpa&code=foo');
    expect(res.status).toBe(200);
    expect(calls.listWhere[0].code).toBeUndefined();
  });
});

// ============================================================================
// §9·§11 canonical exact lookup
// ============================================================================
describe('EXACT LOOKUP: GET /channels/code/:code 가 canonical 단건 경로다', () => {
  it('익명 + 정확한 code → 200 + { success, data }', async () => {
    const res = await request(buildApp()).get(`/api/v1/channels/code/${CODE}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(CHANNEL_ID);
    expect(res.body.data.code).toBe(CODE);
  });

  it('없는 code → 404 NOT_FOUND', async () => {
    const res = await request(buildApp()).get('/api/v1/channels/code/NO-SUCH');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('exact match 만 한다 — prefix/부분 문자열로는 찾히지 않는다', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/v1/channels/code/KPA');
    expect(res.status).toBe(404);
    // 검색이 아니라 동등 비교여야 한다.
    expect(calls.findOneOpts[0].where).toEqual({ code: 'KPA' });
  });

  it('URL-encoded code 도 원문으로 조회된다', async () => {
    const app = buildApp(channelRow({ code: 'KPA LOBBY/01' }));
    const res = await request(app).get(`/api/v1/channels/code/${encodeURIComponent('KPA LOBBY/01')}`);
    expect(res.status).toBe(200);
    expect(calls.findOneOpts[0].where).toEqual({ code: 'KPA LOBBY/01' });
  });

  it('§13 중복 code 가 있어도 결과가 흔들리지 않게 가장 오래된 행으로 고정한다', async () => {
    const app = buildApp();
    await request(app).get(`/api/v1/channels/code/${CODE}`);
    expect(calls.findOneOpts[0].order).toEqual({ createdAt: 'ASC' });
  });

  it('§18 status filtering: inactive 채널도 code 로 조회된다 (재생 판단은 player)', async () => {
    const app = buildApp(channelRow({ status: 'inactive' }));
    const res = await request(app).get(`/api/v1/channels/code/${CODE}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('inactive');
  });
});

// ============================================================================
// §16 route shadowing
// ============================================================================
describe('ROUTE ORDER: /code/:code 는 /:id 에 가려지지 않는다', () => {
  it('UUID 형태의 code 도 code handler 에 도달한다', async () => {
    const app = buildApp(channelRow({ code: UUID_LIKE_CODE }));
    const res = await request(app).get(`/api/v1/channels/code/${UUID_LIKE_CODE}`);
    expect(res.status).toBe(200);
    // /:id 로 갔다면 where 가 { id: ... } 였을 것이다.
    expect(calls.findOneOpts[0].where).toEqual({ code: UUID_LIKE_CODE });
  });

  it('UUID 가 아닌 단일 세그먼트는 여전히 /:id 의 400 INVALID_ID 다', async () => {
    const res = await request(buildApp()).get('/api/v1/channels/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('/health 도 여전히 가려지지 않는다', async () => {
    const res = await request(buildApp()).get('/api/v1/channels/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('channels');
  });

  it('라우트 선언 순서가 static-first 다 (/health → /code/:code → /:id)', () => {
    // doc comment 안의 예시 문자열이 아니라 실제 선언 순서만 본다.
    const src = fs
      .readFileSync(path.resolve(__dirname, '../routes/channels/channels.routes.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(String.fromCharCode(10))
      .filter((line) => !line.trim().startsWith('//'))
      .join(String.fromCharCode(10));
    const health = src.indexOf("router.get('/health'");
    const byCode = src.indexOf("router.get('/code/:code'");
    const byId = src.indexOf("router.get('/:id'");
    expect(health).toBeGreaterThan(-1);
    expect(byCode).toBeGreaterThan(-1);
    expect(byId).toBeGreaterThan(-1);
    expect(health).toBeLessThan(byId);
    expect(byCode).toBeLessThan(byId);
  });
});

// ============================================================================
// §19 slot linkage 회귀 — code lookup 이후 alias 호환이 유지된다
// ============================================================================
describe('SLOT LINKAGE: code lookup 이후에도 canonical/legacy alias 가 함께 매칭된다', () => {
  it('kpa-society 채널의 slot 조회는 legacy kpa 까지 포함한다', async () => {
    const app = buildApp();
    const res = await request(app).get(`/api/v1/channels/${CHANNEL_ID}/contents`);
    expect(res.status).toBe(200);
    expect(calls.slotParams.serviceKeys).toEqual(['kpa-society', 'kpa']);
  });

  it('contents 응답은 player 가 쓰는 channel 메타를 그대로 포함한다', async () => {
    const res = await request(buildApp()).get(`/api/v1/channels/${CHANNEL_ID}/contents`);
    expect(res.body.channel).toMatchObject({
      id: CHANNEL_ID,
      code: CODE,
      serviceKey: 'kpa-society',
      slotKey: 'intranet-hero',
      status: 'active',
    });
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBe(0);
  });
});

// ============================================================================
// §22 정적 계약 — player client 는 목록 endpoint 를 호출하지 않는다
// ============================================================================
describe('STATIC CONTRACT: signage-player-web 의 channel lookup', () => {
  const PLAYER_CLIENT = path.resolve(
    __dirname,
    '../../../../services/signage-player-web/src/api/channels.ts',
  );
  const src = () => fs.readFileSync(PLAYER_CLIENT, 'utf8');
  const code = () =>
    src()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(String.fromCharCode(10))
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join(String.fromCharCode(10));

  it('player client 파일이 존재한다', () => {
    expect(fs.existsSync(PLAYER_CLIENT)).toBe(true);
  });

  it('목록 endpoint 를 code 조회에 쓰지 않는다 (`/channels?code=` 금지)', () => {
    expect(code()).not.toMatch(/\/api\/v1\/channels\?/);
    expect(code()).not.toMatch(/channels\?code=/);
  });

  it('canonical 단건 endpoint 를 호출한다', () => {
    expect(code()).toContain('/api/v1/channels/code/');
  });

  it('serviceKey 를 player 에 주입하지 않는다 (device 는 serviceKey 를 모른다)', () => {
    expect(code()).not.toMatch(/serviceKey=/);
  });

  it('telemetry endpoint 는 그대로 유지된다 (§20 회귀 방지)', () => {
    const c = code();
    expect(c).toContain('/playback-log');
    expect(c).toContain('/heartbeat');
  });
});
