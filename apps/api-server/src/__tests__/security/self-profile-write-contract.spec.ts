/**
 * Self Profile Write Contract — Security / Contract Regression Test
 *
 * WO-O4O-CROSS-SERVICE-SELF-PROFILE-WRITE-CONTRACT-V1 §11 §12
 *
 * 계약:
 *   미인증 → 401
 *   인증 사용자 → 자기 이름/닉네임/전화 수정 200, UPDATE 는 자기 row 만
 *   allowlist 밖 필드(roles·status·isActive·serviceKey·businessInfo·organizationId·
 *   membership·approvedAt·userId·id·email) → 400, DB write 0
 *   body 로 타 사용자 지목 → 타 사용자 row 변경 0
 *   self-profile 호출로 권한 상승(role/status 변화) 없음
 *
 * 역할 분기·requireAdmin·serviceKey 로 owner 결정은 이 계약에 존재하지 않는다.
 */

import * as fs from 'fs';
import * as path from 'path';

const queries: Array<{ sql: string; params: unknown[] }> = [];

jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({}),
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (/^\s*SELECT/i.test(sql)) {
        return [
          {
            id: params[0],
            email: 'self@example.com',
            name: '홍길동',
            firstName: '길동',
            lastName: '홍',
            nickname: '길동이',
            phone: '01011112222',
            avatar: null,
            status: 'active',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ];
      }
      return [];
    },
  },
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import {
  SelfProfileController,
  SELF_PROFILE_EDITABLE_FIELDS,
} from '../../modules/user/controllers/self-profile.controller.js';

const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000002';

function fakeRes() {
  const state: any = { statusCode: 200, body: null };
  const res: any = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(body: unknown) {
      state.body = body;
      return res;
    },
    get statusCode() {
      return state.statusCode;
    },
    get body() {
      return state.body;
    },
  };
  return res;
}

function fakeReq(opts: { userId?: string; body?: Record<string, unknown> }): any {
  return {
    user: opts.userId ? { id: opts.userId, roles: [] } : undefined,
    params: {},
    query: {},
    body: opts.body ?? {},
  };
}

const updateQueries = () => queries.filter((q) => /^\s*UPDATE/i.test(q.sql));

beforeEach(() => {
  queries.length = 0;
});

describe('canonical self-profile 계약 — 인증 경계', () => {
  it('미인증 PATCH 는 401 이고 DB write 가 없다', async () => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(fakeReq({ body: { name: '침입자' } }), res);
    expect(res.statusCode).toBe(401);
    expect(updateQueries()).toHaveLength(0);
  });

  it('미인증 GET 은 401 이다', async () => {
    const res = fakeRes();
    await SelfProfileController.getSelfProfile(fakeReq({}), res);
    expect(res.statusCode).toBe(401);
  });
});

