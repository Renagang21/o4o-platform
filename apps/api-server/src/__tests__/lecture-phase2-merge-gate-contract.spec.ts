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
    CourseStatus: { DRAFT: 'draft', PENDING_REVIEW: 'pending_review', PUBLISHED: 'published', REJECTED: 'rejected', ARCHIVED: 'archived' },
    ContentKind: { LECTURE: 'lecture', COURSE_MATERIAL: 'course_material' },
    CourseVisibility: { PUBLIC: 'public', MEMBERS: 'members' },
    CourseReusablePolicy: { RESTRICTED: 'restricted', PLATFORM: 'platform' },
    AttemptStatus: {}, LessonType: {}, ProgressStatus: {}, EnrollmentStatus: {},
  }),
  { virtual: true },
);
jest.mock('../database/connection.js', () => ({
  AppDataSource: {
    get isInitialized() { return true; },
    getRepository: () => ({}),
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

import { CourseController } from '../modules/lms/controllers/CourseController.js';
import { QuizController } from '../modules/lms/controllers/QuizController.js';
import { CourseService, pickUpdatableCourseFields } from '../modules/lms/services/CourseService.js';
import { QuizService } from '../modules/lms/services/QuizService.js';
import { LessonController } from '../modules/lms/controllers/LessonController.js';
import { LessonService } from '../modules/lms/services/LessonService.js';
import { CertificateController } from '../modules/lms/controllers/CertificateController.js';
import { CertificateService } from '../modules/lms/services/CertificateService.js';

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
});
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
    const svc = read('apps/api-server/src/modules/lms/services/EnrollmentService.ts');
    expect(svc).toContain('progressPercentage');
  });
  it('CourseService.updateCourse 는 raw body 를 Object.assign 하지 않는다 (allowlist 경유)', () => {
    const svc = read('apps/api-server/src/modules/lms/services/CourseService.ts');
    expect(svc).toContain('const data = pickUpdatableCourseFields(rawData);');
    expect(svc).not.toContain("'serviceKey'");
  });
});
