/**
 * RBAC · account baseline snapshot migration 소유권 종결 계약
 *
 * WO-O4O-RBAC-AND-ACCOUNT-BASELINE-SNAPSHOT-MIGRATION-OWNERSHIP-FINAL-CLOSURE-V1
 * 선행: WO-O4O-RBAC-BASELINE-TABLE-MIGRATION-OWNERSHIP-AND-LEGACY-SCHEMA-DECLARATION-CLOSURE-V1 (판정 MIGRATION_OWNERSHIP_REQUIRED 5)
 *
 * 계약 (fs 기반 · DB 불필요):
 *   (1) 5 테이블의 생성 소유자 = api-server migration `20270413000000-BaselineRbacAndAccountTables` 하나
 *   (2) 그 migration 은 존재 시 구조 assertion(no-op / drift → throw) 이며, ALTER · DROP · seed · CREATE EXTENSION · IF NOT EXISTS ·
 *       catch-and-continue · 은퇴 테이블(user_roles · organization_units · organization_roles) 생성이 없다
 *   (3) canonical column 집합은 entity 가 매핑하는 컬럼을 모두 포함한다 (entity → 운영 구조 부분집합 계약)
 *   (4) down() 은 DROP 하지 않는다
 * 실 DB 동작(fresh 생성 · 운영 fingerprint 동일 · drift 실패) 은 CHECK 의 격리 PostgreSQL harness 결과가 증빙한다.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const MIGRATIONS = join(SRC, 'database', 'migrations');
const FILE = '20270413000000-BaselineRbacAndAccountTables.ts';
const TARGETS = ['permissions', 'role_permissions', 'linked_accounts', 'settings', 'account_activities'];
const RETIRED = ['user_roles', 'organization_units', 'organization_roles'];

const read = (p: string) => readFileSync(p, 'utf8');
const codeLines = (p: string) =>
  read(p)
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'));

const migPath = join(MIGRATIONS, FILE);
const code = () => codeLines(migPath).join('\n');

/** migration 의 TABLES 선언에서 테이블별 col('...') 이름을 뽑는다 */
function canonicalColumns(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const src = code();
  for (const t of TARGETS) {
    const start = src.indexOf(`table: '${t}'`);
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf('requires:', start);
    out[t] = Array.from(src.slice(start, end).matchAll(/col\('([^']+)'/g)).map((m) => m[1]);
  }
  return out;
}

describe('RBAC · account baseline snapshot migration 소유권 종결', () => {
  describe('A. 생성 소유자 = deploy migration job (단일 migration)', () => {
    it('baseline migration 파일이 존재하고 클래스/name 이 일치한다', () => {
      expect(existsSync(migPath)).toBe(true);
      const src = read(migPath);
      expect(src).toMatch(/export class BaselineRbacAndAccountTables20270413000000 implements MigrationInterface/);
      expect(src).toMatch(/name = 'BaselineRbacAndAccountTables20270413000000'/);
    });

    it('대상 5 테이블 각각의 CREATE 소유 migration 은 baseline 하나뿐이다 (다른 migration 의 CREATE TABLE 0)', () => {
      for (const n of readdirSync(MIGRATIONS)) {
        if (n === FILE) continue;
        const src = codeLines(join(MIGRATIONS, n)).join('\n');
        for (const t of TARGETS) {
          const hit = new RegExp(`CREATE\\s+TABLE(\\s+IF\\s+NOT\\s+EXISTS)?\\s+["']?${t}["']?\\s*\\(`, 'i').test(src) || new RegExp(`createTable\\([^)]*['"]${t}['"]`).test(src);
          expect({ n, t, hit }).toEqual({ n, t, hit: false });
        }
      }
    });

    it('TABLES 선언은 정확히 대상 5 테이블이다', () => {
      const declared = Array.from(code().matchAll(/table: '([^']+)'/g)).map((m) => m[1]);
      expect(declared).toEqual(TARGETS);
    });
  });

  describe('B. 금지 사항 (WO §6)', () => {
    it('ALTER · DROP · TRUNCATE · INSERT/UPDATE/DELETE · synchronize · CREATE EXTENSION · IF NOT EXISTS · wildcard 가 없다', () => {
      const src = code();
      expect(src).not.toMatch(/\bALTER\s+TABLE\b/i);
      expect(src).not.toMatch(/\bDROP\s+(TABLE|INDEX|CONSTRAINT|TYPE)\b/i);
      expect(src).not.toMatch(/\bTRUNCATE\b/i);
      expect(src).not.toMatch(/\b(INSERT\s+INTO|UPDATE\s+"?\w+"?\s+SET|DELETE\s+FROM)\b/i);
      expect(src).not.toMatch(/synchronize/);
      expect(src).not.toMatch(/CREATE\s+EXTENSION/i);
      expect(src).not.toMatch(/IF\s+NOT\s+EXISTS/i);
      expect(src).not.toMatch(/LIKE\s+'%/i);
    });

    it('CASCADE 는 FK 의 ON DELETE 정의(운영 실측) 로만 나타난다 — DROP … CASCADE 0', () => {
      const src = code();
      const all = src.match(/CASCADE/g) ?? [];
      const fk = src.match(/ON DELETE CASCADE/g) ?? [];
      expect(all.length).toBeGreaterThan(0);
      expect(all.length).toBe(fk.length);
    });

    it('오류를 삼키고 계속 진행하는 catch 가 없다 (drift → throw)', () => {
      const src = code();
      expect(src).not.toMatch(/\bcatch\b/);
      expect(src).toMatch(/structure drift — refusing to proceed \(no ALTER\)/);
      expect(src).toMatch(/throw new Error/);
    });

    it('은퇴/부재 테이블(user_roles · organization_units · organization_roles) 을 만들지 않는다 · lifecycle installer 호출 0', () => {
      const src = code();
      for (const t of RETIRED) expect({ t, hit: new RegExp(`['"]${t}['"]`).test(src) }).toEqual({ t, hit: false });
      expect(src).not.toMatch(/lifecycle|@o4o\/(auth|platform|organization|lms)-core/);
    });

    it('down() 은 DROP 하지 않는다 (no-op · irreversible)', () => {
      const src = code();
      const down = src.slice(src.indexOf('async down('), src.indexOf('function createTableSql'));
      expect(down).not.toMatch(/q\.query|queryRunner|DROP/);
      expect(down).toMatch(/no-op/);
    });
  });

  describe('C. canonical 구조 ⊇ entity 매핑 (런타임 호환) · 존재 시 no-op 경로', () => {
    it('각 테이블의 canonical column 집합이 entity 가 매핑하는 컬럼을 모두 포함한다', () => {
      const cols = canonicalColumns();
      const entityCols: Record<string, string[]> = {
        // Permission.ts (appId 는 insert:false · select:false 로 DB 미매핑)
        permissions: ['id', 'key', 'description', 'category', 'isActive', 'createdAt', 'updatedAt'],
        // Role.ts @JoinTable
        role_permissions: ['role_id', 'permission_id'],
        linked_accounts: ['id', 'userId', 'provider', 'providerId', 'email', 'displayName', 'profileImage', 'isVerified', 'isPrimary', 'providerData', 'lastUsedAt', 'linkedAt', 'updatedAt'],
        settings: ['key', 'value', 'type', 'description', 'createdAt', 'updatedAt'],
        // AccountActivity.ts: property `type` → column `action`
        account_activities: ['id', 'userId', 'action', 'email', 'ipAddress', 'userAgent', 'success', 'details', 'createdAt'],
      };
      for (const t of TARGETS) {
        for (const c of entityCols[t]) expect({ t, c, has: cols[t].includes(c) }).toEqual({ t, c, has: true });
      }
    });

    it('Role.ts 의 JoinTable 이름·컬럼과 migration 의 role_permissions 정의가 일치한다', () => {
      const role = read(join(SRC, 'modules', 'auth', 'entities', 'Role.ts'));
      expect(role).toMatch(/name:\s*'role_permissions'/);
      expect(role).toMatch(/joinColumn:\s*\{\s*name:\s*'role_id'/);
      expect(role).toMatch(/inverseJoinColumn:\s*\{\s*name:\s*'permission_id'/);
      expect(code()).toMatch(/PRIMARY KEY \(role_id, permission_id\)/);
    });

    it('존재하는 테이블은 assertion 만 수행한다 (hasTable → assertTable → continue)', () => {
      const src = code();
      expect(src).toMatch(/if \(await q\.hasTable\(spec\.table\)\) \{[\s\S]*?await assertTable\(q, spec\);[\s\S]*?continue;/);
      // 생성 후에도 동일 assertion 으로 자가 검증
      expect(src).toMatch(/await q\.query\(createTableSql\(spec\)\);[\s\S]*?await assertTable\(q, spec\);/);
    });

    it('선행 계약(rbac-baseline 선언 종결 spec) 이 그대로 존재한다', () => {
      expect(existsSync(join(SRC, '__tests__', 'rbac-baseline-table-migration-ownership-legacy-schema-declaration-closure.spec.ts'))).toBe(true);
    });
  });
});
