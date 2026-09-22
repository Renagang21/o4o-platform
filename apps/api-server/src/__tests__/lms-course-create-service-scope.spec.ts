/**
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §8 — course serviceKey 강제
 *
 * 종전(WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §10) 은 생성 시 소속 서비스를
 * "요청 scope → 생성자의 첫 active membership" 순으로 유추했다. Phase 2 에서 LMS runtime 의
 * Application Service 는 O4O 강의(lecture) 하나뿐이므로:
 *
 *   - 서버가 `course.serviceKey = 'lecture'` 로 고정한다.
 *   - 클라이언트가 보낸 serviceKey 는 신뢰하지 않는다 (덮어쓴다).
 *   - "첫 active membership" 유추(service_memberships SELECT) 는 제거한다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8');

describe('LMS course create — serviceKey 강제 (Lecture Phase 2 §8)', () => {
  const controller = read('apps/api-server/src/modules/lms/controllers/CourseController.ts');
  const create = controller.slice(
    controller.indexOf('static async createCourse'),
    controller.indexOf('static async getCourse'),
  );

  it('createCourse 는 serviceKey 를 SERVICE_KEYS.LECTURE 로 고정한다', () => {
    expect(create).toContain('data.serviceKey = SERVICE_KEYS.LECTURE;');
  });

  it('클라이언트 serviceKey / 요청 scope 로 소속을 결정하지 않는다', () => {
    expect(create).not.toContain('data.serviceKey = createScope');
    expect(create).not.toContain('resolveLmsServiceScope(req)');
    expect(create).not.toContain('req.body.serviceKey');
  });

  it('"첫 active membership" 추론(service_memberships SELECT)이 제거됐다', () => {
    expect(create).not.toContain('FROM service_memberships');
    expect(controller).not.toContain('FROM service_memberships');
  });

  it('생성 자격 판정은 controller 가 아니라 라우트 guard(requireInstructor = Lecture 계약)가 한다', () => {
    expect(create).not.toContain('hasAnyRole');
    expect(create).not.toContain("'kpa:admin'");
    expect(create).not.toContain("'lms:instructor'");
    const routes = read('apps/api-server/src/modules/lms/routes/lms.routes.ts');
    expect(routes).toMatch(/router\.post\('\/courses',\s*requireAuth,\s*requireInstructor/);
    const requireInstructor = read('apps/api-server/src/modules/lms/middleware/requireInstructor.ts');
    expect(requireInstructor).toContain('export const requireInstructor = requireLectureInstructor;');
  });
});
