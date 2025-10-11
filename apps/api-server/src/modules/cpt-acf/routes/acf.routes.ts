import { Router, IRouter } from 'express';
import { ACFController } from '../controllers/acf.controller';
import { authenticateToken } from '../../../middleware/auth';
import { requireAdmin } from '../../../middleware/permission.middleware';

const router: IRouter = Router();

// Field Group Management Routes
router.get('/custom-field-groups', ACFController.getFieldGroups);
router.get('/custom-field-groups/:id', ACFController.getFieldGroup);
router.post('/custom-field-groups', authenticateToken, requireAdmin, ACFController.createFieldGroup);
router.put('/custom-field-groups/:id', authenticateToken, requireAdmin, ACFController.updateFieldGroup);
router.delete('/custom-field-groups/:id', authenticateToken, requireAdmin, ACFController.deleteFieldGroup);

// Alternative paths for backward compatibility
router.get('/custom-fields/groups', ACFController.getFieldGroups);
router.get('/custom-fields/groups/:id', ACFController.getFieldGroup);
router.post('/custom-fields/groups', authenticateToken, requireAdmin, ACFController.createFieldGroup);
router.put('/custom-fields/groups/:id', authenticateToken, requireAdmin, ACFController.updateFieldGroup);
router.delete('/custom-fields/groups/:id', authenticateToken, requireAdmin, ACFController.deleteFieldGroup);

// Field Value Management Routes
router.get('/custom-fields/:entityType/:entityId', ACFController.getFieldValues);
router.post('/custom-fields/:entityType/:entityId', authenticateToken, ACFController.saveFieldValues);

// Import/Export Routes
router.post('/custom-fields/export', authenticateToken, requireAdmin, ACFController.exportFieldGroups);
router.post('/custom-fields/import', authenticateToken, requireAdmin, ACFController.importFieldGroups);

export default router;