describe('canonical self-profile 계약 — 정상 수정', () => {
  it('본인 이름·닉네임·전화 수정은 200 이고 자기 row 만 UPDATE 한다', async () => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(
      fakeReq({ userId: USER_A, body: { name: '새이름', nickname: '새닉', phone: '01033334444' } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body?.success).toBe(true);

    const updates = updateQueries();
    expect(updates).toHaveLength(1);
    const { sql, params } = updates[0];
    // WHERE 절 대상은 항상 인증 사용자 자신이며 마지막 파라미터로 바인딩된다.
    expect(sql).toContain('WHERE id = $');
    expect(params[params.length - 1]).toBe(USER_A);
    expect(params).not.toContain(USER_B);
    // allowlist 컬럼만 SET 된다.
    expect(sql).toContain('"name" =');
    expect(sql).toContain('"nickname" =');
    expect(sql).toContain('"phone" =');
    expect(sql).not.toMatch(/roles|status|"isActive"|business_info|"businessInfo"/i);
  });

  it('공백만 들어온 선택 필드는 NULL 로 정리된다', async () => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(
      fakeReq({ userId: USER_A, body: { nickname: '   ' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(updateQueries()[0].params[0]).toBeNull();
  });

  it('이름은 비울 수 없다 (NOT NULL 컬럼)', async () => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(
      fakeReq({ userId: USER_A, body: { name: '  ' } }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(updateQueries()).toHaveLength(0);
  });

  it('변경할 항목이 없으면 400 이고 write 가 없다', async () => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(fakeReq({ userId: USER_A, body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(updateQueries()).toHaveLength(0);
  });
});

describe('canonical self-profile 계약 — 금지 필드', () => {
  const FORBIDDEN: Array<[string, unknown]> = [
    ['roles', ['admin']],
    ['role', 'admin'],
    ['status', 'approved'],
    ['isActive', true],
    ['serviceKey', 'pharmacy-hub'],
    ['businessInfo', { companyName: 'x' }],
    ['organizationId', 'org-1'],
    ['membership', { role: 'operator' }],
    ['approvedAt', '2026-01-01'],
    ['email', 'other@example.com'],
    ['password', 'whatever'],
    ['id', USER_B],
    ['userId', USER_B],
  ];

  it.each(FORBIDDEN)('%s 는 400 으로 거부되고 DB 에 반영되지 않는다', async (field, value) => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(
      fakeReq({ userId: USER_A, body: { name: '새이름', [field as string]: value } }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body?.code).toBe('FIELD_NOT_EDITABLE');
    expect(updateQueries()).toHaveLength(0);
  });

  it('allowlist 는 ACCOUNT_CORE 5개 필드로 고정돼 있다', () => {
    expect([...SELF_PROFILE_EDITABLE_FIELDS]).toEqual([
      'name',
      'firstName',
      'lastName',
      'nickname',
      'phone',
    ]);
  });
});

describe('canonical self-profile 계약 — 타 사용자 / 권한 상승 차단', () => {
  it('body 로 다른 user id 를 지목해도 타 사용자 row 는 변경되지 않는다', async () => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(
      fakeReq({ userId: USER_A, body: { id: USER_B, userId: USER_B, name: '탈취' } }),
      res,
    );
    expect(res.statusCode).toBe(400);
    const touchedB = queries.filter((q) => q.params.includes(USER_B));
    expect(touchedB).toHaveLength(0);
  });

  it('허용 필드만 보낸 경우에도 UPDATE 대상은 인증 사용자 뿐이다', async () => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(
      fakeReq({ userId: USER_A, body: { name: '내이름' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
    for (const q of updateQueries()) {
      expect(q.params).not.toContain(USER_B);
    }
  });

  it('self-profile 응답은 role/status 를 변경하지 않는다', async () => {
    const res = fakeRes();
    await SelfProfileController.updateSelfProfile(
      fakeReq({ userId: USER_A, body: { name: '내이름' } }),
      res,
    );
    expect(res.body?.data?.status).toBe('active');
    expect(res.body?.data).not.toHaveProperty('roles');
    for (const q of updateQueries()) {
      expect(q.sql).not.toMatch(/role_assignments|service_memberships|"status"/i);
    }
  });
});

describe('canonical self-profile 계약 — route 등록 위치', () => {
  const routes = read('apps/api-server/src/routes/users.routes.ts');

  it('/me/profile 은 requireAdmin 앞에 등록된다', () => {
    const selfIdx = routes.indexOf("'/me/profile'");
    const adminIdx = routes.indexOf('router.use(requireAdmin)');
    expect(selfIdx).toBeGreaterThan(-1);
    expect(adminIdx).toBeGreaterThan(-1);
    expect(selfIdx).toBeLessThan(adminIdx);
  });

  it('GET/PATCH 두 메서드가 모두 등록돼 있다', () => {
    expect(routes).toMatch(/router\.get\(\s*'\/me\/profile'/);
    expect(routes).toMatch(/router\.patch\(\s*'\/me\/profile'/);
  });

  it('self-profile controller 에는 requireAdmin·role 분기가 없다', () => {
    const controller = read('apps/api-server/src/modules/user/controllers/self-profile.controller.ts');
    // 주석(설계 근거 서술)은 제외하고 실제 코드만 본다.
    const code = controller.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/requireAdmin|hasAnyRole|isAdmin/);
    // 대상 사용자는 항상 req.user.id 에서만 파생한다.
    expect(controller).toMatch(/req\.user\?\.id/);
    expect(controller).not.toMatch(/req\.body\.(userId|id)\b/);
  });
});
