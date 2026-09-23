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
 *  7차 P1-17 학습자 노출 상태 : GET /courses · /courses/:id 는 PUBLISHED 만 (초안은 소유 강사·운영자에게만 · 그 외 404)
 *  7차 P2-7  생성 명의       : createCourse 의 instructorId 는 서버가 요청자로 고정한다
 *  8차 P2-9  초안 예외 경계  : 게시 전 강의 예외는 role·소유권 + active Lecture membership 을 함께 요구한다
 *  9차 P1-18 공개+승인 강의  : enrollment 요구는 visibility 와 독립 — PUBLIC 이어도 isPaid·requiresApproval 이면 승인 필요
 *  9차 P2-10 평가 소유자 예외: requireEnrollment 의 소유자 면제도 현재 role + active membership 을 요구한다
 *  9차 P2-11 초안 소유자 축  : 소유권 + 현재 `lecture:instructor` 가 함께 있어야 초안을 연다
 *  7차 P2-8  평가 조회 정책  : lesson quiz/assignment 조회에도 visibility·membership·enrollment 정책 (소유 강사 예외)
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
    getRepository: (entity: any) => {
      const name = typeof entity === 'string' ? entity : entity?.name;
      if (name === 'Enrollment') return enrollmentRepo;
      if (name === 'Lesson') return lessonEntityRepo;   // 7차 P2-8: requireEnrollment lessonId → courseId
      if (name === 'Course') return courseEntityRepo;   // 7차 P2-8: requireEnrollment course 정책 로드
      return {};
    },
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
import { LessonService, pickUpdatableLessonFields } from '../modules/lms/services/LessonService.js';
import { requireLectureOperator } from '../modules/lms/middleware/lecture-access.js';
import { CertificateController } from '../modules/lms/controllers/CertificateController.js';
import { CertificateService, pickUpdatableCertificateFields } from '../modules/lms/services/CertificateService.js';
import { AssignmentController } from '../modules/lms/controllers/AssignmentController.js';
import { InstructorController } from '../modules/lms/controllers/InstructorController.js';
import { requireEnrollment } from '../modules/lms/middleware/requireEnrollment.js';

const enrollments: Record<string, { id: string; courseId: string; userId: string; status: string }> = {};
let enrollmentSaves: string[] = [];
const enrollmentRepo = {
  findOne: async ({ where }: any) => {
    const e = enrollments[where.id];
    return e ? { ...e, course: courses[e.courseId] ? { ...courses[e.courseId] } : null } : null;
  },
  save: async (e: any) => { enrollmentSaves.push(e.id); return e; },
};
// 7차 P2-8: requireEnrollment 가 쓰는 TypeORM repository 2종 (in-memory)
const lessonEntityRepo: any = {
  findOne: async ({ where }: any) => (lessons[where.id] ? { id: where.id, courseId: lessons[where.id].courseId } : null),
};
const courseEntityRepo: any = {
  findOne: async ({ where }: any) => (courses[where.id] ? { ...courses[where.id] } : null),
};
let assignmentWrites: string[] = [];
const assignmentSvc: any = {
  upsertAssignment: async (d: any) => { assignmentWrites.push(d.lessonId); return { id: 'as', ...d }; },
  listSubmissionsForLesson: async () => [],
  // 11차 P2: 운영자 검토 화면은 과제 "존재 여부"만 읽는다 (write 0)
  getAssignmentByLesson: async (lessonId: string) => (lessonId === 'les-pub' ? { id: 'as-1', lessonId } : null),
};

type CourseRow = { id: string; serviceKey: string | null; visibility: string; instructorId: string; status: string; title: string; isPaid?: boolean; tags?: string[] };
const courses: Record<string, CourseRow> = {};
const quizzes: Record<string, any> = {};

