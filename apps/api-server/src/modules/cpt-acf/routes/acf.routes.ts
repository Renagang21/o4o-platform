import { Router, IRouter } from 'express';
import { ACFController } from '../controllers/acf.controller.js';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { requireAdmin } from '../../../middleware/permission.middleware.js';

const router: IRouter = Router();

// Field Group Management Routes
router.get('/custom-field-groups', ACFController.getFieldGroups);
router.get('/custom-field-groups/:id', ACFController.getFieldGroup);
router.post('/custom-field-groups', authenticate, requireAdmin, ACFController.createFieldGroup);
router.put('/custom-field-groups/:id', authenticate, requireAdmin, ACFController.updateFieldGroup);
router.delete('/custom-field-groups/:id', authenticate, requireAdmin, ACFController.deleteFieldGroup);

// Alternative paths for backward compatibility
router.get('/custom-fields/groups', ACFController.getFieldGroups);
router.get('/custom-fields/groups/:id', ACFController.getFieldGroup);
router.post('/custom-fields/groups', authenticate, requireAdmin, ACFController.createFieldGroup);
router.put('/custom-fields/groups/:id', authenticate, requireAdmin, ACFController.updateFieldGroup);
router.delete('/custom-fields/groups/:id', authenticate, requireAdmin, ACFController.deleteFieldGroup);

// Field Value Management Routes
router.get('/custom-fields/:entityType/:entityId', ACFController.getFieldValues);
router.post('/custom-fields/:entityType/:entityId', authenticate, ACFController.saveFieldValues);

// Import/Export Routes
router.post('/custom-fields/export', authenticate, requireAdmin, ACFController.exportFieldGroups);
router.post('/custom-fields/import', authenticate, requireAdmin, ACFController.importFieldGroups);

export default router;