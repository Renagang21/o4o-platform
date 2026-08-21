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
//   scope.isPlatformAdmin(platform:super_admin) 으로 별도 강제하므로
//   kpa:admin / kpa:operator 는 CUD 불가(조회 전용) 상태가 유지된다.
// WO-O4O-ADMIN-LEGACY-SUPER-ADMIN-NOOP-CLEANUP-V1:
//   requireRole → hasAnyRole 은 role_assignments 에 대한 In() 정확 문자열 매칭이다.
//   무접두 'super_admin' 은 역할 카탈로그에 정의가 없고 보유자 0명이라 무효항 → 제거(판정 불변).
//   'admin'/'operator'/'manager' 는 본 WO 범위 밖이라 유지한다.
router.use(requireRole([
  'admin', 'operator', 'manager',
  'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'cosmetics:admin', 'cosmetics:operator',
  'kpa:admin', 'kpa:operator',
  // WO-O4O-PHARMACYHUB-OPERATOR-COMMUNITY-AND-COMMON-CAPABILITY-FULL-ADOPTION-V1:
  //   공통 API 는 이미 service scope 로 격리되는데 allowlist 에만 pharmacy-hub 가 빠져 있었다.
  //   (injectServiceScope 가 'pharmacy-hub' 를 self-map 하므로 데이터 경계는 그대로다.)
  'pharmacy-hub:admin', 'pharmacy-hub:operator',
]));
router.use(injectServiceScope);

// Role catalog
router.get('/', controller.getRoles);
router.get('/:name', controller.getRoleByName);
router.post('/', controller.createRole);
router.put('/:id', controller.updateRole);
router.delete('/:id', controller.deleteRole);

export default router;
