/**
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2
 *
 * 종전(WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §15) 이 파일은
 * `isCourseAccessibleByOperator` 의 다중 서비스 운영자(kpa / cosmetics / pharmacy-hub) 판정을
 * 고정했다. Phase 2 에서 LMS runtime 의 Application Service 는 O4O 강의(lecture) 하나뿐이므로
 * 서비스 allowlist 자체가 사라졌다. 본 spec 은 그 은퇴를 정적으로 고정한다.
 *
 * 계약:
 *   - 운영자 경로 guard = requireLectureOperator (active lecture membership + lecture:operator|admin)
 *   - 운영 대상 = course.serviceKey === 'lecture' 만. 그 외(legacy NULL 포함)는 non-disclosure 404
 *   - kpa:* / cosmetics:* / pharmacy-hub:* / admin / super_admin 문자열 allowlist 0
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROUTES = readFileSync(join(__dirname, '../modules/lms/routes/lms.routes.ts'), 'utf-8');
// PR #225 merge-gate repair: isLectureCourse 는 lecture-access.ts 로 승격(CourseController 강사 write 경로와 공유)
const ACCESS = readFileSync(join(__dirname, '../modules/lms/middleware/lecture-access.ts'), 'utf-8');

describe('LMS operator route — Lecture 전용 (다중 서비스 allowlist 은퇴)', () => {
  it('서비스 allowlist 판정 함수와 KPA guard 가 남아 있지 않다', () => {
    expect(ROUTES).not.toContain('isCourseAccessibleByOperator');
    expect(ROUTES).not.toContain('requireLmsOperator');
    expect(ROUTES).not.toContain('requireKpaAdmin');
    expect(ROUTES).not.toContain('KPA_SCOPE_CONFIG');
    expect(ROUTES).not.toContain('PLATFORM_ADMIN_ROLES');
    expect(ROUTES).not.toContain("'cosmetics:admin'");
    expect(ROUTES).not.toContain("'pharmacy-hub:operator'");
    expect(ROUTES).not.toContain('SERVICE_SCOPE_VIOLATION');
  });

  it('운영 mutation 5종은 requireLectureOperator 로만 보호된다', () => {
    const lines = ROUTES.split('\n');
    for (const p of [
      "router.post('/operator/courses/:id/unpublish'",
      "router.post('/operator/courses/:id/approve'",
      "router.post('/operator/courses/:id/reject'",
      "router.post('/operator/courses/:id/archive'",
      "router.delete('/operator/courses/:id/hard'",
    ]) {
      const line = lines.find((l) => l.includes(p));
      expect(line).toBeDefined();
      expect(line).toContain('requireAuth, requireLectureOperator');
    }
  });

  it('운영 목록(GET /operator/courses)이 존재하며 requireLectureOperator 로 보호된다', () => {
    expect(ROUTES).toMatch(/router\.get\('\/operator\/courses',\s*requireAuth,\s*requireLectureOperator/);
  });

  it('운영 대상은 course.serviceKey === lecture 만이며, 그 외는 404 (403 아님)', () => {
    expect(ACCESS).toContain("export function isLectureCourse(courseServiceKey: string | null | undefined): boolean");
    expect(ACCESS).toContain('return courseServiceKey === SERVICE_KEYS.LECTURE;');
    expect(ROUTES).toContain("import { requireLectureLearner, requireLectureOperator, isLectureCourse } from '../middleware/lecture-access.js';");
    expect(ROUTES).not.toContain('function isLectureCourse(');
    const checks = ROUTES.match(/if \(!isLectureCourse\(course\.serviceKey\)\) \{ return res\.status\(404\)/g) ?? [];
    expect(checks.length).toBe(5);
  });

  it('generic LMS 라우터는 lecture 컨텍스트를 서버가 고정한다 (client serviceKey 미신뢰)', () => {
    expect(ROUTES).toContain('router.use(lmsContextMiddleware({ serviceCode: SERVICE_KEYS.LECTURE }));');
  });
});
