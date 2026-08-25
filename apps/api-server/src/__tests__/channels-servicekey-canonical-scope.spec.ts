/**
 * WO-O4O-CHANNELS-SERVICEKEY-CANONICAL-SCOPE-ALIGNMENT-V1
 *
 * `channels.serviceKey` 는 CMS ledger service key 다(= `cms_content_slots.serviceKey` 와 같은 축).
 * 문자열 동등 비교로 다루면 alias 가 고립된다.
 *
 * 프로덕션 실측(read-only, 이 WO 시점):
 *   channels                : 0행
 *   channel_playback_logs   : 0행
 *   channel_heartbeats      : 0행
 *   cms_content_slots       : kpa-society 28 / kpa 1(slotKey=intranet-hero) / glycopharm 1
 *   cms_contents            : kpa-society 53 / kpa 1 / glycopharm 66 / neture 6 / pharmacy-hub 1
 *
 * 따라서 legacy `kpa` slot 은 **실제로 존재**하고, canonical KPA 채널이 그 slot 을
 * 놓치면 안 된다(§12). 아래 fixture 는 그 구조를 그대로 옮긴 것이다.
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import {
  resolveCanonicalServiceKey,
  resolveRolePrefixFromCanonicalServiceKey,
} from '@o4o/security-core';

jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (_req: any, _res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => {
    if (req.headers['x-test-admin'] === '1') {
      req.user = { id: 'admin-1', roles: ['platform:super_admin'] };
      next();
      return;
    }
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

class Channel {}
class CmsContent {}
class CmsContentSlot {}
class ChannelPlaybackLog {}
class ChannelHeartbeat {}

jest.mock(
  '@o4o-apps/cms-core',
  () => ({
    Channel: class Channel {},
    CmsContent: class CmsContent {},
    CmsContentSlot: class CmsContentSlot {},
    ChannelPlaybackLog: class ChannelPlaybackLog {},
    ChannelHeartbeat: class ChannelHeartbeat {},
  }),
  { virtual: true },
);

import { createChannelRoutes } from '../routes/channels/channels.routes.js';
import { resolveCmsServiceKeys } from '../routes/cms-content/cms-content-utils.js';

// ── fixtures ────────────────────────────────────────────────────────────────
type SlotRow = {
  id: string;
  slotKey: string;
  serviceKey: string | null;
  organizationId: string | null;
  isActive: boolean;
  sortOrder: number;
  startsAt: Date | null;
  endsAt: Date | null;
  content: { id: string; status: string; title: string } | null;
};

const SLOTS: SlotRow[] = [
  // production 의 legacy row 를 그대로 본뜬다: serviceKey='kpa'
  {
    id: 'slot-legacy',
    slotKey: 'intranet-hero',
    serviceKey: 'kpa',
    organizationId: null,
    isActive: true,
    sortOrder: 0,
    startsAt: null,
    endsAt: null,
    content: { id: 'c-legacy', status: 'published', title: 'KPA legacy hero' },
  },
  {
    id: 'slot-canonical',
    slotKey: 'kpa-dashboard-banner',
    serviceKey: 'kpa-society',
    organizationId: null,
    isActive: true,
    sortOrder: 0,
    startsAt: null,
    endsAt: null,
    content: { id: 'c-canonical', status: 'published', title: 'KPA canonical banner' },
  },
  {
    id: 'slot-gp',
    slotKey: 'intranet-hero',
    serviceKey: 'glycopharm',
    organizationId: null,
    isActive: true,
    sortOrder: 1,
    startsAt: null,
    endsAt: null,
    content: { id: 'c-gp', status: 'published', title: 'GP hero' },
  },
  {
    id: 'slot-global',
    slotKey: 'intranet-hero',
    serviceKey: null,
    organizationId: null,
    isActive: true,
    sortOrder: 2,
    startsAt: null,
    endsAt: null,
    content: { id: 'c-global', status: 'published', title: 'Global hero' },
  },
];

type ChannelRow = {
  id: string;
  serviceKey: string | null;
  organizationId: string | null;
  name: string;
  code: string | null;
  type: string;
  slotKey: string;
  status: string;
};

function baseChannels(): ChannelRow[] {
  return [
    {
      id: '11111111-1111-4111-8111-111111111111',
      serviceKey: 'kpa-society',
      organizationId: null,
      name: 'KPA canonical TV',
      code: 'KPA-TV-1',
      type: 'tv',
      slotKey: 'intranet-hero',
      status: 'active',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      serviceKey: 'kpa',
      organizationId: null,
      name: 'KPA legacy TV',
      code: 'KPA-TV-2',
      type: 'tv',
      slotKey: 'kpa-dashboard-banner',
      status: 'active',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      serviceKey: 'glycopharm',
      organizationId: null,
      name: 'GP TV',
      code: 'GP-TV-1',
      type: 'tv',
      slotKey: 'intranet-hero',
      status: 'active',
    },
  ];
}

// ── fake data source ────────────────────────────────────────────────────────
function matchIn(value: unknown, filter: any): boolean {
  if (filter === undefined) return true;
  const values: unknown[] = filter?._value !== undefined ? filter._value : [filter];
  return values.includes(value as never);
}

type Recorded = { sql: string; params: any };

function makeApp() {
  const channels = baseChannels();
  const saved: any[] = [];
  const recorded: Recorded[] = [];

  const slotQb = () => {
    const conds: Recorded[] = [];
    const qb: any = {
      leftJoinAndSelect: () => qb,
      where: (sql: string, params: any) => {
        conds.push({ sql, params });
        recorded.push({ sql, params });
        return qb;
      },
      andWhere: (sql: string, params: any) => {
        conds.push({ sql, params });
        recorded.push({ sql, params });
        return qb;
      },
      orderBy: () => qb,
      getMany: async () =>
        SLOTS.filter((slot) => {
          for (const { sql, params } of conds) {
            if (sql.includes('slot.slotKey =')) {
              if (slot.slotKey !== params.slotKey) return false;
            } else if (sql.includes('slot.isActive')) {
              if (!slot.isActive) return false;
            } else if (sql.includes('content.status =')) {
              if (slot.content?.status !== params.status) return false;
            } else if (sql.includes('slot.serviceKey IN')) {
              if (slot.serviceKey !== null && !params.serviceKeys.includes(slot.serviceKey))
                return false;
            } else if (sql.includes('slot.serviceKey =')) {
              // 회귀 감시용: 이 경로가 살아 있으면 alias 가 고립된다.
              if (slot.serviceKey !== null && slot.serviceKey !== params.serviceKey) return false;
            } else if (sql.trim() === 'slot.serviceKey IS NULL') {
              if (slot.serviceKey !== null) return false;
            } else if (sql.includes('slot.organizationId =')) {
              if (slot.organizationId !== null && slot.organizationId !== params.organizationId)
                return false;
            } else if (sql.trim() === 'slot.organizationId IS NULL') {
              if (slot.organizationId !== null) return false;
            }
          }
          return true;
        }).sort((a, b) => a.sortOrder - b.sortOrder),
    };
    return qb;
  };

  const dataSource: any = {
    getRepository: (entity: any) => {
      const name = entity?.name;
      if (name === 'CmsContentSlot') {
        return { createQueryBuilder: slotQb };
      }
      return {
        findAndCount: jest.fn(async ({ where }: any) => {
          const rows = channels.filter(
            (c) =>
              matchIn(c.serviceKey, where.serviceKey) &&
              (where.type === undefined || c.type === where.type) &&
              (where.status === undefined || c.status === where.status) &&
              (where.slotKey === undefined || c.slotKey === where.slotKey),
          );
          return [rows, rows.length];
        }),
        findOne: jest.fn(async ({ where }: any) => {
          if (where.id) return channels.find((c) => c.id === where.id) || null;
          if (where.code) return channels.find((c) => c.code === where.code) || null;
          return null;
        }),
        create: (data: any) => ({ ...data }),
        save: jest.fn(async (row: any) => {
          const persisted = { id: row.id || 'new-id', ...row };
          saved.push(persisted);
          return persisted;
        }),
      };
    },
  };

  const app = express();
  app.use(express.json());
  app.use('/channels', createChannelRoutes(dataSource));
  return { app, saved, channels, recorded };
}

// ── 1. canonicalization (security-core SSOT) ────────────────────────────────
describe('channel service identity 축', () => {
  it.each([
    ['kpa', 'kpa-society'],
    ['kpa-society', 'kpa-society'],
    ['cosmetics', 'k-cosmetics'],
    ['k-cosmetics', 'k-cosmetics'],
  ])('resolveCanonicalServiceKey(%s) === %s', (input, expected) => {
    expect(resolveCanonicalServiceKey(resolveRolePrefixFromCanonicalServiceKey(input))).toBe(
      expected,
    );
    expect(resolveCanonicalServiceKey(input as string)).toBe(expected);
  });

  it.each(['neture', 'glycopharm', 'pharmacy-hub', 'platform'])('%s 는 self-map', (key) => {
    expect(resolveCanonicalServiceKey(key)).toBe(key);
    expect(resolveCmsServiceKeys(key)).toEqual([key]);
  });

  it('alias 집합은 두 방향 입력에서 동일하다', () => {
    expect(resolveCmsServiceKeys('kpa')).toEqual(['kpa-society', 'kpa']);
    expect(resolveCmsServiceKeys('kpa-society')).toEqual(['kpa-society', 'kpa']);
    expect(resolveCmsServiceKeys('cosmetics')).toEqual(['k-cosmetics', 'cosmetics']);
    expect(resolveCmsServiceKeys('k-cosmetics')).toEqual(['k-cosmetics', 'cosmetics']);
  });
});

// ── 2. read: alias/canonical 동일 모집단 ────────────────────────────────────
describe('GET /channels 의 serviceKey 필터', () => {
  it('kpa 와 kpa-society 는 같은 채널 모집단을 반환한다', async () => {
    const alias = await request(makeApp().app).get('/channels?serviceKey=kpa');
    const canonical = await request(makeApp().app).get('/channels?serviceKey=kpa-society');
    expect(alias.status).toBe(200);
    expect(canonical.status).toBe(200);
    const ids = (r: any) => r.body.data.map((c: any) => c.id).sort();
    expect(ids(alias)).toEqual(ids(canonical));
    expect(alias.body.data).toHaveLength(2); // canonical + legacy 둘 다
  });

  it('타 서비스 채널은 혼입되지 않는다', async () => {
    const res = await request(makeApp().app).get('/channels?serviceKey=kpa');
    expect(res.body.data.map((c: any) => c.serviceKey)).not.toContain('glycopharm');
  });

  it('glycopharm 필터는 self-map 이라 GP 채널만 반환한다', async () => {
    const res = await request(makeApp().app).get('/channels?serviceKey=glycopharm');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].serviceKey).toBe('glycopharm');
  });

  it('serviceKey 없으면 전체를 반환한다(기존 계약 유지)', async () => {
    const res = await request(makeApp().app).get('/channels');
    expect(res.body.data).toHaveLength(3);
  });
});

// ── 3. write: canonical 저장 ────────────────────────────────────────────────
describe('channel write 는 canonical ledger key 로 저장한다', () => {
  const body = { name: 'ch', type: 'tv', slotKey: 'intranet-hero' };

  it.each([
    ['kpa', 'kpa-society'],
    ['kpa-society', 'kpa-society'],
    ['cosmetics', 'k-cosmetics'],
    ['k-cosmetics', 'k-cosmetics'],
    ['glycopharm', 'glycopharm'],
  ])('POST serviceKey=%s → 저장 %s', async (input, expected) => {
    const ctx = makeApp();
    const res = await request(ctx.app)
      .post('/channels')
      .set('x-test-admin', '1')
      .send({ ...body, serviceKey: input });
    expect(res.status).toBe(201);
    expect(ctx.saved[0].serviceKey).toBe(expected);
  });

  it('POST serviceKey 없음 → null(cross-service) 유지', async () => {
    const ctx = makeApp();
    const res = await request(ctx.app).post('/channels').set('x-test-admin', '1').send(body);
    expect(res.status).toBe(201);
    expect(ctx.saved[0].serviceKey).toBeNull();
  });

  it('PUT serviceKey=kpa → kpa-society 로 저장된다', async () => {
    const ctx = makeApp();
    const res = await request(ctx.app)
      .put('/channels/33333333-3333-4333-8333-333333333333')
      .set('x-test-admin', '1')
      .send({ serviceKey: 'kpa' });
    expect(res.status).toBe(200);
    expect(ctx.saved[0].serviceKey).toBe('kpa-society');
  });

  it('PUT serviceKey=null → cross-service 로 되돌릴 수 있다', async () => {
    const ctx = makeApp();
    const res = await request(ctx.app)
      .put('/channels/33333333-3333-4333-8333-333333333333')
      .set('x-test-admin', '1')
      .send({ serviceKey: null });
    expect(res.status).toBe(200);
    expect(ctx.saved[0].serviceKey).toBeNull();
  });

  it('write 는 admin 만 가능하다(기존 계약 유지)', async () => {
    const ctx = makeApp();
    expect((await request(ctx.app).post('/channels').send(body)).status).toBe(403);
    expect(
      (await request(ctx.app).put('/channels/33333333-3333-4333-8333-333333333333').send({}))
        .status,
    ).toBe(403);
  });
});

// ── 4. CMS slot linkage (이 WO 의 핵심) ─────────────────────────────────────
describe('GET /channels/:id/contents 의 CMS slot linkage', () => {
  it('canonical KPA 채널이 legacy kpa slot 을 놓치지 않는다', async () => {
    const res = await request(makeApp().app).get(
      '/channels/11111111-1111-4111-8111-111111111111/contents',
    );
    expect(res.status).toBe(200);
    const ids = res.body.data.map((d: any) => d.content.id);
    expect(ids).toContain('c-legacy'); // serviceKey='kpa' slot
    expect(ids).toContain('c-global'); // serviceKey=null slot (기존 계약)
    expect(ids).not.toContain('c-gp');
  });

  it('legacy alias 채널도 canonical slot 을 본다', async () => {
    const res = await request(makeApp().app).get(
      '/channels/22222222-2222-4222-8222-222222222222/contents',
    );
    expect(res.status).toBe(200);
    expect(res.body.data.map((d: any) => d.content.id)).toContain('c-canonical');
  });

  it('alias 집합은 security-core 파생값 그대로 쿼리에 전달된다', async () => {
    const ctx = makeApp();
    await request(ctx.app).get('/channels/11111111-1111-4111-8111-111111111111/contents');
    const cond = ctx.recorded.find((r) => r.sql.includes('slot.serviceKey IN'));
    expect(cond).toBeDefined();
    expect(cond!.params.serviceKeys).toEqual(resolveCmsServiceKeys('kpa-society'));
  });

  it('GP 채널에 KPA slot 이 혼입되지 않는다', async () => {
    const res = await request(makeApp().app).get(
      '/channels/33333333-3333-4333-8333-333333333333/contents',
    );
    expect(res.status).toBe(200);
    const ids = res.body.data.map((d: any) => d.content.id);
    expect(ids).toContain('c-gp');
    expect(ids).not.toContain('c-legacy');
    expect(ids).not.toContain('c-canonical');
  });
});

// ── 5. static regression ────────────────────────────────────────────────────
describe('channels 영역 static contract', () => {
  const API_SRC = path.resolve(__dirname, '..');
  const SOURCES = [
    'routes/channels/channels.routes.ts',
    'routes/admin/channel-ops.routes.ts',
    'routes/admin/channel-heartbeat.routes.ts',
    'routes/admin/channel-playback-logs.routes.ts',
  ];

  function stripComments(code: string): string {
    return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  }

  it.each(SOURCES)('%s 에 로컬 alias 배열/맵을 다시 만들지 않는다', (rel) => {
    const code = stripComments(fs.readFileSync(path.join(API_SRC, rel), 'utf-8'));
    expect(code).not.toMatch(
      /\[\s*'(kpa-society|kpa)'\s*,\s*'(kpa|kpa-society)'\s*\]|\[\s*'(k-cosmetics|cosmetics)'\s*,\s*'(cosmetics|k-cosmetics)'\s*\]/,
    );
    expect(code).not.toMatch(/\{\s*'?kpa-society'?\s*:/);
  });

  it('channels.routes 는 serviceKey 를 문자열 동등으로 비교하지 않는다', () => {
    const code = stripComments(
      fs.readFileSync(path.join(API_SRC, 'routes/channels/channels.routes.ts'), 'utf-8'),
    );
    expect(code).not.toMatch(/where\.serviceKey\s*=\s*serviceKey/);
    expect(code).not.toMatch(/slot\.serviceKey = :serviceKey/);
    expect(code).toMatch(/resolveCmsServiceKeys/);
    expect(code).toMatch(/resolveCanonicalServiceKey/);
  });

  it('admin channel 조회 필터도 alias 집합을 쓴다', () => {
    for (const rel of SOURCES.slice(1)) {
      const code = stripComments(fs.readFileSync(path.join(API_SRC, rel), 'utf-8'));
      expect(code).toMatch(/resolveCmsServiceKeys/);
      expect(code).not.toMatch(/serviceKey\s*=\s*serviceKey as string/);
    }
  });

  it('admin-dashboard channel 화면은 canonical value 만 보낸다', () => {
    for (const rel of ['ChannelFormModal.tsx', 'ChannelList.tsx']) {
      const p = path.resolve(API_SRC, '../../admin-dashboard/src/pages/cms/channels', rel);
      const code = stripComments(fs.readFileSync(p, 'utf-8'));
      expect(code).toMatch(/value:\s*'kpa-society'/);
      expect(code).not.toMatch(/value:\s*'kpa'/);
      expect(code).not.toMatch(/value:\s*'cosmetics'/);
    }
  });
});

// 미사용 클래스 참조 방지(엔티티 형태만 문서화한다)
void [Channel, CmsContent, CmsContentSlot, ChannelPlaybackLog, ChannelHeartbeat];
