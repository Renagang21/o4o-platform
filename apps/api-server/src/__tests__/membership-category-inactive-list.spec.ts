/**
 * WO-O4O-ADMIN-MEMBERSHIP-INACTIVE-CATEGORY-LIST-FIX-V1
 *
 * 결함: MemberCategoryService.list() 가 `where: { isActive: true }` 로 고정되어 있어
 *       비활성 회원 분류가 관리자 목록에서 사라지고 다시 활성화할 수 없었다.
 *
 * 이 테스트는 운영 DB 를 사용하지 않는다. in-memory fake repository 와
 * fake DataSource 만 사용한다 (운영 데이터 write 0건).
 */
import express from 'express';
import request from 'supertest';
import { readFileSync } from 'fs';
import { join } from 'path';

import { MemberCategoryService } from '../../../../packages/membership-yaksa/src/backend/services/MemberCategoryService.js';
import { createCategoryRoutes } from '../../../../packages/membership-yaksa/src/backend/routes/categoryRoutes.js';
import {
  createMembershipAdminGuards,
  MEMBERSHIP_ADMIN_ROLES,
  MEMBERSHIP_ADMIN_SUBTREES,
} from '../bootstrap/membership-admin-guard.js';

// ---------------------------------------------------------------------------
// in-memory fake repository
// ---------------------------------------------------------------------------

interface FakeCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  requiresAnnualFee: boolean;
  annualFeeAmount: number | null;
  sortOrder: number;
}

function seedRows(): FakeCategory[] {
  return [
    { id: 'c1', name: '정회원', description: null, isActive: true, requiresAnnualFee: true, annualFeeAmount: 50000, sortOrder: 1 },
    { id: 'c2', name: '준회원', description: null, isActive: false, requiresAnnualFee: true, annualFeeAmount: 30000, sortOrder: 2 },
    { id: 'c3', name: '휴업약사', description: null, isActive: true, requiresAnnualFee: false, annualFeeAmount: null, sortOrder: 3 },
    { id: 'c4', name: '명예회원', description: null, isActive: false, requiresAnnualFee: false, annualFeeAmount: null, sortOrder: 3 },
  ];
}

class FakeRepo {
  public findCalls: any[] = [];
  constructor(public rows: FakeCategory[]) {}

  async find(options: any): Promise<FakeCategory[]> {
    this.findCalls.push(options);
    let result = [...this.rows];
    if (options?.where && 'isActive' in options.where) {
      result = result.filter((r) => r.isActive === options.where.isActive);
    }
    // order: { sortOrder: 'ASC', name: 'ASC' }
    result.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return result;
  }

  async findOne(options: any): Promise<FakeCategory | null> {
    const where = options?.where ?? {};
    return this.rows.find((r) => Object.keys(where).every((k) => (r as any)[k] === where[k])) ?? null;
  }

  create(dto: any): FakeCategory {
    return { id: `c${this.rows.length + 1}`, description: null, isActive: true, requiresAnnualFee: false, annualFeeAmount: null, sortOrder: 0, ...dto };
  }

  async save(entity: FakeCategory): Promise<FakeCategory> {
    const idx = this.rows.findIndex((r) => r.id === entity.id);
    if (idx >= 0) this.rows[idx] = entity;
    else this.rows.push(entity);
    return entity;
  }

  async remove(entity: FakeCategory): Promise<FakeCategory> {
    this.rows = this.rows.filter((r) => r.id !== entity.id);
    return entity;
  }
}

function makeDataSource(repo: FakeRepo): any {
  return { getRepository: () => repo };
}

// ---------------------------------------------------------------------------
// 1. Service 계약
// ---------------------------------------------------------------------------

