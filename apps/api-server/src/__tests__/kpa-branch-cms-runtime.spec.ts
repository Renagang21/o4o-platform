/**
 * KPA-c Branch CMS Runtime Regression Test
 *
 * WO-KPA-C-RUNTIME-REGRESSION-V1
 *
 * Validates at the HTTP layer:
 *   A) Organization isolation — server-enforced scoping
 *   B) Permission boundary — KPA role enforcement
 *   C) Tampering prevention — body injection ignored
 *   D) Audit log — CUD triggers audit, 403 does not
 *
 * Architecture: Supertest + Express + mock DataSource (no DB)
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createBranchAdminDashboardController } from '../routes/kpa/controllers/branch-admin-dashboard.controller';

/* ═══════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════ */

const ORG_A = 'a0000000-0a00-4000-a000-000000000003'; // 종로구
const ORG_B = 'a0000000-0a00-4000-a000-000000000004'; // 강남구
const USER_A = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
const NEWS_A1 = '11111111-1111-4111-a111-111111111111';
const NEWS_B1 = '22222222-2222-4222-a222-222222222222';

/* ═══════════════════════════════════════════════════════
   Shared mutable state (reset per test)
   ═══════════════════════════════════════════════════════ */

let currentUser: Record<string, any> | null = null;

/* ═══════════════════════════════════════════════════════
   Mock repository spies
   ═══════════════════════════════════════════════════════ */

// Audit
const auditCreate = jest.fn((data: any) => data);
const auditSave = jest.fn().mockResolvedValue({});

// Member — drives getUserOrganizationId + requireOrgRole resolution
const memberFindOne = jest.fn().mockImplementation(({ where }: any) => {
  if (where.user_id === USER_A) return Promise.resolve({ id: 'm1', user_id: USER_A, organization_id: ORG_A, role: 'admin', status: 'active' });
  if (where.user_id === USER_B) return Promise.resolve({ id: 'm2', user_id: USER_B, organization_id: ORG_B, role: 'admin', status: 'active' });
  return Promise.resolve(null);
});

// News
const newsCreate = jest.fn((data: any) => ({
  id: NEWS_A1, is_deleted: false, view_count: 0, created_at: new Date(), updated_at: new Date(), ...data,
}));
const newsSave = jest.fn((entity: any) => Promise.resolve({ ...entity }));
const newsFindOne = jest.fn().mockImplementation(({ where }: any) => {
  // NEWS_A1 belongs to ORG_A — visible only when scoped to ORG_A
  if (where.id === NEWS_A1 && where.organization_id === ORG_A && where.is_deleted === false) {
    return Promise.resolve({
      id: NEWS_A1, organization_id: ORG_A, title: 'Org A News',
      content: 'content', category: 'notice', is_pinned: false,
      is_published: true, is_deleted: false,
    });
  }
  // NEWS_B1 belongs to ORG_B — invisible to ORG_A
  return Promise.resolve(null);
});

// Chainable QueryBuilder factory
function createChainableQB(items: any[] = []) {
  const qb: Record<string, jest.Mock> = {};
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.orderBy = jest.fn().mockReturnValue(qb);
  qb.addOrderBy = jest.fn().mockReturnValue(qb);
  qb.skip = jest.fn().mockReturnValue(qb);
  qb.take = jest.fn().mockReturnValue(qb);
  qb.getManyAndCount = jest.fn().mockResolvedValue([items, items.length]);
  return qb;
}

let lastNewsQB: ReturnType<typeof createChainableQB>;
const newsCreateQB = jest.fn(() => {
  lastNewsQB = createChainableQB([]);
  return lastNewsQB;
});

/* ═══════════════════════════════════════════════════════
   Mock DataSource
   ═══════════════════════════════════════════════════════ */

