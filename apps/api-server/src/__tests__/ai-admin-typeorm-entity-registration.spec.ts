/**
 * WO-O4O-NETURE-AI-ADMIN-API-500-ROOT-CAUSE-AND-PRODUCTION-CLOSURE-V1
 *
 * production 결함:
 *   GET /api/ai/admin/dashboard | /engines | /policy | /usage → 500
 *   (같은 원인으로 /api/ai/usage, /api/ai/history, /api/ai/policy 도 500)
 *
 * 근본 원인 (A. CODE_DEFECT + C. MISSING_RUNTIME_DEPENDENCY):
 *   `AiEngine` / `AiQueryPolicy` / `AiQueryLog` 가 AppDataSource 의 entities 배열
 *   (= src/database/entities.ts, SSOT)에 등록되어 있지 않았다.
 *   `ai-admin.service.ts` 의 ensureInitialized() 가 `AppDataSource.getRepository(...)` 를
 *   부르는 순간 EntityMetadataNotFoundError 가 나고, 라우터 catch 가 그대로 500 을 반환했다.
 *   raw SQL(`AppDataSource.query`)만 쓰는 나머지 엔드포인트는 정상이었다 —
 *   500 경계가 "Repository 사용 여부"와 정확히 일치했다.
 *
 * schema/migration 은 불필요하다:
 *   세 table 은 이미 migration 으로 존재한다
 *   (1736900000000-CreateAIQueryTables, 1737100700000-CreateAiEnginesAndAdminColumns).
 *   등록은 metadata 만 만들며 synchronize:false 이므로 DDL 을 유발하지 않는다.
 *
 * 이 spec 이 보는 축:
 *   (1) 실제 entity 클래스로 metadata 를 build 해 컬럼이 migration schema 와 일치하는지
 *   (2) entities.ts 등록 SSOT 에 세 entity 가 모두 있는지(부분 등록 금지)
 *   (3) 등록 여부에 따라 라우터가 500 ↔ 200 으로 갈리는지(production 재현/차단)
 *   (4) 권한 계약(requireAdmin)과 내부 오류 문자열 비노출
 */
import 'reflect-metadata';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AiEngine } from '../entities/AiEngine.js';
import { AiQueryPolicy } from '../entities/AiQueryPolicy.js';
import { AiQueryLog } from '../entities/AiQueryLog.js';

const AI_ENTITY_NAMES = ['AiEngine', 'AiQueryPolicy', 'AiQueryLog'];

// ── migration 이 만든 실제 컬럼 (frozen) ────────────────────────────────────
//   ai_query_policy 는 CreateAIQueryTables + CreateAiEnginesAndAdminColumns 합집합.
const MIGRATION_SCHEMA: Record<string, string[]> = {
  ai_engines: [
    'id', 'slug', 'name', 'description', 'provider',
    'is_active', 'is_available', 'sort_order', 'created_at', 'updated_at',
  ],
  ai_query_policy: [
    'id', 'free_daily_limit', 'paid_daily_limit', 'ai_enabled', 'default_model',
    'system_prompt', 'warning_threshold', 'global_daily_limit', 'active_engine_id',
    'created_at', 'updated_at',
  ],
  ai_query_logs: [
    'id', 'user_id', 'question', 'answer', 'context_type', 'context_id',
    'context_data', 'attached_info', 'query_date', 'success', 'error_message',
    'duration_ms', 'created_at',
  ],
};

const ENTITIES_TS = path.resolve(__dirname, '../database/entities.ts');
const CONNECTION_TS = path.resolve(__dirname, '../database/connection.ts');

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

// ── (1) metadata ↔ migration schema 정합 ────────────────────────────────────
describe('§3 AI entity metadata ↔ migration schema', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      entities: [AiEngine, AiQueryPolicy, AiQueryLog],
    });
    // 연결 없이 metadata 만 build 한다(DB 접속 0).
    await (ds as any).buildMetadatas();
  });

  it.each(AI_ENTITY_NAMES)('%s 는 metadata 가 build 된다', (name) => {
    expect(ds.entityMetadatas.find((m) => m.name === name)).toBeDefined();
  });

  it.each(Object.keys(MIGRATION_SCHEMA))(
    '%s 의 컬럼 databaseName 이 migration 컬럼과 정확히 일치한다',
    (tableName) => {
      const meta = ds.entityMetadatas.find((m) => m.tableName === tableName);
      expect(meta).toBeDefined();
      const actual = meta!.columns.map((c) => c.databaseName).sort();
      expect(actual).toEqual([...MIGRATION_SCHEMA[tableName]].sort());
    },
  );

  it('등록은 DDL 을 유발하지 않는다(synchronize:false)', () => {
    const connection = fs.readFileSync(CONNECTION_TS, 'utf8');
    expect(connection).toMatch(/synchronize:\s*false/);
    expect(connection).not.toMatch(/^\s*synchronize:\s*true/m);
  });
});

