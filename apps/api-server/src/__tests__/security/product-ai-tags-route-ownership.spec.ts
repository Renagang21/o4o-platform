/**
 * WO-O4O-PRODUCT-AI-TAGS-SUPPLIER-OWNERSHIP-GUARD-V1 §7
 *
 * 소유권 판정 자체(resolveGlobalProductResourceAccess)는 product-ai-global-access.spec.ts 가
 * 단위로 고정한다. 본 스펙은 그 **route 배선**을 고정한다 —
 * ai-tags 의 각 endpoint 가 실제로 판정을 호출하고, 실패 시 403 으로 끊는가.
 *
 * 회귀 위험: endpoint 하나가 `authenticate` 만 남기고 판정 호출을 빠뜨리면
 * 인증된 아무 사용자나 임의 ProductMaster 의 tags 를 수정할 수 있게 된다.
 *
 *   공급자 A  — 자기 offer master        → 통과 (403 아님)
 *   공급자 A  — 공급자 B 의 master        → 403
 *   공급자 A  — offer 없는 master         → 403
 *   서비스 운영자(kpa/cosmetics/glycopharm/neture) → 403 (역할만으로 전역 write 없음)
 *   일반 인증 사용자                      → 403
 *   platform:super_admin                 → 통과
 *   미인증                                → 401
 */
import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';

const MASTER_A = '11111111-1111-4111-8111-111111111111';
const MASTER_B = '22222222-2222-4222-8222-222222222222';
const MASTER_NO_OFFER = '44444444-4444-4444-8444-444444444444';

const FIXTURE = {
  roles: {
    superadmin: ['platform:super_admin'],
    'kpa-operator': ['kpa-society:operator'],
    'kpa-admin': ['kpa-society:admin'],
    'cosmetics-operator': ['cosmetics:operator'],
    'glycopharm-admin': ['glycopharm:admin'],
    'neture-operator': ['neture:operator', 'neture:admin'],
    plain: [],
  } as Record<string, string[]>,
  suppliers: {
    'supplier-a-user': { id: 'supplier-a', status: 'ACTIVE' },
    'supplier-b-user': { id: 'supplier-b', status: 'ACTIVE' },
    'supplier-pending-user': { id: 'supplier-p', status: 'PENDING' },
  } as Record<string, { id: string; status: string }>,
  offers: { 'supplier-a': [MASTER_A], 'supplier-b': [MASTER_B], 'supplier-p': [MASTER_A] } as Record<string, string[]>,
  masters: [MASTER_A, MASTER_B, MASTER_NO_OFFER],
};

jest.mock('../../middleware/auth.middleware.js', () => ({
  authenticate: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const id = req.headers['x-test-user'] as string | undefined;
    if (!id) {
      res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
      return;
    }
    (req as unknown as { user: unknown }).user = { id };
    next();
  },
}));

// LLM 의존은 계약 검증과 무관하다. 실제 호출 경로에 도달하지 않도록 stub 한다.
jest.mock('@o4o/ai-core', () => ({ execute: jest.fn(async () => ({ tags: [] })) }), { virtual: true });
jest.mock(
  '@o4o/ai-prompts/store',
  () => ({ PRODUCT_TAGGING_SYSTEM: 'stub', PRODUCT_TAGGING_B2B_SYSTEM: 'stub' }),
  { virtual: true },
);

function createStubDataSource(): DataSource {
  const query = async (sql: string, params: unknown[] = []): Promise<unknown[]> => {
    if (/FROM role_assignments/.test(sql)) {
      const [userId, allowed] = params as [string, string[]];
      return (FIXTURE.roles[userId] ?? []).some((r) => allowed.includes(r)) ? [{ ok: 1 }] : [];
    }
    if (/FROM neture_suppliers/.test(sql)) {
      const s = FIXTURE.suppliers[(params as [string])[0]];
      return s ? [s] : [];
    }
    if (/FROM supplier_product_offers/.test(sql)) {
      const [supplierId, masterId] = params as [string, string];
      return (FIXTURE.offers[supplierId] ?? []).includes(masterId) ? [{ ok: 1 }] : [];
    }
    if (/FROM organization_members/.test(sql)) return [];
    if (/FROM organization_product_listings/.test(sql)) return [];
    // loadProductTagInput — 태그 생성 입력 조회
    if (/FROM product_masters pm/.test(sql)) {
      const [id] = params as [string];
      return FIXTURE.masters.includes(id)
        ? [{ id, regulatoryName: 'n', marketingName: 'n', manufacturerName: 'm', existingTags: [] }]
        : [];
    }
    // productMasterExists
    if (/FROM product_masters/.test(sql)) {
      const [id] = params as [string];
      return FIXTURE.masters.includes(id) ? [{ ok: 1 }] : [];
    }
    if (/FROM product_ocr_texts/.test(sql)) return [];
    throw new Error(`Unexpected query in stub: ${sql}`);
  };

  const repo = {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => v),
    delete: jest.fn(async () => ({ affected: 1 })),
    update: jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: () => ({
      where: () => ({ andWhere: () => ({ getOne: async () => null }) }),
    }),
  };

  return { query, getRepository: () => repo } as unknown as DataSource;
}