const repos: Record<string, any> = {
  KpaAuditLog: { save: auditSave, create: auditCreate },
  KpaMember: {
    findOne: memberFindOne,
    count: jest.fn().mockResolvedValue(0),
    find: jest.fn().mockResolvedValue([]),
  },
  KpaBranchNews: {
    create: newsCreate, save: newsSave, findOne: newsFindOne,
    createQueryBuilder: newsCreateQB,
  },
  KpaBranchOfficer: {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => ({ id: 'off-1', is_deleted: false, ...d })),
    save: jest.fn((d: any) => Promise.resolve(d)),
    findOne: jest.fn().mockResolvedValue(null),
  },
  KpaBranchDoc: {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((d: any) => ({ id: 'doc-1', is_deleted: false, ...d })),
    save: jest.fn((d: any) => Promise.resolve(d)),
    findOne: jest.fn().mockResolvedValue(null),
    createQueryBuilder: jest.fn(() => createChainableQB([])),
  },
  KpaBranchSettings: {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => d),
    save: jest.fn((d: any) => Promise.resolve(d)),
  },
  KpaOrganization: {
    findOne: jest.fn().mockResolvedValue({ id: ORG_A, name: 'Test Branch', type: 'branch' }),
  },
};

const mockDS = {
  getRepository: jest.fn((entity: any) => {
    const name = typeof entity === 'function' ? entity.name : String(entity);
    return repos[name] || {};
  }),
} as unknown as DataSource;

/* ═══════════════════════════════════════════════════════
   Express App + Dynamic Auth Middleware
   ═══════════════════════════════════════════════════════ */

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());

  const dynamicAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!currentUser) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No user' } });
      return;
    }
    (req as any).user = currentUser;
    next();
  };

  app.use('/branch-admin', createBranchAdminDashboardController(mockDS, dynamicAuth as any));
});

beforeEach(() => {
  jest.clearAllMocks();
  // Default: User A (ORG_A) with kpa:branch_admin
  currentUser = {
    id: USER_A,
    name: 'Branch A Operator',
    email: 'a@test.com',
    roles: ['kpa:branch_admin'],
  };
});

/* ═══════════════════════════════════════════════════════
   A) Organization Isolation
   ═══════════════════════════════════════════════════════ */

