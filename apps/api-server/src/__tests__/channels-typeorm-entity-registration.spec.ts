/**
 * WO-O4O-CHANNELS-TYPEORM-ENTITY-REGISTRATION-AND-RUNTIME-CLOSURE-V1
 *
 * production 결함:
 *   GET /api/v1/channels → 500 { code: 'INTERNAL_ERROR', message: 'No metadata for "Channel" was found.' }
 *
 * 근본 원인:
 *   `Channel` / `ChannelPlaybackLog` / `ChannelHeartbeat` 가 AppDataSource 의
 *   entities 배열(= src/database/entities.ts, SSOT)에 등록되어 있지 않았다.
 *   entity 파일이 export 되고 route 가 import 하는 것만으로는 metadata 가 생기지 않는다.
 *
 * 왜 기존 테스트가 못 잡았나:
 *   기존 channels spec 은 `@o4o-apps/cms-core` 를 virtual mock 으로 대체하고
 *   fake DataSource 를 주입한다. 즉 "등록 여부"를 볼 수 없는 구조였다.
 *   tsc 도 import 가능 여부만 검증하지 배열 등록은 검증하지 못한다.
 *
 * 그래서 이 spec 은 import 가능 여부를 보지 않는다. 네 축을 본다:
 *   (1) 실제 entity 클래스로 TypeORM metadata 를 build 해서
 *       table 명/컬럼 databaseName 이 production 실제 schema 와 정확히 일치하는지
 *   (2) src/database/entities.ts 가 세 entity 를 실제로 등록 배열에 담고 있는지
 *   (3) (2)에서 얻은 "등록된 이름 집합"만 metadata 를 가진 DataSource 로
 *       실제 라우터를 mount 해서 production 실패를 그대로 재현/차단하는지
 *   (4) auth 계약과 내부 오류 비노출
 *
 * production 실측 컬럼(read-only census, 이 WO 시점 / 3 table 모두 0행):
 *   channels               : camelCase (1736600000000-CreateChannelsTable 이 그렇게 만듦)
 *   channel_playback_logs  : snake_case (1736700000000-CreateChannelPlaybackLog)
 *   channel_heartbeats     : snake_case (1736710000000-CreateChannelHeartbeat)
 *   AppDataSource 에는 namingStrategy 가 없다(connection.ts 에서 주석 처리).
 *   → 뒤 두 table 은 entity 에 name: 매핑이 없으면 등록 즉시 컬럼 오류가 난다.
 */
import 'reflect-metadata';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';

import {
  Channel as RealChannel,
  ChannelPlaybackLog as RealChannelPlaybackLog,
  ChannelHeartbeat as RealChannelHeartbeat,
} from '@o4o-apps/cms-core/entities';

jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (_req: any, _res: any, next: any) => next(),
  requireAdmin: (_req: any, res: any) => {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

// 라우터는 root barrel 에서 entity 를 import 한다. root barrel 은 side-effect 가 무거우므로
// /entities subpath 의 **실제 클래스**로 치환한다(가짜 class 로 바꾸지 않는다 — 그러면 §15 위반).
jest.mock('@o4o-apps/cms-core', () => require('@o4o-apps/cms-core/entities'), { virtual: true });

import { createChannelRoutes } from '../routes/channels/channels.routes.js';

// ── production 실측 schema (frozen) ─────────────────────────────────────────
const PRODUCTION_SCHEMA: Record<string, string[]> = {
  channels: [
    'id', 'organizationId', 'serviceKey', 'name', 'code', 'description', 'type',
    'slotKey', 'status', 'resolution', 'orientation', 'autoplay',
    'refreshIntervalSec', 'defaultDurationSec', 'location', 'metadata',
    'createdBy', 'createdAt', 'updatedAt',
  ],
  channel_playback_logs: [
    'id', 'channel_id', 'content_id', 'service_key', 'organization_id',
    'played_at', 'duration_sec', 'completed', 'source', 'created_at',
  ],
  channel_heartbeats: [
    'id', 'channel_id', 'service_key', 'organization_id', 'player_version',
    'device_type', 'platform', 'ip_address', 'is_online', 'uptime_sec',
    'metrics', 'received_at',
  ],
};

const ENTITIES_TS = path.resolve(__dirname, '../database/entities.ts');
const CONNECTION_TS = path.resolve(__dirname, '../database/connection.ts');
const CHANNEL_ENTITY_NAMES = ['Channel', 'ChannelPlaybackLog', 'ChannelHeartbeat'];

/** entities.ts 의 `export const entities = [...]` 배열에 담긴 식별자 이름을 뽑는다. */
function registeredEntityNames(): Set<string> {
  const src = fs.readFileSync(ENTITIES_TS, 'utf8');
  const start = src.indexOf('export const entities');
  expect(start).toBeGreaterThan(-1);
  const open = src.indexOf('[', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '[') depth += 1;
    else if (src[i] === ']') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end).toBeGreaterThan(open);
  const body = src
    .slice(open + 1, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const names = new Set<string>();
  for (const raw of body.split(',')) {
    const token = raw.trim().replace(/^\.\.\./, '');
    if (/^[A-Za-z_$][\w$]*$/.test(token)) names.add(token);
  }
  return names;
}

// ── (1) metadata ↔ production schema 정합 ───────────────────────────────────
describe('WO §10/§11 channels entity metadata ↔ production schema', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      entities: [RealChannel, RealChannelPlaybackLog, RealChannelHeartbeat],
    });
    // 연결 없이 metadata 만 build 한다(DB 접속 0).
    await (ds as any).buildMetadatas();
  });

  it.each(CHANNEL_ENTITY_NAMES)('%s 는 metadata 가 build 된다', (name) => {
    const meta = ds.entityMetadatas.find((m) => m.name === name);
    expect(meta).toBeDefined();
  });

  it.each(Object.keys(PRODUCTION_SCHEMA))(
    '%s 의 컬럼 databaseName 이 production 실제 컬럼과 정확히 일치한다',
    (tableName) => {
      const meta = ds.entityMetadatas.find((m) => m.tableName === tableName);
      expect(meta).toBeDefined();
      const actual = meta!.columns.map((c) => c.databaseName).sort();
      expect(actual).toEqual([...PRODUCTION_SCHEMA[tableName]].sort());
    },
  );

  it('snake_case table 은 entity 쪽 name: 매핑으로 정합을 맞춘다(schema 변경/migration 0)', () => {
    // 이 프로젝트 AppDataSource 에는 namingStrategy 가 없다. 그 전제가 깨지면
    // 아래 name: 매핑이 이중 변환되어 다시 drift 가 난다.
    const connection = fs.readFileSync(CONNECTION_TS, 'utf8');
    expect(connection).toMatch(/^\s*\/\/\s*namingStrategy:/m);
    expect(connection).not.toMatch(/^\s*namingStrategy:/m);

    const logMeta = ds.entityMetadatas.find((m) => m.tableName === 'channel_playback_logs')!;
    expect(logMeta.findColumnWithPropertyName('channelId')!.databaseName).toBe('channel_id');
    const hbMeta = ds.entityMetadatas.find((m) => m.tableName === 'channel_heartbeats')!;
    expect(hbMeta.findColumnWithPropertyName('receivedAt')!.databaseName).toBe('received_at');
  });

  it('production 은 synchronize 를 켜지 않는다(등록이 DDL 을 유발하지 않는다)', () => {
    const connection = fs.readFileSync(CONNECTION_TS, 'utf8');
    expect(connection).toMatch(/synchronize:\s*false/);
    expect(connection).not.toMatch(/synchronize:\s*true/);
  });
});

// ── (2) 등록 SSOT ───────────────────────────────────────────────────────────
describe('WO §12/§13 entities.ts 등록', () => {
  it('세 entity 가 모두 등록 배열에 있다(부분 등록 금지)', () => {
    const registered = registeredEntityNames();
    for (const name of CHANNEL_ENTITY_NAMES) {
      expect(registered.has(name)).toBe(true);
    }
  });

  it('세 entity 는 @o4o-apps/cms-core/entities subpath 에서 import 된다', () => {
    const src = fs.readFileSync(ENTITIES_TS, 'utf8');
    const block = src.match(/import \{([\s\S]*?)\} from '@o4o-apps\/cms-core\/entities';/);
    expect(block).not.toBeNull();
    for (const name of CHANNEL_ENTITY_NAMES) {
      expect(new RegExp(`(^|[^\\w])${name}\\s*,`).test(block![1])).toBe(true);
    }
  });

  it('glob 패턴으로 entity 를 자동 등록하지 않는다', () => {
    const src = fs.readFileSync(ENTITIES_TS, 'utf8');
    expect(src).not.toMatch(/\*\*\/\*\.entity/);
  });
});

