/**
 * WO-O4O-CMS-SERVICEKEY-ALIAS-SSOT-RESIDUAL-CLOSURE-V1
 *
 * CMS 주변에 남아 있던 로컬 serviceKey alias 리터럴을 `@o4o/security-core` canonical
 * SSOT 한 축으로 수렴시킨 계약을 고정한다.
 *
 * 실측(production, read-only)이 이 계약의 근거다:
 *   cms_contents      : kpa-society 53 / kpa 1        (legacy alias 1건)
 *   cms_content_slots : kpa-society 28 / kpa 1        (legacy alias 1건, 위 content 와 한 쌍)
 *
 * 따라서 alias 를 문자열 동등으로 필터하면 **양쪽 모두 서로를 잃는다**:
 *   serviceKey=kpa-society → legacy slot 1건이 보이지 않고
 *   serviceKey=kpa         → canonical slot 28건이 보이지 않는다.
 * slot 관리 경계도 read 경계와 같은 alias 집합을 써야 한다 (WO §8·§12).
 */
import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';

import {
  resolveCanonicalServiceKey,
  resolveRolePrefixFromCanonicalServiceKey,
} from '@o4o/security-core';

jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    const roles = req.headers['x-test-roles'];
    if (roles) req.user = { id: 'u-1', email: 'u@test', roles: String(roles).split(',') };
    next();
  },
  requireAuth: (req: any, res: any, next: any) => {
    const roles = req.headers['x-test-roles'];
    if (!roles) return res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
    req.user = { id: 'u-1', email: 'u@test', roles: String(roles).split(',') };
    next();
  },
}));

jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: jest.fn(async (_id: string, roles: string[]) => false),
    getActiveRoles: jest.fn(async () => []),
  },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock(
  '@o4o-apps/cms-core',
  () => ({ CmsContent: class CmsContent {}, CmsContentSlot: class CmsContentSlot {} }),
  { virtual: true },
);

import { createCmsContentSlotRoutes } from '../routes/cms-content/cms-content-slot.handler.js';
import {
  resolveCmsServiceKeys,
  canonicalizeCmsServiceKey,
  resolveCmsRolePrefix,
  isSameCmsService,
} from '../routes/cms-content/cms-content-utils.js';
import { roleAssignmentService } from '../modules/auth/services/role-assignment.service.js';

// ────────────────────────────────────────────────────────────────────────────
// 1. SSOT 파생 계약 — 값을 손으로 적지 않는다
// ────────────────────────────────────────────────────────────────────────────

