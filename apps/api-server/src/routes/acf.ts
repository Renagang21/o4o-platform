import { Router } from 'express';
import { ACFController } from '../modules/cpt-acf/controllers/acf.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/permission.middleware';

const router: Router = Router();

// Field Groups
router.get('/custom-field-groups', ACFController.getFieldGroups);
router.get('/custom-field-groups/:id', ACFController.getFieldGroup);
router.post('/custom-field-groups', authenticate, requireAdmin, ACFController.createFieldGroup);
router.put('/custom-field-groups/:id', authenticate, requireAdmin, ACFController.updateFieldGroup);
router.delete('/custom-field-groups/:id', authenticate, requireAdmin, ACFController.deleteFieldGroup);

// Legacy routes for compatibility
router.get('/custom-fields/groups', ACFController.getFieldGroups);
router.get('/custom-fields/groups/:id', ACFController.getFieldGroup);
router.post('/custom-fields/groups', authenticate, requireAdmin, ACFController.createFieldGroup);
router.put('/custom-fields/groups/:id', authenticate, requireAdmin, ACFController.updateFieldGroup);
router.delete('/custom-fields/groups/:id', authenticate, requireAdmin, ACFController.deleteFieldGroup);

// Field Values
router.get('/custom-fields/:entityType/:entityId', ACFController.getFieldValues);
router.post('/custom-fields/:entityType/:entityId', authenticate, ACFController.saveFieldValues);

// Export/Import
router.post('/custom-fields/export', authenticate, requireAdmin, ACFController.exportFieldGroups);
router.post('/custom-fields/import', authenticate, requireAdmin, ACFController.importFieldGroups);

export default router;