/**
 * auth-core dead lifecycle · 은퇴한 user_roles 재생성 경로 종결 계약
 *
 * WO-O4O-AUTH-CORE-DEAD-LIFECYCLE-AND-RETIRED-USER-ROLES-RESURRECTION-FINAL-CLOSURE-V1
 * 근거 조사: IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1
 *
 * 판정 근거 (실측 2026-09-14)
 *   - auth-core lifecycle install()/uninstall() 호출자 저장소 전체 0 (`@o4o/auth-core/lifecycle` import 0).
 *   - install.ts 는 users · roles · **user_roles** · refresh_tokens · login_attempts 를 CREATE TABLE 하고 ENUM · seed 를 넣었다.
 *     user_roles 는 RBAC SSOT 전환(role_assignments) 으로 이미 은퇴한 테이블이며, 이 코드가 실행됐다면 폐기 구조를 되살렸다.
 *   - 프로덕션 인증 테이블의 스키마 소유자는 api-server deploy migration job 하나 (CreateUsersTable ·
 *     AddRefreshTokenAndLoginAttempt · CreateRoleAssignmentsTable · DropLegacyRbacColumns …).
 *
 * 본 spec 은 (1) auth-core 가 테이블 · ENUM · seed 를 만들거나 지우지 않는다는 계약, (2) user_roles 재생성 · 역할 seed 재도입 방지,
 * (3) 정본(api-server 인증 entity · migration · auth 서비스 소비 경로) 보존을 고정한다.
 * ownsTables 의 `user_roles` 항목은 이 WO 범위 밖 (RBAC baseline 소유권 WO 에서 migration 소유 기준으로 정비).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const SRC = join(__dirname, '..');
const REPO = join(SRC, '..', '..', '..');
const AUTH_CORE = join(REPO, 'packages', 'auth-core', 'src');
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

describe('auth-core dead lifecycle · 은퇴한 user_roles 재생성 경로 종결', () => {
  describe('A. auth-core 는 인증 테이블 · ENUM · seed 를 만들거나 지우지 않는다 (스키마 소유자 = deploy migration job)', () => {
    it('lifecycle install.ts · uninstall.ts 가 존재하지 않는다', () => {
      expect(existsSync(join(AUTH_CORE, 'lifecycle', 'install.ts'))).toBe(false);
      expect(existsSync(join(AUTH_CORE, 'lifecycle', 'uninstall.ts'))).toBe(false);
    });

    it('패키지 소스 어디에도 DDL (CREATE/DROP/ALTER TABLE · CREATE TYPE · CREATE EXTENSION · CASCADE) 이 없다', () => {
      for (const f of walk(AUTH_CORE)) {
        const code = codeLines(f).join('\n');
        expect({ f, hit: /\b(CREATE|DROP|ALTER)\s+TABLE\b/i.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bCREATE\s+(TYPE|EXTENSION)\b/i.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\.(createTable|dropTable)\(/.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bCASCADE\b/.test(code) }).toEqual({ f, hit: false });
      }
    });

    it('은퇴한 user_roles 를 실행 코드로 참조하는 곳이 없다 (역할 seed INSERT 포함)', () => {
      // manifest.ts 의 ownsTables 선언 문자열은 실행 경로가 아니며 RBAC baseline 소유권 WO 범위 (여기서 제외).
      for (const f of walk(AUTH_CORE)) {
        const code = codeLines(f).join('\n');
        if (!/manifest\.ts$/.test(f)) expect({ f, hit: /user_roles/.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bINSERT\s+INTO\b/i.test(code) }).toEqual({ f, hit: false });
        expect({ f, hit: /\bDELETE\s+FROM\b/i.test(code) }).toEqual({ f, hit: false });
      }
    });
  });

  describe('B. stale 선언이 없다', () => {
    it('manifest.lifecycle 에 install · uninstall 경로가 없다 (activate · deactivate 만)', () => {
      const code = codeLines(join(AUTH_CORE, 'manifest.ts')).join('\n');
      expect(code).not.toMatch(/lifecycle\/install\.js/);
      expect(code).not.toMatch(/lifecycle\/uninstall\.js/);
      expect(code).toMatch(/lifecycle\/activate\.js/);
      expect(code).toMatch(/lifecycle\/deactivate\.js/);
    });

    it('lifecycle/index.ts 는 activate · deactivate 만 export 한다', () => {
      const code = codeLines(join(AUTH_CORE, 'lifecycle', 'index.ts')).join('\n');
      expect(code).toMatch(/export \{ activate \}/);
      expect(code).toMatch(/export \{ deactivate \}/);
      expect(code).not.toMatch(/install|uninstall/);
    });

    it('api-server 는 auth-core lifecycle 을 import 하지 않는다', () => {
      for (const f of walk(SRC)) {
        if (f.includes('__tests__')) continue;
        expect({ f, hit: /@o4o\/auth-core\/lifecycle/.test(read(f)) }).toEqual({ f, hit: false });
      }
    });
  });

  describe('C. 정본은 보존된다', () => {
    it('인증 정본 entity 가 api-server 에 존재하고 DataSource 에 등록되어 있다', () => {
      const files = [
        join(SRC, 'entities', 'User.ts'),
        join(SRC, 'entities', 'LinkedAccount.ts'),
        join(SRC, 'modules', 'auth', 'entities', 'Role.ts'),
        join(SRC, 'modules', 'auth', 'entities', 'RoleAssignment.ts'),
        join(SRC, 'modules', 'auth', 'entities', 'RefreshToken.ts'),
        join(SRC, 'modules', 'auth', 'entities', 'LoginAttempt.ts'),
        join(SRC, 'modules', 'auth', 'entities', 'ServiceMembership.ts'),
        join(SRC, 'modules', 'auth', 'entities', 'ServiceCredential.ts'),
      ];
      for (const f of files) expect({ f, exists: existsSync(f) }).toEqual({ f, exists: true });

      const registry = read(join(SRC, 'database', 'entities.ts'));
      for (const name of ['User', 'Role', 'RoleAssignment', 'RefreshToken', 'LoginAttempt', 'LinkedAccount', 'ServiceMembership']) {
        expect({ name, hit: new RegExp(`import \{ ${name} \}`).test(registry) }).toEqual({ name, hit: true });
      }
    });

    it('인증 테이블의 정본 migration 이 api-server 에 존재한다', () => {
      const names = readdirSync(MIGRATIONS);
      for (const re of [/CreateUsersTable/, /AddRefreshTokenAndLoginAttempt/, /CreateRoleAssignmentsTable/, /DropLegacyRbacColumns/]) {
        expect({ re: String(re), hit: names.some((n) => re.test(n)) }).toEqual({ re: String(re), hit: true });
      }
    });

    it('auth-core manifest 정본 · package subpath export 는 유지된다', () => {
      expect(codeLines(join(AUTH_CORE, 'index.ts')).join('\n')).toMatch(/manifest/);
      const pkg = JSON.parse(read(join(REPO, 'packages', 'auth-core', 'package.json')));
      expect(pkg.exports['./lifecycle']).toBeDefined();
      expect(existsSync(join(AUTH_CORE, 'lifecycle', 'activate.ts'))).toBe(true);
      expect(existsSync(join(AUTH_CORE, 'lifecycle', 'deactivate.ts'))).toBe(true);
    });

    it('api-server 로그인 · 토큰 서비스 경로가 존재한다', () => {
      expect(existsSync(join(SRC, 'services', 'authentication.service.ts')) || existsSync(join(SRC, 'modules', 'auth'))).toBe(true);
    });
  });
});