describe('MemberCategoryService.list()', () => {
  it('기본값은 활성 분류만 반환한다 (일반 회원용 소비처 보호)', async () => {
    const repo = new FakeRepo(seedRows());
    const svc = new MemberCategoryService(makeDataSource(repo));

    const result = await svc.list();

    expect(result.map((r: any) => r.id)).toEqual(['c1', 'c3']);
    expect(result.every((r: any) => r.isActive === true)).toBe(true);
    expect(repo.findCalls[0].where).toEqual({ isActive: true });
  });

  it('includeInactive=false 도 활성만 반환한다', async () => {
    const repo = new FakeRepo(seedRows());
    const svc = new MemberCategoryService(makeDataSource(repo));

    const result = await svc.list({ includeInactive: false });

    expect(result.map((r: any) => r.id)).toEqual(['c1', 'c3']);
    expect(repo.findCalls[0].where).toEqual({ isActive: true });
  });

  it('includeInactive=true 는 활성·비활성을 모두 반환한다', async () => {
    const repo = new FakeRepo(seedRows());
    const svc = new MemberCategoryService(makeDataSource(repo));

    const result = await svc.list({ includeInactive: true });

    expect(result.map((r: any) => r.id).sort()).toEqual(['c1', 'c2', 'c3', 'c4']);
    expect(repo.findCalls[0].where).toBeUndefined();
  });

  it('isActive=false 값을 그대로 유지한다 (상태 왜곡 없음)', async () => {
    const repo = new FakeRepo(seedRows());
    const svc = new MemberCategoryService(makeDataSource(repo));

    const result = await svc.list({ includeInactive: true });

    expect(result.find((r: any) => r.id === 'c2')!.isActive).toBe(false);
    expect(result.find((r: any) => r.id === 'c4')!.isActive).toBe(false);
    expect(result.find((r: any) => r.id === 'c1')!.isActive).toBe(true);
  });

  it('정렬은 sortOrder ASC, name ASC 로 두 모드 모두 동일하다', async () => {
    const repo = new FakeRepo(seedRows());
    const svc = new MemberCategoryService(makeDataSource(repo));

    await svc.list();
    await svc.list({ includeInactive: true });

    expect(repo.findCalls[0].order).toEqual({ sortOrder: 'ASC', name: 'ASC' });
    expect(repo.findCalls[1].order).toEqual({ sortOrder: 'ASC', name: 'ASC' });

    // sortOrder 동률(c3 휴업약사 / c4 명예회원)은 name ASC 로 이어진다
    const all = await svc.list({ includeInactive: true });
    expect(all.map((r: any) => r.id)).toEqual(['c1', 'c2', 'c4', 'c3']);
  });
});

// ---------------------------------------------------------------------------
// 2. 관리자 목록 API 계약
// ---------------------------------------------------------------------------

function makeCategoryApp(repo: FakeRepo) {
  const app = express();
  app.use(express.json());
  app.use('/categories', createCategoryRoutes(makeDataSource(repo)));
  return app;
}