function makeReq(opts: { id?: string; roles?: string[]; member?: boolean; params?: any; body?: any; query?: any; path?: string } = {}): any {
  // 7차 P1-17: listCourses 는 학습자 목록(/courses)과 운영 목록(/operator/courses)을 path 로 구분한다.
  const req: any = { params: opts.params ?? {}, body: opts.body ?? {}, query: opts.query ?? {}, path: opts.path ?? '/courses' };
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
/**
 * 7차 P2-8 · 9차 P1-18/P2-10 이 공유하는 requireEnrollment 실행기.
 * describe 마다 같은 래퍼를 복제하지 않는다.
 */
async function runEnrollment(req: any, options: any = { checkLesson: true }) {
  const res = makeRes();
  let passed = false;
  await requireEnrollment(options)(req, res, (() => { passed = true; }) as any);
  return { res, passed };
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
  courses['lec-pub'] = { id: 'lec-pub', serviceKey: 'lecture', visibility: 'public', instructorId: 'inst', status: 'published', title: 'L public', tags: ['a'] };
  courses['lec-mem'] = { id: 'lec-mem', serviceKey: 'lecture', visibility: 'members', instructorId: 'inst', status: 'published', title: 'L members', tags: ['a'] };
  // 7차 P1-17: 게시 전 강의 — 소유 강사·운영자 외에는 존재를 드러내지 않는다
  courses['lec-draft'] = { id: 'lec-draft', serviceKey: 'lecture', visibility: 'public', instructorId: 'inst', status: 'draft', title: 'L draft', tags: ['a'] };
  // 7차 P2-8 · 9차 P1-18/P2-10 공용 평가 정책 fixture
  courses['lec-paid'] = { id: 'lec-paid', serviceKey: 'lecture', visibility: 'members', instructorId: 'inst', status: 'published', title: 'paid', isPaid: true };
  courses['lec-pub-approval'] = { id: 'lec-pub-approval', serviceKey: 'lecture', visibility: 'public', instructorId: 'inst', status: 'published', title: 'pub approval', requiresApproval: true };
  courses['lec-pub-paid'] = { id: 'lec-pub-paid', serviceKey: 'lecture', visibility: 'public', instructorId: 'inst', status: 'published', title: 'pub paid', isPaid: true };
  Object.assign(lessons, { 'les-paid': { courseId: 'lec-paid' }, 'les-kpa': { courseId: 'kpa-old' }, 'les-pub': { courseId: 'lec-pub' }, 'les-pub-approval': { courseId: 'lec-pub-approval' }, 'les-pub-paid': { courseId: 'lec-pub-paid' } });
  courses['kpa-old'] = { id: 'kpa-old', serviceKey: 'kpa-society', visibility: 'members', instructorId: 'inst', status: 'pending_review', title: 'legacy', tags: ['a'] };
  courses['null-old'] = { id: 'null-old', serviceKey: null, visibility: 'public', instructorId: 'inst', status: 'draft', title: 'legacy null', tags: ['a'] };

  // CourseService: repository 를 in-memory 로 대체 (updateCourse 는 실제 코드 경로 실행)
  const cs: any = CourseService.getInstance();
  cs.courseRepository = {
    create: (d: any) => ({ id: d.id ?? 'new-course', ...d }),
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
    await CourseController.updateCourse(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'lec-draft' }, body: { title: 'renamed', status: 'published' } }), res);
    expect(res.statusCode).toBe(200);
    expect(courses['lec-draft'].status).toBe('draft');
    expect(courses['lec-draft'].title).toBe('renamed');
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

