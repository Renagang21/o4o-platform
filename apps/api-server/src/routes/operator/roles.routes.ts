/**
 * Operator Role Catalog Routes
 * WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1
 *
 * roles 테이블 CRUD API.
 * MembershipConsole과 동일한 guard 패턴.
 * 조회: operator 이상(service scope 필터) · 생성/수정/삭제: platform admin 전용.
 */
import { Router } from 'express';
import { RoleController } from '../../controllers/operator/RoleController.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../utils/serviceScope.js';

const router: Router = Router();
const controller = new RoleController();

// All routes require authentication + operator-level role + service scope
router.use(authenticate);
// WO-O4O-KPA-OPERATOR-CANONICAL-ROLE-GUARD-FIX-V1: 'kpa-society:*' → canonical 'kpa:*'
//   guard 통과는 카탈로그 '조회'만 의미한다. 생성/수정/삭제는 RoleController 가
//   scope.isPlatformAdmin(platform:admin | platform:super_admin) 으로 별도 강제하므로
//   kpa:admin / kpa:operator 는 CUD 불가(조회 전용) 상태가 유지된다.
router.use(requireRole([
  'admin', 'super_admin', 'operator', 'manager',
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'cosmetics:admin', 'cosmetics:operator',
  'kpa:admin', 'kpa:operator',
]));
router.use(injectServiceScope);

// Role catalog
router.get('/', controller.getRoles);
router.get('/:name', controller.getRoleByName);
router.post('/', controller.createRole);
router.put('/:id', controller.updateRole);
router.delete('/:id', controller.deleteRole);

export default router;