describe('GET /categories (관리자 목록)', () => {
  it('활성·비활성 분류를 모두 반환하고 응답 구조를 유지한다', async () => {
    const repo = new FakeRepo(seedRows());
    const res = await request(makeCategoryApp(repo)).get('/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data.map((r: any) => r.id)).toEqual(['c1', 'c2', 'c4', 'c3']);
    expect(res.body.data.filter((r: any) => r.isActive === false)).toHaveLength(2);
  });

  it('비활성 전환 후에도 목록에서 사라지지 않는다', async () => {
    const repo = new FakeRepo(seedRows());
    const app = makeCategoryApp(repo);

    const before = await request(app).get('/categories');
    expect(before.body.data.find((r: any) => r.id === 'c1').isActive).toBe(true);

    const patched = await request(app).patch('/categories/c1').send({ isActive: false });
    expect(patched.status).toBe(200);

    const after = await request(app).get('/categories');
    expect(after.body.data.map((r: any) => r.id)).toContain('c1');
    expect(after.body.data.find((r: any) => r.id === 'c1').isActive).toBe(false);
    expect(after.body.data).toHaveLength(4);
  });

  it('목록에 남은 비활성 분류를 다시 활성화할 수 있다', async () => {
    const repo = new FakeRepo(seedRows());
    const app = makeCategoryApp(repo);

    const listed = await request(app).get('/categories');
    const inactive = listed.body.data.find((r: any) => r.isActive === false);
    expect(inactive).toBeDefined();

    // 기존 토글 API(PATCH) 재사용
    const toggled = await request(app).patch(`/categories/${inactive.id}`).send({ isActive: true });
    expect(toggled.status).toBe(200);

    // 편집 폼 저장 경로(PUT)도 동일하게 동작한다
    const other = (await request(app).get('/categories')).body.data.find((r: any) => r.isActive === false);
    const saved = await request(app).put(`/categories/${other.id}`).send({ isActive: true });
    expect(saved.status).toBe(200);

    const after = await request(app).get('/categories');
    expect(after.body.data.every((r: any) => r.isActive === true)).toBe(true);
  });

  it('기존 생성·조회·수정·삭제 계약에 회귀가 없다', async () => {
    const repo = new FakeRepo(seedRows());
    const app = makeCategoryApp(repo);

    const created = await request(app).post('/categories').send({ name: '신규분류', sortOrder: 9 });
    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);

    const dup = await request(app).post('/categories').send({ name: '신규분류' });
    expect(dup.status).toBe(400);

    const one = await request(app).get(`/categories/${created.body.data.id}`);
    expect(one.status).toBe(200);
    expect(one.body.data.name).toBe('신규분류');

    const missing = await request(app).get('/categories/does-not-exist');
    expect(missing.status).toBe(404);

    const updated = await request(app).put(`/categories/${created.body.data.id}`).send({ description: 'x' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.description).toBe('x');

    const removed = await request(app).delete(`/categories/${created.body.data.id}`);
    expect(removed.status).toBe(200);
    expect(removed.body.success).toBe(true);
    expect((await request(app).get('/categories')).body.data).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// 3. 일반 회원용 소비처 보호 (비활성 미노출)
// ---------------------------------------------------------------------------

describe('일반 회원용 소비처 보호', () => {
  it('opt-in 하지 않은 호출자는 비활성 분류를 볼 수 없다', async () => {
    const repo = new FakeRepo(seedRows());
    const svc = new MemberCategoryService(makeDataSource(repo));

    const memberFacing = await svc.list(); // 향후 일반 회원용 소비처가 쓰는 형태

    expect(memberFacing.some((r: any) => r.isActive === false)).toBe(false);
  });

  it('전체 조회는 관리자 목록 route 에서만 opt-in 한다', () => {
    const routeSrc = readFileSync(
      join(__dirname, '../../../../packages/membership-yaksa/src/backend/routes/categoryRoutes.ts'),
      'utf8',
    );
    const optIns = routeSrc.match(/includeInactive:\s*true/g) ?? [];
    expect(optIns).toHaveLength(1);
    expect(routeSrc).toContain("categoryService.list({ includeInactive: true })");
  });
});

// ---------------------------------------------------------------------------
// 4. V2 guard 유지 (인증·권한 변경 없음)
// ---------------------------------------------------------------------------

describe('WO-...-GUARD-V2 권한 계약 유지', () => {
  const fakeDeps = {
    authenticate: ((req: any, res: any, next: any) => {
      const roles = req.headers['x-test-roles'];
      if (roles === undefined) {
        return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      }
      req.user = { id: 'u1', roles: String(roles).split(',').filter(Boolean) };
      next();
    }) as any,
    requireRole: (roles: string[]) => ((req: any, res: any, next: any) => {
      if (!req.user) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED' });
      const ok = req.user.roles.some((r: string) => roles.includes(r));
      if (!ok) return res.status(403).json({ success: false, error: `Requires one of: ${roles.join(', ')}` });
      next();
    }) as any,
  };

  function guardedApp(repo: FakeRepo) {
    const app = express();
    app.use(express.json());
    const { adminOnly } = createMembershipAdminGuards(fakeDeps);
    app.use('/api/v1/membership/categories', adminOnly);
    app.use('/api/v1/membership/categories', createCategoryRoutes(makeDataSource(repo)));
    return app;
  }

  it('비로그인은 401', async () => {
    const res = await request(guardedApp(new FakeRepo(seedRows()))).get('/api/v1/membership/categories');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_REQUIRED');
  });

  it('일반 사용자는 403', async () => {
    const res = await request(guardedApp(new FakeRepo(seedRows())))
      .get('/api/v1/membership/categories')
      .set('x-test-roles', 'customer');
    expect(res.status).toBe(403);
  });

  it('platform:admin / platform:super_admin 은 전체 목록을 받는다', async () => {
    for (const role of MEMBERSHIP_ADMIN_ROLES) {
      const res = await request(guardedApp(new FakeRepo(seedRows())))
        .get('/api/v1/membership/categories')
        .set('x-test-roles', role);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.data.filter((r: any) => r.isActive === false)).toHaveLength(2);
    }
  });

  it('guard 설정(역할·subtree)은 이번 WO 에서 변경되지 않았다', () => {
    expect(MEMBERSHIP_ADMIN_ROLES).toEqual(['platform:admin', 'platform:super_admin']);
    expect(MEMBERSHIP_ADMIN_SUBTREES).toContain('/api/v1/membership/categories');

    const guardSrc = readFileSync(join(__dirname, '../bootstrap/membership-admin-guard.ts'), 'utf8');
    expect(guardSrc).not.toContain('INACTIVE-CATEGORY-LIST-FIX');

    const routesSrc = readFileSync(join(__dirname, '../bootstrap/register-routes.ts'), 'utf8');
    expect(routesSrc).toContain('registerMembershipAdminGuards(app);');
  });
});
