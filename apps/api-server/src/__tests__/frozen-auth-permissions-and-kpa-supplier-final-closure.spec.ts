/**
 * WO-O4O-FROZEN-AUTH-PERMISSIONS-DB-AND-KPA-SUPPLIER-ENDPOINT-FINAL-CLOSURE-V1
 *   — A/B/C 축 재유입 방지 계약 테스트
 *
 * A. `@o4o/organization-core` `PermissionGuard` — 판정 `REMOVE_SAFE`
 *    runtime consumer 0 · test consumer 0 · external workspace consumer 0
 *    (`packages/organization-core` 는 `private: true`) · public API consumer 0.
 *    동결 Core 의 freeze 범위는 "구조/테이블 변경 금지"(core-boundary.md)이며
 *    dead guard 클래스 제거는 그 범위가 아니다. canonical 권한 축은
 *    `requireAuth` + `require{Service}Scope` + `role_assignments` 이다.
 *
 * B. `users.permissions` — 판정 `DROP_APPROVED_READY`
 *    read 0 / write 0 / claim 0 · 프로덕션 57행 전부 `[]` ·
 *    schema 의존(index/constraint/view/trigger/function/generated) 0.
 *    실제 DROP 및 migration 작성은 WO §13 에 따라 수행하지 않는다.
 *
 * C. `/kpa/supplier/*` 3 endpoint — 판정 `CANONICAL_REEXPOSE`
 *    backend 는 살아 있고 operator 승인 축(`content-approval.service`)과
 *    signage forced-content 축이 실제로 소비한다. `/supplier/signage/media`
 *    (web-neture 소비)가 `/supplier/signage/campaign-requests/my-media`
 *    계약에 의존하므로 은퇴 불가. §21 에 따라 공급자 UX 를 새로 만들지 않는다.
 *
 * 이 테스트는 **재유입 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..', '..', '..');

const read = (...seg: string[]) => fs.readFileSync(path.join(SRC, ...seg), 'utf8');
const readRepo = (...seg: string[]) => fs.readFileSync(path.join(REPO, ...seg), 'utf8');

describe('WO-O4O-FROZEN-AUTH-PERMISSIONS-DB-AND-KPA-SUPPLIER-ENDPOINT-FINAL-CLOSURE-V1', () => {
  describe('A축 — organization-core PermissionGuard 는 되살아나지 않는다', () => {
    it('packages/organization-core/src/guards 디렉터리가 없다', () => {
      expect(fs.existsSync(path.join(REPO, 'packages', 'organization-core', 'src', 'guards'))).toBe(
        false,
      );
    });

    it('organization-core barrel 이 guards 를 re-export 하지 않는다', () => {
      expect(readRepo('packages', 'organization-core', 'src', 'index.ts')).not.toContain('guards');
      expect(readRepo('packages', 'organization-core', 'src', 'backend', 'index.ts')).not.toContain(
        'guards',
      );
    });

    it('실제 소비되는 organization-core export 는 유지된다', () => {
      const src = readRepo('packages', 'organization-core', 'src', 'index.ts');
      expect(src).toContain("export * from './services/index.js';");
      expect(src).toContain("export * from './utils/index.js';");
    });

    it('PermissionService 는 유지된다 (organizationPermissions 유틸의 기반)', () => {
      expect(
        fs.existsSync(
          path.join(REPO, 'packages', 'organization-core', 'src', 'services', 'PermissionService.ts'),
        ),
      ).toBe(true);
    });
  });

  describe('B축 — users.permissions 는 권한 축으로 되살아나지 않는다', () => {
    it('User.getAllPermissions 가 users.permissions 스냅샷을 읽지 않는다', () => {
      const src = read('modules', 'auth', 'entities', 'User.ts');
      expect(src).not.toContain('new Set([...(this.permissions || [])])');
    });

    it('컬럼 정의는 유지된다 (실제 DROP · migration 은 WO §13 금지)', () => {
      expect(read('modules', 'auth', 'entities', 'User.ts')).toContain('permissions!: string[];');
    });

    it('DROP migration 파일이 작성되지 않았다', () => {
      const dir = path.join(SRC, 'database', 'migrations');
      const offenders = fs
        .readdirSync(dir)
        .filter((f) => /DropUsersPermissions|RemoveUsersPermissions/i.test(f));
      expect(offenders).toEqual([]);
    });

    it('JWT permissions claim 은 재발급되지 않는다', () => {
      expect(read('utils', 'token.utils.ts')).not.toContain('permissions: user.permissions');
    });
  });

  describe('C축 — /kpa/supplier/* canonical 면은 은퇴되지 않는다', () => {
    const routes = () => read('routes', 'kpa', 'kpa.routes.ts');

    it('3 endpoint 마운트가 유지된다', () => {
      const src = routes();
      expect(src).toContain(`'/supplier/content-submissions'`);
      expect(src).toContain(`'/supplier/signage/campaign-requests'`);
      expect(src).toContain(`'/supplier/signage'`);
    });

    it('web-neture 가 소비하는 supplier 면도 유지된다 (은퇴 오판 방지)', () => {
      const src = routes();
      expect(src).toContain(`'/supplier/signage/media'`);
      expect(src).toContain(`'/supplier/screen-sets'`);
    });

    it('operator 승인 축이 두 entity_type 을 계속 처리한다', () => {
      const src = read('routes', 'kpa', 'services', 'content-approval.service.ts');
      expect(src).toContain('signage_campaign_request');
      expect(src).toContain('hub_content_submission');
    });

    it('공급자 UX 를 새로 만들지 않는다 — admin 로컬 supplierops 화면은 없다', () => {
      expect(
        fs.existsSync(path.join(REPO, 'apps', 'admin-dashboard', 'src', 'pages', 'supplierops')),
      ).toBe(false);
    });
  });
});
