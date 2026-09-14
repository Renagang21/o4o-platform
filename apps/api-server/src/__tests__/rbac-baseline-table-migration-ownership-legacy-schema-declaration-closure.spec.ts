/**
 * RBAC baseline 테이블 migration 소유권 · legacy 스키마 선언 종결 계약
 *
 * WO-O4O-RBAC-BASELINE-TABLE-MIGRATION-OWNERSHIP-AND-LEGACY-SCHEMA-DECLARATION-CLOSURE-V1
 * 근거 조사: IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1 §6 · §7 · §10
 *
 * 테이블별 판정 (실측 2026-09-14 · DDL 0 · 일괄 생성 금지)
 *   permissions         MIGRATION_OWNERSHIP_REQUIRED  실물 ✓(0 row) · entity Permission 등록 · Role.permissions eager ManyToMany 경유 런타임 JOIN · 창조 migration 부재
 *   role_permissions    MIGRATION_OWNERSHIP_REQUIRED  실물 ✓(0 row) · Role @JoinTable('role_permissions') · 창조 migration 부재
 *   linked_accounts     MIGRATION_OWNERSHIP_REQUIRED  실물 ✓(0 row) · entity LinkedAccount · account-linking/auth-login 소비 · 창조 migration 부재
 *   settings            MIGRATION_OWNERSHIP_REQUIRED  실물 ✓(4 row) · entity Settings · settingsService/passportDynamic 소비 · 창조 migration 부재
 *   account_activities  MIGRATION_OWNERSHIP_REQUIRED  실물 ✓(30d 2,102 row) · entity AccountActivity · 로그인 경로 소비 · 창조 migration 부재
 *   organization_units  ABSENT_AND_UNUSED             실물 ✗ · entity 없음 · 은퇴한 organization-core lifecycle install 만 정의했음
 *   organization_roles  ABSENT_AND_UNUSED             실물 ✗ · entity 없음 · 동상
 *   (부수) user_roles   HISTORICAL_RETIRED            20260228000002-DropLegacyRbacColumns 가 DROP · RBAC Freeze F9 "재생성 금지"
 *
 * 계약: (1) manifest ownsTables 는 은퇴/부재 테이블(user_roles · organization_units · organization_roles) 을 선언하지 않는다,
 * (2) 그 세 테이블을 다시 만드는 entity · DDL 이 저장소에 없다 (migration 의 DROP · 존재 가드 조회는 허용),
 * (3) MIGRATION_OWNERSHIP_REQUIRED 5 테이블의 정본 entity 는 보존되고 DataSource 에 등록되어 있으며 패키지 코드가 만들지 않는다.
 * 이 spec 은 "baseline migration 이 없다" 를 고정하지 않는다 — 후속 baseline migration WO 가 추가돼도 그대로 통과한다.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const PACKAGES = join(REPO, 'packages');
const MIGRATIONS = join(SRC, 'database', 'migrations');

const read = (p: string) => readFileSync(p, 'utf8');
const codeLines = (p: string) =>
  read(p)
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.ts$/.test(name)) out.push(p);
  }
  return out;
}

const RETIRED_OR_ABSENT = ['user_roles', 'organization_units', 'organization_roles'];
const OWNERSHIP_REQUIRED = ['permissions', 'role_permissions', 'linked_accounts', 'settings', 'account_activities'];

const ownsTablesOf = (pkg: string): string[] => {
  const code = codeLines(join(PACKAGES, pkg, 'src', 'manifest.ts')).join('\n');
  const m = code.match(/ownsTables:\s*\[([\s\S]*?)\]/);
  if (!m) return [];
  return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
};

describe('RBAC baseline 테이블 migration 소유권 · legacy 스키마 선언 종결', () => {
  describe('A. legacy 스키마 선언이 없다 (ownsTables ≠ 스키마 창조)', () => {
    it('auth-core ownsTables 에 은퇴한 user_roles 가 없다 (F9 재생성 금지)', () => {
      const tables = ownsTablesOf('auth-core');
      expect(tables).not.toContain('user_roles');
      expect(tables).toEqual(
        expect.arrayContaining(['users', 'roles', 'permissions', 'role_permissions', 'linked_accounts', 'refresh_tokens', 'login_attempts']),
      );
    });

    it('organization-core ownsTables 에 부재 테이블 organization_units · organization_roles 가 없다', () => {
      const tables = ownsTablesOf('organization-core');
      expect(tables).not.toContain('organization_units');
      expect(tables).not.toContain('organization_roles');
      expect(tables).toEqual(expect.arrayContaining(['organizations', 'organization_members']));
    });

    it('platform-core ownsTables 는 app_registry · settings · account_activities 를 유지한다', () => {
      expect(ownsTablesOf('platform-core')).toEqual(expect.arrayContaining(['app_registry', 'settings', 'account_activities']));
    });

    it('어느 패키지 manifest 도 은퇴/부재 테이블을 ownsTables 로 선언하지 않는다', () => {
      for (const pkg of readdirSync(PACKAGES)) {
        const manifest = join(PACKAGES, pkg, 'src', 'manifest.ts');
        if (!existsSync(manifest)) continue;
        for (const t of RETIRED_OR_ABSENT) {
          expect({ pkg, t, declared: ownsTablesOf(pkg).includes(t) }).toEqual({ pkg, t, declared: false });
        }
      }
    });
  });

  describe('B. 은퇴/부재 테이블을 다시 만드는 코드가 없다', () => {
    it('user_roles · organization_units · organization_roles 에 대한 @Entity · CREATE TABLE · createTable 이 저장소에 없다', () => {
      const files = [...walk(PACKAGES), ...walk(SRC)].filter((f) => !f.includes('__tests__'));
      for (const f of files) {
        const code = codeLines(f).join('\n');
        for (const t of RETIRED_OR_ABSENT) {
          const entity = new RegExp(`@Entity\\(\\s*['"]${t}['"]`).test(code);
          const ddl = new RegExp(`CREATE\\s+TABLE(\\s+IF\\s+NOT\\s+EXISTS)?\\s+["']?${t}\\b`, 'i').test(code);
          const qb = new RegExp(`createTable\\([^)]*['"]${t}['"]`).test(code);
          expect({ f, t, entity, ddl, qb }).toEqual({ f, t, entity: false, ddl: false, qb: false });
        }
      }
    });

    it('user_roles 의 마지막 migration 은 DROP (20260228000002-DropLegacyRbacColumns) 이고 이후 재생성 migration 이 없다', () => {
      const names = readdirSync(MIGRATIONS).sort();
      const dropIdx = names.findIndex((n) => /DropLegacyRbacColumns/.test(n) && n.startsWith('20260228000002'));
      expect(dropIdx).toBeGreaterThan(-1);
      expect(read(join(MIGRATIONS, names[dropIdx]))).toMatch(/DROP TABLE IF EXISTS user_roles/);
      for (const n of names.slice(dropIdx + 1)) {
        const code = codeLines(join(MIGRATIONS, n)).join('\n');
        expect({ n, hit: /CREATE\s+TABLE(\s+IF\s+NOT\s+EXISTS)?\s+["']?user_roles\b/i.test(code) }).toEqual({ n, hit: false });
      }
    });
  });

  describe('C. MIGRATION_OWNERSHIP_REQUIRED 5 테이블의 정본 entity 는 보존된다 (DDL 0 · 패키지가 만들지 않는다)', () => {
    it('entity 파일이 존재하고 테이블명이 일치한다', () => {
      const map: Record<string, string> = {
        permissions: join(SRC, 'modules', 'auth', 'entities', 'Permission.ts'),
        linked_accounts: join(SRC, 'entities', 'LinkedAccount.ts'),
        settings: join(SRC, 'entities', 'Settings.ts'),
        account_activities: join(SRC, 'entities', 'AccountActivity.ts'),
      };
      for (const [t, f] of Object.entries(map)) {
        expect({ t, exists: existsSync(f) }).toEqual({ t, exists: true });
        expect({ t, entity: new RegExp(`@Entity\\(\\s*['"]${t}['"]`).test(read(f)) }).toEqual({ t, entity: true });
      }
      // role_permissions 는 Role 의 @JoinTable 로 선언된다 (standalone entity 없음)
      expect(read(join(SRC, 'modules', 'auth', 'entities', 'Role.ts'))).toMatch(/name:\s*'role_permissions'/);
    });

    it('DataSource 에 Permission · LinkedAccount · Settings · AccountActivity 가 등록되어 있다', () => {
      const registry = read(join(SRC, 'database', 'entities.ts'));
      for (const name of ['Permission', 'LinkedAccount', 'Settings', 'AccountActivity']) {
        expect({ name, hit: new RegExp(`import \\{ ${name} \\}`).test(registry) }).toEqual({ name, hit: true });
      }
    });

    it('packages/* 어디에도 이 5 테이블을 만드는 DDL 이 없다 (스키마 소유자 = api-server migration)', () => {
      for (const f of walk(PACKAGES)) {
        const code = codeLines(f).join('\n');
        for (const t of OWNERSHIP_REQUIRED) {
          const ddl = new RegExp(`CREATE\\s+TABLE(\\s+IF\\s+NOT\\s+EXISTS)?\\s+["']?${t}\\b`, 'i').test(code);
          expect({ f, t, ddl }).toEqual({ f, t, ddl: false });
        }
      }
    });
  });
});