// ── (3) 라우터 runtime 재현 ─────────────────────────────────────────────────
type Row = Record<string, unknown>;

function makeApp() {
  const registered = registeredEntityNames();
  const saved: Record<string, Row[]> = {
    ChannelPlaybackLog: [],
    ChannelHeartbeat: [],
  };
  const channels: Row[] = [];

  const repoFor = (name: string) => ({
    findAndCount: async () => [channels, channels.length],
    findOne: async () => channels[0] ?? null,
    create: (data: Row) => ({ ...data }),
    save: async (row: Row) => {
      saved[name] = saved[name] ?? [];
      saved[name].push(row);
      return { id: name + '-1', ...row };
    },
    createQueryBuilder: () => {
      const qb: any = {
        leftJoinAndSelect: () => qb,
        where: () => qb,
        andWhere: () => qb,
        orderBy: () => qb,
        getMany: async () => [],
      };
      return qb;
    },
  });

  const dataSource: any = {
    // 실제 TypeORM 과 같은 실패 형태를 재현한다:
    //   등록 배열에 없는 entity 로 getRepository 하면 metadata 오류가 난다.
    getRepository(entity: any) {
      const name = entity?.name;
      if (!registered.has(name)) {
        throw new Error('No metadata for "' + name + '" was found.');
      }
      return repoFor(name);
    },
  };

  const app = express();
  app.use(express.json());
  app.use('/api/v1/channels', createChannelRoutes(dataSource));
  return { app, channels, saved };
}

describe('WO §16/§17 channels runtime 계약', () => {
  it('GET /api/v1/channels 는 빈 상태에서 500 이 아니라 200 + 빈 목록이다', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/channels');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('serviceKey alias 입력도 500 이 아니라 200 이다', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/channels?serviceKey=kpa');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/channels/health 는 200 이다(/:id 에 가려지지 않는다)', async () => {
    const { app } = makeApp();
    const res = await request(app).get('/api/v1/channels/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('channels');
  });

  it('POST /:id/playback-log 는 ChannelPlaybackLog metadata 오류로 죽지 않는다', async () => {
    const { app, channels, saved } = makeApp();
    const channelId = '11111111-1111-4111-8111-111111111111';
    channels.push({ id: channelId, serviceKey: 'kpa-society', organizationId: null });
    const res = await request(app)
      .post('/api/v1/channels/' + channelId + '/playback-log')
      .send({ contentId: '22222222-2222-4222-8222-222222222222', durationSec: 12 });
    expect(res.status).toBeLessThan(500);
    expect(saved.ChannelPlaybackLog.length).toBe(1);
  });

  it('POST /:id/heartbeat 는 ChannelHeartbeat metadata 오류로 죽지 않는다', async () => {
    const { app, channels, saved } = makeApp();
    const channelId = '11111111-1111-4111-8111-111111111111';
    channels.push({ id: channelId, serviceKey: 'kpa-society', organizationId: null });
    const res = await request(app)
      .post('/api/v1/channels/' + channelId + '/heartbeat')
      .send({ playerVersion: '1.0.0', deviceType: 'web' });
    expect(res.status).toBeLessThan(500);
    expect(saved.ChannelHeartbeat.length).toBe(1);
  });
});

// ── (4) §18 auth / §24 error leakage ────────────────────────────────────────
describe('WO §18/§24 auth 및 내부 오류 비노출', () => {
  it('POST /api/v1/channels 는 관리자 권한이 필요하다', async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post('/api/v1/channels')
      .send({ name: 'x', type: 'tv', slotKey: 'intranet-hero' });
    expect(res.status).toBe(403);
  });

  it('500 응답 body 에 TypeORM 내부 문자열을 노출하지 않는다', async () => {
    const registered = registeredEntityNames();
    expect(registered.has('Channel')).toBe(true);

    const dataSource: any = {
      getRepository: () => ({
        findAndCount: async () => {
          throw new Error('No metadata for "Channel" was found.');
        },
      }),
    };
    const app = express();
    app.use(express.json());
    app.use('/api/v1/channels', createChannelRoutes(dataSource));

    const res = await request(app).get('/api/v1/channels');
    expect(res.status).toBe(500);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('No metadata');
    expect(body).not.toContain('was found');
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