// ─────────────────────────────────────────────────────────────────────────────
// 7차 P1-17 학습자 노출 상태 / P2-7 생성 명의 / P2-8 평가 조회 정책
// ─────────────────────────────────────────────────────────────────────────────
describe('7차 P1-17 학습자 목록·상세는 게시된 강의만', () => {
  it('GET /courses · 비로그인이 status=draft 를 보내도 서버가 published 로 고정', async () => {
    await CourseController.listCourses(makeReq({ query: { status: 'draft' } }), makeRes());
    expect(listFilters[0].status).toBe('published');
  });
  it('GET /courses · active membership 학습자도 published 고정', async () => {
    await CourseController.listCourses(makeReq({ id: 'u-mem', member: true, query: { status: 'pending_review' } }), makeRes());
    expect(listFilters[0].status).toBe('published');
  });
  it('GET /operator/courses · lecture:operator → 클라이언트 status 유지 (운영 목록은 별도 경로)', async () => {
    await CourseController.listCourses(makeReq({ id: 'op', roles: ['lecture:operator'], member: true, path: '/operator/courses', query: { status: 'pending_review' } }), makeRes());
    expect(listFilters[0].status).toBe('pending_review');
  });
  it('운영자라도 학습자 경로(/courses)로 오면 published 고정', async () => {
    await CourseController.listCourses(makeReq({ id: 'op', roles: ['lecture:operator'], member: true, query: { status: 'draft' } }), makeRes());
    expect(listFilters[0].status).toBe('published');
  });
  it('GET /courses/:id · 비로그인 · 초안 → 404 (제목 비노출)', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ params: { id: 'lec-draft' } }), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('L draft');
  });
  it('GET /courses/:id · 다른 회원(membership 있음) · 초안 → 404', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'u-mem', member: true, params: { id: 'lec-draft' } }), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('L draft');
  });
  it('GET /courses/:id · 소유 강사 → 200 (편집 화면은 같은 경로를 쓴다)', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'lec-draft' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.course.title).toBe('L draft');
  });
  it('GET /courses/:id · lecture:operator → 200 · 게시 강의는 종전대로 200', async () => {
    const op = makeRes();
    await CourseController.getCourse(makeReq({ id: 'op', roles: ['lecture:operator'], member: true, params: { id: 'lec-draft' } }), op);
    expect(op.statusCode).toBe(200);
    const pub = makeRes();
    await CourseController.getCourse(makeReq({ params: { id: 'lec-pub' } }), pub);
    expect(pub.statusCode).toBe(200);
  });
});

describe('8차 P2-9 게시 전 강의 예외는 active Lecture membership 을 함께 요구한다', () => {
  it('membership 없는 소유 강사(role 만 남은 상태) → 자기 초안도 404', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'inst', roles: ['lecture:instructor'], params: { id: 'lec-draft' } }), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('L draft');
  });
  it('membership 없는 stale lecture:operator → 404', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'op', roles: ['lecture:operator'], params: { id: 'lec-draft' } }), res);
    expect(res.statusCode).toBe(404);
  });
  it('membership 이 inactive 인 소유 강사 → 404', async () => {
    const req = makeReq({ id: 'inst', roles: ['lecture:instructor'], params: { id: 'lec-draft' } });
    req.user.memberships = [{ serviceKey: 'lecture', status: 'suspended' }];
    memberships.push({ user_id: 'inst', service_key: 'lecture', status: 'suspended' });
    const res = makeRes();
    await CourseController.getCourse(req, res);
    expect(res.statusCode).toBe(404);
  });
  it('platform:super_admin break-glass 는 membership 없이도 200', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'sa', roles: ['platform:super_admin'], params: { id: 'lec-draft' } }), res);
    expect(res.statusCode).toBe(200);
  });
});

describe('9차 P2-11 초안 열람의 소유자 축은 소유권 + 현재 lecture:instructor', () => {
  it('membership 은 active 이지만 강사 role 이 회수된 소유자 → 자기 초안 404', async () => {
    const res = makeRes();
    await CourseController.getCourse(makeReq({ id: 'inst', roles: [], member: true, params: { id: 'lec-draft' } }), res);
    expect(res.statusCode).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('L draft');
  });
});

describe('9차 P1-18 유료·승인 강의의 enrollment 요구는 visibility 와 독립이다', () => {
  const run = (req: any) => runEnrollment(req);
  it('공개 + 승인 필요 강의 · 승인 enrollment 없음 → 403 APPROVAL_REQUIRED (membership 은 묻지 않는다)', async () => {
    const { res, passed } = await run(makeReq({ id: 'u-nomember', params: { lessonId: 'les-pub-approval' } }));
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('APPROVAL_REQUIRED');
  });
  it('공개 + 유료 강의 · enrollment 없음 → 403 ENROLLMENT_REQUIRED', async () => {
    const { res, passed } = await run(makeReq({ id: 'u-mem', member: true, params: { lessonId: 'les-pub-paid' } }));
    expect(passed).toBe(false);
    expect(res.body.code).toBe('ENROLLMENT_REQUIRED');
  });
  it('공개 + 무료·승인불필요 강의는 종전대로 통과 (membership 도 불요)', async () => {
    expect((await run(makeReq({ id: 'u-nomember', params: { lessonId: 'les-pub' } }))).passed).toBe(true);
  });
});

