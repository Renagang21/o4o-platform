/**
 * 분회 개설 신청·승인 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §5 (S3)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 고정하는 것
 *   주소(slug) 2회 검사 — 신청 시 · 승인 직전. 선점되면 **임의 주소로 개설하지 않는다**
 *   승인이 첫 운영자를 만든다. 분회는 커뮤니티와 달리 **3축**으로 만든다:
 *     branch_memberships(active) · service_memberships('kpa-branch') · role_assignments(operator)
 *   `branch_memberships` 에 role 컬럼을 두지 않는 기존 4축 분리를 그대로 따른다
 *   역할은 canonical 경로(roleAssignmentService.assignRole)로만 준다 — 직접 INSERT 하지 않는다
 */
import * as fs from 'fs';
import * as path from 'path';

type Row = Record<string, any>;

const db: {
  orgs: Row[];
  requests: Row[];
  branchMemberships: Row[];
  serviceMemberships: Row[];
  assignedRoles: Array<{ userId: string; role: string; assignedBy?: string; viaService: boolean }>;
  rawSql: string[];
} = { orgs: [], requests: [], branchMemberships: [], serviceMemberships: [], assignedRoles: [], rawSql: [] };

let seq = 0;
const uid = () => `id-${++seq}`;

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    assignRole: async (input: { userId: string; role: string; assignedBy?: string }) => {
      db.assignedRoles.push({ ...input, viaService: true });
      return { id: uid(), ...input, isActive: true };
    },
  },
}));

function repoFor(name: string) {
  const list = name === 'KpaOrganization' ? db.orgs : db.branchMemberships;
  return {
    create: (o: Row) => ({ ...o }),
    save: async (o: Row) => {
      if (!o.id) {
        o.id = uid();
        list.push(o);
      } else if (!list.includes(o)) {
        list.push(o);
      }
      return o;
    },
    findOne: async ({ where }: { where: Row }) =>
      list.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
  };
}

const manager = {
  getRepository: (e: { name?: string }) => repoFor(e?.name ?? ''),
  query: async (sql: string, params: any[] = []) => {
    db.rawSql.push(sql);
    const s = sql.replace(/\s+/g, ' ').trim();

    if (/^SELECT 1 FROM branch_creation_requests/i.test(s)) {
      return db.requests.filter((r) => r.desired_slug === params[0] && r.status === 'pending').map(() => ({ ok: 1 }));
    }
    if (/^SELECT \* FROM branch_creation_requests WHERE id/i.test(s)) {
      return db.requests.filter((r) => r.id === params[0]);
    }
    if (/^INSERT INTO branch_creation_requests/i.test(s)) {
      const row: Row = {
        id: uid(),
        requester_user_id: params[0],
        desired_slug: params[1],
        name: params[2],
        parent_id: params[3],
        description: params[4],
        address: params[5],
        phone: params[6],
        status: 'pending',
        reviewed_by_user_id: null,
        reviewed_at: null,
        reason: null,
        created_branch_id: null,
      };
      db.requests.push(row);
      return [row];
    }
    if (/^UPDATE branch_creation_requests/i.test(s)) {
      const row = db.requests.find((r) => r.id === params[0]);
      if (!row) return [];
      if (/status = 'slug_conflict'/.test(s)) {
        Object.assign(row, { status: 'slug_conflict', reviewed_by_user_id: params[1], reason: params[2] });
      } else if (/status = 'approved'/.test(s)) {
        Object.assign(row, { status: 'approved', reviewed_by_user_id: params[1], created_branch_id: params[2] });
      } else if (/status = 'rejected'/.test(s)) {
        Object.assign(row, { status: 'rejected', reviewed_by_user_id: params[1], reason: params[2] });
      }
      return [row];
    }
    if (/INSERT INTO service_memberships/i.test(s)) {
      const [userId, serviceKey] = params;
      const found = db.serviceMemberships.find((r) => r.user_id === userId && r.service_key === serviceKey);
      if (found) found.status = 'active';
      else db.serviceMemberships.push({ user_id: userId, service_key: serviceKey, status: 'active' });
      return [];
    }
    return [];
  },
};

const dataSource = {
  transaction: async <T>(fn: (m: typeof manager) => Promise<T>) => fn(manager),
  query: (sql: string, params?: any[]) => manager.query(sql, params),
} as any;

