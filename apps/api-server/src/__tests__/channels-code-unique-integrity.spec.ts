/**
 * WO-O4O-CHANNEL-CODE-DATABASE-UNIQUENESS-INTEGRITY-V1
 *
 * `channels.code` 는 signage player 의 익명 단건 주소다. 유일성이 application 사전 검사
 * 하나에만 걸려 있었고(검사 → INSERT 사이에 트랜잭션 없음), migration 20270319000000 이
 * 부분 유니크 인덱스 `UQ_channels_code` 로 그 유일성을 DB 로 내렸다.
 *
 * 여기서 고정하는 것:
 *   - 사전 검사는 그대로 유지된다(KEEP_PRECHECK) — 빠른 409.
 *   - 경쟁 상태에서 DB 가 막은 경우도 500/Postgres 원문이 아니라 409 DUPLICATE_CODE.
 *   - 그 변환은 **해당 제약 이름에서만** 일어난다(다른 23505 는 변환하지 않는다).
 *   - same-row 재저장은 정상, other-row 중복은 차단.
 *   - migration 이 실제로 unique index 를 만든다(static contract).
 *
 * 실 Postgres 동시성 실증(§7 §15 §20)은 `CHANNELS_UQ_PG_URL` 이 주어졌을 때만 도는
 * 마지막 describe 에 있다. CI 에는 DB 가 없어 기본적으로 등록되지 않는다.
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
  requireAdmin: (req: any, res: any, next: any) => {
    if (!currentUser) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      return;
    }
    if (!currentUser.roles.includes('platform:super_admin')) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
      return;
    }
    req.user = currentUser;
    next();
  },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory 는 hoist 되므로 import 를 쓸 수 없다
jest.mock('@o4o-apps/cms-core', () => require('@o4o-apps/cms-core/entities'), { virtual: true });

import {
  createChannelRoutes,
  isChannelCodeDuplicateViolation,
} from '../routes/channels/channels.routes.js';

const ADMIN = { id: 'admin-1', roles: ['platform:super_admin'] };
const EXISTING_ID = '11111111-1111-4111-8111-111111111111';
/** 주석 안의 예시 문자열이 아니라 실제 SQL 만 본다. */
function migrationCode(): string {
  return fs
    .readFileSync(MIGRATION_FILE, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(String.fromCharCode(10))
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join(String.fromCharCode(10));
}

const MIGRATION_FILE = path.resolve(
  __dirname,
  '../database/migrations/20270319000000-AddChannelsCodeUniqueIndex.ts',
);

/** production 인덱스 이름 — 이 이름으로만 409 변환이 일어난다. */
const UNIQUE_INDEX = 'UQ_channels_code';

/** TypeORM 이 감싸는 실제 오류 형태(QueryFailedError.driverError). */
function pgUniqueViolation(constraint: string) {
  const err: any = new Error(
    `duplicate key value violates unique constraint "${constraint}"`,
  );
  err.code = '23505';
  err.constraint = constraint;
  err.detail = `Key (code)=(DUP-1) already exists.`;
  err.driverError = { code: '23505', constraint, detail: err.detail };
  return err;
}

function existingChannel(overrides: Record<string, unknown> = {}) {
  return {
    id: EXISTING_ID,
    serviceKey: 'kpa-society',
    organizationId: null,
    name: 'Lobby',
    code: 'KPA-LOBBY-01',
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

interface Harness {
  app: express.Express;
  calls: { findOne: any[]; saved: any[] };
}

/**
 * @param opts.precheckHit  사전 검사(findOne({code}))가 기존 행을 찾을지
 * @param opts.saveError    save() 가 던질 오류 (경쟁 상태 재현)
 */
function buildApp(opts: { precheckHit?: boolean; saveError?: unknown } = {}): Harness {
  const calls = { findOne: [] as any[], saved: [] as any[] };
  const row = existingChannel();

  const channelRepo = {
    findAndCount: jest.fn(async () => [[row], 1]),
    findOne: jest.fn(async (o: any) => {
      calls.findOne.push(o);
      const where = o.where || {};
      if (where.id !== undefined) return where.id === row.id ? { ...row } : null;
      if (where.code !== undefined) return opts.precheckHit ? { ...row } : null;
      return null;
    }),
    create: jest.fn((v: any) => ({ ...v })),
    save: jest.fn(async (v: any) => {
      if (opts.saveError) throw opts.saveError;
      calls.saved.push(v);
      return { id: 'new-id', ...v };
    }),
  };

  const dataSource: any = {
    getRepository: (entity: any) =>
      entity?.name === 'Channel'
        ? channelRepo
        : { createQueryBuilder: () => ({ getMany: async () => [] }) },
  };

  const app = express();
  app.use(express.json());
  app.use('/api/v1/channels', createChannelRoutes(dataSource));
  return { app, calls };
}

const CREATE_BODY = { name: 'New', type: 'tv', slotKey: 'intranet-hero', code: 'DUP-1' };

beforeEach(() => {
  currentUser = ADMIN;
});

// ============================================================================
// §17 violation 식별 — 해당 제약에서만 변환
// ============================================================================
describe('isChannelCodeDuplicateViolation', () => {
  it('해당 인덱스의 23505 는 중복으로 인식한다', () => {
    expect(isChannelCodeDuplicateViolation(pgUniqueViolation(UNIQUE_INDEX))).toBe(true);
  });

  it('driverError 에만 실려온 경우도 인식한다', () => {
    expect(
      isChannelCodeDuplicateViolation({
        driverError: { code: '23505', constraint: UNIQUE_INDEX },
      }),
    ).toBe(true);
  });

  it('다른 unique constraint 의 23505 는 변환하지 않는다', () => {
    expect(isChannelCodeDuplicateViolation(pgUniqueViolation('UQ_channels_something_else'))).toBe(
      false,
    );
    expect(isChannelCodeDuplicateViolation(pgUniqueViolation('ux_role_assignments_user_role_active'))).toBe(
      false,
    );
  });

  it('23505 가 아닌 오류는 변환하지 않는다 (FK/NOT NULL 위반은 그대로)', () => {
    expect(isChannelCodeDuplicateViolation({ code: '23503', constraint: UNIQUE_INDEX })).toBe(false);
    expect(isChannelCodeDuplicateViolation({ code: '23502' })).toBe(false);
    expect(isChannelCodeDuplicateViolation(new Error('boom'))).toBe(false);
    expect(isChannelCodeDuplicateViolation(null)).toBe(false);
  });
});

// ============================================================================
// §16 §18 create — pre-check 유지 + DB 위반도 409
// ============================================================================
describe('POST /channels — duplicate code', () => {
  it('사전 검사에서 걸리면 409 DUPLICATE_CODE (KEEP_PRECHECK)', async () => {
    const { app, calls } = buildApp({ precheckHit: true });
    const res = await request(app).post('/api/v1/channels').send(CREATE_BODY);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_CODE');
    // 사전 검사는 serviceKey 를 조건에 넣지 않는다 → 전역 유일성 계약
    expect(calls.findOne.at(-1).where).toEqual({ code: 'DUP-1' });
    expect(calls.saved).toHaveLength(0);
  });

  it('경쟁 상태(사전 검사 통과 + DB 위반)에서도 409 DUPLICATE_CODE', async () => {
    const { app } = buildApp({ saveError: pgUniqueViolation(UNIQUE_INDEX) });
    const res = await request(app).post('/api/v1/channels').send(CREATE_BODY);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_CODE');
  });

  it('§27 응답에 Postgres 내부 정보가 새지 않는다', async () => {
    const { app } = buildApp({ saveError: pgUniqueViolation(UNIQUE_INDEX) });
    const res = await request(app).post('/api/v1/channels').send(CREATE_BODY);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/duplicate key value|23505|UQ_channels_code|Key \(code\)/i);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'DUPLICATE_CODE', message: 'A channel with this code already exists' },
    });
  });

  it('다른 제약의 23505 는 409 로 둔갑하지 않고 500 INTERNAL_ERROR 로 남는다', async () => {
    const { app } = buildApp({ saveError: pgUniqueViolation('UQ_some_other_index') });
    const res = await request(app).post('/api/v1/channels').send(CREATE_BODY);
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(res.body)).not.toMatch(/duplicate key value|23505|UQ_some_other_index/i);
  });

  it('code 없는 생성은 중복 검사를 하지 않는다 (nullable 유지)', async () => {
    const { app, calls } = buildApp();
    const res = await request(app)
      .post('/api/v1/channels')
      .send({ name: 'No code', type: 'tv', slotKey: 'intranet-hero' });
    expect(res.status).toBe(201);
    expect(calls.saved[0].code).toBeNull();
    expect(calls.findOne.filter((c) => c.where?.code !== undefined)).toHaveLength(0);
  });
});