describe('9차 P2-10 평가 조회의 소유자 면제도 현재 role + active membership 을 요구한다', () => {
  const run = (req: any) => runEnrollment(req, { checkLesson: true, allowCourseOwner: true });
  it('강사 role 이 회수된 소유자(membership active) → 면제 없음 · 403 ENROLLMENT_REQUIRED', async () => {
    const { res, passed } = await run(makeReq({ id: 'inst', roles: [], member: true, params: { lessonId: 'les-paid' } }));
    expect(passed).toBe(false);
    expect(res.body.code).toBe('ENROLLMENT_REQUIRED');
  });
  it('membership 이 없는 소유 강사 → 면제 없음 · 403 MEMBERSHIP_NOT_FOUND', async () => {
    const { res, passed } = await run(makeReq({ id: 'inst', roles: ['lecture:instructor'], params: { lessonId: 'les-paid' } }));
    expect(passed).toBe(false);
    expect(res.body.code).toBe('MEMBERSHIP_NOT_FOUND');
  });
  it('membership 없는 stale lecture:admin → 면제 없음', async () => {
    expect((await run(makeReq({ id: 'adm', roles: ['lecture:admin'], params: { lessonId: 'les-paid' } }))).passed).toBe(false);
  });
  it('platform:super_admin break-glass 는 통과', async () => {
    expect((await run(makeReq({ id: 'sa', roles: ['platform:super_admin'], params: { lessonId: 'les-paid' } }))).passed).toBe(true);
  });
});

describe('7차 P2-7 createCourse 의 instructorId 는 서버가 요청자로 고정한다', () => {
  it('body 의 instructorId(타인) 는 무시된다 · serviceKey 도 lecture 고정', async () => {
    const res = makeRes();
    await CourseController.createCourse(
      makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, body: { title: 'new', tags: ['a'], instructorId: 'victim', serviceKey: 'kpa-society' } }),
      res,
    );
    expect(res.statusCode).toBe(201);
    expect(savedCourse.instructorId).toBe('inst');
    expect(savedCourse.serviceKey).toBe('lecture');
    expect(savedCourse.status).toBe('draft');
  });
});

