/**
 * WO-O4O-KPA-PHARMACYHUB-COMMUNITY-MY-STORE-PRODUCTION-CLOSURE-V1 §10 §15
 *
 * production smoke 결함: pharmacyhub.co.kr 에서 생성한 강의가
 * `serviceKey: 'kpa-society'` 로 저장되어 PH operator/instructor/learner 목록에서 사라지고
 * KPA scope 를 오염시켰다.
 *
 * 원인: `CourseController.createCourse` 가 요청의 LMS scope 를 보지 않고
 *      생성자의 첫 active `service_memberships` 행에서 serviceKey 를 유추했다.
 *      (PH client 는 생성 시 serviceKey 를 보내지 않았다.)
 *
 * 계약: 생성 시 소속 서비스는 **요청 scope** 가 결정한다. 무경계 요청에서만 membership 유래.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../../../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8');

describe('LMS course create — service scope (WO-...-PRODUCTION-CLOSURE-V1 §10)', () => {
  const controller = read('apps/api-server/src/modules/lms/controllers/CourseController.ts');

  it('createCourse 가 요청 scope 를 해석한다', () => {
    const create = controller.slice(
      controller.indexOf('static async createCourse'),
      controller.indexOf('static async getCourse'),
    );
    expect(create).toContain('resolveLmsServiceScope(req)');
    expect(create).toContain('data.serviceKey = createScope;');
  });

  it('알 수 없는 serviceKey 는 400 INVALID_SERVICE_KEY 로 거절한다', () => {
    const create = controller.slice(
      controller.indexOf('static async createCourse'),
      controller.indexOf('static async getCourse'),
    );
    expect(create).toContain('InvalidLmsServiceKeyError');
    expect(create).toContain('INVALID_SERVICE_KEY_CODE');
  });

  it('무경계 요청에서는 membership 유래 fallback 이 남아 있다', () => {
    const create = controller.slice(
      controller.indexOf('static async createCourse'),
      controller.indexOf('static async getCourse'),
    );
    expect(create).toContain('FROM service_memberships');
    // scope 해석이 membership fallback 보다 앞선다
    expect(create.indexOf('resolveLmsServiceScope(req)')).toBeLessThan(
      create.indexOf('FROM service_memberships'),
    );
  });

  it('PH client 가 강의 생성 시 canonical serviceKey 를 붙인다', () => {
    const phLms = read('services/web-pharmacy-hub/src/api/lms.ts');
    const idx = phLms.indexOf("api.post<any>('/lms/courses'");
    expect(idx).toBeGreaterThan(-1);
    expect(phLms.slice(idx, idx + 200)).toContain('serviceKey: PH_SERVICE_KEY');
  });

  it('KPA client 도 강의 생성 시 canonical serviceKey 를 붙인다', () => {
    const kpa = read('services/web-kpa-society/src/api/lms-instructor.ts');
    expect(kpa).toContain("'/lms/courses?serviceKey=kpa-society'");
  });
});
