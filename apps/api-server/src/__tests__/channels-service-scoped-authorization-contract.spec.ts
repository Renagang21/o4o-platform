/**
 * WO-O4O-CHANNELS-SERVICE-SCOPED-AUTHORIZATION-CONTRACT-V1
 *
 * 확정된 계약(§6):
 *   MANAGEMENT (POST / PUT / PATCH / DELETE)
 *     → platform admin(`platform:super_admin`) 전용. service operator 에게 channel 관리
 *       권한을 부여할 제품 근거(role catalog 의 channel permission, service 운영 UI,
 *       consumer)가 코드·운영 구조 어디에도 없다 → SERVICE_OPERATOR_WRITE_NOT_GRANTED.
 *
 *   ENUMERATION (GET /channels)
 *     → serviceKey 로 경계를 갖는다. serviceKey 없이 전 서비스 channel 을 익명에게
 *       돌려주던 동작을 닫는다. 판정은 CMS read 경계 helper(resolveCmsReadScope) 한 벌로 한다.
 *
 *   DEVICE-ADDRESSED PUBLIC READ (GET /:id, /code/:code, /:id/contents)
 *     → 익명 유지. signage player 는 serviceKey 를 갖지 않고 channel id/code 자체가
 *       주소이자 capability 다. 여기에 serviceKey 를 요구하면 유일한 production
 *       consumer 가 끊긴다.
 *
 *   DEVICE INGEST (POST /:id/playback-log, /:id/heartbeat)
 *     → INTENTIONAL_DEVICE_INGEST. 무인증이 의도이며(코드 주석 + player 클라이언트가
 *       credential 을 전혀 보내지 않음), serviceKey/organizationId 를 body 에서 받지 않고
 *       **channel row 에서 파생**하므로 cross-service 주입 경로가 없다.
 *
 * 이 spec 은 "import 가능" 같은 약한 검사를 하지 않는다. 실제 라우터를 mount 하고
 * actor(anonymous / service operator / platform admin) x endpoint 전수로 응답과
 * **실제 repository 에 전달된 where 절**을 검증한다.
 */
import 'reflect-metadata';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

// ── actor 주입 지점 ──────────────────────────────────────────────────────────
type TestUser = { id: string; roles: string[] } | undefined;
let currentUser: TestUser;

jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: jest.fn(async (userId: string, roles: string[]) => {
      if (!currentUser || currentUser.id !== userId) return false;
      return currentUser.roles.some((r) => roles.includes(r));
    }),
  },
}));

// 실제 requireAdmin 의 계약(401 미인증 / 403 non-admin / platform:super_admin 만 통과)을
// 그대로 재현한다. 미들웨어 구현 자체는 CORE_FREEZE 대상이라 이 WO 에서 건드리지 않는다.
jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    if (currentUser) req.user = currentUser;
    next();
  },
  requireAdmin: async (req: any, res: any, next: any) => {
    if (!currentUser) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    req.user = currentUser;
    if (!currentUser.roles.includes('platform:super_admin')) {
      res.status(403).json({ success: false, error: 'Admin privileges required', code: 'FORBIDDEN' });
      return;
    }
    next();
  },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('@o4o-apps/cms-core', () => require('@o4o-apps/cms-core/entities'), { virtual: true });

import { createChannelRoutes } from '../routes/channels/channels.routes.js';

const CHANNEL_ID = '11111111-1111-4111-8111-111111111111';
const CONTENT_ID = '22222222-2222-4222-8222-222222222222';

const CHANNEL_ROW = {
  id: CHANNEL_ID,
  serviceKey: 'kpa-society',
  organizationId: null as string | null,
  name: 'KPA Lobby TV',
  code: 'KPA-LOBBY',
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
};

// ── repository spy ──────────────────────────────────────────────────────────
interface Calls {
  listWhere: any[];
  saved: any[];
}
let calls: Calls;

