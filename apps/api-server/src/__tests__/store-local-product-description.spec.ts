import express from 'express';
import request from 'supertest';

/**
 * WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1 §13
 *
 * 매장 상품 상세 설명의 canonical 저장 위치는 `store_local_products.detail_html` 이다.
 * (전역 자원 `product_ai_contents` 는 ProductMaster 기준 AI 초안이며 매장 저장소가 아니다.)
 *
 * 검증 대상:
 *   - 목록 응답이 detail_html 을 포함한다 (설명 화면의 유일한 조회 경로)
 *   - 목록 쿼리에 organization_id 경계가 항상 적용된다
 *   - PUT { detailHtml } 이 부분 업데이트로 저장된다
 *   - description / summary / usage_info / caution_info 가 보존된다
 *   - detailHtml 미전송 시 기존 값이 유지된다
 *   - 저장 후 목록 재조회에서 값이 되읽힌다
 *   - 타 조직 상품 수정은 404 이며 원본이 변경되지 않는다
 *   - detail_html 저장 시 <script> 가 제거된다
 */

const ORG_A = 'org-aaaa';
const ORG_B = 'org-bbbb';

let currentOrgId: string | null = ORG_A;

jest.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-store-owner', roles: ['kpa:store_owner'] };
    next();
  },
}));

jest.mock('../utils/store-owner.utils.js', () => ({
  resolveStoreAccess: jest.fn(async () => currentOrgId),
}));

import { createStoreLocalProductRoutes } from '../routes/platform/store-local-product.routes.js';

interface Row {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  summary: string | null;
  detail_html: string | null;
  usage_info: string | null;
  caution_info: string | null;
  images: string[];
  thumbnail_url: string | null;
  gallery_images: string[];
  category: string | null;
  barcode: string | null;
  price_display: string | null;
  badge_type: string;
  highlight_flag: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const SNAKE_TO_CAMEL: Record<string, string> = {
  organization_id: 'organizationId',
  detail_html: 'detailHtml',
  usage_info: 'usageInfo',
  caution_info: 'cautionInfo',
  thumbnail_url: 'thumbnailUrl',
  gallery_images: 'galleryImages',
  price_display: 'priceDisplay',
  badge_type: 'badgeType',
  highlight_flag: 'highlightFlag',
  is_active: 'isActive',
  sort_order: 'sortOrder',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};
const CAMEL_TO_SNAKE: Record<string, string> = Object.fromEntries(
  Object.entries(SNAKE_TO_CAMEL).map(([k, v]) => [v, k]),
);

function toEntity(row: Row): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[SNAKE_TO_CAMEL[k] ?? k] = v;
  return out;
}

