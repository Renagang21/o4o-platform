/**
 * organization-core dead lifecycle · 파괴적 uninstall 은퇴 계약
 *
 * WO-O4O-ORGANIZATION-CORE-DEAD-LIFECYCLE-AND-DESTRUCTIVE-UNINSTALL-FINAL-RETIREMENT-V1
 * 근거 조사: IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1
 *
 * 판정 근거 (실측 2026-09-14)
 *   - organization-core lifecycle install()/uninstall() 호출자 저장소 전체 0. 프로덕션에 lifecycle 이
 *     만드는 idx_* 인덱스 0 · organization_units/organization_roles 부재 → 한 번도 실행된 적 없음.
 *   - uninstall.ts 는 옵션과 무관하게 `DELETE FROM role_assignments` · `DELETE FROM permissions` 를
 *     실행하고 dropTables 시 organizations/organization_members 를 CASCADE DROP 했다 (RBAC SSOT 파괴 경로).
 *   - src/index.ts 가 `export * from './lifecycle/index.js'` 로 그 코드를 api-server 번들에 실어 왔다.
 *
 * 본 spec 은 (1) 이 패키지가 테이블을 만들거나 지우지 않는다는 계약, (2) 파괴적 uninstall 경로 재도입 방지,
 * (3) 정본(entity · migration · OrganizationService 소비 경로) 보존을 고정한다.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const ORG_CORE = join(REPO, 'packages', 'organization-core', 'src');
const MIGRATIONS = join(SRC, 'database', 'migrations');

const read = (p: string) => readFileSync(p, 'utf8');
const codeLines = (p: string) =>
  read(p)
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.ts$/.test(name)) out.push(p);
  }
  return out;
}

describe('organization-core dead lifecycle · 파괴적 uninstall 은퇴', () => {
  describe('A. organization-core 는 테이블을 만들거나 지우지 않는다 (스키마 소유자 = deploy migration job)', () => {
    it('lifecycle install.ts · uninstall.ts 가 존재하지 않는다', () => {
      expect(existsSync(join(ORG_CORE, 'lifecycle', 'install.ts'))).toBe(false);
      expect(existsSync(join(ORG_CORE, 'lifecycle', 'uninstall.ts'))).toBe(false);
    });

    it('lifecycle/index.ts 는 activate · deactivate 만 export 한다', () => {
      const exps = codeLines(join(ORG_CORE, 'lifecycle', 'index.ts')).filter((l) => /^export/.test(l.trim()));
      expect(exps.map((l) => l.trim()).sort()).toEqual([
        "export { activate } from './activate.js';",
        "export { deactivate } from './deactivate.js';",
      ]);
    });

    it('패키지 소스 어디에도 DDL (CREATE/DROP/ALTER TABLE) 이 없다', () => {
      for (const f of walk(ORG_CORE)) {
        const code = codeLines(f).join('\n');
        expect({ f, hit: /\b(CREATE|DROP|ALTER)\s+TABLE\b/i.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bCASCADE\b/.test(code) }).toEqual({ f, hit: false });
      }
    });

    it('공유 RBAC 데이터(role_assignments · permissions)를 DELETE 하는 raw SQL 이 없다', () => {
      for (const f of walk(ORG_CORE)) {
        const code = codeLines(f).join('\n');
        expect({ f, hit: /DELETE\s+FROM\s+(role_assignments|permissions|organizations|organization_members)\b/i.test(code) })
          .toEqual({ f, hit: false });
      }
    });
  });

  describe('B. stale export · manifest 선언이 없다', () => {
    it('src/index.ts 가 lifecycle 을 barrel 로 재export 하지 않는다', () => {
      const code = codeLines(join(ORG_CORE, 'index.ts')).join('\n');
      expect(code).not.toMatch(/from\s+'\.\/lifecycle\/index\.js'/);
    });

    it('manifest.lifecycle 에 install · uninstall 경로가 없다', () => {
      const code = codeLines(join(ORG_CORE, 'manifest.ts')).join('\n');
      expect(code).not.toMatch(/lifecycle\/install\.js/);
      expect(code).not.toMatch(/lifecycle\/uninstall\.js/);
    });

    it('은퇴한 InstallContext · UninstallContext 타입이 더 이상 export 되지 않는다', () => {
      const code = codeLines(join(ORG_CORE, 'types', 'context.ts')).join('\n');
      expect(code).not.toMatch(/export interface (InstallContext|UninstallContext)\b/);
    });
  });

  describe('C. 정본은 보존된다', () => {
    it('Organization · OrganizationMember entity 가 존재하고 api-server 가 등록한다', () => {
      expect(existsSync(join(ORG_CORE, 'entities', 'Organization.ts'))).toBe(true);
      expect(existsSync(join(ORG_CORE, 'entities', 'OrganizationMember.ts'))).toBe(true);
      expect(read(join(SRC, 'database', 'entities.ts'))).toMatch(/@o4o\/organization-core\/entities/);
    });

    it('organizations · organization_members 의 정본 migration 이 존재한다', () => {
      const names = readdirSync(MIGRATIONS);
      expect(names.some((n) => /OrgServiceModelNormalizationPhaseA/.test(n))).toBe(true);
      expect(names.some((n) => /CosmeticsStoreOrgBridge/.test(n))).toBe(true);
    });

    it('api-server 의 OrganizationService 소비 경로가 유지된다', () => {
      expect(read(join(SRC, 'routes', 'organization.routes.ts'))).toMatch(/OrganizationService/);
    });
  });
});
