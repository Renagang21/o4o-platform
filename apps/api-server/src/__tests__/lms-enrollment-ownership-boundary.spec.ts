/**
 * LMS Enrollment Ownership / Horizontal Authorization — Regression Test
 *
 * WO-O4O-LMS-ENROLLMENT-OWNERSHIP-AND-AUTHORIZATION-BOUNDARY-FIX-V1
 * 선행: WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1 (service boundary)
 *
 * 닫으려는 결함:
 *   cross-service boundary 는 닫혔지만, **같은 서비스 안에서는** enrollment id 만 알면
 *   타 사용자의 enrollment 를 조회·변경할 수 있었다.
 *
 * 계약:
 *   본인 enrollment → 정상 / 같은 서비스 타인 → 404 / 타 서비스 → 404 / 없는 id → 404
 *   (전부 non-disclosure 동일 응답) / 알 수 없는 serviceKey → 400 / 미인증 → 401
 *
 * user-facing endpoint 에 elevated bypass 를 새로 만들지 않는다.
 * 관리 동작은 기존 `/lms/instructor/enrollments/:id/{approve,reject}` 계약을 쓴다.
 */

import * as fs from 'fs';
import * as path from 'path';

const mockEnrollmentService = {
  getEnrollment: jest.fn(),
  updateEnrollment: jest.fn(),
  startEnrollment: jest.fn(),
  completeEnrollment: jest.fn(),
  cancelEnrollment: jest.fn(),
  listEnrollments: jest.fn(),
};
const mockHasAnyRole = jest.fn();

jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({}),
    query: async () => [] as any[],
  },
}));

jest.mock('../modules/lms/services/EnrollmentService.js', () => ({
  EnrollmentService: { getInstance: () => mockEnrollmentService },
}));

jest.mock('../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { hasAnyRole: (...args: unknown[]) => mockHasAnyRole(...args) },
}));

import { EnrollmentController } from '../modules/lms/controllers/EnrollmentController.js';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

const USER_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const USER_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const ENROLLMENT_ID = 'eeeeeeee-0000-0000-0000-000000000003';
const COURSE_ID = 'cccccccc-0000-0000-0000-000000000004';

function fakeRes() {
  const state: any = { statusCode: 0, body: null };
  const res: any = {
    status(code: number) { state.statusCode = code; return res; },
    json(body: unknown) { state.body = body; return res; },
    setHeader() { return res; },
    end() { return res; },
    get statusCode() { return state.statusCode; },
    get body() { return state.body; },
  };
  return res;
}

function fakeReq(opts: {
  userId?: string;
  roles?: string[];
  params?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
}): any {
  return {
    user: opts.userId ? { id: opts.userId, roles: opts.roles ?? [] } : undefined,
    params: opts.params ?? {},
    query: opts.query ?? {},
    body: opts.body ?? {},
    baseUrl: '/api/v1/lms',
    originalUrl: '/api/v1/lms',
    path: '/',
  };
}

function enrollmentOf(userId: string, serviceKey: string | null = 'kpa-society') {
  return {
    id: ENROLLMENT_ID,
    userId,
    courseId: COURSE_ID,
    course: { id: COURSE_ID, serviceKey },
  };
}

const MUTATIONS = [
  { name: 'updateEnrollment', call: EnrollmentController.updateEnrollment, mock: () => mockEnrollmentService.updateEnrollment },
  { name: 'startEnrollment', call: EnrollmentController.startEnrollment, mock: () => mockEnrollmentService.startEnrollment },
  { name: 'completeEnrollment', call: EnrollmentController.completeEnrollment, mock: () => mockEnrollmentService.completeEnrollment },
  { name: 'cancelEnrollment', call: EnrollmentController.cancelEnrollment, mock: () => mockEnrollmentService.cancelEnrollment },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockHasAnyRole.mockResolvedValue(false);
  mockEnrollmentService.updateEnrollment.mockResolvedValue({ id: ENROLLMENT_ID });
  mockEnrollmentService.startEnrollment.mockResolvedValue({ id: ENROLLMENT_ID });
  mockEnrollmentService.completeEnrollment.mockResolvedValue({ id: ENROLLMENT_ID });
  mockEnrollmentService.cancelEnrollment.mockResolvedValue({ id: ENROLLMENT_ID });
  mockEnrollmentService.listEnrollments.mockResolvedValue({ enrollments: [], total: 0 });
});