describe('7차 P2-8 lesson quiz/assignment 조회에도 강의 접근 정책', () => {
  const run = (req: any) => runEnrollment(req, { checkLesson: true, allowCourseOwner: true });
  it('lessonId 파라미터(:lessonId)로도 course 를 역추적한다 — membership 없는 회원 → 403', async () => {
    const { res, passed } = await run(makeReq({ id: 'u-nomember', params: { lessonId: 'les-paid' } }));
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('MEMBERSHIP_NOT_FOUND');
  });
  it('membership 은 있으나 유료 강의에 등록하지 않은 회원 → 403 ENROLLMENT_REQUIRED', async () => {
    const { res, passed } = await run(makeReq({ id: 'u-mem', member: true, params: { lessonId: 'les-paid' } }));
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('ENROLLMENT_REQUIRED');
  });
  it('소유 강사·lecture:admin 은 통과 (편집 화면의 과제 조회가 막히지 않는다)', async () => {
    expect((await run(makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { lessonId: 'les-paid' } }))).passed).toBe(true);
    expect((await run(makeReq({ id: 'adm', roles: ['lecture:admin'], member: true, params: { lessonId: 'les-paid' } }))).passed).toBe(true);
  });
  it('legacy(kpa-society) lesson 은 소유 강사에게도 404 (scope 가 먼저)', async () => {
    const { res, passed } = await run(makeReq({ id: 'inst', roles: ['lecture:admin'], member: true, params: { lessonId: 'les-kpa' } }));
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(404);
  });
  it('public 강의 lesson 은 종전대로 통과', async () => {
    expect((await run(makeReq({ id: 'u-nomember', params: { lessonId: 'les-pub' } }))).passed).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 11차 (Codex 8~10차 응답) — allowlist · 운영자 검토 · 초안 비노출
// ─────────────────────────────────────────────────────────────────────────────
describe('11차 P1-31 lesson 수정은 allowlist 밖 필드를 반영하지 않는다', () => {
  it('courseId · id 는 버려지고 지원 필드만 남는다', () => {
    const picked: any = pickUpdatableLessonFields({
      title: 'new', courseId: 'lec-mem', id: 'les-x', isPublished: true, instructorId: 'other',
    });
    expect(picked).toEqual({ title: 'new', isPublished: true });
    expect('courseId' in picked).toBe(false);
  });
  it('빈 입력·null 도 안전하다', () => {
    expect(pickUpdatableLessonFields(null)).toEqual({});
    expect(pickUpdatableLessonFields({ courseId: 'x' })).toEqual({});
  });
  it('LessonService.updateLesson 은 raw 입력을 Object.assign 하지 않는다', () => {
    const svc = read('apps/api-server/src/modules/lms/services/LessonService.ts');
    expect(svc).toContain('const data = pickUpdatableLessonFields(input);');
    expect(svc).toContain('async updateLesson(id: string, input: UpdateLessonRequest)');
  });
});

describe('11차 P1-32 certificate 수정은 지원 5필드만', () => {
  it('courseId · userId · id 는 버려진다', () => {
    const picked: any = pickUpdatableCertificateFields({
      certificateUrl: 'u', isValid: false, courseId: 'lec-mem', userId: 'other', id: 'cert-x',
    });
    expect(picked).toEqual({ certificateUrl: 'u', isValid: false });
  });
  it('CertificateService.updateCertificate 는 allowlist 를 거친다', () => {
    const svc = read('apps/api-server/src/modules/lms/services/CertificateService.ts');
    expect(svc).toContain('const data = pickUpdatableCertificateFields(input);');
  });
});

describe('11차 P2-33 운영자 검토 화면 — 읽기 전용 · enrollment 0', () => {
  beforeEach(() => {
    const ls: any = LessonService.getInstance();
    ls.listLessonsByCourse = jest.fn(async (courseId: string) => ({
      lessons: courseId === 'lec-pub'
        ? [{ id: 'les-pub', courseId, title: 'L1', type: 'video', order: 1, isPublished: false, isFree: false, content: { html: 'x' } }]
        : [],
      total: courseId === 'lec-pub' ? 1 : 0,
    }));
  });

  const call = async (courseId: string) => {
    const req = makeReq({ id: 'op', roles: ['lecture:operator'], member: true, params: { courseId } });
    const res = makeRes();
    await CourseController.operatorCourseReview(req, res);
    return res;
  };

  it('lecture 강의는 커리큘럼·평가 존재 여부를 읽기 전용으로 돌려준다', async () => {
    const res = await call('lec-pub');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.readOnly).toBe(true);
    expect(res.body.data.course.id).toBe('lec-pub');
    expect(res.body.data.curriculum).toHaveLength(1);
    const l = res.body.data.curriculum[0];
    expect(l.content).toEqual({ html: 'x' });       // 내용 확인 가능
    expect(l.isPublished).toBe(false);              // 초안도 검토자에게는 보인다
    expect(l.hasAssignment).toBe(true);             // 존재 여부만
    expect(l.hasQuiz).toBe(false);
    // 검토 자체로 수강 등록·write 가 일어나지 않는다
    expect(enrollmentSaves).toEqual([]);
    expect(lessonWrites).toEqual([]);
    expect(assignmentWrites).toEqual([]);
    expect(certMutations).toEqual([]);
  });

  it('legacy(KPA) 강의는 non-disclosure 404', async () => {
    const res = await call('kpa-old');
    expect(res.statusCode).toBe(404);
  });

  it('serviceKey 가 NULL 인 강의도 404', async () => {
    const res = await call('null-old');
    expect(res.statusCode).toBe(404);
  });
});

describe('11차 P2-33 운영자 검토 권한 — role 만으로는 열리지 않는다', () => {
  const guard = async (opts: any) => {
    const req = makeReq(opts);
    const res = makeRes();
    let passed = false;
    await requireLectureOperator(req, res, (() => { passed = true; }) as any);
    return { res, passed };
  };

  it('operator + active membership → 통과', async () => {
    const { passed } = await guard({ id: 'op', roles: ['lecture:operator'], member: true });
    expect(passed).toBe(true);
  });
  it('lecture:admin + active membership → 통과 (operator ⊂ admin)', async () => {
    const { passed } = await guard({ id: 'ad', roles: ['lecture:admin'], member: true });
    expect(passed).toBe(true);
  });
  it('일반 학습자(membership 만) → 거부', async () => {
    const { passed, res } = await guard({ id: 'learner', roles: [], member: true });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });
  it('강사 role 만 → 거부 (instructor 는 운영자가 아니다)', async () => {
    const { passed, res } = await guard({ id: 'inst', roles: ['lecture:instructor'], member: true });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });
  it('operator role 인데 membership 이 없으면 → 거부', async () => {
    const { passed, res } = await guard({ id: 'op2', roles: ['lecture:operator'], member: false });
    expect(passed).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});

describe('11차 P2-34 미발행 lesson 은 learner 에게 보이지 않는다', () => {
  let listArgs: any[] = [];
  beforeEach(() => {
    listArgs = [];
    const ls: any = LessonService.getInstance();
    ls.listLessonsByCourse = jest.fn(async (courseId: string, filters: any) => {
      listArgs.push([courseId, filters]);
      return { lessons: [], total: 0 };
    });
    ls.getLesson = jest.fn(async (id: string) =>
      (lessons[id] ? { id, courseId: lessons[id].courseId, title: 't', isPublished: id !== 'les-draft' } : null));
    lessons['les-draft'] = { courseId: 'lec-pub' };
  });

  it('학습자 목록은 서버가 isPublished=true 로 고정한다 (query 위조 무시)', async () => {
    const req = makeReq({ id: 'learner', member: true, params: { courseId: 'lec-pub' }, query: { isPublished: 'false' } });
    await LessonController.listLessonsByCourse(req, makeRes());
    expect(listArgs[0][1].isPublished).toBe(true);
  });

  it('소유 강사는 초안을 포함해 본다', async () => {
    const req = makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { courseId: 'lec-pub' } });
    await LessonController.listLessonsByCourse(req, makeRes());
    expect(listArgs[0][1].isPublished).toBeUndefined();
  });

  it('lecture:admin 도 초안을 본다', async () => {
    const req = makeReq({ id: 'ad', roles: ['lecture:admin'], member: true, params: { courseId: 'lec-pub' } });
    await LessonController.listLessonsByCourse(req, makeRes());
    expect(listArgs[0][1].isPublished).toBeUndefined();
  });

  it('미발행 lesson 상세는 learner 에게 404', async () => {
    const req = makeReq({ id: 'learner', member: true, params: { id: 'les-draft' } });
    const res = makeRes();
    await LessonController.getLesson(req, res);
    expect(res.statusCode).toBe(404);
  });

  it('미발행 lesson 상세도 소유 강사에게는 열린다', async () => {
    const req = makeReq({ id: 'inst', roles: ['lecture:instructor'], member: true, params: { id: 'les-draft' } });
    const res = makeRes();
    await LessonController.getLesson(req, res);
    expect(res.statusCode).toBe(200);
  });
});

describe('정적 계약', () => {
  it('web-lecture instructorApi.getQuizForLesson 은 강사 전용 경로를 쓴다', () => {
    const src = read('services/web-lecture/src/api/lecture.ts');
    const instructorBlock = src.slice(src.indexOf('export const instructorApi'), src.indexOf('export const operatorApi'));
    expect(instructorBlock).toContain('/lms/instructor/lessons/${lessonId}/quiz');
    expect(instructorBlock).not.toContain('`/lms/lessons/${lessonId}/quiz`');
  });
  it('라우트: 강사 quiz 읽기는 requireInstructor · learner 읽기는 그대로', () => {
    const routes = read('apps/api-server/src/modules/lms/routes/lms.routes.ts');
    expect(routes).toMatch(/router\.get\('\/instructor\/lessons\/:lessonId\/quiz', requireAuth, apiLimiter, requireInstructor, asyncHandler\(QuizController\.getQuizForLessonAsInstructor\)\)/);
    // 7차 P2-8: learner 읽기에도 enrollment 정책이 붙었다 (controller 는 그대로)
    expect(routes).toMatch(/router\.get\('\/lessons\/:lessonId\/quiz', requireAuth, apiLimiter, requireEnrollment\(\{ checkLesson: true, allowCourseOwner: true \}\), asyncHandler\(QuizController\.getQuizForLesson\)\)/);
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
  it('7차 P2-8: 평가 조회 라우트도 requireEnrollment 를 거친다', () => {
    const routes = read('apps/api-server/src/modules/lms/routes/lms.routes.ts');
    expect(routes).toContain("router.get('/lessons/:lessonId/quiz', requireAuth, apiLimiter, requireEnrollment({ checkLesson: true, allowCourseOwner: true })");
    expect(routes).toContain("router.get('/lessons/:lessonId/assignment', requireAuth, apiLimiter, requireEnrollment({ checkLesson: true, allowCourseOwner: true })");
  });
  it('11차 P2-33: 운영자 검토 route 는 requireLectureOperator 를 거치고, 운영 목록은 검토 화면으로 연결된다', () => {
    const r = read('apps/api-server/src/modules/lms/routes/lms.routes.ts');
    expect(r).toContain("router.get('/operator/courses/:courseId/review', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(CourseController.operatorCourseReview))");
    const page = read('services/web-lecture/src/pages/operator/OperatorCoursesPage.tsx');
    expect(page).toContain('to={`/operator/courses/${c.id}/review`}');
    expect(page).not.toContain('coursePath(c.id)');   // learner 경로로 보내지 않는다
    const app = read('services/web-lecture/src/App.tsx');
    expect(app).toContain('path="/operator/courses/:courseId/review"');
    // 검토 화면은 편집 진입점을 두지 않는다
    const review = read('services/web-lecture/src/pages/operator/OperatorCourseReviewPage.tsx');
    expect(review).not.toContain('instructorApi');
    expect(review).not.toContain('/instructor/courses/');
  });
  it('11차 P2-35: PharmacyHub 가이드·KPA 홈 피드에 내부 강의 안내가 남아 있지 않다', () => {
    const ph = read('packages/shared-space-ui/src/guide/copy/pharmacy-hub.ts');
    expect(ph).not.toContain('교육 콘텐츠는 PharmacyHub 에 등록된 강의만 표시됩니다.');
    expect(ph).toContain('O4O 강의로 이동');
    const home = read('services/web-kpa-society/src/pages/HomeLatestPage.tsx');
    expect(home).not.toContain("{ key: 'course'");
    expect(home).not.toContain("label: '강의'");
  });
  it('4차 P1-15: 평가 제출 라우트는 enrollment 정책을 통과해야 한다', () => {
    const routes = read('apps/api-server/src/modules/lms/routes/lms.routes.ts');
    expect(routes).toMatch(/router\.post\('\/quizzes\/:quizId\/submit', requireAuth, apiLimiter, requireLectureLearner, requireEnrollment\(\{ checkQuiz: true \}\)/);
    expect(routes).toMatch(/router\.post\('\/assignments\/:assignmentId\/submit', requireAuth, apiLimiter, requireLectureLearner, requireEnrollment\(\{ checkAssignment: true \}\)/);
    const mw = read('apps/api-server/src/modules/lms/middleware/requireEnrollment.ts');
    // quiz/assignment → course 역추적은 parameter binding 만 사용한다 (Guard Rule 2)
    expect(mw).toContain('checkQuiz?: boolean;');
    expect(mw).toContain('checkAssignment?: boolean;');
    expect(mw).toContain('WHERE q.id = $1');
    expect(mw).toContain('WHERE a.id = $1');
  });
});
