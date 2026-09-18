import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

describe('Lecture Service Foundation', () => {
  const catalog = read('config/service-catalog.ts');
  const serviceKeys = read('constants/service-keys.ts');
  const roles = read('types/roles.ts');
  const legal = read('modules/service-legal/service-legal-scope.ts');
  const cors = read('bootstrap/setup-middlewares.ts');
  // reference seed 는 migration 이 아니라 CLI (data-only 는 incremental 계약 C22 fingerprint 중복 · MIGRATION-STANDARD 규칙 8)
  const seed = read('scripts/seed-lecture-service-and-roles.ts');
  const join = read('modules/auth/controllers/handoff.controller.ts');

  it('canonical service identity와 study.neture.co.kr을 등록한다', () => {
    expect(serviceKeys).toContain("LECTURE: 'lecture'");
    expect(catalog).toContain("key: 'lecture'");
    expect(catalog).toContain("domain: 'study.neture.co.kr'");
    expect(catalog).toContain("joinEnabled: false");
    expect(catalog).toContain("workspaceMode: 'none'");
    expect(cors).toContain('"https://study.neture.co.kr"');
  });

  it('study.neture.co.kr origin을 neture가 아니라 exact hostname으로 판정한다', () => {
    expect(join).toContain('new URL(origin).hostname.toLowerCase()');
    expect(join).toContain('svc.domain.toLowerCase() === originHost');
    expect(join).not.toContain('origin.includes(svc.domain)');
  });

  it('Lecture 역할은 3개뿐이고 lecture:member는 만들지 않는다', () => {
    for (const role of ['lecture:admin', 'lecture:operator', 'lecture:instructor']) {
      expect(roles).toContain(role);
      expect(seed).toContain(`'${role}'`);
    }
    expect(roles).not.toContain("'lecture:member'");
    // seed 대상 목록은 정확히 3개 · lecture:member 는 "생성하지 않는다"(count 0 유지) 검증에서만 이름이 등장한다.
    expect(seed).toContain("= ['lecture:admin', 'lecture:operator', 'lecture:instructor']");
    expect(seed).toContain('must stay 0');
  });

  it('법정 서비스 scope가 lecture를 인식한다', () => {
    expect(legal).toContain("'lecture'");
    expect(legal).toContain('lecture: LECTURE_SCOPE_CONFIG');
  });

  it('reference seed 는 migration 이 아니라 CLI 이며, 사용자 membership/role_assignment나 LMS 데이터를 건드리지 않는다', () => {
    const migrationsDir = resolve(ROOT, 'database/migrations');
    expect(readdirSync(migrationsDir).filter((f) => /Lecture/i.test(f))).toEqual([]);
    expect(seed).toMatch(/INSERT INTO platform_services/);
    expect(seed).toMatch(/ON CONFLICT \(code\) DO UPDATE/);
    expect(seed).toMatch(/ON CONFLICT \(name\) DO UPDATE/);
    expect(seed).toContain("includes('--apply')");
    expect(seed).not.toMatch(/INSERT INTO\s+service_memberships/i);
    expect(seed).not.toMatch(/INSERT INTO\s+role_assignments/i);
    expect(seed).not.toMatch(/UPDATE\s+lms_courses/i);
  });

  it('공통 join은 role 없는 pending membership을 만들며 Phase 1에서는 join 자체가 닫혀 있다', () => {
    expect(catalog).toContain("joinEnabled: false");
    expect(join).toContain("INSERT INTO service_memberships (user_id, service_key, status, created_at, updated_at)");
    expect(join).not.toContain("INSERT INTO service_memberships (user_id, service_key, role");
  });
});