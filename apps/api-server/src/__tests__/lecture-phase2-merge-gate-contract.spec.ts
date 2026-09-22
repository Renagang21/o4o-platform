/**
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 — PR #225 merge-gate 계약 (Codex P1 5건)
 *
 *  P1-1 members visibility : 로그인만으로 members 강의를 열지 않는다 — 목록·상세 모두 active lecture membership 필요
 *  P1-2 serviceKey immutable: PATCH body 의 serviceKey/instructorId 는 CourseService.updateCourse 에 반영되지 않는다
 *  P1-3 publish target scope: POST /courses/:id/publish 는 course.serviceKey==='lecture' 만 (legacy → 404)
 *  P1-4 instructor quiz     : 강사 편집 경로는 정답을 포함하고 소유권을 검사한다 · learner 경로는 정답을 제거한다
 *  (P1-5 pre-cutover 가용성은 운영 게이트 — CHECK §15 / PR 설명의 실행 순서로 고정, runtime fallback 0)
 *  재검토 P1-6 lesson mutation : 강사·lecture:admin 의 lesson create/update/delete/reorder 는 대상 course 가 lecture 일 때만 (legacy → 404)
 *  재검토 P1-7 certificate issue: POST /certificates/issue 는 courseId 가 lecture scope 일 때만 (legacy → 404)
 *  재검토 P2-1 progress 필드   : web-lecture 어댑터는 서버 영속 필드 progressPercentage 를 읽는다
 *  3차 P1-8  status allowlist  : 강사 PATCH 로 status(published 등) 를 바꿀 수 없다 — 상태 전이는 전용 endpoint 만
 *  3차 P1-9  certificate 변경  : update/revoke/renew 는 lecture course 의 certificate 만 (legacy → 404)
 *  3차 P1-10 assignment upsert : 대상 lesson 의 course 가 lecture 가 아니면 lecture:admin 도 404
 *  3차 P1-11 enrollment 승인   : approve/reject 는 lecture course 의 수강만 (legacy → 404 · write 0)
 *  3차 P1-12 submission 조회   : 강사 submission 경로도 lecture course 만 (admin override 이전에 scope)
 *  3차 P2-2  progress 목록     : MyEnrollmentsPage 도 progressPercentage 를 읽는다
 *  4차 P1-13 quiz 생성 귀속    : courseId 를 생략하고 lessonId 만 보내도 귀속될 course 로 scope·소유권 검사 (우회 차단)
 *  4차 P1-14 문항 id 보존     : 편집기·updateQuiz 가 questions[].id 를 유지한다 (채점 매칭 유실 방지)
 *  4차 P1-15 제출 enrollment  : quiz/assignment 제출은 membership 위에 enrollment 정책까지 통과해야 한다
 *  6차 P1-16 퀴즈 저장 정합   : 정답 없는/보기에 없는 문항 저장 차단 · 보기 편집 시 정답 동기화 · 로드 실패를 미존재로 오인 금지(중복 퀴즈)
 *
 * DB 없이 controller/service 를 실제로 실행한다: TypeORM entity 그래프는 virtual mock,
 * DataSource 는 service_memberships / lms_lessons 조회만 흉내낸다.
 */

const memberships: { user_id: string; service_key: string; status: string }[] = [];
const lessons: Record<string, { courseId: string }> = {};

jest.mock(
  '@o4o/lms-core',
  () => ({
    Course: class {},
    Lesson: class {},
    Quiz: class {},
    QuizAttempt: class {},
    Progress: class {},
    Enrollment: class {},
    Certificate: class {},
    InstructorApplication: class {},
    CourseStatus: { DRAFT: 'draft', PENDING_REVIEW: 'pending_review', PUBLISHED: 'published', REJECTED: 'rejected', ARCHIVED: 'archived' },
    ContentKind: { LECTURE: 'lecture', COURSE_MATERIAL: 'course_material' },
    CourseVisibility: { PUBLIC: 'public', MEMBERS: 'members' },
    CourseReusablePolicy: { RESTRICTED: 'restricted', PLATFORM: 'platform' },
    AttemptStatus: {}, LessonType: {}, ProgressStatus: {},
    EnrollmentStatus: { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' },
  }),
  { virtual: true },
);
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    get isInitialized() { return true; },
    // InstructorController 는 Enrollment repository 를 직접 쓴다 — 그 외 repository 는 사용하지 않는다.
    getRepository: (entity: any) => (entity?.name === 'Enrollment' ? enrollmentRepo : {}),
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('FROM lms_lessons WHERE id')) {
        const l = lessons[params[0]];
        return l ? [{ courseId: l.courseId }] : [];
      }
      if (sql.includes('FROM lms_lessons l')) {
        // lms-scope-guard LESSON_SQL — lesson → course.service_key
        const l = lessons[params[0]];
        if (!l) return [];
        const c = courses[l.courseId];
        return c ? [{ service_key: c.serviceKey }] : [];
      }
      if (sql.includes('FROM lms_courses WHERE id')) {
        // lms-scope-guard COURSE_SQL
        const c = courses[params[0]];
        return c ? [{ service_key: c.serviceKey }] : [];
      }
      if (sql.includes('FROM lms_quizzes q')) {
        const q = quizzes[params[0]];
        if (!q) return [];
        const c = courses[q.courseId];
        return c ? [{ service_key: c.serviceKey }] : [];
      }
      const [userId, serviceKey] = params;
      return memberships
        .filter((m) => m.user_id === userId && m.service_key === serviceKey)
        .map((m) => ({ status: m.status }));
    }),
  },
}));
jest.mock('../services/NotificationService.js', () => ({ notificationService: {} }));
jest.mock('../common/event-log.service.js', () => ({ logEvent: jest.fn() }));
jest.mock('../modules/lms/services/RewardPolicyService.js', () => ({ resolveRewardAmount: jest.fn(), grantRewardIfConfigured: jest.fn() }));
jest.mock('../modules/lms/services/CompletionService.js', () => ({ CompletionService: { getInstance: () => ({}) } }));
jest.mock('../modules/credit/entities/CreditTransaction.js', () => ({ CreditSourceType: {} }));
jest.mock('../modules/credit/credit-constants.js', () => ({ CREDIT_DESCRIPTIONS: {} }));
jest.mock('../modules/lms/utils/certificatePdf.js', () => ({ generateCertificatePdf: jest.fn() }));
jest.mock('../modules/lms/services/EnrollmentService.js', () => ({ EnrollmentService: { getInstance: () => ({}) } }));
jest.mock('../modules/lms/services/AssignmentService.js', () => ({ AssignmentService: { getInstance: () => assignmentSvc } }));
jest.mock('../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: {} }));

import { CourseController } from '../modules/lms/controllers/CourseController.js';
import { QuizController } from '../modules/lms/controllers/QuizController.js';
import { CourseService, pickUpdatableCourseFields, UPDATABLE_COURSE_FIELDS } from '../modules/lms/services/CourseService.js';
import { QuizService } from '../modules/lms/services/QuizService.js';
import { LessonController } from '../modules/lms/controllers/LessonController.js';
import { LessonService } from '../modules/lms/services/LessonService.js';
import { CertificateController } from '../modules/lms/controllers/CertificateController.js';
import { CertificateService } from '../modules/lms/services/CertificateService.js';
import { AssignmentController } from '../modules/lms/controllers/AssignmentController.js';
import { InstructorController } from '../modules/lms/controllers/InstructorController.js';

const enrollments: Record<string, { id: string; courseId: string; userId: string; status: string }> = {};
let enrollmentSaves: string[] = [];
const enrollmentRepo = {
  findOne: async ({ where }: any) => {
    const e = enrollments[where.id];
    return e ? { ...e, course: courses[e.courseId] ? { ...courses[e.courseId] } : null } : null;
  },
  save: async (e: any) => { enrollmentSaves.push(e.id); return e; },
};
let assignmentWrites: string[] = [];
const assignmentSvc: any = {
  upsertAssignment: async (d: any) => { assignmentWrites.push(d.lessonId); return { id: 'as', ...d }; },
  listSubmissionsForLesson: async () => [],
};

type CourseRow = { id: string; serviceKey: string | null; visibility: string; instructorId: string; status: string; title: string; isPaid?: boolean; tags?: string[] };
const courses: Record<string, CourseRow> = {};
const quizzes: Record<string, any> = {};

function makeReq(opts: { id?: string; roles?: string[]; member?: boolean; params?: any; body?: any; query?: any } = {}): any {
  const req: any = { params: opts.params ?? {}, body: opts.body ?? {}, query: opts.query ?? {} };
  if (opts.id) {
    req.user = {
      id: opts.id,
      roles: opts.roles ?? [],
      memberships: opts.member ? [{ serviceKey: 'lecture', status: 'active' }] : [],
    };
    if (opts.member) memberships.push({ user_id: opts.id, service_key: 'lecture', status: 'active' });
  }
  req.lmsContext = { serviceCode: 'lecture' }; // lms.routes.ts 가 고정하는 route context
  return req;
}
function makeRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = jest.fn((c: number) => { res.statusCode = c; return res; });
  res.json = jest.fn((b: any) => { res.body = b; return res; });
  return res;
}

