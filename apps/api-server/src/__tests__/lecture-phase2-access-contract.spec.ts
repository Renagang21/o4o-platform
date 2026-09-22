/**
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 — Lecture 접근 계약 (§6 · §7 · §22)
 *
 * 세 층 guard 를 실제로 실행해 부정 매트릭스를 고정한다.
 *   Learner    = active lecture membership (role 불요)
 *   Instructor = membership + lecture:instructor
 *   Operator   = membership + lecture:operator | lecture:admin
 *
 * DB 는 service_memberships 조회만 mock 한다 (판정 정본 = DB, JWT 스냅샷은 1차 필터).
 */

const memberships: { user_id: string; service_key: string; status: string }[] = [];

jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    get isInitialized() { return true; },
    query: jest.fn(async (_sql: string, params: any[] = []) => {
      const [userId, serviceKey] = params;
      return memberships
        .filter((m) => m.user_id === userId && m.service_key === serviceKey)
        .map((m) => ({ status: m.status }));
    }),
  },
}));

import {
  requireLectureLearner,
  requireLectureInstructor,
  requireLectureOperator,
  requireLectureAdmin,
  hasLectureOperatorRole,
  hasLectureInstructorRole,
  hasLectureAdminRole,
} from '../modules/lms/middleware/lecture-access.js';
import { requireInstructor } from '../modules/lms/middleware/requireInstructor.js';

type Snapshot = { serviceKey: string; status: string };

function makeReq(roles: string[], snapshot: Snapshot[] = [], id = 'u1'): any {
  return { user: { id, roles, memberships: snapshot } };
}
function makeRes() {
  const res: any = { statusCode: 0, body: null };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn((b: any) => { res.body = b; return res; });
  return res;
}
async function run(guard: any, req: any) {
  const res = makeRes();
  const next = jest.fn();
  await guard(req, res, next);
  return next.mock.calls.length > 0
    ? { allowed: true as const, status: 0, code: undefined as string | undefined }
    : { allowed: false as const, status: res.statusCode, code: res.body?.code as string | undefined };
}

const ACTIVE: Snapshot[] = [{ serviceKey: 'lecture', status: 'active' }];
const SUSPENDED: Snapshot[] = [{ serviceKey: 'lecture', status: 'suspended' }];
function dbActive(id = 'u1') { memberships.push({ user_id: id, service_key: 'lecture', status: 'active' }); }
function dbSuspended(id = 'u1') { memberships.push({ user_id: id, service_key: 'lecture', status: 'suspended' }); }

beforeEach(() => { memberships.length = 0; });

describe('Learner 층 — requireLectureLearner', () => {
  it('미인증 → 401', async () => {
    expect(await run(requireLectureLearner, {})).toEqual({ allowed: false, status: 401, code: 'AUTH_REQUIRED' });
  });
  it('active lecture membership 만 있으면(role 0) 통과', async () => {
    dbActive();
    expect((await run(requireLectureLearner, makeReq([], ACTIVE))).allowed).toBe(true);
  });
  it('membership 없음 → 403 MEMBERSHIP_NOT_FOUND', async () => {
    const r = await run(requireLectureLearner, makeReq([], []));
    expect(r).toEqual({ allowed: false, status: 403, code: 'MEMBERSHIP_NOT_FOUND' });
  });
  it('JWT 는 active 이지만 DB 가 suspended → 403 MEMBERSHIP_NOT_ACTIVE (정지 즉시성)', async () => {
    dbSuspended();
    const r = await run(requireLectureLearner, makeReq([], ACTIVE));
    expect(r).toEqual({ allowed: false, status: 403, code: 'MEMBERSHIP_NOT_ACTIVE' });
  });
  it('JWT 스냅샷이 inactive → 403 MEMBERSHIP_NOT_ACTIVE', async () => {
    const r = await run(requireLectureLearner, makeReq([], SUSPENDED));
    expect(r.code).toBe('MEMBERSHIP_NOT_ACTIVE');
  });
  it('KPA / KCos / PH active membership 은 Lecture 학습 권한을 열지 않는다 (§15)', async () => {
    memberships.push({ user_id: 'u1', service_key: 'kpa-society', status: 'active' });
    const r = await run(requireLectureLearner, makeReq(['kpa:member'], [{ serviceKey: 'kpa-society', status: 'active' }]));
    expect(r.code).toBe('MEMBERSHIP_NOT_FOUND');
  });
  it('platform:super_admin break-glass 는 통과', async () => {
    expect((await run(requireLectureLearner, makeReq(['platform:super_admin'], []))).allowed).toBe(true);
  });
});