function buildApp() {
  calls = { listWhere: [], saved: [] };

  const channelRepo = {
    findAndCount: jest.fn(async (opts: any) => {
      calls.listWhere.push(opts.where);
      return [[CHANNEL_ROW], 1];
    }),
    findOne: jest.fn(async (opts: any) => {
      const where = opts.where || {};
      if (where.code !== undefined) return where.code === CHANNEL_ROW.code ? CHANNEL_ROW : null;
      if (where.id !== undefined) return where.id === CHANNEL_ID ? CHANNEL_ROW : null;
      return null;
    }),
    create: jest.fn((data: any) => ({ id: CHANNEL_ID, ...data })),
    save: jest.fn(async (entity: any) => {
      calls.saved.push(entity);
      return entity;
    }),
    merge: jest.fn((target: any, data: any) => Object.assign(target, data)),
    remove: jest.fn(async (entity: any) => entity),
    delete: jest.fn(async () => ({ affected: 1 })),
  };

  const slotRepo = {
    createQueryBuilder: jest.fn(() => {
      const qb: any = {
        leftJoinAndSelect: () => qb,
        where: () => qb,
        andWhere: () => qb,
        orderBy: () => qb,
        getMany: async () => [],
      };
      return qb;
    }),
  };

  const telemetryRepo = {
    create: jest.fn((data: any) => ({ id: CONTENT_ID, ...data })),
    save: jest.fn(async (entity: any) => {
      calls.saved.push(entity);
      return entity;
    }),
  };

  const dataSource: any = {
    getRepository: (entity: any) => {
      const name = entity?.name;
      if (name === 'Channel') return channelRepo;
      if (name === 'CmsContentSlot' || name === 'CmsContent') return slotRepo;
      return telemetryRepo;
    },
  };

  const app = express();
  app.use(express.json());
  app.use('/api/v1/channels', createChannelRoutes(dataSource));
  return app;
}

const ANONYMOUS: TestUser = undefined;
const KPA_OPERATOR: TestUser = { id: 'user-kpa-op', roles: ['kpa:operator'] };
const COSMETICS_OPERATOR: TestUser = { id: 'user-cos-op', roles: ['cosmetics:operator'] };
const PLATFORM_ADMIN: TestUser = { id: 'user-admin', roles: ['platform:super_admin'] };

let app: express.Express;

beforeEach(() => {
  currentUser = ANONYMOUS;
  app = buildApp();
});

// ============================================================================
// §13 ENUMERATION — GET /api/v1/channels
// ============================================================================
describe('ENUMERATION: GET /api/v1/channels — serviceKey 가 read 경계다', () => {
  it('anonymous + serviceKey 없음 → 400 SERVICE_KEY_REQUIRED (전 서비스 열람 차단)', async () => {
    const res = await request(app).get('/api/v1/channels');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SERVICE_KEY_REQUIRED');
    // 거부는 DB 에 도달하기 전에 끝나야 한다.
    expect(calls.listWhere).toHaveLength(0);
  });

  it('service operator + serviceKey 없음 → 400 (operator 도 cross-service enumeration 불가)', async () => {
    currentUser = KPA_OPERATOR;
    const res = await request(app).get('/api/v1/channels');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SERVICE_KEY_REQUIRED');
    expect(calls.listWhere).toHaveLength(0);
  });

  it('platform admin + serviceKey 없음 → 200 cross-service (역할 근거로만 허용)', async () => {
    currentUser = PLATFORM_ADMIN;
    const res = await request(app).get('/api/v1/channels');
    expect(res.status).toBe(200);
    expect(calls.listWhere).toHaveLength(1);
    expect(calls.listWhere[0].serviceKey).toBeUndefined();
  });

  it('anonymous + serviceKey=kpa → 200, 그 서비스 alias 집합으로만 제한', async () => {
    const res = await request(app).get('/api/v1/channels?serviceKey=kpa');
    expect(res.status).toBe(200);
    expect(calls.listWhere[0].serviceKey._value).toEqual(['kpa-society', 'kpa']);
  });

  it('alias 입력과 canonical 입력이 같은 모집단을 만든다 (kpa == kpa-society)', async () => {
    await request(app).get('/api/v1/channels?serviceKey=kpa');
    await request(app).get('/api/v1/channels?serviceKey=kpa-society');
    expect(calls.listWhere[0].serviceKey._value).toEqual(calls.listWhere[1].serviceKey._value);
  });

  it('platform admin 도 serviceKey 를 주면 그 서비스로 제한된다 (admin 예외 없음)', async () => {
    currentUser = PLATFORM_ADMIN;
    await request(app).get('/api/v1/channels?serviceKey=cosmetics');
    expect(calls.listWhere[0].serviceKey._value).toEqual(['k-cosmetics', 'cosmetics']);
  });

  it('cross-service 격리: cosmetics operator 가 kpa 를 물어도 kpa 모집단이 섞이지 않는다', async () => {
    currentUser = COSMETICS_OPERATOR;
    await request(app).get('/api/v1/channels?serviceKey=cosmetics');
    const scoped = calls.listWhere[0].serviceKey._value;
    expect(scoped).toEqual(['k-cosmetics', 'cosmetics']);
    expect(scoped).not.toContain('kpa-society');
    expect(scoped).not.toContain('kpa');
  });
});