import {
  BranchLifecycleService,
  BranchLifecycleError,
  normalizeBranchSlug,
  KPA_BRANCH_OPERATOR_ROLE,
  KPA_BRANCH_SERVICE_KEY,
} from '../branch-lifecycle.service.js';

const service = new BranchLifecycleService(dataSource);
const REQUESTER = 'u-requester';
const REVIEWER = 'u-branch-admin';

beforeEach(() => {
  db.orgs = [];
  db.requests = [];
  db.branchMemberships = [];
  db.serviceMemberships = [];
  db.assignedRoles = [];
  db.rawSql = [];
  seq = 0;
});

const ask = () =>
  service.requestCreation({ requesterUserId: REQUESTER, desiredSlug: 'gangnam', name: '강남분회' });

describe('주소 규칙', () => {
  it.each(['a', 'A-b-', '-ab', 'a_b', 'a b', ''])('형태가 잘못된 주소는 거절한다: %s', (bad) => {
    expect(() => normalizeBranchSlug(bad)).toThrow(BranchLifecycleError);
  });

  it.each([
    [' Gangnam ', 'gangnam'],
    ['SEO-CHO', 'seo-cho'],
  ])('%s 를 %s 로 정규화한다', (raw, expected) => {
    expect(normalizeBranchSlug(raw)).toBe(expected);
  });

  it('80자를 넘는 주소는 거절한다 (컬럼 varchar(80))', () => {
    expect(() => normalizeBranchSlug('a'.repeat(81))).toThrow(BranchLifecycleError);
  });
});

describe('개설 신청 — 검사 1회차', () => {
  it('신청은 pending 이다', async () => {
    const r = await ask();
    expect({ status: r.status, slug: r.desired_slug }).toEqual({ status: 'pending', slug: 'gangnam' });
  });

  it('이미 개설된 주소는 409', async () => {
    db.orgs.push({ id: 'b1', slug: 'gangnam', type: 'group' });
    await expect(ask()).rejects.toMatchObject({ code: 'SLUG_TAKEN', statusCode: 409 });
  });

  it('pending 신청이 붙잡은 주소도 409', async () => {
    await ask();
    await expect(
      service.requestCreation({ requesterUserId: 'other', desiredSlug: 'gangnam', name: '다른 분회' }),
    ).rejects.toMatchObject({ code: 'SLUG_TAKEN' });
  });

  it('없는 상위 조직을 지정하면 404 (표시용이지만 실재해야 한다)', async () => {
    await expect(
      service.requestCreation({
        requesterUserId: REQUESTER,
        desiredSlug: 'gangnam',
        name: '강남분회',
        parentId: 'no-such-org',
      }),
    ).rejects.toMatchObject({ code: 'PARENT_NOT_FOUND', statusCode: 404 });
  });
});

describe('개설 승인 — 검사 2회차 + 첫 운영자 3축', () => {
  it('분회를 만들고 type·is_active 를 서버가 고정한다', async () => {
    const r = await ask();
    const out = await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(out.outcome).toBe('created');
    expect(db.orgs).toHaveLength(1);
    expect(db.orgs[0]).toMatchObject({ slug: 'gangnam', type: 'group', is_active: true });
    expect(r.status).toBe('approved');
  });

  it('신청자에게 **분회 소속**이 생긴다 (어느 분회인가)', async () => {
    const r = await ask();
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(db.branchMemberships).toHaveLength(1);
    expect(db.branchMemberships[0]).toMatchObject({
      user_id: REQUESTER,
      organization_id: db.orgs[0].id,
      status: 'active',
    });
  });

  it('신청자에게 **운영자 역할**이 생긴다 (운영자인가)', async () => {
    const r = await ask();
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(db.assignedRoles).toEqual([
      { userId: REQUESTER, role: KPA_BRANCH_OPERATOR_ROLE, assignedBy: REVIEWER, viaService: true },
    ]);
  });

  it('역할은 canonical 경로로만 준다 — role_assignments 직접 SQL 은 0건', async () => {
    const r = await ask();
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(db.rawSql.filter((sql) => /role_assignments/i.test(sql))).toEqual([]);
  });

  it('신청자에게 **서비스 접근 자격**이 생긴다', async () => {
    const r = await ask();
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(db.serviceMemberships).toEqual([
      { user_id: REQUESTER, service_key: KPA_BRANCH_SERVICE_KEY, status: 'active' },
    ]);
  });

  it('분회별 역할(kpa-branch:operator:{id})을 만들지 않는다 — 소속 축을 중복 저장하지 않는다', async () => {
    const r = await ask();
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    for (const { role } of db.assignedRoles) {
      expect(role.split(':')).toHaveLength(2);
    }
  });

  it('승인 직전 선점되면 개설하지 않고 slug_conflict 로 돌린다', async () => {
    const r = await ask();
    db.orgs.push({ id: 'b-existing', slug: 'gangnam', type: 'group' });

    const out = await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });

    expect(out).toEqual({ outcome: 'slug_conflict', slug: 'gangnam' });
    expect(r.status).toBe('slug_conflict');
    expect(r.reason).toMatch(/새 주소로 다시 신청/);
    // 새 분회도, 운영자도 만들지 않았다.
    expect(db.orgs).toHaveLength(1);
    expect(db.branchMemberships).toEqual([]);
    expect(db.assignedRoles).toEqual([]);
  });

  it('이미 처리된 신청은 409', async () => {
    const r = await ask();
    await service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER });
    await expect(
      service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_PENDING' });
  });

  it('없는 신청은 404', async () => {
    await expect(
      service.approveCreation({ requestId: 'no-such', reviewerUserId: REVIEWER }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_FOUND', statusCode: 404 });
  });
});