describe('Instructor 층 — requireInstructor === requireLectureInstructor', () => {
  it('membership + lecture:instructor → 통과', async () => {
    dbActive();
    expect((await run(requireInstructor, makeReq(['lecture:instructor'], ACTIVE))).allowed).toBe(true);
    expect(requireInstructor).toBe(requireLectureInstructor);
  });
  it('learner(role 0) → 403', async () => {
    dbActive();
    expect((await run(requireInstructor, makeReq([], ACTIVE))).status).toBe(403);
  });
  it('lecture:admin / lecture:operator 는 강사가 아니다 → 403 (§6)', async () => {
    dbActive();
    expect((await run(requireInstructor, makeReq(['lecture:admin'], ACTIVE))).status).toBe(403);
    expect((await run(requireInstructor, makeReq(['lecture:operator'], ACTIVE))).status).toBe(403);
  });
  it('legacy lms:instructor → 403 (§13 runtime consumer 0)', async () => {
    dbActive();
    expect((await run(requireInstructor, makeReq(['lms:instructor'], ACTIVE))).status).toBe(403);
  });
  it('role 있음 + membership 없음 → 403 MEMBERSHIP_NOT_FOUND (§7)', async () => {
    expect(await run(requireInstructor, makeReq(['lecture:instructor'], []))).toEqual({ allowed: false, status: 403, code: 'MEMBERSHIP_NOT_FOUND' });
  });
  it('role 있음 + membership inactive → 403 MEMBERSHIP_NOT_ACTIVE', async () => {
    dbSuspended();
    expect((await run(requireInstructor, makeReq(['lecture:instructor'], ACTIVE))).code).toBe('MEMBERSHIP_NOT_ACTIVE');
  });
});

describe('Operator 층 — requireLectureOperator / requireLectureAdmin', () => {
  it('membership + lecture:operator → 통과, lecture:admin ⊇ operator', async () => {
    dbActive();
    expect((await run(requireLectureOperator, makeReq(['lecture:operator'], ACTIVE))).allowed).toBe(true);
    expect((await run(requireLectureOperator, makeReq(['lecture:admin'], ACTIVE))).allowed).toBe(true);
    expect((await run(requireLectureAdmin, makeReq(['lecture:admin'], ACTIVE))).allowed).toBe(true);
    expect((await run(requireLectureAdmin, makeReq(['lecture:operator'], ACTIVE))).status).toBe(403);
  });
  it('lecture:instructor → operator API 403', async () => {
    dbActive();
    expect((await run(requireLectureOperator, makeReq(['lecture:instructor'], ACTIVE))).status).toBe(403);
  });
  it('learner → operator API 403', async () => {
    dbActive();
    expect((await run(requireLectureOperator, makeReq([], ACTIVE))).status).toBe(403);
  });
  it('KPA admin/operator · KCos · PH · legacy admin 문자열 → 403 (membership 이 있어도)', async () => {
    dbActive();
    const legacy = ['kpa:admin', 'kpa:operator', 'cosmetics:admin', 'cosmetics:operator', 'pharmacy-hub:admin', 'pharmacy-hub:operator', 'admin', 'super_admin', 'lms:instructor'];
    for (const role of legacy) {
      expect((await run(requireLectureOperator, makeReq([role], ACTIVE))).status).toBe(403);
    }
  });
  it('role 있음 + membership 없음 → 403 MEMBERSHIP_NOT_FOUND', async () => {
    expect((await run(requireLectureOperator, makeReq(['lecture:admin'], []))).code).toBe('MEMBERSHIP_NOT_FOUND');
  });
  it('platform:super_admin break-glass 는 통과 (Foundation platformBypass)', async () => {
    expect((await run(requireLectureOperator, makeReq(['platform:super_admin'], []))).allowed).toBe(true);
  });
});

describe('controller 내부 판정 helper — Lecture role 만 인정', () => {
  it('hasLectureAdminRole / hasLectureOperatorRole / hasLectureInstructorRole', () => {
    expect(hasLectureAdminRole(makeReq(['lecture:admin']))).toBe(true);
    expect(hasLectureAdminRole(makeReq(['lecture:operator']))).toBe(false);
    expect(hasLectureOperatorRole(makeReq(['lecture:operator']))).toBe(true);
    expect(hasLectureOperatorRole(makeReq(['lecture:admin']))).toBe(true);
    expect(hasLectureOperatorRole(makeReq(['lecture:instructor']))).toBe(false);
    expect(hasLectureInstructorRole(makeReq(['lecture:instructor']))).toBe(true);
    expect(hasLectureInstructorRole(makeReq(['lecture:admin']))).toBe(false);
    for (const legacy of ['kpa:admin', 'lms:instructor', 'admin', 'cosmetics:admin']) {
      expect(hasLectureAdminRole(makeReq([legacy]))).toBe(false);
      expect(hasLectureOperatorRole(makeReq([legacy]))).toBe(false);
      expect(hasLectureInstructorRole(makeReq([legacy]))).toBe(false);
    }
  });
});
