/**
 * WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1
 *   — A/B/D/E/F 축 재유입 방지 계약 테스트
 *
 * A. admin `/supplierops/*` 라우트 + 로컬 pages/supplierops
 *    판정 LEGACY_DEAD — appId 'supplierops' 가 appsCatalog · app_registry 어디에도
 *    없어 AppRouteGuard 가 항상 app-disabled 로 보내던 도달 불가 라우트였다.
 *    serviceGroup id 'supplierops' 는 multi-tenant 소비처가 있어 유지한다.
 *
 * B. `packages/partnerops` (`@o4o/partnerops`)
 *    판정 DEAD — import 소비처 0 · api-server mount 0. package + root build script +
 *    lockfile workspace 항목을 제거했다. `packages/partner-core` 는 무접촉이다.
 *
 * D. JWT `permissions` claim / `users.permissions` 스냅샷 / account-linking 병합
 *    claim consumer 0, 컬럼 read 는 `getAllPermissions` 하나, write 는 account-linking
 *    병합 하나였다. 셋 다 제거해 `users.permissions` 는 DROP_READY 가 되었다.
 *    실제 컬럼 DROP · migration 은 WO §16 에 따라 수행하지 않는다.
 *
 * E. `signage-role.middleware` 의 `user.dbRoles` dead branch 5개
 *    dbRoles ManyToMany 는 Phase3-E 에서 삭제돼 producer 가 0 이다.
 *
 * 이 테스트는 **재유입 방지 계약**이다. DB·네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..', '..', '..');

const read = (...seg: string[]) => fs.readFileSync(path.join(SRC, ...seg), 'utf8');
const readRepo = (...seg: string[]) => fs.readFileSync(path.join(REPO, ...seg), 'utf8');

describe('WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1', () => {
  describe('A축 — /supplierops/* 는 재등록되지 않는다', () => {
    it('admin-dashboard 에 pages/supplierops 디렉터리가 없다', () => {
      expect(
        fs.existsSync(path.join(REPO, 'apps', 'admin-dashboard', 'src', 'pages', 'supplierops')),
      ).toBe(false);
    });

    it('apps.routes 에 /supplierops/* 라우트 등록이 없다', () => {
      const src = readRepo('apps', 'admin-dashboard', 'src', 'routes', 'apps.routes.tsx');
      expect(src).not.toContain('path="/supplierops/*"');
      expect(src).not.toContain('SupplierOpsRouter');
    });

    it('appsCatalog 에 supplierops appId 가 없다 (serviceGroup id 는 유지)', () => {
      const src = read('app-manifests', 'appsCatalog.ts');
      expect(src).not.toContain(`appId: 'supplierops'`);
    });

    it('공급자 canonical backend 는 그대로 마운트되어 있다', () => {
      const src = read('routes', 'kpa', 'kpa.routes.ts');
      expect(src).toContain(`'/supplier/content-submissions'`);
      expect(src).toContain(`'/supplier/signage/campaign-requests'`);
    });
  });

  describe('B축 — packages/partnerops 는 되살아나지 않는다', () => {
    it('packages/partnerops 패키지가 없다', () => {
      // node_modules 는 로컬 설치 잔재라 소스 엔트리(package.json · src/index.ts)로 판정한다.
      expect(fs.existsSync(path.join(REPO, 'packages', 'partnerops', 'package.json'))).toBe(false);
      expect(fs.existsSync(path.join(REPO, 'packages', 'partnerops', 'src'))).toBe(false);
    });

    it('root package.json 이 @o4o/partnerops 를 빌드하지 않는다', () => {
      expect(readRepo('package.json')).not.toContain('@o4o/partnerops');
    });

    it('lockfile 에 packages/partnerops workspace 항목이 없다', () => {
      expect(readRepo('pnpm-lock.yaml')).not.toContain('packages/partnerops:');
    });

    it('packages/partner-core 는 그대로 남아 있다 (§9 보호 대상)', () => {
      expect(fs.existsSync(path.join(REPO, 'packages', 'partner-core'))).toBe(true);
    });
  });

  describe('D축 — permissions 스냅샷은 권한 축으로 되살아나지 않는다', () => {
    it('token.utils 가 permissions claim 을 발급하지 않는다', () => {
      const src = read('utils', 'token.utils.ts');
      expect(src).not.toContain('permissions: user.permissions');
      expect(src).not.toMatch(/^\s*permissions: \[\],/m);
    });

    it('AccessTokenPayload 에 permissions claim 이 없다', () => {
      const src = read('types', 'auth.ts');
      expect(src).not.toMatch(/^\s*permissions\?: string\[\];/m);
    });

    it('User.getAllPermissions 가 users.permissions 스냅샷을 읽지 않는다', () => {
      const src = read('modules', 'auth', 'entities', 'User.ts');
      expect(src).not.toContain('new Set([...(this.permissions || [])])');
    });

    it('account-linking 이 permissions 를 병합하지 않는다', () => {
      const src = read('services', 'account-linking.service.ts');
      expect(src).not.toContain('mergeFields.permissions');
    });

    it('account-linking 의 다른 identity field 병합은 유지된다', () => {
      const src = read('services', 'account-linking.service.ts');
      expect(src).toContain('mergeFields.businessInfo');
      expect(src).toContain('mergeFields.roles');
    });

    it('users.permissions 컬럼 정의는 유지된다 (DROP 은 별도 WO)', () => {
      const src = read('modules', 'auth', 'entities', 'User.ts');
      expect(src).toContain('permissions!: string[];');
    });
  });

  describe('E축 — signage dbRoles dead branch 는 되살아나지 않는다', () => {
    const signage = () => read('middleware', 'signage-role.middleware.ts');

    it('signage-role.middleware 에 dbRoles grant 분기가 없다', () => {
      expect(signage()).not.toContain('user.dbRoles?.some');
    });

    it('canonical signage 권한 축(role · service membership)은 유지된다', () => {
      const src = signage();
      expect(src).toContain('hasPlatformRole');
      expect(src).toContain('hasActiveServiceMembership');
    });
  });

  describe('F축 — legacy role 모니터링 잔재', () => {
    it('소비처 0 이 된 logLegacyRoleUsage 가 제거되었다', () => {
      expect(read('utils', 'role.utils.ts')).not.toContain('export function logLegacyRoleUsage');
    });
  });
});