describe('same-service ownership — 본인 enrollment 는 정상 동작', () => {
  for (const m of MUTATIONS) {
    it(`${m.name}: 본인 enrollment PASS`, async () => {
      mockEnrollmentService.getEnrollment.mockResolvedValue(enrollmentOf(USER_A));
      const res = fakeRes();
      await m.call(fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID } }), res);

      expect(m.mock()).toHaveBeenCalledTimes(1);
      expect(res.body?.success).toBe(true);
    });
  }
});

describe('same-service horizontal authorization — 타인 enrollment 차단', () => {
  for (const m of MUTATIONS) {
    it(`${m.name}: user A → user B enrollment 404 + mutation 미실행`, async () => {
      mockEnrollmentService.getEnrollment.mockResolvedValue(enrollmentOf(USER_B));
      const res = fakeRes();
      await m.call(fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID } }), res);

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ success: false, error: 'Enrollment not found', code: 'NOT_FOUND' });
      expect(m.mock()).not.toHaveBeenCalled();
    });
  }

  it('elevated role 도 user-facing mutation 을 bypass 하지 않는다', async () => {
    mockHasAnyRole.mockResolvedValue(true);
    mockEnrollmentService.getEnrollment.mockResolvedValue(enrollmentOf(USER_B));
    const res = fakeRes();
    await EnrollmentController.cancelEnrollment(
      fakeReq({ userId: USER_A, roles: ['lms:instructor', 'kpa:admin'], params: { id: ENROLLMENT_ID } }),
      res,
    );

    expect(res.statusCode).toBe(404);
    expect(mockEnrollmentService.cancelEnrollment).not.toHaveBeenCalled();
  });
});

describe('cross-service 차단 회귀', () => {
  for (const m of MUTATIONS) {
    it(`${m.name}: 타 서비스 enrollment 는 소유자여도 404`, async () => {
      mockEnrollmentService.getEnrollment.mockResolvedValue(enrollmentOf(USER_A, 'glycopharm'));
      const res = fakeRes();
      await m.call(
        fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID }, query: { serviceKey: 'kpa-society' } }),
        res,
      );

      expect(res.statusCode).toBe(404);
      expect(m.mock()).not.toHaveBeenCalled();
    });
  }

  it('service scope 판정이 ownership 판정보다 먼저다 (타 서비스 + 타인 → 404)', async () => {
    mockEnrollmentService.getEnrollment.mockResolvedValue(enrollmentOf(USER_B, 'k-cosmetics'));
    const res = fakeRes();
    await EnrollmentController.startEnrollment(
      fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID }, query: { serviceKey: 'kpa-society' } }),
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(mockEnrollmentService.startEnrollment).not.toHaveBeenCalled();
  });
});

describe('non-disclosure 계약', () => {
  it('없는 enrollment → 404 + 동일 body', async () => {
    mockEnrollmentService.getEnrollment.mockResolvedValue(null);
    const res = fakeRes();
    await EnrollmentController.updateEnrollment(fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, error: 'Enrollment not found', code: 'NOT_FOUND' });
  });

  it('타인 enrollment 와 없는 enrollment 의 응답이 구분되지 않는다', async () => {
    mockEnrollmentService.getEnrollment.mockResolvedValue(null);
    const missing = fakeRes();
    await EnrollmentController.getEnrollment(fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID } }), missing);

    mockEnrollmentService.getEnrollment.mockResolvedValue(enrollmentOf(USER_B));
    const foreign = fakeRes();
    await EnrollmentController.getEnrollment(fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID } }), foreign);

    expect(foreign.statusCode).toBe(missing.statusCode);
    expect(foreign.body).toEqual(missing.body);
  });

  it('알 수 없는 serviceKey → 400 (조회 이전 차단)', async () => {
    const res = fakeRes();
    await EnrollmentController.cancelEnrollment(
      fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID }, query: { serviceKey: 'not-a-service' } }),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(mockEnrollmentService.getEnrollment).not.toHaveBeenCalled();
    expect(mockEnrollmentService.cancelEnrollment).not.toHaveBeenCalled();
  });

  it('미인증 요청 → 401', async () => {
    const res = fakeRes();
    await EnrollmentController.startEnrollment(fakeReq({ params: { id: ENROLLMENT_ID } }), res);
    expect(res.statusCode).toBe(401);
    expect(mockEnrollmentService.getEnrollment).not.toHaveBeenCalled();
  });
});

