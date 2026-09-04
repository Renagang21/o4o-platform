/**
 * WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1
 *   — A/B/C 축 재등록 방지 계약 테스트
 *
 * A. `requirePermission` / `requireAnyPermission` (authorization.middleware)
 *    판정 DEAD_UNMOUNTED — api-server 전체 route mount 0건.
 *    1차 판정이던 `user.permissions?.includes(...)` grant 분기는 프로덕션 users
 *    57행 중 permissions 가 비어 있지 않은 행이 0건이라 실행된 적이 없다.
 *    canonical 은 `requireAuth` + `require{Service}Scope` + roleAssignmentService.
 *
 * B. `NotificationType` dead member 18종
 *    판정 DEAD — src producer/consumer 0, 프로덕션 notifications.type distinct
 *    16종 중 해당 18종 row 0건(serialized contract 0).
 *    `settlement.paid` 는 §11 에 따라 canonical 정산 완료 이벤트로 활성화했다.
 *
 * C. admin `/sellerops/*` 라우트 + 로컬 pages/sellerops
 *    판정 DEAD_CATALOG — appId 'sellerops' 가 app_registry 미등록이라
 *    AppRouteGuard 가 항상 app-disabled 로 보내던 도달 불가 라우트.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB·네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..', '..', '..');

const read = (...seg: string[]) => fs.readFileSync(path.join(SRC, ...seg), 'utf8');

describe('WO-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1', () => {
  describe('A축 — permission 스냅샷 guard 는 되살아나지 않는다', () => {
    const authorization = () => read('common', 'middleware', 'auth', 'authorization.middleware.ts');

    it('authorization.middleware 에 requirePermission 정의가 없다', () => {
      expect(authorization()).not.toContain('export const requirePermission');
    });

    it('authorization.middleware 에 requireAnyPermission 정의가 없다', () => {
      expect(authorization()).not.toContain('export const requireAnyPermission');
    });

    it('authorization.middleware 에 user.permissions grant 분기가 없다', () => {
      expect(authorization()).not.toContain('user.permissions?.includes');
    });

    it('auth.middleware 가 두 미들웨어를 재수출하지 않는다', () => {
      const src = read('common', 'middleware', 'auth.middleware.ts');
      expect(src).not.toContain('requirePermission');
      expect(src).not.toContain('requireAnyPermission');
    });

    it('signage-role.middleware 에 user.permissions grant 분기가 없다', () => {
      const src = read('middleware', 'signage-role.middleware.ts');
      expect(src).not.toContain('user.permissions?.includes');
    });

    it('canonical RBAC 경로(roleAssignmentService)는 유지된다', () => {
      expect(authorization()).toContain('roleAssignmentService.hasAnyRole');
    });
  });

  describe('B축 — NotificationType dead member 는 되살아나지 않는다', () => {
    const REMOVED = [
      'order.new',
      'order.status_changed',
      'settlement.new_pending',
      'price.changed',
      'stock.low',
      'role.approved',
      'role.application_submitted',
      'member.license_expiring',
      'member.license_expired',
      'member.verification_expired',
      'member.fee_overdue_warning',
      'member.fee_overdue',
      'member.report_rejected',
      'member.education_deadline',
      'pharmacy.request_submitted',
      'pharmacy.request_approved',
      'pharmacy.request_rejected',
      'store.online_sales_order_created',
    ];

    it.each(REMOVED)('%s 는 union 에 없다', (member) => {
      expect(read('entities', 'Notification.ts')).not.toContain(`'${member}'`);
    });

    it('settlement.paid 는 union 에 남아 있다', () => {
      expect(read('entities', 'Notification.ts')).toContain(`'settlement.paid'`);
    });

    it('정산 완료 알림은 custom 이 아니라 settlement.paid 를 쓴다', () => {
      const src = read('modules', 'neture', 'services', 'neture-settlement.service.ts');
      expect(src).toContain(`type: 'settlement.paid'`);
      expect(src).not.toContain(`type: 'custom'`);
    });

    it('admin-dashboard 의 dead PD-7 Notification 블록이 없다', () => {
      const src = fs.readFileSync(
        path.join(REPO, 'apps', 'admin-dashboard', 'src', 'types', 'index.ts'),
        'utf8',
      );
      expect(src).not.toContain('export type NotificationChannel');
      expect(src).not.toContain('export interface Notification ');
    });
  });

  describe('C축 — sellerops 는 재등록되지 않는다', () => {
    it('admin-dashboard 에 pages/sellerops 디렉터리가 없다', () => {
      expect(
        fs.existsSync(path.join(REPO, 'apps', 'admin-dashboard', 'src', 'pages', 'sellerops')),
      ).toBe(false);
    });

    it('apps.routes 에 /sellerops/* 라우트 등록이 없다', () => {
      const src = fs.readFileSync(
        path.join(REPO, 'apps', 'admin-dashboard', 'src', 'routes', 'apps.routes.tsx'),
        'utf8',
      );
      expect(src).not.toContain('path="/sellerops/*"');
      expect(src).not.toContain('SellerOpsRouter');
    });

    it('appsCatalog 에 sellerops / supplierops appId 가 없다 (serviceGroup id 는 유지)', () => {
      const src = read('app-manifests', 'appsCatalog.ts');
      expect(src).not.toContain(`appId: 'sellerops'`);
      expect(src).not.toContain(`appId: 'supplierops'`);
      expect(src).toContain(`id: 'sellerops'`);
    });
  });
});