describe('Category A: Organization Isolation', () => {
  it('A1: Branch A operator creates news → organization_id forced to ORG_A', async () => {
    const res = await request(app)
      .post('/branch-admin/news')
      .send({ title: 'New Notice' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Verify repo.create received server-resolved ORG_A
    expect(newsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: ORG_A }),
    );
  });

  it('A2: Branch A operator cannot update Branch B news → 404', async () => {
    const res = await request(app)
      .patch(`/branch-admin/news/${NEWS_B1}`)
      .send({ title: 'Hijack Attempt' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');

    // Verify findOne scoped to ORG_A (User A's org), not ORG_B
    expect(newsFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: NEWS_B1, organization_id: ORG_A }),
      }),
    );
  });

  it('A3: Branch A operator deletes own news → soft delete (is_deleted=true)', async () => {
    const res = await request(app)
      .delete(`/branch-admin/news/${NEWS_A1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deleted).toBe(true);

    // Verify save called with is_deleted = true
    expect(newsSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: NEWS_A1, is_deleted: true }),
    );
  });

  it('A4: News list query filters is_deleted=false', async () => {
    const res = await request(app)
      .get('/branch-admin/news');

    expect(res.status).toBe(200);

    // Verify QueryBuilder received is_deleted filter
    expect(lastNewsQB.andWhere).toHaveBeenCalledWith('n.is_deleted = false');
    // Verify org scoping
    expect(lastNewsQB.where).toHaveBeenCalledWith(
      'n.organization_id = :organizationId',
      { organizationId: ORG_A },
    );
  });
});

/* ═══════════════════════════════════════════════════════
   B) Permission Boundary
   ═══════════════════════════════════════════════════════ */

describe('Category B: Permission Boundary', () => {
  it('B1: kpa:pharmacist (member) → branch-admin API → 403', async () => {
    currentUser = { id: USER_A, name: 'Pharmacist', roles: ['kpa:pharmacist'] };
    const res = await request(app).get('/branch-admin/news');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('B2: platform:admin → branch-admin API → 403', async () => {
    currentUser = { id: USER_A, name: 'Platform Admin', roles: ['platform:admin'] };
    const res = await request(app).get('/branch-admin/news');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('B3: kpa:operator → branch-admin API → 200 (allowed)', async () => {
    currentUser = { id: USER_A, name: 'KPA Operator', roles: ['kpa:operator'] };
    const res = await request(app).get('/branch-admin/news');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('B4: legacy branch_admin (unprefixed) → 403', async () => {
    currentUser = { id: USER_A, name: 'Legacy Admin', roles: ['branch_admin'] };
    const res = await request(app).get('/branch-admin/news');
    expect(res.status).toBe(403);
  });

  it('B5: no user → 401', async () => {
    currentUser = null;
    const res = await request(app).get('/branch-admin/news');
    expect(res.status).toBe(401);
  });
});

/* ═══════════════════════════════════════════════════════
   C) Tampering Prevention
   ═══════════════════════════════════════════════════════ */

describe('Category C: Tampering Prevention', () => {
  it('C1: body with organization_id=ORG_B → ignored, saved as ORG_A', async () => {
    const res = await request(app)
      .post('/branch-admin/news')
      .send({ title: 'Spoofed Org', organization_id: ORG_B });

    expect(res.status).toBe(201);

    // Server MUST use ORG_A (from getUserOrganizationId), not ORG_B from body
    const createArg = newsCreate.mock.calls[0][0];
    expect(createArg.organization_id).toBe(ORG_A);
    expect(createArg.organization_id).not.toBe(ORG_B);
  });

  it('C2: body with branchId=ORG_B → ignored, saved as ORG_A', async () => {
    const res = await request(app)
      .post('/branch-admin/news')
      .send({ title: 'Spoofed Branch', branchId: ORG_B });

    expect(res.status).toBe(201);
    expect(newsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: ORG_A }),
    );
  });

  it('C3: PATCH with organization_id=ORG_B in body → findOne scoped to ORG_A', async () => {
    const res = await request(app)
      .patch(`/branch-admin/news/${NEWS_A1}`)
      .send({ title: 'Updated', organization_id: ORG_B });

    expect(res.status).toBe(200);

    // Verify lookup used server-resolved ORG_A
    expect(newsFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organization_id: ORG_A }),
      }),
    );
  });
});

/* ═══════════════════════════════════════════════════════
   D) Audit Log Verification
   ═══════════════════════════════════════════════════════ */

describe('Category D: Audit Log', () => {
  it('D1: news create → CONTENT_CREATED audit', async () => {
    await request(app)
      .post('/branch-admin/news')
      .send({ title: 'Audit Test' });

    expect(auditSave).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        operator_id: USER_A,
        action_type: 'CONTENT_CREATED',
        target_type: 'branch_news',
      }),
    );
  });

  it('D2: news update → CONTENT_UPDATED audit', async () => {
    await request(app)
      .patch(`/branch-admin/news/${NEWS_A1}`)
      .send({ title: 'Updated Title' });

    expect(auditSave).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        operator_id: USER_A,
        action_type: 'CONTENT_UPDATED',
        target_type: 'branch_news',
      }),
    );
  });

  it('D3: news delete → CONTENT_DELETED audit', async () => {
    await request(app)
      .delete(`/branch-admin/news/${NEWS_A1}`);

    expect(auditSave).toHaveBeenCalledTimes(1);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        operator_id: USER_A,
        action_type: 'CONTENT_DELETED',
        target_type: 'branch_news',
      }),
    );
  });

  it('D4: permission denied (403) → audit NOT called', async () => {
    currentUser = { id: USER_A, name: 'Pharmacist', roles: ['kpa:pharmacist'] };

    await request(app)
      .post('/branch-admin/news')
      .send({ title: 'Should Not Audit' });

    expect(auditSave).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