describe('CMS alias 집합은 security-core resolver 파생이다', () => {
  it.each(['kpa', 'kpa-society', 'cosmetics', 'k-cosmetics'])(
    '%s 의 alias 집합은 resolver 왕복 결과와 동일하다',
    (input) => {
      const prefix = resolveRolePrefixFromCanonicalServiceKey(input);
      const canonical = resolveCanonicalServiceKey(prefix);
      expect(resolveCmsServiceKeys(input).sort()).toEqual([canonical, prefix].sort());
      expect(canonicalizeCmsServiceKey(input)).toBe(canonical);
      expect(resolveCmsRolePrefix(input)).toBe(prefix);
    },
  );

  it.each(['neture', 'glycopharm', 'pharmacy-hub'])(
    'self-map 서비스 %s 는 alias 가 하나뿐이다',
    (input) => {
      expect(resolveCmsServiceKeys(input)).toEqual([input]);
      expect(canonicalizeCmsServiceKey(input)).toBe(input);
    },
  );

  it('alias 쌍은 같은 canonical service 로 판정된다', () => {
    expect(isSameCmsService('kpa', 'kpa-society')).toBe(true);
    expect(isSameCmsService('cosmetics', 'k-cosmetics')).toBe(true);
    expect(isSameCmsService('kpa', 'k-cosmetics')).toBe(false);
    expect(isSameCmsService('glycopharm', 'pharmacy-hub')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. 로컬 alias table 재도입 금지 (static contract)
// ────────────────────────────────────────────────────────────────────────────

const API_SRC = path.resolve(__dirname, '..');

/** CMS serviceKey 를 직접 다루는 소스 목록 — 여기서 alias 배열이 재등장하면 SSOT 가 두 벌이 된다. */
const CMS_SOURCES = [
  'routes/cms-content/cms-content-utils.ts',
  'routes/cms-content/cms-content-mutation.handler.ts',
  'routes/cms-content/cms-content-query.handler.ts',
  'routes/cms-content/cms-content-slot.handler.ts',
  'routes/kpa/kpa.routes.ts',
  'routes/o4o-store/controllers/news.controller.ts',
];

/** 주석은 계약 설명에 alias 값을 적으므로 검사 대상에서 제외한다. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('CMS 영역에 로컬 alias table 을 다시 만들지 않는다', () => {
  it.each(CMS_SOURCES)('%s 에 하드코딩 alias 배열이 없다', (rel) => {
    const code = stripComments(fs.readFileSync(path.join(API_SRC, rel), 'utf8'));
    // ['kpa-society', 'kpa'] / ['kpa','kpa-society'] / k-cosmetics 쌍 — 순서·따옴표 무관
    const aliasArray =
      /\[\s*'(kpa-society|kpa)'\s*,\s*'(kpa|kpa-society)'\s*\]|\[\s*'(k-cosmetics|cosmetics)'\s*,\s*'(cosmetics|k-cosmetics)'\s*\]/;
    expect(code).not.toMatch(aliasArray);
    // { 'kpa-society': ... } 형태의 로컬 매핑 객체도 금지
    expect(code).not.toMatch(/\{\s*'?kpa-society'?\s*:/);
    expect(code).not.toMatch(/\{\s*'?k-cosmetics'?\s*:/);
  });

  it('kpa.routes.ts 의 KPA 서비스 키는 security-core 파생이다', () => {
    const code = fs.readFileSync(path.join(API_SRC, 'routes/kpa/kpa.routes.ts'), 'utf8');
    expect(code).toContain("const KPA_SERVICE_KEY = resolveCanonicalServiceKey('kpa')");
    expect(code).toContain("const KPA_SERVICE_KEYS = resolveCmsServiceKeys('kpa')");
  });

  it('admin-dashboard CMS 서비스 카탈로그는 canonical key 만 쓴다', () => {
    const catalog = path.resolve(
      API_SRC,
      // API_SRC = apps/api-server/src → apps/admin-dashboard
      '../../admin-dashboard/src/pages/cms/cmsServiceCatalog.ts',
    );
    const code = stripComments(fs.readFileSync(catalog, 'utf8'));
    expect(code).toContain("value: 'kpa-society'");
    expect(code).toContain("value: 'k-cosmetics'");
    // role prefix 를 service identity 값으로 되돌리면 축이 다시 섞인다.
    expect(code).not.toMatch(/value:\s*'kpa'/);
    expect(code).not.toMatch(/value:\s*'cosmetics'/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. slot 관리 경계 — alias 고립 금지 / 신규 legacy row 생성 0
// ────────────────────────────────────────────────────────────────────────────

const SLOT_ROWS = [
  { id: 's-canon', slotKey: 'kpa-main-hero', serviceKey: 'kpa-society', isActive: true, sortOrder: 1, contentId: 'c-1', content: null },
  { id: 's-legacy', slotKey: 'intranet-hero', serviceKey: 'kpa', isActive: true, sortOrder: 0, contentId: 'c-legacy', content: null },
  { id: 's-gp', slotKey: 'gp-hero', serviceKey: 'glycopharm', isActive: true, sortOrder: 0, contentId: 'c-gp', content: null },
];

function unwrapIn(value: any): string[] | undefined {
  if (value === undefined) return undefined;
  return value?._value ?? [value];
}

let lastWhere: any = null;
let saved: any = null;

function makeApp() {
  lastWhere = null;
  saved = null;
  const dataSource: any = {
    getRepository: (entity: any) => {
      const name = entity?.name;
      if (name === 'CmsContent') {
        return { findOne: jest.fn(async () => ({ id: 'c-1', title: 'x' })) };
      }
      return {
        find: jest.fn(async ({ where }: any) => {
          lastWhere = where;
          const keys = unwrapIn(where.serviceKey);
          return SLOT_ROWS.filter((s) => (keys ? keys.includes(s.serviceKey!) : true));
        }),
        findOne: jest.fn(async ({ where }: any) =>
          SLOT_ROWS.find((s) => s.id === where.id) ?? null,
        ),
        create: jest.fn((v: any) => ({ ...v })),
        save: jest.fn(async (v: any) => {
          saved = v;
          return { id: v.id ?? 's-new', ...v };
        }),
      };
    },
  };
  const app = express();
  app.use(express.json());
  app.use('/cms', createCmsContentSlotRoutes({ dataSource }));
  return app;
}

beforeEach(() => {
  (roleAssignmentService.hasAnyRole as jest.Mock).mockResolvedValue(false);
  (roleAssignmentService.getActiveRoles as jest.Mock).mockResolvedValue([]);
});

describe('slot 목록은 alias 를 고립시키지 않는다 (WO §12)', () => {
  it('KPA operator 가 canonical 로 필터해도 legacy kpa slot 이 함께 조회된다', async () => {
    const res = await request(makeApp())
      .get('/cms/slots?serviceKey=kpa-society')
      .set('x-test-roles', 'kpa:operator');
    expect(res.status).toBe(200);
    expect(unwrapIn(lastWhere.serviceKey)!.sort()).toEqual(['kpa', 'kpa-society']);
    expect(res.body.data.map((s: any) => s.id).sort()).toEqual(['s-canon', 's-legacy']);
  });

  it('legacy alias 로 필터해도 canonical slot 이 함께 조회된다', async () => {
    const res = await request(makeApp())
      .get('/cms/slots?serviceKey=kpa')
      .set('x-test-roles', 'kpa:operator');
    expect(res.status).toBe(200);
    expect(res.body.data.map((s: any) => s.id).sort()).toEqual(['s-canon', 's-legacy']);
  });

  it('platform admin 이 필터해도 같은 alias 집합이다', async () => {
    (roleAssignmentService.hasAnyRole as jest.Mock).mockResolvedValue(true);
    const res = await request(makeApp())
      .get('/cms/slots?serviceKey=kpa-society')
      .set('x-test-roles', 'platform:super_admin');
    expect(res.status).toBe(200);
    expect(unwrapIn(lastWhere.serviceKey)!.sort()).toEqual(['kpa', 'kpa-society']);
  });

  it('타 서비스 operator 는 KPA slot 을 필터할 수 없다', async () => {
    const res = await request(makeApp())
      .get('/cms/slots?serviceKey=kpa-society')
      .set('x-test-roles', 'glycopharm:operator');
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('SERVICE_SCOPE_DENIED');
  });
});

describe('slot 신규 생성은 canonical 로만 저장한다 (WO §9)', () => {
  it.each([
    ['kpa', 'kpa-society'],
    ['kpa-society', 'kpa-society'],
  ])('입력 %s → 저장 %s', async (input, expected) => {
    const res = await request(makeApp())
      .post('/cms/slots')
      .set('x-test-roles', 'kpa:operator')
      .send({ slotKey: 'kpa-main-hero', serviceKey: input, contentId: 'c-1' });
    expect(res.status).toBe(201);
    expect(saved.serviceKey).toBe(expected);
  });

  it('platform admin 이 만들어도 canonical 로 저장된다', async () => {
    (roleAssignmentService.hasAnyRole as jest.Mock).mockResolvedValue(true);
    const res = await request(makeApp())
      .post('/cms/slots')
      .set('x-test-roles', 'platform:super_admin')
      .send({ slotKey: 'x', serviceKey: 'cosmetics', contentId: 'c-1' });
    expect(res.status).toBe(201);
    expect(saved.serviceKey).toBe('k-cosmetics');
  });

  it('글로벌 slot(serviceKey 없음)은 admin 만 만들고 null 로 남는다', async () => {
    (roleAssignmentService.hasAnyRole as jest.Mock).mockResolvedValue(true);
    const res = await request(makeApp())
      .post('/cms/slots')
      .set('x-test-roles', 'platform:super_admin')
      .send({ slotKey: 'x', contentId: 'c-1' });
    expect(res.status).toBe(201);
    expect(saved.serviceKey).toBeNull();
  });
});

describe('legacy slot 은 수정 가능하되 조용히 migration 되지 않는다 (WO §11)', () => {
  it('KPA operator 는 legacy kpa slot 을 수정할 수 있다', async () => {
    const res = await request(makeApp())
      .put('/cms/slots/s-legacy')
      .set('x-test-roles', 'kpa:operator')
      .send({ sortOrder: 5 });
    expect(res.status).toBe(200);
    expect(saved.sortOrder).toBe(5);
    expect(saved.serviceKey).toBe('kpa');
  });

  it('canonical alias 를 재전송해도 legacy 값이 유지된다 (migration 0)', async () => {
    const res = await request(makeApp())
      .put('/cms/slots/s-legacy')
      .set('x-test-roles', 'kpa:operator')
      .send({ serviceKey: 'kpa-society', sortOrder: 2 });
    expect(res.status).toBe(200);
    expect(saved.serviceKey).toBe('kpa');
  });

  it('타 서비스 operator 는 legacy kpa slot 을 수정할 수 없다', async () => {
    const res = await request(makeApp())
      .put('/cms/slots/s-legacy')
      .set('x-test-roles', 'cosmetics:operator')
      .send({ sortOrder: 9 });
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('SERVICE_SCOPE_DENIED');
  });

  it('operator 는 실제 cross-service 이전을 할 수 없다', async () => {
    const res = await request(makeApp())
      .put('/cms/slots/s-canon')
      .set('x-test-roles', 'kpa:operator')
      .send({ serviceKey: 'glycopharm' });
    expect(res.status).toBe(403);
    expect(res.body?.error?.code).toBe('SERVICE_KEY_IMMUTABLE');
  });
});
