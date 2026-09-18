import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

describe('Lecture Service Foundation', () => {
  const catalog = read('config/service-catalog.ts');
  const serviceKeys = read('constants/service-keys.ts');
  const roles = read('types/roles.ts');
  const legal = read('modules/service-legal/service-legal-scope.ts');
  const cors = read('bootstrap/setup-middlewares.ts');
  const migration = read('database/migrations/20270414000000-SeedLectureServiceAndRoles.ts');
  const join = read('modules/auth/controllers/handoff.controller.ts');

  it('canonical service identity와 study.neture.co.kr을 등록한다', () => {
    expect(serviceKeys).toContain("LECTURE: 'lecture'");
    expect(catalog).toContain("key: 'lecture'");
    expect(catalog).toContain("domain: 'study.neture.co.kr'");
    expect(catalog).toContain("joinEnabled: false");
    expect(catalog).toContain("workspaceMode: 'none'");
    expect(cors).toContain('"https://study.neture.co.kr"');
  });

  it('Lecture 역할은 3개뿐이고 lecture:member는 만들지 않는다', () => {
    for (const role of ['lecture:admin', 'lecture:operator', 'lecture:instructor']) {
      expect(roles).toContain(role);
      expect(migration).toContain(role);
    }
    expect(roles).not.toContain("'lecture:member'");
    expect(migration).not.toContain("'lecture:member'");
  });

  it('법정 서비스 scope가 lecture를 인식한다', () => {
    expect(legal).toContain("'lecture'");
    expect(legal).toContain('lecture: LECTURE_SCOPE_CONFIG');
  });

  it('Foundation migration은 사용자 membership/role_assignment나 LMS 데이터를 건드리지 않는다', () => {
    expect(migration).not.toMatch(/INSERT INTO\s+service_memberships/i);
    expect(migration).not.toMatch(/INSERT INTO\s+role_assignments/i);
    expect(migration).not.toMatch(/UPDATE\s+lms_courses/i);
  });

  it('공통 join은 role 없는 pending membership을 만들며 Phase 1에서는 join 자체가 닫혀 있다', () => {
    expect(catalog).toContain("joinEnabled: false");
    expect(join).toContain("INSERT INTO service_memberships (user_id, service_key, status, created_at, updated_at)");
    expect(join).not.toContain("INSERT INTO service_memberships (user_id, service_key, role");
  });
});
