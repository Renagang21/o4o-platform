/**
 * LMS Cross-Service Read/Write Boundary — Regression Test
 *
 * WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1
 * 선행: WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1 (공개 목록 read boundary)
 *
 * 닫으려는 결함:
 *   목록 read 는 scope 가 걸렸지만, 단건 read 와 write 경로(enroll / progress /
 *   lesson·quiz·assignment 단건 / certificate)는 courseId·lessonId 만 알면 타 서비스
 *   resource 에 접근·기록이 가능했다.
 *
 * 검증 2계층:
 *   (A) 동작 — lms-scope-guard 의 판정 함수가 scope 밖 resource 를 404 로 차단하고,
 *       무경계(legacy/admin) 요청은 통과시키는지 fake req/res + fake AppDataSource 로 실측.
 *   (B) 정적 회귀 가드 — 각 controller/middleware 의 guard 호출과 프런트 serviceKey
 *       주입을 소스 텍스트로 고정한다.
 *
 * 새 LMS 전용 service-key 매핑은 만들지 않는다 (canonical SSOT 재사용).
 */

import * as fs from 'fs';
import * as path from 'path';

const dbQuery = jest.fn(async (_sql: string, _params: unknown[]) => [] as any[]);

jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    getRepository: () => ({}),
    query: (sql: string, params: unknown[]) => dbQuery(sql, params),
  },
}));

import {
  resolveScopeOrRespond,
  guardCourseScope,
  guardLessonScope,
  guardQuizScope,
  guardAssignmentScope,
  guardLoadedCourseScope,
  applyCourseScopeToQuery,
} from '../modules/lms/utils/lms-scope-guard.js';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

function fakeRes() {
  const state: any = { statusCode: 0, body: null };
  const res: any = {
    status(code: number) { state.statusCode = code; return res; },
    json(body: unknown) { state.body = body; return res; },
    state,
  };
  return res;
}

const kpaReq = () => ({ lmsContext: { serviceCode: 'kpa' }, query: {}, params: {} } as any);
const gpReq = () => ({ query: { serviceKey: 'glycopharm' }, params: {} } as any);
const openReq = () => ({ query: {}, params: {} } as any);