// ============================================================================
// §19 update — 자기 row 는 통과, 다른 row 중복은 차단
// ============================================================================
describe('PUT /channels/:id — duplicate code', () => {
  it('code 를 바꾸지 않는 update 는 중복으로 오인하지 않는다', async () => {
    const { app, calls } = buildApp({ precheckHit: true });
    const res = await request(app)
      .put(`/api/v1/channels/${EXISTING_ID}`)
      .send({ code: 'KPA-LOBBY-01', name: 'Lobby renamed' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Lobby renamed');
    // 자기 code 와 동일하므로 중복 조회 자체를 하지 않는다
    expect(calls.findOne.filter((c) => c.where?.code !== undefined)).toHaveLength(0);
  });

  it('다른 row 가 쓰는 code 로 바꾸면 409', async () => {
    const { app } = buildApp({ precheckHit: true });
    const res = await request(app)
      .put(`/api/v1/channels/${EXISTING_ID}`)
      .send({ code: 'OTHER-CODE' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_CODE');
  });

  it('경쟁 상태의 DB 위반도 409 이고 내부 정보가 새지 않는다', async () => {
    const { app } = buildApp({ saveError: pgUniqueViolation(UNIQUE_INDEX) });
    const res = await request(app)
      .put(`/api/v1/channels/${EXISTING_ID}`)
      .send({ code: 'OTHER-CODE' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_CODE');
    expect(JSON.stringify(res.body)).not.toMatch(/duplicate key value|23505|UQ_channels_code/i);
  });
});

// ============================================================================
// §21 §28 lookup / migration 계약
// ============================================================================
describe('code lookup 과 migration 계약', () => {
  it('exact lookup 은 여전히 결정적이다 (방어적 order 유지)', async () => {
    const { app, calls } = buildApp();
    await request(app).get('/api/v1/channels/code/KPA-LOBBY-01');
    expect(calls.findOne.at(-1)).toMatchObject({
      where: { code: 'KPA-LOBBY-01' },
      order: { createdAt: 'ASC' },
    });
  });

  it('migration 이 channels(code) 부분 유니크 인덱스를 만든다', () => {
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "UQ_channels_code"/);
    expect(sql).toMatch(/ON channels \(code\)/);
    expect(sql).toMatch(/WHERE code IS NOT NULL/);
  });

  it('migration 은 중복이 있으면 조용히 넘어가지 않고 실패한다', () => {
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    expect(sql).toMatch(/HAVING count\(\*\) > 1/);
    expect(sql).toMatch(/throw new Error/);
  });

  it('migration 은 데이터를 지우거나 고치지 않는다', () => {
    const sql = migrationCode();
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(sql).not.toMatch(/\bUPDATE\s+channels\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
  });

  it('code 컬럼을 NOT NULL 로 바꾸지 않는다 (§11 범위 밖)', () => {
    const sql = migrationCode();
    expect(sql).not.toMatch(/SET NOT NULL/i);
  });

  it('case-insensitive 유일성을 도입하지 않는다 (§9 §32)', () => {
    const sql = migrationCode();
    expect(sql).not.toMatch(/lower\(code\)/i);
    expect(sql).not.toMatch(/citext/i);
  });
});

// ============================================================================
// §7 §15 §20 실 Postgres 동시성 실증
//   CHANNELS_UQ_PG_URL 이 있을 때만 등록된다. 예:
//   docker run -d --rm -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=channeltest -p 55432:5432 postgres:15
//   CHANNELS_UQ_PG_URL=postgres://postgres:postgres@localhost:55432/channeltest npx jest <this file>
// ============================================================================
const PG_URL = process.env.CHANNELS_UQ_PG_URL;

(PG_URL ? describe : describe.skip)('실 Postgres: channels.code 유일성', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { DataSource } = require('typeorm');
  const {
    CreateChannelsTable1736600000000,
  } = require('../database/migrations/1736600000000-CreateChannelsTable.js');
  const {
    AddChannelsCodeUniqueIndex20270319000000,
  } = require('../database/migrations/20270319000000-AddChannelsCodeUniqueIndex.js');
  /* eslint-enable @typescript-eslint/no-require-imports */

  // baseDs: channels table 만 만드는 상태 (유니크 인덱스 이전)
  // uqDs:   이번 WO 의 migration 까지 포함하는 상태
  let baseDs: any;
  let uqDs: any;

  const makeDs = (migrations: unknown[]) =>
    new DataSource({
      type: 'postgres',
      url: PG_URL,
      entities: [],
      migrations,
      migrationsTableName: 'typeorm_migrations',
      synchronize: false,
      logging: false,
    });

  const insert = (ds: any, code: string | null, name = 'ch') =>
    ds.query(
      `INSERT INTO channels (name, code, type, "slotKey") VALUES ($1, $2, 'tv', 'intranet-hero') RETURNING id`,
      [name, code],
    );

  const countCode = async (ds: any, code: string) =>
    (await ds.query(`SELECT count(*)::int AS n FROM channels WHERE code = $1`, [code]))[0].n;

  const indexNames = async (ds: any) =>
    (await ds.query(`SELECT indexname FROM pg_indexes WHERE tablename = 'channels'`)).map(
      (r: any) => r.indexname,
    );

  /** 애플리케이션의 "사전 검사 → INSERT" 를 그대로 흉내낸 경쟁 시나리오. */
  async function racingCreate(ds: any, code: string) {
    const precheck = async () =>
      (await ds.query(`SELECT id FROM channels WHERE code = $1`, [code])).length > 0;
    // 두 요청이 사전 검사를 **모두** 통과한 뒤 INSERT 하도록 단계를 나눈다.
    const [hitA, hitB] = await Promise.all([precheck(), precheck()]);
    const attempt = async (hit: boolean) => {
      if (hit) return { outcome: 'precheck-409' as const };
      try {
        await insert(ds, code);
        return { outcome: 'created' as const };
      } catch (e: any) {
        return { outcome: 'db-violation' as const, err: e };
      }
    };
    return Promise.all([attempt(hitA), attempt(hitB)]);
  }

  beforeAll(async () => {
    const bootstrap = makeDs([]);
    await bootstrap.initialize();
    await bootstrap.query(`DROP TABLE IF EXISTS channels`);
    await bootstrap.query(`DROP TABLE IF EXISTS typeorm_migrations`);
    await bootstrap.destroy();

    baseDs = makeDs([CreateChannelsTable1736600000000]);
    await baseDs.initialize();
    await baseDs.runMigrations(); // channels table 생성 (유니크 인덱스 없음)
  }, 180000);

  afterAll(async () => {
    if (uqDs?.isInitialized) await uqDs.destroy();
    if (baseDs?.isInitialized) await baseDs.destroy();
  });

  it('§7 유니크 인덱스가 없으면 사전 검사만으로는 중복 row 를 막지 못한다', async () => {
    const results = await racingCreate(baseDs, 'RACE-NO-UQ');
    expect(results.filter((r) => r.outcome === 'created')).toHaveLength(2);
    expect(await countCode(baseDs, 'RACE-NO-UQ')).toBe(2);
    expect(await indexNames(baseDs)).toContain('idx_channels_code');
  }, 180000);

  it('§24 중복이 남아 있으면 migration 이 실패하고 데이터를 건드리지 않는다', async () => {
    uqDs = makeDs([CreateChannelsTable1736600000000, AddChannelsCodeUniqueIndex20270319000000]);
    await uqDs.initialize();
    await expect(uqDs.runMigrations()).rejects.toThrow(/중복 code/);
    // 실패했어도 중복 행은 그대로다 (자동 삭제/rename 없음)
    expect(await countCode(uqDs, 'RACE-NO-UQ')).toBe(2);
    expect(await indexNames(uqDs)).not.toContain('UQ_channels_code');
  }, 180000);

  it('§15 중복 정리 후 migration up 이 부분 유니크 인덱스를 만든다', async () => {
    // 정리는 운영 판단이므로 마이그레이션이 아니라 테스트가 직접 한다(scratch DB).
    await uqDs.query(`DELETE FROM channels WHERE code = 'RACE-NO-UQ'`);
    await uqDs.runMigrations();

    const idx = await uqDs.query(
      `SELECT indexdef FROM pg_indexes WHERE tablename = 'channels' AND indexname = 'UQ_channels_code'`,
    );
    expect(idx).toHaveLength(1);
    expect(idx[0].indexdef).toMatch(/CREATE UNIQUE INDEX/);
    expect(idx[0].indexdef).toMatch(/WHERE \(code IS NOT NULL\)/);
    // 같은 컬럼/조건의 비유니크 조회 인덱스는 대체되었다
    expect(await indexNames(uqDs)).not.toContain('idx_channels_code');
  }, 180000);

  it('§20 동일 code 동시 생성 → 1건 성공 / 1건 DB 위반 / row 1개', async () => {
    const results = await racingCreate(uqDs, 'RACE-WITH-UQ');
    const created = results.filter((r) => r.outcome === 'created');
    const violated = results.filter((r) => r.outcome === 'db-violation');
    expect(created).toHaveLength(1);
    expect(violated).toHaveLength(1);

    const err = (violated[0] as any).err;
    expect(err.code).toBe('23505');
    expect(err.constraint).toBe('UQ_channels_code');
    // 그 오류는 API 계약상 409 DUPLICATE_CODE 로 변환된다.
    expect(isChannelCodeDuplicateViolation(err)).toBe(true);

    expect(await countCode(uqDs, 'RACE-WITH-UQ')).toBe(1);
  }, 180000);

  it('§11 code NULL 은 여러 행 허용', async () => {
    await insert(uqDs, null, 'no-code-1');
    await insert(uqDs, null, 'no-code-2');
    const n = (await uqDs.query(`SELECT count(*)::int AS n FROM channels WHERE code IS NULL`))[0].n;
    expect(n).toBeGreaterThanOrEqual(2);
  }, 180000);

  it('§9 case-sensitive 계약 유지: ABC 와 abc 는 서로 다른 code', async () => {
    await insert(uqDs, 'CASE-ABC');
    await expect(insert(uqDs, 'case-abc')).resolves.toBeDefined();
  }, 180000);

  it('§10 trim 하지 않는 계약 유지: "X" 와 " X " 는 서로 다른 code', async () => {
    await insert(uqDs, 'TRIM-X');
    await expect(insert(uqDs, ' TRIM-X ')).resolves.toBeDefined();
  }, 180000);

  it('§19 같은 row 의 code 재저장(UPDATE)은 위반이 아니다', async () => {
    const [row] = await insert(uqDs, 'SELF-UPDATE', 'self');
    await expect(
      uqDs.query(`UPDATE channels SET code = 'SELF-UPDATE', name = 'renamed' WHERE id = $1`, [
        row.id,
      ]),
    ).resolves.toBeDefined();
    expect(await countCode(uqDs, 'SELF-UPDATE')).toBe(1);
  }, 180000);

  it('§19 다른 row 의 code 로 UPDATE 하면 DB 가 막는다', async () => {
    const [row] = await insert(uqDs, 'OTHER-ROW', 'other');
    await expect(
      uqDs.query(`UPDATE channels SET code = 'SELF-UPDATE' WHERE id = $1`, [row.id]),
    ).rejects.toMatchObject({ code: '23505', constraint: 'UQ_channels_code' });
  }, 180000);

  it('§15 migration down → 유니크가 사라지고 조회 인덱스가 복원된다', async () => {
    await uqDs.undoLastMigration();
    const names = await indexNames(uqDs);
    expect(names).toContain('idx_channels_code');
    expect(names).not.toContain('UQ_channels_code');
  }, 180000);
});