// ── (2) 등록 SSOT ───────────────────────────────────────────────────────────
describe('§4 entities.ts 등록', () => {
  it('세 entity 가 모두 등록 배열에 있다(부분 등록 금지)', () => {
    const registered = registeredEntityNames();
    for (const name of AI_ENTITY_NAMES) {
      expect(registered.has(name)).toBe(true);
    }
  });

  it('세 entity 는 src/entities 실제 경로에서 import 된다', () => {
    const src = fs.readFileSync(ENTITIES_TS, 'utf8');
    for (const name of AI_ENTITY_NAMES) {
      expect(src).toContain(`import { ${name} } from '../entities/${name}.js';`);
    }
  });

  it('glob 패턴으로 entity 를 자동 등록하지 않는다', () => {
    const src = fs.readFileSync(ENTITIES_TS, 'utf8');
    expect(src).not.toMatch(/\*\*\/\*\.entity/);
  });
});

// ── (3) 라우터 runtime 재현 ─────────────────────────────────────────────────
const ENGINE_ROW = {
  id: 1,
  slug: 'gemini-2.5-flash',
  name: 'Gemini 2.5 Flash',
  description: '테스트 엔진',
  provider: 'google',
  isActive: true,
  isAvailable: true,
  sortOrder: 1,
};

function fakeRepo() {
  return {
    count: async () => 1,
    find: async () => [ENGINE_ROW],
    findOne: async () => ENGINE_ROW,
    create: (data: any) => ({ ...data }),
    save: async (row: any) => row,
    update: async () => ({ affected: 1 }),
  };
}

function loadApp(options: { registered: Set<string>; admin?: boolean }) {
  const { registered, admin = true } = options;

  jest.resetModules();

  jest.doMock('../middleware/auth.middleware.js', () => ({
    authenticate: (_req: any, _res: any, next: any) => next(),
    requireAdmin: (_req: any, res: any, next: any) => {
      if (admin) return next();
      return res.status(403).json({ success: false, error: 'FORBIDDEN' });
    },
  }));

  jest.doMock('../utils/logger.js', () => ({
    __esModule: true,
    default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  }));

  jest.doMock('../database/connection.js', () => ({
    AppDataSource: {
      // 실제 TypeORM 과 같은 실패 형태를 재현한다:
      //   등록 배열에 없는 entity 로 getRepository 하면 metadata 오류가 난다.
      getRepository(entity: any) {
        const name = entity?.name;
        if (!registered.has(name)) {
          throw new Error(`No metadata for "${name}" was found.`);
        }
        return fakeRepo();
      },
      query: async () => [],
    },
  }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const router = require('../routes/ai-admin.routes.js').default;
  const app = express();
  app.use(express.json());
  app.use('/api/ai/admin', router);
  return app;
}

describe('§2/§7 ai-admin 라우터 runtime 계약', () => {
  // 첫 모듈 로드(ts-jest 컴파일)가 기본 5s 를 넘길 수 있다.
  jest.setTimeout(30000);

  it('entity 미등록이면 GET /engines 는 production 과 동일하게 500 이다(회귀 재현)', async () => {
    const app = loadApp({ registered: new Set<string>() });
    const res = await request(app).get('/api/ai/admin/engines');
    expect(res.status).toBe(500);
  });

  it('현재 entities.ts 등록 상태에서는 GET /engines 가 200 이다', async () => {
    const app = loadApp({ registered: registeredEntityNames() });
    const res = await request(app).get('/api/ai/admin/engines');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0].slug).toBe('gemini-2.5-flash');
  });

  it('500 을 빈 배열/빈 객체로 삼키지 않는다', async () => {
    const app = loadApp({ registered: new Set<string>() });
    const res = await request(app).get('/api/ai/admin/engines');
    expect(res.status).not.toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeUndefined();
  });

  it('500 응답 body 에 TypeORM 내부 문자열을 노출하지 않는다', async () => {
    const app = loadApp({ registered: new Set<string>() });
    const res = await request(app).get('/api/ai/admin/engines');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('No metadata');
    expect(body).not.toContain('was found');
  });
});

// ── (4) 권한 계약 ───────────────────────────────────────────────────────────
describe('§6 권한 계약', () => {
  it('requireAdmin 불충족이면 200 이 아니라 403 이다(권한을 넓혀 통과시키지 않는다)', async () => {
    const app = loadApp({ registered: registeredEntityNames(), admin: false });
    for (const p of ['/dashboard', '/engines', '/policy', '/usage']) {
      const res = await request(app).get(`/api/ai/admin${p}`);
      expect(res.status).toBe(403);
    }
  });

  it('모든 /api/ai/admin 라우트가 authenticate + requireAdmin 를 건다', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../routes/ai-admin.routes.ts'),
      'utf8',
    );
    const handlers = src.match(/router\.(get|post|put|patch|delete)\(/g) || [];
    const guarded = src.match(/authenticate,\s*requireAdmin/g) || [];
    expect(handlers.length).toBeGreaterThan(0);
    expect(guarded.length).toBe(handlers.length);
  });
});