// ============================================================================
// §11 DEVICE-ADDRESSED PUBLIC READ — 단건 조회는 익명 유지
// ============================================================================
describe('PUBLIC READ: 단건 조회는 device 계약으로 익명 유지', () => {
  it('anonymous GET /:id → 200', async () => {
    const res = await request(app).get(`/api/v1/channels/${CHANNEL_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(CHANNEL_ID);
  });

  it('anonymous GET /code/:code → 200', async () => {
    const res = await request(app).get('/api/v1/channels/code/KPA-LOBBY');
    expect(res.status).toBe(200);
  });

  it('anonymous GET /:id/contents → 200', async () => {
    const res = await request(app).get(`/api/v1/channels/${CHANNEL_ID}/contents`);
    expect(res.status).toBe(200);
    expect(res.body.channel.serviceKey).toBe('kpa-society');
  });

  it('존재하지 않는 단건은 404 (존재 여부를 상태코드로 구분 노출하지 않는 기존 관례)', async () => {
    const res = await request(app).get('/api/v1/channels/33333333-3333-4333-8333-333333333333');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

// ============================================================================
// §12 / §20 DEVICE INGEST — INTENTIONAL_DEVICE_INGEST
// ============================================================================
describe('DEVICE INGEST: 무인증 telemetry write 는 의도된 계약이다', () => {
  it('anonymous POST /:id/playback-log → 201', async () => {
    const res = await request(app)
      .post(`/api/v1/channels/${CHANNEL_ID}/playback-log`)
      .send({ contentId: CONTENT_ID, durationSec: 12 });
    expect(res.status).toBe(201);
  });

  it('playback-log 의 serviceKey/organizationId 는 body 가 아니라 channel row 에서 파생된다', async () => {
    await request(app)
      .post(`/api/v1/channels/${CHANNEL_ID}/playback-log`)
      .send({
        contentId: CONTENT_ID,
        durationSec: 12,
        serviceKey: 'k-cosmetics',
        organizationId: '99999999-9999-4999-8999-999999999999',
      });
    const saved = calls.saved[0];
    expect(saved.serviceKey).toBe('kpa-society');
    expect(saved.organizationId).toBeNull();
  });

  it('anonymous POST /:id/heartbeat → 201', async () => {
    const res = await request(app)
      .post(`/api/v1/channels/${CHANNEL_ID}/heartbeat`)
      .send({ playerVersion: '1.0.0', deviceType: 'tv', platform: 'tizen' });
    expect(res.status).toBe(201);
  });

  it('heartbeat 의 serviceKey/organizationId 도 body 주입이 불가능하다', async () => {
    await request(app)
      .post(`/api/v1/channels/${CHANNEL_ID}/heartbeat`)
      .send({ serviceKey: 'k-cosmetics', organizationId: '99999999-9999-4999-8999-999999999999' });
    const saved = calls.saved[0];
    expect(saved.serviceKey).toBe('kpa-society');
    expect(saved.organizationId).toBeNull();
  });

  it('telemetry ingest 는 channel 상태를 변경하지 않는다 (Channel row 저장 없음)', async () => {
    await request(app)
      .post(`/api/v1/channels/${CHANNEL_ID}/heartbeat`)
      .send({ playerVersion: '1.0.0' });
    expect(calls.saved.every((s: any) => s.name === undefined)).toBe(true);
  });
});

// ============================================================================
// §14 MANAGEMENT — platform admin 전용
// ============================================================================
describe('MANAGEMENT: 모든 write 는 platform admin 전용이다', () => {
  const writes: Array<[string, () => request.Test]> = [
    ['POST /', () => request(app).post('/api/v1/channels').send({ name: 'x', type: 'tv', slotKey: 's' })],
    ['PUT /:id', () => request(app).put(`/api/v1/channels/${CHANNEL_ID}`).send({ name: 'y' })],
    ['PATCH /:id/status', () => request(app).patch(`/api/v1/channels/${CHANNEL_ID}/status`).send({ status: 'inactive' })],
    ['DELETE /:id', () => request(app).delete(`/api/v1/channels/${CHANNEL_ID}`)],
  ];

  it.each(writes)('anonymous %s → 401', async (_label, call) => {
    currentUser = ANONYMOUS;
    const res = await call();
    expect(res.status).toBe(401);
  });

  it.each(writes)('service operator %s → 403 (SERVICE_OPERATOR_WRITE_NOT_GRANTED)', async (_label, call) => {
    currentUser = KPA_OPERATOR;
    const res = await call();
    expect(res.status).toBe(403);
    expect(calls.saved).toHaveLength(0);
  });

  it('platform admin POST / → 201', async () => {
    currentUser = PLATFORM_ADMIN;
    const res = await request(app)
      .post('/api/v1/channels')
      .send({ name: 'New', type: 'tv', slotKey: 'intranet-hero', serviceKey: 'kpa' });
    expect(res.status).toBe(201);
  });

  it('신규 write 는 role prefix 가 아니라 canonical ledger key 로 저장된다', async () => {
    currentUser = PLATFORM_ADMIN;
    await request(app)
      .post('/api/v1/channels')
      .send({ name: 'New', type: 'tv', slotKey: 'intranet-hero', serviceKey: 'kpa' });
    expect(calls.saved[0].serviceKey).toBe('kpa-society');
  });

  it('ownership 이전(serviceKey 변경)은 platform admin 만 가능하고 canonical 로 접힌다', async () => {
    currentUser = KPA_OPERATOR;
    const denied = await request(app)
      .put(`/api/v1/channels/${CHANNEL_ID}`)
      .send({ serviceKey: 'cosmetics' });
    expect(denied.status).toBe(403);
    expect(calls.saved).toHaveLength(0);

    currentUser = PLATFORM_ADMIN;
    const allowed = await request(app)
      .put(`/api/v1/channels/${CHANNEL_ID}`)
      .send({ serviceKey: 'cosmetics' });
    expect(allowed.status).toBe(200);
    expect(calls.saved[0].serviceKey).toBe('k-cosmetics');
  });
});

// ============================================================================
// §7 / §18 구조 불변식 — 권한 판정 근거를 두 벌로 만들지 않는다
// ============================================================================
describe('구조 불변식: 로컬 role-prefix 조립 / 서비스별 분기 금지', () => {
  const ROUTES_TS = path.resolve(__dirname, '../routes/channels/channels.routes.ts');
  const src = () => fs.readFileSync(ROUTES_TS, 'utf8');
  /** 주석은 계약 설명(금지 사례 인용)을 담으므로 코드 본문만 검사한다. */
  const code = () =>
    src()
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(String.fromCharCode(10))
      .filter((line) => !line.trim().startsWith('//'))
      .join(String.fromCharCode(10));

  it('권한 판정에 `${serviceKey}:operator` 같은 role 문자열을 직접 조립하지 않는다', () => {
    expect(code()).not.toMatch(/\$\{[^}]*[sS]erviceKey[^}]*\}\s*:\s*(operator|admin)/);
    expect(code()).not.toMatch(/`\$\{\s*serviceKey\s*\}:(operator|admin)`/);
  });

  it('serviceKey 문자열 동등 비교로 서비스별 분기를 만들지 않는다', () => {
    expect(code()).not.toMatch(/serviceKey\s*===\s*['"]kpa/);
    expect(code()).not.toMatch(/serviceKey\s*===\s*['"](k-)?cosmetics/);
  });

  it('목록 read 경계는 CMS read 경계 helper 한 벌을 그대로 쓴다', () => {
    expect(src()).toContain('resolveCmsReadScope');
    expect(src()).toContain('CMS_SERVICE_KEY_REQUIRED_ERROR');
    // alias 해석도 로컬 배열이 아니라 security-core 파생 helper 로만 한다.
    expect(code()).not.toMatch(/\[\s*['"]kpa-society['"]\s*,\s*['"]kpa['"]\s*\]/);
  });
});