describe('개설 거절', () => {
  it('사유를 남기고 분회·운영자를 만들지 않는다', async () => {
    const r = await ask();
    const out = await service.rejectCreation({
      requestId: r.id,
      reviewerUserId: REVIEWER,
      reason: '기존 분회와 구역이 겹칩니다.',
    });
    expect(out.status).toBe('rejected');
    expect(out.reason).toBe('기존 분회와 구역이 겹칩니다.');
    expect(db.orgs).toEqual([]);
    expect(db.branchMemberships).toEqual([]);
    expect(db.assignedRoles).toEqual([]);
  });

  it('거절된 신청은 다시 승인할 수 없다', async () => {
    const r = await ask();
    await service.rejectCreation({ requestId: r.id, reviewerUserId: REVIEWER, reason: 'no' });
    await expect(
      service.approveCreation({ requestId: r.id, reviewerUserId: REVIEWER }),
    ).rejects.toMatchObject({ code: 'REQUEST_NOT_PENDING' });
  });
});

describe('라우트 심사 주체 (소스 고정)', () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, '..', '..', '..', 'routes', 'kpa-branch', 'kpa-branch.routes.ts'),
    'utf-8',
  );
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l: string) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');

  it('심사는 kpa-branch:admin 이다', () => {
    expect(code).toMatch(
      /const branchServiceAdminGuards = \[apiLimiter as any, requireAuth as any, requireKpaBranchScope\(`\$\{SERVICE_KEY\}:admin`\)\]/,
    );
  });

  it('신청·심사 경로에 rate limit 이 붙어 있다 (인증만으로 열린 경로의 폭주 차단)', () => {
    expect(code).toMatch(/router\.post\('\/branch-requests', apiLimiter as any,/);
    expect(code).toMatch(/const branchServiceAdminGuards = \[apiLimiter as any,/);
  });

  it('심사 경로에 개별 분회 가드(resolveBranch · requireBranchScope)를 붙이지 않는다', () => {
    const adminRequestLines = code
      .split('\n')
      .filter((l: string) => l.includes('/admin/branch-requests'));
    expect(adminRequestLines.length).toBeGreaterThan(0);
    for (const line of adminRequestLines) {
      expect(line).not.toMatch(/resolveBranch|requireBranchScope/);
    }
  });

  it('operator 가드를 심사에 쓰지 않는다 (A 분회 운영자가 B 개설을 승인하면 안 된다)', () => {
    expect(code).not.toMatch(/branch-requests[\s\S]{0,200}?\$\{SERVICE_KEY\}:operator/);
  });

  it('신청·내 이력은 **권한 검사 없이** 인증만 요구한다 (개체·서비스 가드 0)', () => {
    const requestLines = code.split('\n').filter((l: string) => l.includes("'/branch-requests"));
    expect(requestLines.length).toBeGreaterThan(0);
    for (const line of requestLines) {
      expect(line).toMatch(/requireAuth as any/);
      expect(line).not.toMatch(/requireKpaBranchScope|resolveBranch|requireBranchScope|requireRole/);
    }
  });

  it('기존 super_admin 직접 생성 경로를 그대로 둔다 (대체가 아니라 병행)', () => {
    expect(code).toMatch(/router\.post\('\/admin\/branches', \.\.\.superAdminGuards/);
  });
});