function baseRow(overrides: Partial<Row>): Row {
  return {
    id: 'row-1',
    organization_id: ORG_A,
    name: '제품',
    description: null,
    summary: null,
    detail_html: null,
    usage_info: null,
    caution_info: null,
    images: [],
    thumbnail_url: null,
    gallery_images: [],
    category: null,
    barcode: null,
    price_display: null,
    badge_type: 'none',
    highlight_flag: false,
    is_active: true,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** 실제로 실행된 목록 SQL 을 검사하기 위해 보관 */
let lastListSql = '';

function makeApp(rows: Row[]) {
  const dataSource: any = {
    query: async (sql: string, params: any[]) => {
      if (/^\s*SELECT COUNT/i.test(sql)) {
        return [{ count: rows.filter((r) => r.organization_id === params[0] && r.is_active).length }];
      }
      if (/FROM store_local_products/i.test(sql)) {
        lastListSql = sql;
        return rows
          .filter((r) => r.organization_id === params[0] && r.is_active)
          .map((r) => ({ ...r }));
      }
      throw new Error('unexpected query: ' + sql);
    },
    getRepository: () => ({
      findOne: async ({ where }: any) => {
        const hit = rows.find(
          (r) => r.id === where.id && r.organization_id === where.organizationId,
        );
        return hit ? toEntity(hit) : null;
      },
      save: async (entity: any) => {
        const idx = rows.findIndex((r) => r.id === entity.id);
        const target = rows[idx];
        for (const [k, v] of Object.entries(entity)) {
          const col = CAMEL_TO_SNAKE[k] ?? k;
          (target as any)[col] = v;
        }
        target.updated_at = '2026-07-29T00:00:00.000Z';
        return toEntity(target);
      },
      create: (x: any) => x,
    }),
  };

  const app = express();
  app.use(express.json());
  app.use('/api/v1/store', createStoreLocalProductRoutes(dataSource));
  return { app, rows };
}

beforeEach(() => {
  currentOrgId = ORG_A;
  lastListSql = '';
});

describe('store local product — 상세 설명 소유권 (WO-…-OWNERSHIP-ALIGNMENT-V1)', () => {
  it('목록 응답에 detail_html 이 포함된다 (설명 화면 hydrate 소스)', async () => {
    const { app } = makeApp([baseRow({ detail_html: '<p>저장된 설명</p>' })]);

    const res = await request(app).get('/api/v1/store/local-products');

    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toHaveProperty('detail_html', '<p>저장된 설명</p>');
    expect(lastListSql).toMatch(/detail_html/);
  });

  it('목록 쿼리는 organization_id 경계를 항상 적용한다', async () => {
    const { app } = makeApp([
      baseRow({ id: 'a', organization_id: ORG_A }),
      baseRow({ id: 'b', organization_id: ORG_B }),
    ]);

    const res = await request(app).get('/api/v1/store/local-products');

    expect(res.body.data.items.map((i: any) => i.id)).toEqual(['a']);
    expect(lastListSql).toMatch(/WHERE organization_id = \$1/);
  });

  it('PUT { detailHtml } 로 저장되고, 다른 설명 필드는 보존된다', async () => {
    const { app, rows } = makeApp([
      baseRow({
        id: 'row-1',
        description: '원래 요약설명',
        summary: '원래 한줄요약',
        usage_info: '원래 사용법',
        caution_info: '원래 주의사항',
      }),
    ]);

    const res = await request(app)
      .put('/api/v1/store/local-products/row-1')
      .send({ detailHtml: '<p>새 상세</p>' });

    expect(res.status).toBe(200);
    expect(res.body.data.detailHtml).toBe('<p>새 상세</p>');
    expect(rows[0].detail_html).toBe('<p>새 상세</p>');
    // §6: description / summary / usage_info / caution_info 는 자동 병합·덮어쓰기 금지
    expect(rows[0].description).toBe('원래 요약설명');
    expect(rows[0].summary).toBe('원래 한줄요약');
    expect(rows[0].usage_info).toBe('원래 사용법');
    expect(rows[0].caution_info).toBe('원래 주의사항');
  });

  it('detailHtml 을 보내지 않으면 기존 detail_html 이 유지된다', async () => {
    const { app, rows } = makeApp([baseRow({ detail_html: '<p>유지</p>' })]);

    await request(app).put('/api/v1/store/local-products/row-1').send({ name: '이름만 변경' });

    expect(rows[0].detail_html).toBe('<p>유지</p>');
    expect(rows[0].name).toBe('이름만 변경');
  });

  it('저장 후 목록 재조회에서 되읽힌다 (새로고침 지속성)', async () => {
    const { app } = makeApp([baseRow({})]);

    await request(app)
      .put('/api/v1/store/local-products/row-1')
      .send({ detailHtml: '<p>지속</p>' });
    const res = await request(app).get('/api/v1/store/local-products');

    expect(res.body.data.items[0].detail_html).toBe('<p>지속</p>');
  });

  it('타 조직 상품은 404 이며 원본 detail_html 이 변경되지 않는다', async () => {
    const { app, rows } = makeApp([
      baseRow({ id: 'b', organization_id: ORG_B, detail_html: '<p>남의 매장</p>' }),
    ]);

    const res = await request(app)
      .put('/api/v1/store/local-products/b')
      .send({ detailHtml: '<p>침범</p>' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(rows[0].detail_html).toBe('<p>남의 매장</p>');
  });

  it('매장 소속이 없으면 저장이 403 이다 (역할 확대 없음)', async () => {
    currentOrgId = null;
    const { app } = makeApp([baseRow({})]);

    const res = await request(app)
      .put('/api/v1/store/local-products/row-1')
      .send({ detailHtml: '<p>x</p>' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  it('detail_html 저장 시 <script> 가 제거된다', async () => {
    const { app, rows } = makeApp([baseRow({})]);

    await request(app)
      .put('/api/v1/store/local-products/row-1')
      .send({ detailHtml: '<p>본문</p><script>alert(1)</script>' });

    expect(rows[0].detail_html).toBe('<p>본문</p>');
  });
});
