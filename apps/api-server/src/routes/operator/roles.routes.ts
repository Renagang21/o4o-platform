/**
 * Operator Role Catalog Routes
 * WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1
 *
 * roles 테이블 CRUD API.
 * MembershipConsole과 동일한 guard 패턴.
 */
import { Router } from 'express';
import { RoleController } from '../../controllers/operator/RoleController.js';
import { authenticate, requireRole } from '../../middleware/auth.middleware.js';
import { injectServiceScope } from '../../utils/serviceScope.js';

const router: Router = Router();
const controller = new RoleController();

// All routes require authentication + operator-level role + service scope
router.use(authenticate);
router.use(requireRole([
  'admin', 'super_admin', 'operator', 'manager',
  'platform:admin', 'platform:super_admin',
  'neture:admin', 'neture:operator',
  'glycopharm:admin', 'glycopharm:operator',
  'k-cosmetics:admin', 'k-cosmetics:operator',
  'kpa-society:admin', 'kpa-society:operator',
]));
router.use(injectServiceScope);

// Role catalog
router.get('/', controller.getRoles);
router.get('/:name', controller.getRoleByName);
router.post('/', controller.createRole);
router.put('/:id', controller.updateRole);
router.delete('/:id', controller.deleteRole);

export default router;
