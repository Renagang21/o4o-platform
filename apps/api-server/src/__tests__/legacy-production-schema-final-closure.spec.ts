/**
 * WO-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1
 *   — production schema 정리 결과의 재유입 방지 계약
 *
 * A. `users.permissions` — production DROP 완료
 *    (`20270320000000-DropUsersPermissionsColumn`).
 *    권한 SSOT 는 `role_assignments` 다 (CLAUDE.md F9). 엔티티에 스냅샷 컬럼을
 *    다시 선언하면 배포된 스키마와 어긋나 모든 `users` 조회가 깨진다.
 *
 * B. `store_events` — production DROP 완료
 *    (`20270321000000-DropStoreEventsTable`). 엔티티·라우트·서비스 0.
 *
 * C. `organization_product_applications` — 이미 부재
 *    (`20260226000001-DropOrganizationProductApplications`). 재생성 금지.
 *
 * 이 테스트는 **정적 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..', '..', '..');

const read = (...seg: string[]) => fs.readFileSync(path.join(SRC, ...seg), 'utf8');
const MIGRATIONS = path.join(SRC, 'database', 'migrations');
const migrationFiles = () => fs.readdirSync(MIGRATIONS);

describe('WO-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1', () => {
  describe('A축 — users.permissions 는 되살아나지 않는다', () => {
    it('DROP migration 이 존재한다', () => {
      expect(migrationFiles().filter((f) => /DropUsersPermissionsColumn/.test(f)).length).toBe(1);
    });

    it('User 엔티티에 permissions 컬럼 선언이 없다', () => {
      const src = read('modules', 'auth', 'entities', 'User.ts');
      expect(src).not.toContain('permissions!: string[];');
      expect(src).not.toMatch(/@Column\([^)]*\)\s*\n\s*permissions/);
    });

    it('런타임 코드가 users.permissions 컬럼을 읽지 않는다', () => {
      // 파생 값(`getAllPermissions()`)은 컬럼이 아니다 — 컬럼 직접 read 만 금지한다.
      expect(read('scripts', 'check-admin-permissions.ts')).not.toContain('adminUser.permissions');
      expect(read('modules', 'auth', 'entities', 'User.ts')).not.toContain(
        'new Set([...(this.permissions || [])])',
      );
      expect(read('utils', 'token.utils.ts')).not.toContain('permissions: user.permissions');
    });
  });

  describe('B축 — store_events 는 되살아나지 않는다', () => {
    it('DROP migration 이 존재한다', () => {
      expect(migrationFiles().filter((f) => /DropStoreEventsTable/.test(f)).length).toBe(1);
    });

    it('엔티티 정의가 없다', () => {
      const entities = path.join(SRC, 'entities');
      const hit = fs
        .readdirSync(entities)
        .filter((f) => /^StoreEvent\.(ts|js)$/.test(f));
      expect(hit).toEqual([]);
    });

    it('reset dry-run SQL 이 사라진 테이블을 조회하지 않는다', () => {
      const sql = fs.readFileSync(
        path.join(REPO, 'scripts', 'reset', 'O4O-RESET-DRYRUN-V1.sql'),
        'utf8',
      );
      expect(sql).not.toContain('store_events');
    });
  });

  describe('C축 — organization_product_applications 는 재생성되지 않는다', () => {
    it('DROP migration 이 유지된다 (신규 CREATE migration 추가 금지)', () => {
      const files = migrationFiles();
      expect(files.filter((f) => /DropOrganizationProductApplications/.test(f)).length).toBe(1);
      // 최초 생성 migration 1개 외에 새 CREATE 가 추가되지 않았다.
      expect(files.filter((f) => /CreateOrganizationProductApplications/.test(f)).length).toBe(1);
    });
  });
});