/** ai-tags 의 전 write endpoint. 하나라도 판정을 빠뜨리면 여기서 잡힌다. */
const WRITE_ENDPOINTS: Array<[string, (m: string) => string, unknown]> = [
  ['POST regenerate', (m) => `/api/v1/products/${m}/ai-tags/regenerate`, {}],
  ['POST suggest', (m) => `/api/v1/products/${m}/ai-tags/suggest`, {}],
  ['POST manual', (m) => `/api/v1/products/${m}/ai-tags/manual`, { tag: 'x' }],
  ['POST manual/batch', (m) => `/api/v1/products/${m}/ai-tags/manual/batch`, { tags: ['x'] }],
];
const DELETE_ENDPOINT = (m: string) => `/api/v1/products/${m}/ai-tags/00000000-0000-4000-8000-000000000009`;

describe('WO-O4O-PRODUCT-AI-TAGS-SUPPLIER-OWNERSHIP-GUARD-V1 — route 배선', () => {
  let app: express.Express;

  beforeAll(async () => {
    const { createProductAiTagRouter } = await import(
      '../../modules/store-ai/controllers/product-ai-tag.controller.js'
    );
    app = express();
    app.use(express.json());
    app.use('/api/v1/products', createProductAiTagRouter(createStubDataSource()));
  });

  const post = (user: string, path: string, body: unknown) =>
    request(app).post(path).set('x-test-user', user).send(body as object);

  describe('공급자 — 자기 제품만', () => {
    it.each(WRITE_ENDPOINTS)('%s — 자기 offer master 는 통과', async (_label, path, body) => {
      const res = await post('supplier-a-user', path(MASTER_A), body);
      expect(res.status).not.toBe(403);
    });

    it.each(WRITE_ENDPOINTS)('%s — 타 공급자 master 는 403', async (_label, path, body) => {
      const res = await post('supplier-a-user', path(MASTER_B), body);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PRODUCT_ACCESS_DENIED');
    });

    it.each(WRITE_ENDPOINTS)('%s — offer 없는 master 는 403', async (_label, path, body) => {
      const res = await post('supplier-a-user', path(MASTER_NO_OFFER), body);
      expect(res.status).toBe(403);
    });

    it('DELETE — 타 공급자 master 는 403, 자기 master 는 통과', async () => {
      const other = await request(app).delete(DELETE_ENDPOINT(MASTER_B)).set('x-test-user', 'supplier-a-user');
      expect(other.status).toBe(403);
      const own = await request(app).delete(DELETE_ENDPOINT(MASTER_A)).set('x-test-user', 'supplier-a-user');
      expect(own.status).not.toBe(403);
    });

    it('비ACTIVE 공급자는 자기 master 라도 write 403', async () => {
      const res = await post('supplier-pending-user', `/api/v1/products/${MASTER_A}/ai-tags/manual`, { tag: 'x' });
      expect(res.status).toBe(403);
    });
  });

  describe('서비스 운영자 / 일반 사용자 — 역할만으로 전역 write 없음', () => {
    const NON_OWNERS = ['kpa-operator', 'kpa-admin', 'cosmetics-operator', 'glycopharm-admin', 'neture-operator', 'plain'];

    it.each(NON_OWNERS)('%s 의 수동 태그 추가는 403', async (user) => {
      const res = await post(user, `/api/v1/products/${MASTER_A}/ai-tags/manual`, { tag: 'x' });
      expect(res.status).toBe(403);
    });

    it.each(NON_OWNERS)('%s 의 태그 재생성은 403', async (user) => {
      const res = await post(user, `/api/v1/products/${MASTER_A}/ai-tags/regenerate`, {});
      expect(res.status).toBe(403);
    });

    it.each(NON_OWNERS)('%s 의 태그 조회(관리 API)도 403', async (user) => {
      const res = await request(app).get(`/api/v1/products/${MASTER_A}/ai-tags`).set('x-test-user', user);
      expect(res.status).toBe(403);
    });
  });

  describe('platform:super_admin — 기존 전역 권한 유지', () => {
    it.each(WRITE_ENDPOINTS)('%s 통과', async (_label, path, body) => {
      const res = await post('superadmin', path(MASTER_A), body);
      expect(res.status).not.toBe(403);
    });

    it('타 공급자 master 도 통과', async () => {
      const res = await post('superadmin', `/api/v1/products/${MASTER_B}/ai-tags/manual`, { tag: 'x' });
      expect(res.status).not.toBe(403);
    });
  });

  describe('입력 계약', () => {
    it('미인증은 401', async () => {
      const res = await request(app).post(`/api/v1/products/${MASTER_A}/ai-tags/manual`).send({ tag: 'x' });
      expect(res.status).toBe(401);
    });

    it('존재하지 않는 master 는 소유자에게도 404 (전역 고아 row 생성 금지)', async () => {
      const ghost = '55555555-5555-4555-8555-555555555555';
      const res = await post('superadmin', `/api/v1/products/${ghost}/ai-tags/manual`, { tag: 'x' });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('PRODUCT_MASTER_NOT_FOUND');
    });

    it('UUID 형식이 아니면 403 (500 방지)', async () => {
      const res = await post('supplier-a-user', '/api/v1/products/not-a-uuid/ai-tags/manual', { tag: 'x' });
      expect(res.status).toBe(403);
    });
  });
});