let listFilters: any[] = [];
let savedCourse: any = null;
let savedQuiz: any = null;

beforeEach(() => {
  memberships.length = 0;
  listFilters = [];
  savedCourse = null;
  savedQuiz = null;
  for (const k of Object.keys(courses)) delete courses[k];
  for (const k of Object.keys(lessons)) delete lessons[k];
  for (const k of Object.keys(quizzes)) delete quizzes[k];
  courses['lec-pub'] = { id: 'lec-pub', serviceKey: 'lecture', visibility: 'public', instructorId: 'inst', status: 'draft', title: 'L public', tags: ['a'] };
  courses['lec-mem'] = { id: 'lec-mem', serviceKey: 'lecture', visibility: 'members', instructorId: 'inst', status: 'draft', title: 'L members', tags: ['a'] };
  courses['kpa-old'] = { id: 'kpa-old', serviceKey: 'kpa-society', visibility: 'members', instructorId: 'inst', status: 'pending_review', title: 'legacy', tags: ['a'] };
  courses['null-old'] = { id: 'null-old', serviceKey: null, visibility: 'public', instructorId: 'inst', status: 'draft', title: 'legacy null', tags: ['a'] };

  // CourseService: repository 를 in-memory 로 대체 (updateCourse 는 실제 코드 경로 실행)
  const cs: any = CourseService.getInstance();
  cs.courseRepository = {
    findOne: async ({ where }: any) => (courses[where.id] ? { ...courses[where.id] } : null),
    save: async (c: any) => { savedCourse = c; courses[c.id] = { ...courses[c.id], ...c }; return c; },
  };
  cs.listCourses = jest.fn(async (filters: any) => { listFilters.push(filters); return { courses: [], total: 0 }; });
  cs.publishCourse = jest.fn(async (id: string) => ({ ...courses[id], status: 'published' }));

  const qs: any = QuizService.getInstance();
  qs.quizRepository = {
    findOne: async ({ where }: any) => {
      const match = Object.values(quizzes).find((q: any) =>
        (where.id && q.id === where.id) ||
        (where.lessonId && q.lessonId === where.lessonId && (where.isPublished === undefined || q.isPublished === where.isPublished)));
      return match ? JSON.parse(JSON.stringify(match)) : null;
    },
    save: async (q: any) => { savedQuiz = q; quizzes[q.id] = q; return q; },
  };
  cs.maybeRevertToPendingReview = jest.fn(async () => undefined);

  const ls: any = LessonService.getInstance();
  ls.getLesson = jest.fn(async (id: string) => (lessons[id] ? { id, courseId: lessons[id].courseId, title: 't' } : null));
  ls.createLesson = jest.fn(async (d: any) => { lessonWrites.push(['create', d.courseId]); return { id: 'new', ...d }; });
  ls.updateLesson = jest.fn(async (id: string, d: any) => { lessonWrites.push(['update', id]); return { id, ...d }; });
  ls.deleteLesson = jest.fn(async (id: string) => { lessonWrites.push(['delete', id]); });
  ls.reorderLessons = jest.fn(async (courseId: string) => { lessonWrites.push(['reorder', courseId]); return []; });
  lessonWrites = [];

  const certs: any = CertificateService.getInstance();
  certs.issueCertificate = jest.fn(async (d: any) => { certIssues.push(d.courseId); return { id: 'cert', ...d }; });
  certIssues = [];
  // 3차 P1-9: certificate → course 관계를 in-memory 로 (update/revoke/renew 는 service 를 stub · write 기록만)
  certs.getCertificate = jest.fn(async (id: string) => {
    const c = certificates[id];
    return c ? { id, userId: c.userId, course: courses[c.courseId] ? { ...courses[c.courseId] } : null } : null;
  });
  certs.updateCertificate = jest.fn(async (id: string) => { certMutations.push(['update', id]); return { id }; });
  certs.revokeCertificate = jest.fn(async (id: string) => { certMutations.push(['revoke', id]); return { id }; });
  certs.renewCertificate = jest.fn(async (id: string) => { certMutations.push(['renew', id]); return { id }; });
  certMutations = [];
  for (const k of Object.keys(certificates)) delete certificates[k];
  for (const k of Object.keys(enrollments)) delete enrollments[k];
  enrollmentSaves = [];
  assignmentWrites = [];
});
const certificates: Record<string, { userId: string; courseId: string }> = {};
let certMutations: [string, string][] = [];
let lessonWrites: [string, string][] = [];
let certIssues: string[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// P1-1 members visibility
// ─────────────────────────────────────────────────────────────────────────────
describe('P1-1 members visibility — 로그인만으로는 members 강의를 열지 않는다', () => {
  it('GET /courses/:id · 비로그인 · public → 200', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ params: { id: 'lec-pub' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.course.title).toBe('L public');
  });
  it('GET /courses/:id · 비로그인 · members → 401 MEMBERS_ONLY (본문 비노출)', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ params: { id: 'lec-mem' } }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.code).toBe('MEMBERS_ONLY');
    expect(JSON.stringify(res.body)).not.toContain('L members');
  });
  it('GET /courses/:id · 로그인 · lecture membership 없음 · members → 403 LECTURE_MEMBERSHIP_REQUIRED (제목·설명 비노출)', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'u-nomember', member: false, params: { id: 'lec-mem' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('LECTURE_MEMBERSHIP_REQUIRED');
    expect(JSON.stringify(res.body)).not.toContain('L members');
  });
  it('GET /courses/:id · KPA membership 만 있는 로그인 사용자 · members → 403 (타 서비스 membership 은 Lecture 를 열지 않는다)', async () => {
    memberships.push({ user_id: 'u-kpa', service_key: 'kpa-society', status: 'active' });
    const req = makeReq({ id: 'u-kpa', roles: ['kpa:member'], params: { id: 'lec-mem' } });
    req.user.memberships = [{ serviceKey: 'kpa-society', status: 'active' }];
    const res = makeRes();
    await CourseController.getCourse(req, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('LECTURE_MEMBERSHIP_REQUIRED');
  });
  it('GET /courses/:id · active lecture membership · members → 200', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'u-mem', member: true, params: { id: 'lec-mem' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.course.title).toBe('L members');
  });
  it('GET /courses/:id · 로그인 · membership 없음 · public → 200 (public 은 그대로)', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'u-nomember', params: { id: 'lec-pub' } }), res);
    expect(res.statusCode).toBe(200);
  });

  it('GET /courses 목록 · 비로그인 → visibility=public 강제', async () => {
    await CourseController.listCourses(makeReq({ query: { visibility: 'members' } }), makeRes());
    expect(listFilters[0].visibility).toBe('public');
  });
  it('GET /courses 목록 · 로그인 · membership 없음 → visibility=public 강제 (members 강의 목록 제외)', async () => {
    await CourseController.listCourses(makeReq({ id: 'u-nomember', query: { visibility: 'members' } }), makeRes());
    expect(listFilters[0].visibility).toBe('public');
    await CourseController.listCourses(makeReq({ id: 'u-nomember2', query: {} }), makeRes());
    expect(listFilters[1].visibility).toBe('public');
  });
  it('GET /courses 목록 · active lecture membership → 클라이언트 visibility 필터 유지(전체 허용)', async () => {
    await CourseController.listCourses(makeReq({ id: 'u-mem', member: true, query: {} }), makeRes());
    expect(listFilters[0].visibility).toBeUndefined();
    await CourseController.listCourses(makeReq({ id: 'u-mem2', member: true, query: { visibility: 'members' } }), makeRes());
    expect(listFilters[1].visibility).toBe('members');
  });
  it('목록 scope 는 항상 lecture 로 고정된다 (client serviceKey 무시)', async () => {
    await CourseController.listCourses(makeReq({ query: { serviceKey: 'kpa-society' } }), makeRes());
    expect(listFilters[0].serviceKey).toBe('lecture');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-2 serviceKey immutable
// ─────────────────────────────────────────────────────────────────────────────
describe('P1-2 serviceKey immutable — PATCH 로 서비스 소유권을 옮길 수 없다', () => {
  it('pickUpdatableCourseFields 는 serviceKey · instructorId · id 를 버린다', () => {
    const picked: any = pickUpdatableCourseFields({
      title: 'T', serviceKey: 'kpa-society', instructorId: 'other', contentKind: 'course_material',
      ...({ id: 'x', createdAt: 'y', enrollmentCount: 999 } as any),
    } as any);
    expect(picked).toEqual({ title: 'T', contentKind: 'course_material' });
    expect(picked).not.toHaveProperty('serviceKey');
    expect(picked).not.toHaveProperty('instructorId');
  });
  it.each([['kpa-society'], [null], ['pharmacy-hub'], ['']])('updateCourse: body serviceKey=%p 는 무시되고 lecture 가 유지된다', async (bad) => {
    const cs = CourseService.getInstance();
    const updated = await cs.updateCourse('lec-pub', { title: 'renamed', serviceKey: bad as any });
    expect(updated.serviceKey).toBe('lecture');
    expect(updated.title).toBe('renamed');
    expect(savedCourse.serviceKey).toBe('lecture');
  });
  it('updateCourse: contentKind 는 별개 축 — 변경 가능하고 serviceKey 는 그대로', async () => {
    const updated = await CourseService.getInstance().updateCourse('lec-pub', { contentKind: 'course_material' as any, serviceKey: 'kpa-society' });
    expect(updated.contentKind).toBe('course_material');
    expect(updated.serviceKey).toBe('lecture');
  });
  it('updateCourse: instructorId(소유자) 도 PATCH 로 바뀌지 않는다', async () => {
    const updated = await CourseService.getInstance().updateCourse('lec-pub', { instructorId: 'hijack' } as any);
    expect(updated.instructorId).toBe('inst');
  });
  it('controller PATCH /courses/:id 경유 — 소유자 요청 body 의 serviceKey 가 무시된다', async () => {
    const res = makeRes();
    await CourseController.updateCourse(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'lec-pub' }, body: { title: 'x', serviceKey: 'kpa-society' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.course.serviceKey).toBe('lecture');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-3 publish target scope
// ─────────────────────────────────────────────────────────────────────────────
describe('P1-3 publish / 강사 write 대상은 lecture 강의만 — legacy 는 404 non-disclosure', () => {
  const operator = () => makeReq({ id: 'op', roles: ['lecture:operator'], member: true, params: { id: 'kpa-old' } });

  it('POST /courses/:id/publish · lecture:operator · lecture 강의 → 200', async () => {
    const res = makeRes();
    await CourseController.publishCourse(makeReq({ id: 'op', roles: ['lecture:operator'], member: true, params: { id: 'lec-pub' } }), res);
    expect(res.statusCode).toBe(200);
    expect((CourseService.getInstance() as any).publishCourse).toHaveBeenCalledWith('lec-pub');
  });
  it('POST /courses/:id/publish · lecture:operator · legacy KPA 강의 → 404 (본문 비노출 · publish 미호출)', async () => {
    const res = makeRes();
    await CourseController.publishCourse(operator(), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('legacy');
    expect((CourseService.getInstance() as any).publishCourse).not.toHaveBeenCalled();
  });
  it('POST /courses/:id/publish · serviceKey NULL 강의 → 404', async () => {
    const res = makeRes();
    await CourseController.publishCourse(makeReq({ id: 'op', roles: ['lecture:admin'], member: true, params: { id: 'null-old' } }), res);
    expect(res.statusCode).toBe(404);
  });
  it('POST /courses/:id/publish · 강사(operator 아님) · lecture 강의 → 403 PUBLISH_REQUIRES_APPROVAL (종전 유지)', async () => {
    const res = makeRes();
    await CourseController.publishCourse(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'lec-pub' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('PUBLISH_REQUIRES_APPROVAL');
  });
  it.each([
    ['updateCourse', (r: any, s: any) => CourseController.updateCourse(r, s)],
    ['deleteCourse', (r: any, s: any) => CourseController.deleteCourse(r, s)],
    ['submitForReview', (r: any, s: any) => CourseController.submitForReview(r, s)],
    ['unpublishCourse', (r: any, s: any) => CourseController.unpublishCourse(r, s)],
    ['archiveCourse', (r: any, s: any) => CourseController.archiveCourse(r, s)],
  ])('%s · 소유 강사라도 legacy KPA 강의는 404 (approve/reject/archive 와 동일 규칙)', async (_n, fn) => {
    const res = makeRes();
    await fn(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'kpa-old' }, body: { title: 'x' } }), res);
    expect(res.statusCode).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-4 instructor quiz answer key
// ─────────────────────────────────────────────────────────────────────────────
describe('P1-4 instructor quiz — 편집 경로는 정답 포함·소유권 검사, learner 경로는 정답 제거', () => {
  beforeEach(() => {
    lessons['les-1'] = { courseId: 'lec-pub' };
    lessons['les-kpa'] = { courseId: 'kpa-old' };
    quizzes['q1'] = {
      id: 'q1', lessonId: 'les-1', courseId: 'lec-pub', title: 'Q', passingScore: 60, isPublished: true,
      questions: [{ id: 'qq1', question: '1+1', type: 'single', options: ['1', '2'], answer: '2', points: 10, order: 1 }],
    };
    quizzes['q-kpa'] = { id: 'q-kpa', lessonId: 'les-kpa', courseId: 'kpa-old', title: 'legacy Q', isPublished: true, questions: [{ id: 'x', answer: 'a' }] };
  });

  it('GET /lessons/:lessonId/quiz (learner) → 정답 제거', async () => {
    const res = makeRes();
    await QuizController.getQuizForLesson(makeReq({ id: 'u-mem', member: true, params: { lessonId: 'les-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.quiz.questions[0].answer).toBeUndefined();
  });
  it('GET /instructor/lessons/:lessonId/quiz · 소유 강사 → 정답 포함', async () => {
    const res = makeRes();
    await QuizController.getQuizForLessonAsInstructor(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { lessonId: 'les-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.quiz.questions[0].answer).toBe('2');
  });
  it('GET /instructor/lessons/:lessonId/quiz · lecture:admin → 정답 포함 (소유자 override)', async () => {
    const res = makeRes();
    await QuizController.getQuizForLessonAsInstructor(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, params: { lessonId: 'les-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.quiz.questions[0].answer).toBe('2');
  });
  it('GET /instructor/lessons/:lessonId/quiz · 다른 강사 → 403 (정답 비노출)', async () => {
    const res = makeRes();
    await QuizController.getQuizForLessonAsInstructor(makeReq({ id: 'other-inst', roles: ['lecture:instructor'], member: true, params: { lessonId: 'les-1' } }), res);
    expect(res.statusCode).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain('"answer"');
  });
  it('GET /instructor/lessons/:lessonId/quiz · legacy KPA 강의 lesson → 404', async () => {
    const res = makeRes();
    await QuizController.getQuizForLessonAsInstructor(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { lessonId: 'les-kpa' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('편집 왕복: 강사 읽기(정답 포함) → 제목만 바꿔 PATCH → 정답 보존', async () => {
    const read = makeRes();
    await QuizController.getQuizForLessonAsInstructor(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { lessonId: 'les-1' } }), read);
    const loaded = read.body.data.quiz;
    const res = makeRes();
    await QuizController.updateQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { quizId: 'q1' }, body: { ...loaded, title: 'Q renamed' } }), res);
    expect(res.statusCode).toBe(200);
    expect(savedQuiz.title).toBe('Q renamed');
    expect(savedQuiz.questions[0].answer).toBe('2');
  });
  it('회귀: learner 응답(정답 undefined)으로 PATCH 하면 정답이 유실된다 — 편집기는 이 경로를 쓰지 않는다', async () => {
    const read = makeRes();
    await QuizController.getQuizForLesson(makeReq({ id: 'inst', member: true, params: { lessonId: 'les-1' } }), read);
    const stripped = read.body.data.quiz;
    expect(stripped.questions[0].answer).toBeUndefined();
    await QuizController.updateQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { quizId: 'q1' }, body: { ...stripped, title: 'oops' } }), makeRes());
    expect(savedQuiz.questions[0].answer).toBeUndefined();
  });
  it('PATCH /quizzes/:id · 다른 강사 → 403 · lessonId/courseId 귀속은 body 로 바꿀 수 없다', async () => {
    const res = makeRes();
    await QuizController.updateQuiz(makeReq({ id: 'other-inst', roles: ['lecture:instructor'], member: true, params: { quizId: 'q1' }, body: { title: 'hijack' } }), res);
    expect(res.statusCode).toBe(403);
    expect(savedQuiz).toBeNull();

    const ok = makeRes();
    await QuizController.updateQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { quizId: 'q1' }, body: { title: 'moved?', courseId: 'kpa-old', lessonId: 'les-kpa', id: 'zzz' } }), ok);
    expect(ok.statusCode).toBe(200);
    expect(savedQuiz.courseId).toBe('lec-pub');
    expect(savedQuiz.lessonId).toBe('les-1');
    expect(savedQuiz.id).toBe('q1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4차 P1-13 quiz 생성 — courseId 생략(lessonId 단독) 경로도 scope·소유권을 검사한다
// ─────────────────────────────────────────────────────────────────────────────
describe('4차 P1-13 POST /quizzes — 귀속될 course 를 확정해 검사한다 (courseId 생략 우회 차단)', () => {
  const body = (extra: any) => ({ title: 'Q', questions: [{ question: '1+1', answer: '2' }], ...extra });

  beforeEach(() => {
    lessons['les-1'] = { courseId: 'lec-pub' };
    lessons['les-kpa'] = { courseId: 'kpa-old' };
    lessons['les-other'] = { courseId: 'lec-other' };
    courses['lec-other'] = { id: 'lec-other', serviceKey: 'lecture', visibility: 'public', instructorId: 'other-inst', status: 'draft', title: 'L other', tags: [] };
    // createQuiz 는 실제 service 경로(lesson→courseId 역추적 포함)를 타므로 두 repository 를 채운다.
    const qs: any = QuizService.getInstance();
    qs.quizRepository.create = (d: any) => ({ id: 'new-quiz', ...d });
    qs.lessonRepository = {
      findOne: async ({ where }: any) => (lessons[where.id] ? { id: where.id, courseId: lessons[where.id].courseId } : null),
    };
  });

  it('lessonId 만 · legacy(kpa-society) lesson → 404 · 생성 0', async () => {
    const res = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: body({ lessonId: 'les-kpa' }) }), res);
    expect(res.statusCode).toBe(404);
    expect(savedQuiz).toBeNull();
  });

  it('lessonId 만 · 다른 강사의 lecture lesson → 403 · 생성 0', async () => {
    const res = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: body({ lessonId: 'les-other' }) }), res);
    expect(res.statusCode).toBe(403);
    expect(savedQuiz).toBeNull();
  });

  it('lessonId 만 · 소유 lesson → 201 · courseId 는 lesson 소속으로 확정', async () => {
    const res = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: body({ lessonId: 'les-1' }) }), res);
    expect(res.statusCode).toBe(201);
    expect(savedQuiz.courseId).toBe('lec-pub');
    expect(savedQuiz.lessonId).toBe('les-1');
  });

  it('courseId 와 lessonId 소속이 다르면 404 · 생성 0 (내 강의 id 로 타 lesson 에 붙이기 차단)', async () => {
    const res = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: body({ courseId: 'lec-pub', lessonId: 'les-other' }) }), res);
    expect(res.statusCode).toBe(404);
    expect(savedQuiz).toBeNull();
  });

  it('courseId · lessonId 둘 다 없으면 400 · 생성 0 (무귀속 quiz 금지)', async () => {
    const res = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: body({}) }), res);
    expect(res.statusCode).toBe(400);
    expect(savedQuiz).toBeNull();
  });

  it('courseId 만 · legacy → 404 / 소유 lecture → 201 (종전 계약 유지)', async () => {
    const bad = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: body({ courseId: 'kpa-old' }) }), bad);
    expect(bad.statusCode).toBe(404);
    expect(savedQuiz).toBeNull();

    const ok = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: body({ courseId: 'lec-pub' }) }), ok);
    expect(ok.statusCode).toBe(201);
    expect(savedQuiz.courseId).toBe('lec-pub');
  });

  it('4차 P1-14: PATCH 에서 문항 id 가 빠져도 기존 id 를 승계한다 (채점 매칭 보존)', async () => {
    quizzes['q9'] = {
      id: 'q9', lessonId: 'les-1', courseId: 'lec-pub', title: 'Q', passingScore: 60, isPublished: true,
      questions: [
        { id: 'qid-1', question: 'a', type: 'single', options: ['1', '2'], answer: '1', points: 10, order: 1 },
        { id: 'qid-2', question: 'b', type: 'single', options: ['1', '2'], answer: '2', points: 10, order: 2 },
      ],
    };
    const res = makeRes();
    await QuizController.updateQuiz(makeReq({
      id: 'inst', roles: ['lecture:instructor'], member: true, params: { quizId: 'q9' },
      body: { title: 'Q2', questions: [
        { question: 'a (수정)', type: 'single', options: ['1', '2'], answer: '1', points: 10, order: 1 },
        { question: 'b', type: 'single', options: ['1', '2'], answer: '2', points: 10, order: 2 },
      ] },
    }), res);
    expect(res.statusCode).toBe(200);
    expect(savedQuiz.questions.map((q: any) => q.id)).toEqual(['qid-1', 'qid-2']);
    expect(savedQuiz.questions[0].question).toBe('a (수정)');
  });

  it('4차 P1-14: 새 문항은 새 id 를 받고 기존 id 와 충돌하지 않는다', async () => {
    quizzes['q10'] = {
      id: 'q10', lessonId: 'les-1', courseId: 'lec-pub', title: 'Q', passingScore: 60, isPublished: true,
      questions: [{ id: 'qid-1', question: 'a', type: 'single', options: ['1', '2'], answer: '1', points: 10, order: 1 }],
    };
    const res = makeRes();
    await QuizController.updateQuiz(makeReq({
      id: 'inst', roles: ['lecture:instructor'], member: true, params: { quizId: 'q10' },
      body: { questions: [
        { question: 'a', type: 'single', options: ['1', '2'], answer: '1', points: 10, order: 1 },
        { question: '신규', type: 'single', options: ['1', '2'], answer: '2', points: 10, order: 2 },
      ] },
    }), res);
    expect(res.statusCode).toBe(200);
    const ids = savedQuiz.questions.map((q: any) => q.id);
    expect(ids[0]).toBe('qid-1');
    expect(ids[1]).toBeTruthy();
    expect(ids[1]).not.toBe('qid-1');
  });

  it('lecture:admin 은 타 강사 lecture lesson 에도 생성 가능 · legacy 는 여전히 404', async () => {
    const ok = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, body: body({ lessonId: 'les-other' }) }), ok);
    expect(ok.statusCode).toBe(201);
    expect(savedQuiz.courseId).toBe('lec-other');

    savedQuiz = null;
    const bad = makeRes();
    await QuizController.createQuiz(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, body: body({ lessonId: 'les-kpa' }) }), bad);
    expect(bad.statusCode).toBe(404);
    expect(savedQuiz).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 재검토 P1-6 lesson mutation — 대상 course 가 lecture 가 아니면 소유자·lecture:admin 도 404
