/**
 * LMS Instructor Lists — Service Scope Regression Test
 *
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §10/§13
 *
 * 닫으려는 결함 (production 실측):
 *   `GET /api/v1/lms/instructor/courses` 가 `instructorId` 만으로 좁혀져 있어,
 *   여러 서비스의 강사인 사용자에게 타 서비스 강의가 그대로 노출됐다.
 *   pharmacyhub.co.kr `/instructor/courses` 총 7건 중 6건이 `serviceKey='kpa-society'`
 *   (§20 완료 조건 `cross-service leakage = 0` 위반).
 *
 * 검증 2계층 — 공개 목록 스펙(lms-public-course-service-scope.spec.ts)과 같은 방식:
 *   (A) 정적 회귀 가드 — 백엔드 3개 목록 핸들러가 공통 scope util 을 통과하는지,
 *       LMS 전용 scope 규칙을 새로 만들지 않았는지 소스로 고정한다.
 *   (B) 프런트 계약 — PH / KPA client 가 canonical serviceKey 를 서버에 전달하는지,
 *       그리고 client-side filtering 으로 대신하지 않았는지 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');

const controller = read('apps/api-server/src/modules/lms/controllers/InstructorController.ts');
// WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §11/§14: LMS 화면은 services/web-lecture 단일 소유.
const lmsClient = read('packages/lms-client/src/index.ts');
const lectureApi = read('services/web-lecture/src/api/lecture.ts');

describe('LMS instructor 목록 — service scope (§10/§13)', () => {
  describe('(A) 백엔드 — 공통 scope util 경유', () => {
    it('InstructorController 가 공통 scope util 을 사용한다', () => {
      expect(controller).toContain(
        "import { applyCourseScopeToQuery, resolveScopeOrRespond } from '../utils/lms-scope-guard.js'",
      );
    });

    it('myCourses · pendingEnrollments · dashboardCourses 3개 목록 모두 scope 를 건다', () => {
      expect(controller.match(/resolveScopeOrRespond\(req, res\)/g)?.length).toBe(3);
      expect(controller.match(/applyCourseScopeToQuery\(/g)?.length).toBe(3);
    });

    it('LMS 전용 service-key 매핑이나 로컬 NULL 규칙을 새로 만들지 않는다', () => {
      // legacy(service_key IS NULL) 귀속 판단은 applyCourseScopeToQuery 단독 소관이다.
      expect(controller).not.toContain('serviceKey IS NULL');
      expect(controller).not.toContain('resolveCanonicalServiceKey');
    });

    it('scope 해석 실패(400) 시 쿼리를 계속 실행하지 않는다', () => {
      expect(controller.match(/if \(!scope\.ok\) return;/g)?.length).toBe(3);
    });
  });

  describe('(B) 프런트 — 서버 필터 입력 전달', () => {
    it('공통 instructor client 가 serviceKey 옵션을 서버로 넘긴다', () => {
      expect(lmsClient).toContain(
        'export function createLmsInstructorClient(http: LmsHttpClient, options: LmsClientOptions = {})',
      );
      expect(lmsClient).toContain("http.get<LmsApiResponse<T[]>>('/lms/instructor/courses', scopeParams)");
    });

    it('Lecture 강사 client 는 serviceKey 를 보내지 않는다 — 서버가 lecture 로 고정 (§8)', () => {
      expect(lectureApi).toContain("lmsHttp.get<Paginated<LectureCourse>>('/lms/instructor/courses', params)");
      expect(lectureApi).not.toMatch(/serviceKey:\s*['"]/);
    });

    it('PH / KPA 강사 client 는 삭제되었다 (§14)', () => {
      for (const rel of [
        'services/web-pharmacy-hub/src/api/lms.ts',
        'services/web-kpa-society/src/api/lms-instructor.ts',
      ]) {
        expect(fs.existsSync(path.join(REPO_ROOT, rel))).toBe(false);
      }
    });

    it('응답을 프런트에서 걸러내지 않는다 (client-side filtering 금지)', () => {
      expect(lectureApi).not.toMatch(/\.filter\([^)]*serviceKey/);
    });
  });
});