describe('read leak — GET /enrollments/:id', () => {
  it('본인 enrollment 는 조회된다', async () => {
    mockEnrollmentService.getEnrollment.mockResolvedValue(enrollmentOf(USER_A));
    const res = fakeRes();
    await EnrollmentController.getEnrollment(fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID } }), res);
    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.enrollment?.userId).toBe(USER_A);
  });

  it('타인 enrollment 상세는 id 만으로 읽을 수 없다', async () => {
    mockEnrollmentService.getEnrollment.mockResolvedValue(enrollmentOf(USER_B));
    const res = fakeRes();
    await EnrollmentController.getEnrollment(fakeReq({ userId: USER_A, params: { id: ENROLLMENT_ID } }), res);
    expect(res.statusCode).toBe(404);
  });
});

describe('read leak — GET /enrollments (목록)', () => {
  const filtersOfLastCall = () => mockEnrollmentService.listEnrollments.mock.calls[0][0] as any;

  it('일반 사용자는 본인 userId 로 강제 축소된다', async () => {
    const res = fakeRes();
    await EnrollmentController.listEnrollments(fakeReq({ userId: USER_A, query: { page: '1' } }), res);

    expect(mockEnrollmentService.listEnrollments).toHaveBeenCalledTimes(1);
    expect(filtersOfLastCall().userId).toBe(USER_A);
  });

  it('요청이 타인 userId 를 지정해도 본인으로 덮어쓴다', async () => {
    const res = fakeRes();
    await EnrollmentController.listEnrollments(fakeReq({ userId: USER_A, query: { userId: USER_B } }), res);
    expect(filtersOfLastCall().userId).toBe(USER_A);
  });

  it('기존 관리 역할(lms:instructor)은 전체 목록 계약을 유지한다', async () => {
    mockHasAnyRole.mockResolvedValue(true);
    const res = fakeRes();
    await EnrollmentController.listEnrollments(fakeReq({ userId: USER_A, query: {} }), res);
    expect(filtersOfLastCall().userId).toBeUndefined();
  });

  it('토큰 roles 의 kpa:admin 도 전체 목록 계약을 유지한다', async () => {
    mockHasAnyRole.mockResolvedValue(false);
    const res = fakeRes();
    await EnrollmentController.listEnrollments(fakeReq({ userId: USER_A, roles: ['kpa:admin'], query: {} }), res);
    expect(filtersOfLastCall().userId).toBeUndefined();
  });

  it('목록도 canonical serviceKey 로 덮어쓴다 (client raw 값 미신뢰)', async () => {
    const res = fakeRes();
    await EnrollmentController.listEnrollments(fakeReq({ userId: USER_A, query: { serviceKey: 'kpa' } }), res);
    expect(filtersOfLastCall().serviceKey).toBe('kpa-society');
  });
});

describe('정적 회귀 가드', () => {
  const CONTROLLER = 'apps/api-server/src/modules/lms/controllers/EnrollmentController.ts';
  const GUARD = 'apps/api-server/src/modules/lms/utils/lms-enrollment-owner-guard.ts';

  it('4개 mutation 이 공통 helper 를 사용한다 (경로별 중복 구현 금지)', () => {
    const src = read(CONTROLLER);
    const uses = src.match(/EnrollmentController\.ensureOwnEnrollment\(req, res, id\)/g) ?? [];
    expect(uses.length).toBe(4);
    expect(src).not.toContain('enrollment.userId !== userId');
  });

  it('owner guard 는 scope 판정 후에 ownership 을 확인한다', () => {
    const src = read(GUARD);
    expect(src.indexOf('guardLoadedCourseScope')).toBeLessThan(src.indexOf('enrollment.userId !== userId'));
  });

  it('user-facing 라우트에 elevated bypass 미들웨어가 추가되지 않았다', () => {
    const routes = read('apps/api-server/src/modules/lms/routes/lms.routes.ts');
    for (const p of [
      "router.patch('/enrollments/:id'",
      "router.post('/enrollments/:id/start'",
      "router.post('/enrollments/:id/complete'",
      "router.post('/enrollments/:id/cancel'",
    ]) {
      const line = routes.split('\n').find((l) => l.includes(p));
      expect(line).toBeDefined();
      expect(line).toContain('requireAuth');
      expect(line).not.toContain('requireInstructor');
      expect(line).not.toContain('requireKpaAdmin');
    }
  });
});