/**
 * §6 ProductMaster 비파괴 — syncMasterTags 가 태그 외 메타를 파괴하지 않는지.
 *
 * 운영 데이터의 product_masters.tags 는 array(239,361) 와 object(32,674, nameCleanupV1 rollback ·
 * woBatch · censusKey) 가 공존한다. object 를 배열로 덮어쓰면 선행 WO 의 rollback 키가 사라진다.
 */
describe('syncMasterTags — ProductMaster 비파괴 (§6)', () => {
  const buildService = async (currentTags: unknown) => {
    const { ProductAiTaggingService } = await import(
      '../../modules/store-ai/services/product-ai-tagging.service.js'
    );
    const update = jest.fn(async () => ({ affected: 1 }));
    const repo = {
      find: jest.fn(async () => [{ tag: 'a', source: 'manual', confidence: 1 }]),
      findOne: jest.fn(async () => ({ id: MASTER_A, tags: currentTags })),
      create: jest.fn((v: unknown) => v),
      save: jest.fn(async (v: unknown) => v),
      delete: jest.fn(async () => ({ affected: 1 })),
      update,
      createQueryBuilder: () => ({ where: () => ({ andWhere: () => ({ getOne: async () => null }) }) }),
    };
    const ds = { getRepository: () => repo, query: async () => [] } as unknown as DataSource;
    return { service: new ProductAiTaggingService(ds), update };
  };

  it('tags 가 배치/rollback 메타 object 이면 product_masters 를 수정하지 않는다', async () => {
    const { service, update } = await buildService({ nameCleanupV1: { before: '옛이름' }, woBatch: 'x' });
    await service.addManualTag(MASTER_A, 'new-tag');
    expect(update).not.toHaveBeenCalled();
  });

  it('tags 가 배열이면 기존대로 동기화한다', async () => {
    const { service, update } = await buildService(['old']);
    await service.addManualTag(MASTER_A, 'new-tag');
    expect(update).toHaveBeenCalledWith(MASTER_A, { tags: ['a'] });
  });

  it('tags 가 null 이어도 동기화한다', async () => {
    const { service, update } = await buildService(null);
    await service.addManualTag(MASTER_A, 'new-tag');
    expect(update).toHaveBeenCalled();
  });
});