beforeEach(() => {
  dbQuery.mockReset();
  dbQuery.mockResolvedValue([]);
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-1) scope 해석
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveScopeOrRespond', () => {
  it('라우트 컨텍스트를 canonical scope 로 해석한다', () => {
    expect(resolveScopeOrRespond(kpaReq(), fakeRes())).toEqual({ ok: true, scope: 'kpa-society' });
  });

  it('컨텍스트 없으면 명시 serviceKey 를 쓴다', () => {
    expect(resolveScopeOrRespond(gpReq(), fakeRes())).toEqual({ ok: true, scope: 'glycopharm' });
  });

  it('중복 전달된 serviceKey(배열)도 scope 가 사라지지 않는다', () => {
    const req: any = { query: { serviceKey: ['glycopharm', 'glycopharm'] } };
    expect(resolveScopeOrRespond(req, fakeRes())).toEqual({ ok: true, scope: 'glycopharm' });
  });

  it('알 수 없는 serviceKey 는 400 을 보내고 ok:false', () => {
    const res = fakeRes();
    const out = resolveScopeOrRespond({ query: { serviceKey: 'no-such-service' } } as any, res);
    expect(out.ok).toBe(false);
    expect(res.state.statusCode).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-2) 단건 resource 판정 — course / lesson / quiz / assignment
// ─────────────────────────────────────────────────────────────────────────────

describe('guardCourseScope — enrollment write(enroll) 경계', () => {
  it('동일 서비스 course 는 통과한다', async () => {
    dbQuery.mockResolvedValue([{ service_key: 'glycopharm' }]);
    const res = fakeRes();
    await expect(guardCourseScope(gpReq(), res, 'course-1')).resolves.toBe(true);
    expect(res.state.statusCode).toBe(0);
  });

  it('타 서비스 course 로는 enroll 할 수 없다 — 404(비공개 계약)', async () => {
    dbQuery.mockResolvedValue([{ service_key: 'kpa-society' }]);
    const res = fakeRes();
    await expect(guardCourseScope(gpReq(), res, 'course-1')).resolves.toBe(false);
    expect(res.state.statusCode).toBe(404);
    expect(res.state.body).toMatchObject({ success: false, error: 'Course not found' });
  });

  it('존재하지 않는 courseId 도 404', async () => {
    dbQuery.mockResolvedValue([]);
    const res = fakeRes();
    await expect(guardCourseScope(gpReq(), res, 'ghost')).resolves.toBe(false);
    expect(res.state.statusCode).toBe(404);
  });

  it('legacy service_key NULL 은 KPA scope 에만 포함된다', async () => {
    dbQuery.mockResolvedValue([{ service_key: null }]);
    await expect(guardCourseScope(kpaReq(), fakeRes(), 'c')).resolves.toBe(true);
    await expect(guardCourseScope(gpReq(), fakeRes(), 'c')).resolves.toBe(false);
  });

  it('무경계(legacy/admin) 요청은 통과하며 추가 쿼리를 하지 않는다', async () => {
    await expect(guardCourseScope(openReq(), fakeRes(), 'c')).resolves.toBe(true);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it('raw SQL 은 parameter binding 만 사용한다 (Guard Rule 2)', async () => {
    dbQuery.mockResolvedValue([{ service_key: 'glycopharm' }]);
    await guardCourseScope(gpReq(), fakeRes(), "x' OR 1=1 --");
    const [sql, params] = dbQuery.mock.calls[0];
    expect(sql).toContain('$1');
    expect(sql).not.toContain('OR 1=1');
    expect(params).toEqual(["x' OR 1=1 --"]);
  });
});

describe('guardLessonScope / guardQuizScope / guardAssignmentScope — course 역추적', () => {
  it('lesson 은 course join 으로 판정한다', async () => {
    dbQuery.mockResolvedValue([{ service_key: 'kpa-society' }]);
    const res = fakeRes();
    await expect(guardLessonScope(gpReq(), res, 'lesson-1')).resolves.toBe(false);
    expect(res.state.body).toMatchObject({ error: 'Lesson not found' });
    expect(dbQuery.mock.calls[0][0]).toContain('lms_lessons');
    expect(dbQuery.mock.calls[0][0]).toContain('lms_courses');
  });

  it('quiz 는 lesson 이 없어도 quiz 의 courseId 로 판정된다', async () => {
    dbQuery.mockResolvedValue([{ service_key: 'kpa-society' }]);
    await expect(guardQuizScope(kpaReq(), fakeRes(), 'quiz-1')).resolves.toBe(true);
    expect(dbQuery.mock.calls[0][0]).toContain('COALESCE');
  });

  it('assignment 는 lesson → course 로 판정한다', async () => {
    dbQuery.mockResolvedValue([{ service_key: 'glycopharm' }]);
    const res = fakeRes();
    await expect(guardAssignmentScope(kpaReq(), res, 'a-1')).resolves.toBe(false);
    expect(res.state.body).toMatchObject({ error: 'Assignment not found' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-3) 이미 로드된 relation 판정 — enrollment / certificate
// ─────────────────────────────────────────────────────────────────────────────

describe('guardLoadedCourseScope — enrollment / certificate 단건', () => {
  it('enrollment 가 있어도 타 서비스 course 면 차단한다', () => {
    const res = fakeRes();
    expect(guardLoadedCourseScope(gpReq(), res, 'kpa-society', 'Enrollment not found')).toBe(false);
    expect(res.state.statusCode).toBe(404);
  });

  it('동일 서비스면 통과한다', () => {
    expect(guardLoadedCourseScope(gpReq(), fakeRes(), 'glycopharm', 'Certificate not found')).toBe(true);
  });

  it('무경계 요청은 통과한다', () => {
    expect(guardLoadedCourseScope(openReq(), fakeRes(), 'kpa-society', 'x')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (A-4) 목록 쿼리 SQL 조건 — client-side filtering 금지
// ─────────────────────────────────────────────────────────────────────────────

describe('applyCourseScopeToQuery — 목록(enrollment / certificate) SQL 필터', () => {
  const fakeQuery = () => {
    const calls: Array<[string, any]> = [];
    return { calls, andWhere(c: string, p?: any) { calls.push([c, p]); return this; } };
  };

  it('KPA scope 는 legacy NULL 을 포함한다', () => {
    const q = fakeQuery();
    applyCourseScopeToQuery(q, 'course', 'kpa-society');
    expect(q.calls[0][0]).toBe('(course.serviceKey = :lmsScopeKey OR course.serviceKey IS NULL)');
  });

  it('타 서비스 scope 는 정확 일치만 허용한다', () => {
    const q = fakeQuery();
    applyCourseScopeToQuery(q, 'course', 'glycopharm');
    expect(q.calls[0][0]).toBe('course.serviceKey = :lmsScopeKey');
    expect(q.calls[0][1]).toEqual({ lmsScopeKey: 'glycopharm' });
  });

  it('무경계 요청은 조건을 걸지 않는다', () => {
    const q = fakeQuery();
    applyCourseScopeToQuery(q, 'course', undefined);
    expect(q.calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (B) 정적 회귀 가드
// ─────────────────────────────────────────────────────────────────────────────

describe('정적 회귀 — write 경로 guard 배선', () => {
  const enrollment = read('apps/api-server/src/modules/lms/controllers/EnrollmentController.ts');

  it('enroll 은 course scope 확인 후에만 등록한다', () => {
    expect(enrollment).toContain('guardCourseScope(req, res, courseId)');
  });

  it('progress write 도 course scope + lesson↔course 일치를 확인한다', () => {
    expect(enrollment).toContain('lesson.courseId !== courseId');
  });

  it('enrollment 단건/상태 변경은 scope 확인을 거친다', () => {
    expect(enrollment).toContain('ensureEnrollmentInScope');
  });

  it('목록 필터의 client serviceKey 는 canonical 해석값으로 덮어쓴다', () => {
    expect(enrollment).toContain('serviceKey: scope.scope');
  });
});

describe('정적 회귀 — read 경로 guard 배선', () => {
  it('lesson 목록/단건은 requireEnrollment 에서 service scope 를 판정한다', () => {
    const mw = read('apps/api-server/src/modules/lms/middleware/requireEnrollment.ts');
    expect(mw).toContain('isCourseInServiceScope');
    expect(mw).toContain('resolveLmsServiceScope');
  });

  it('lesson 단건 controller 도 독립적으로 scope 를 판정한다', () => {
    expect(read('apps/api-server/src/modules/lms/controllers/LessonController.ts'))
      .toContain('guardLessonScope(req, res, id)');
  });

  it('quiz / assignment 는 course 역추적 guard 를 쓴다', () => {
    expect(read('apps/api-server/src/modules/lms/controllers/QuizController.ts')).toContain('guardQuizScope');
    expect(read('apps/api-server/src/modules/lms/controllers/AssignmentController.ts')).toContain('guardAssignmentScope');
  });

  it('certificate 단건/다운로드는 course scope 를 소유자 확인보다 먼저 본다', () => {
    const cert = read('apps/api-server/src/modules/lms/controllers/CertificateController.ts');
    const scopeIdx = cert.indexOf('guardLoadedCourseScope(req, res, certificate.course?.serviceKey');
    const ownerIdx = cert.indexOf('certificate.userId !== requestUserId');
    expect(scopeIdx).toBeGreaterThan(-1);
    expect(ownerIdx).toBeGreaterThan(scopeIdx);
  });

  it('course completion 목록도 course join 으로 scope 를 건다', () => {
    expect(read('apps/api-server/src/modules/lms/services/CompletionService.ts'))
      .toContain('course.service_key = :lmsScopeKey');
  });
});

describe('정적 회귀 — KPA remount 계약', () => {
  const kpa = read('apps/api-server/src/routes/kpa/kpa.routes.ts');

  it('KPA LMS 화면이 호출하는 quiz/assignment endpoint 가 remount 되어 있다', () => {
    expect(kpa).toContain("lmsRouter.get('/lessons/:lessonId/quiz'");
    expect(kpa).toContain("lmsRouter.post('/quizzes/:quizId/submit'");
    expect(kpa).toContain("lmsRouter.get('/quizzes/:quizId/attempts'");
    expect(kpa).toContain("lmsRouter.get('/lessons/:lessonId/assignment'");
    expect(kpa).toContain("lmsRouter.post('/assignments/:assignmentId/submit'");
    expect(kpa).toContain("lmsRouter.get('/assignments/:assignmentId/my'");
  });
});

describe('정적 회귀 — 프런트 serviceKey 주입 (generic LMS 소비 서비스)', () => {
  it('GlycoPharm 은 /lms/* 요청에 canonical serviceKey 를 붙인다', () => {
    const src = read('services/web-glycopharm/src/lib/apiClient.ts');
    expect(src).toContain("const LMS_SERVICE_KEY = 'glycopharm'");
    expect(src).toContain("url.startsWith('/lms/')");
  });

  it('K-Cosmetics 는 /lms/* 요청에 canonical serviceKey 를 붙인다', () => {
    const src = read('services/web-k-cosmetics/src/lib/apiClient.ts');
    expect(src).toContain("const LMS_SERVICE_KEY = 'k-cosmetics'");
    expect(src).toContain("url.startsWith('/lms/')");
  });

  it('GlycoPharm 수료증 다운로드는 canonical /pdf 경로를 쓴다', () => {
    const src = read('services/web-glycopharm/src/api/lms.ts');
    expect(src).toContain('`/lms/certificates/${certificateId}/pdf`');
    expect(src).not.toContain('`/lms/certificates/${certificateId}/download`');
  });
});