// ─────────────────────────────────────────────────────────────────────────────
describe('재검토 P1-6 lesson create/update/delete/reorder 는 lecture 강의만', () => {
  beforeEach(() => {
    lessons['les-lec'] = { courseId: 'lec-pub' };
    lessons['les-kpa'] = { courseId: 'kpa-old' };
    lessons['les-null'] = { courseId: 'null-old' };
  });

  it('소유 강사가 legacy(kpa-society) course 에 lesson 을 만들 수 없다 → 404 · write 0', async () => {
    const res = makeRes();
    await LessonController.createLesson(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { courseId: 'kpa-old' }, body: { title: 'x' } }), res);
    expect(res.statusCode).toBe(404);
    expect(lessonWrites).toEqual([]);
  });
  it('lecture:admin 도 legacy course 의 lesson 을 update/delete 할 수 없다 → 404 · write 0', async () => {
    let res = makeRes();
    await LessonController.updateLesson(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, params: { id: 'les-kpa' }, body: { title: 'y' } }), res);
    expect(res.statusCode).toBe(404);
    res = makeRes();
    await LessonController.deleteLesson(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, params: { id: 'les-null' } }), res);
    expect(res.statusCode).toBe(404);
    expect(lessonWrites).toEqual([]);
  });
  it('reorder 도 legacy course 는 404', async () => {
    const res = makeRes();
    await LessonController.reorderLessons(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { courseId: 'null-old' }, body: { lessonIds: ['les-null'] } }), res);
    expect(res.statusCode).toBe(404);
    expect(lessonWrites).toEqual([]);
  });
  it('lecture course: 소유자 200 · 타 강사 403 · lecture:admin 200', async () => {
    let res = makeRes();
    await LessonController.updateLesson(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'les-lec' }, body: { title: 'ok' } }), res);
    expect(res.statusCode).toBe(200);
    res = makeRes();
    await LessonController.updateLesson(makeReq({ id: 'other', roles: ['lecture:instructor'], member: true, params: { id: 'les-lec' }, body: { title: 'no' } }), res);
    expect(res.statusCode).toBe(403);
    res = makeRes();
    await LessonController.deleteLesson(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, params: { id: 'les-lec' } }), res);
    expect(res.statusCode).toBe(200);
    expect(lessonWrites).toEqual([['update', 'les-lec'], ['delete', 'les-lec']]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 재검토 P1-7 certificate issue — courseId 는 lecture scope 만
// ─────────────────────────────────────────────────────────────────────────────
describe('재검토 P1-7 POST /certificates/issue 는 lecture 강의만', () => {
  it('legacy courseId(kpa-society / null / 미존재) → 404 · 발급 0', async () => {
    for (const courseId of ['kpa-old', 'null-old', 'ghost']) {
      const res = makeRes();
      await CertificateController.issueCertificate(makeReq({ id: 'op', roles: ['lecture:operator'], member: true, body: { userId: 'u', courseId } }), res);
      expect(res.statusCode).toBe(404);
    }
    expect(certIssues).toEqual([]);
  });
  it('courseId 누락 → 404 · 발급 0', async () => {
    const res = makeRes();
    await CertificateController.issueCertificate(makeReq({ id: 'op', roles: ['lecture:operator'], member: true, body: { userId: 'u' } }), res);
    expect(res.statusCode).toBe(404);
    expect(certIssues).toEqual([]);
  });
  it('lecture courseId → 발급 경로 진입 (201)', async () => {
    const res = makeRes();
    await CertificateController.issueCertificate(makeReq({ id: 'op', roles: ['lecture:operator'], member: true, body: { userId: 'u', courseId: 'lec-pub' } }), res);
    expect(res.statusCode).toBe(201);
    expect(certIssues).toEqual(['lec-pub']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3차 P1-8 status allowlist — 강사 PATCH 로 published 자가 승인 금지
// ─────────────────────────────────────────────────────────────────────────────
describe('3차 P1-8 PATCH /courses/:id 는 status 를 바꾸지 않는다', () => {
  it('pickUpdatableCourseFields 는 status 를 버린다', () => {
    expect(pickUpdatableCourseFields({ title: 't', status: 'published' } as any)).toEqual({ title: 't' });
    expect(UPDATABLE_COURSE_FIELDS).not.toContain('status');
  });
  it('소유 강사가 PATCH { status: published } → 저장된 status 는 draft 그대로', async () => {
    const res = makeRes();
    await CourseController.updateCourse(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'lec-pub' }, body: { title: 'renamed', status: 'published' } }), res);
    expect(res.statusCode).toBe(200);
    expect(courses['lec-pub'].status).toBe('draft');
    expect(courses['lec-pub'].title).toBe('renamed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3차 P1-9 certificate update/revoke/renew — lecture course 의 certificate 만
// ─────────────────────────────────────────────────────────────────────────────
describe('3차 P1-9 certificate update/revoke/renew 는 lecture 강의 수료증만', () => {
  beforeEach(() => {
    certificates['c-lec'] = { userId: 'u', courseId: 'lec-pub' };
    certificates['c-kpa'] = { userId: 'u', courseId: 'kpa-old' };
    certificates['c-null'] = { userId: 'u', courseId: 'null-old' };
  });
  const op = (extra: any) => makeReq({ id: 'op', roles: ['lecture:operator'], member: true, ...extra });

  it('legacy(kpa-society / null) · 미존재 certificate → 404 · write 0', async () => {
    for (const id of ['c-kpa', 'c-null', 'ghost']) {
      let res = makeRes();
      await CertificateController.updateCertificate(op({ params: { id }, body: { issuerName: 'x' } }), res);
      expect(res.statusCode).toBe(404);
      res = makeRes();
      await CertificateController.revokeCertificate(op({ params: { id } }), res);
      expect(res.statusCode).toBe(404);
      res = makeRes();
      await CertificateController.renewCertificate(op({ params: { id }, body: { months: 12 } }), res);
      expect(res.statusCode).toBe(404);
    }
    expect(certMutations).toEqual([]);
  });
  it('lecture certificate → update/revoke/renew 200', async () => {
    let res = makeRes();
    await CertificateController.updateCertificate(op({ params: { id: 'c-lec' }, body: { issuerName: 'x' } }), res);
    expect(res.statusCode).toBe(200);
    res = makeRes();
    await CertificateController.revokeCertificate(op({ params: { id: 'c-lec' } }), res);
    expect(res.statusCode).toBe(200);
    res = makeRes();
    await CertificateController.renewCertificate(op({ params: { id: 'c-lec' }, body: { months: 6 } }), res);
    expect(res.statusCode).toBe(200);
    expect(certMutations).toEqual([['update', 'c-lec'], ['revoke', 'c-lec'], ['renew', 'c-lec']]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3차 P1-10 assignment upsert — scope 가 admin override 보다 먼저
// ─────────────────────────────────────────────────────────────────────────────
describe('3차 P1-10 POST /assignments 는 lecture 강의의 lesson 만', () => {
  beforeEach(() => {
    lessons['les-lec'] = { courseId: 'lec-pub' };
    lessons['les-kpa'] = { courseId: 'kpa-old' };
    lessons['les-null'] = { courseId: 'null-old' };
  });
  it('lecture:admin 도 legacy lesson 에 assignment 를 만들 수 없다 → 404 · write 0', async () => {
    for (const lessonId of ['les-kpa', 'les-null', 'ghost']) {
      const res = makeRes();
      await AssignmentController.upsertAssignment(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, body: { lessonId, instructions: 'x' } }), res);
      expect(res.statusCode).toBe(404);
    }
    expect(assignmentWrites).toEqual([]);
  });
  it('lecture lesson: 소유자 200 · 타 강사 403 · admin 200', async () => {
    let res = makeRes();
    await AssignmentController.upsertAssignment(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: { lessonId: 'les-lec' } }), res);
    expect(res.statusCode).toBe(200);
    res = makeRes();
    await AssignmentController.upsertAssignment(makeReq({ id: 'other', roles: ['lecture:instructor'], member: true, body: { lessonId: 'les-lec' } }), res);
    expect(res.statusCode).toBe(403);
    res = makeRes();
    await AssignmentController.upsertAssignment(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, body: { lessonId: 'les-lec' } }), res);
    expect(res.statusCode).toBe(200);
    expect(assignmentWrites).toEqual(['les-lec', 'les-lec']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3차 P1-11 enrollment approve/reject — lecture course 의 수강만
// ─────────────────────────────────────────────────────────────────────────────
describe('3차 P1-11 POST /instructor/enrollments/:id/approve|reject 는 lecture 강의만', () => {
  beforeEach(() => {
    enrollments['en-lec'] = { id: 'en-lec', courseId: 'lec-pub', userId: 'stu', status: 'pending' };
    enrollments['en-kpa'] = { id: 'en-kpa', courseId: 'kpa-old', userId: 'stu', status: 'pending' };
    enrollments['en-null'] = { id: 'en-null', courseId: 'null-old', userId: 'stu', status: 'pending' };
  });
  it('legacy 수강은 소유 강사·lecture:admin 모두 404 · save 0', async () => {
    for (const id of ['en-kpa', 'en-null']) {
      for (const who of [{ id: 'inst', roles: ['lecture:instructor'] }, { id: 'adm', roles: ['lecture:admin'] }]) {
        let res = makeRes();
        await InstructorController.approveEnrollment(makeReq({ ...who, member: true, params: { id } }), res);
        expect(res.statusCode).toBe(404);
        res = makeRes();
        await InstructorController.rejectEnrollment(makeReq({ ...who, member: true, params: { id }, body: { reason: 'r' } }), res);
        expect(res.statusCode).toBe(404);
      }
    }
    expect(enrollmentSaves).toEqual([]);
  });
  it('lecture 수강: 타 강사 403 · 소유자 approve 200 (저장 1)', async () => {
    let res = makeRes();
    await InstructorController.approveEnrollment(makeReq({ id: 'other', roles: ['lecture:instructor'], member: true, params: { id: 'en-lec' } }), res);
    expect(res.statusCode).toBe(403);
    res = makeRes();
    await InstructorController.approveEnrollment(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'en-lec' } }), res);
    expect(res.statusCode).toBe(200);
    expect(enrollmentSaves).toEqual(['en-lec']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3차 P1-12 instructor submission 조회 — admin override 이전에 scope
// ─────────────────────────────────────────────────────────────────────────────
describe('3차 P1-12 GET /instructor/lessons/:lessonId/submissions 는 lecture 강의만', () => {
  beforeEach(() => {
    lessons['les-lec'] = { courseId: 'lec-pub' };
    lessons['les-kpa'] = { courseId: 'kpa-old' };
  });
  it('lecture:admin 도 legacy lesson 의 submission 을 볼 수 없다 → 404', async () => {
    const res = makeRes();
    await InstructorController.listLessonSubmissions(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, params: { lessonId: 'les-kpa' } }), res);
    expect(res.statusCode).toBe(404);
  });
  it('lecture lesson: 타 강사 403 · admin 200', async () => {
    let res = makeRes();
    await InstructorController.listLessonSubmissions(makeReq({ id: 'other', roles: ['lecture:instructor'], member: true, params: { lessonId: 'les-lec' } }), res);
    expect(res.statusCode).toBe(403);
    res = makeRes();
    await InstructorController.listLessonSubmissions(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, params: { lessonId: 'les-lec' } }), res);
    expect(res.statusCode).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 정적 계약 — 프런트 편집기 경로 / 라우트 등록
// ─────────────────────────────────────────────────────────────────────────────
import * as fs from 'fs';
import * as path from 'path';
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

describe('정적 계약', () => {
  it('web-lecture instructorApi.getQuizForLesson 은 강사 전용 경로를 쓴다', () => {
    const src = read('services/web-lecture/src/api/lecture.ts');
    const instructorBlock = src.slice(src.indexOf('export const instructorApi'), src.indexOf('export const operatorApi'));
    expect(instructorBlock).toContain('/lms/instructor/lessons/${lessonId}/quiz');
    expect(instructorBlock).not.toContain('`/lms/lessons/${lessonId}/quiz`');
  });
  it('라우트: 강사 quiz 읽기는 requireInstructor · learner 읽기는 그대로', () => {
    const routes = read('apps/api-server/src/modules/lms/routes/lms.routes.ts');
    expect(routes).toMatch(/router\.get\('\/instructor\/lessons\/:lessonId\/quiz', requireAuth, requireInstructor, asyncHandler\(QuizController\.getQuizForLessonAsInstructor\)\)/);
    expect(routes).toMatch(/router\.get\('\/lessons\/:lessonId\/quiz', requireAuth, asyncHandler\(QuizController\.getQuizForLesson\)\)/);
    // 대상 강의 판정은 lecture-access 의 단일 helper 를 공유한다 (routes 로컬 재정의 0)
    expect(routes).not.toMatch(/function isLectureCourse/);
    expect(routes).toContain('isLectureCourse } from \'../middleware/lecture-access.js\'');
  });
  it('web-lecture 어댑터는 서버 영속 필드 progressPercentage 를 읽는다 (재검토 P2-1)', () => {
    const adapter = read('services/web-lecture/src/lib/lmsViewAdapter.ts');
    expect(adapter).toContain('progress: e.progressPercentage ?? e.progress ?? 0,');
    // 3차 P2-2: 목록 화면도 영속 필드를 직접 읽는다
    const page = read('services/web-lecture/src/pages/learner/MyEnrollmentsPage.tsx');
    expect(page).toContain('percent={e.progressPercentage ?? e.progress ?? 0}');
    const svc = read('apps/api-server/src/modules/lms/services/EnrollmentService.ts');
    expect(svc).toContain('progressPercentage');
  });
  it('CourseService.updateCourse 는 raw body 를 Object.assign 하지 않는다 (allowlist 경유)', () => {
    const svc = read('apps/api-server/src/modules/lms/services/CourseService.ts');
    expect(svc).toContain('const data = pickUpdatableCourseFields(rawData);');
    expect(svc).not.toContain("'serviceKey'");
  });
  it('4차 P1-14: 강사 편집기는 문항 id 를 버리지 않는다', () => {
    const page = read('services/web-lecture/src/pages/instructor/InstructorCourseEditPage.tsx');
    expect(page).not.toContain('q.questions.map(({ id: _id, ...rest }) => rest)');
    expect(page).toContain('setQuestions(q.questions.map((qq) => ({ ...qq })));');
    const api = read('services/web-lecture/src/api/lecture.ts');
    // 새 문항은 id 없이(서버 발급), 기존 문항은 id 를 실어 보낼 수 있어야 한다
    expect(api).toMatch(/export interface QuizQuestionDraft \{[\s\S]*?id\?: string;/);
  });
  it('6차 P1-16: 퀴즈 저장은 문항별 정답을 요구하고, 보기 편집 시 정답을 동기화하며, 로드 실패를 미존재로 오인하지 않는다', () => {
    const page = read('services/web-lecture/src/pages/instructor/InstructorCourseEditPage.tsx');
    // 정답 없는 문항 / 보기에 없는 정답은 저장 차단 (채점 불능 · 합격 불가 방지)
    expect(page).toContain('const invalid = cleaned.findIndex((q) => {');
    expect(page).toContain('번 문항의 정답을 선택(입력)하세요.');
    expect(page).toContain("q.type !== 'text' && answers.some((a) => !q.options.includes(a))");
    // 보기 rename/삭제 시 answer 동기화
    expect(page).toContain('if (patch.options && next.type !== \'text\') {');
    expect(page).toContain('const remap = (a: string): string | null => {');
    // 404 만 "새로 만들기" — 그 외 실패는 저장 차단(중복 퀴즈 생성 방지)
    expect(page).toContain('if (errorStatus(err) !== 404) {');
    expect(page).toContain('disabled={saving || Boolean(loadError)}');
    expect(page).not.toContain('} catch { /* 없으면 새로 만든다 */ }');
    const api = read('services/web-lecture/src/api/lecture.ts');
    expect(api).toContain('export function errorStatus(err: unknown): number | undefined');
  });
  it('4차 P1-15: 평가 제출 라우트는 enrollment 정책을 통과해야 한다', () => {
    const routes = read('apps/api-server/src/modules/lms/routes/lms.routes.ts');
    expect(routes).toMatch(/router\.post\('\/quizzes\/:quizId\/submit', requireAuth, requireLectureLearner, requireEnrollment\(\{ checkQuiz: true \}\)/);
    expect(routes).toMatch(/router\.post\('\/assignments\/:assignmentId\/submit', requireAuth, requireLectureLearner, requireEnrollment\(\{ checkAssignment: true \}\)/);
    const mw = read('apps/api-server/src/modules/lms/middleware/requireEnrollment.ts');
    // quiz/assignment → course 역추적은 parameter binding 만 사용한다 (Guard Rule 2)
    expect(mw).toContain('checkQuiz?: boolean;');
    expect(mw).toContain('checkAssignment?: boolean;');
    expect(mw).toContain('WHERE q.id = $1');
    expect(mw).toContain('WHERE a.id = $1');
  });
});
