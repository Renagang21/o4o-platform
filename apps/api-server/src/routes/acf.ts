import { Router } from 'express';
import { ACFController } from '../controllers/acfController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router: Router = Router();

// Field Groups
router.get('/custom-field-groups', ACFController.getFieldGroups);
router.get('/custom-field-groups/:id', ACFController.getFieldGroup);
router.post('/custom-field-groups', authenticateToken, requireAdmin, ACFController.createFieldGroup);
router.put('/custom-field-groups/:id', authenticateToken, requireAdmin, ACFController.updateFieldGroup);
router.delete('/custom-field-groups/:id', authenticateToken, requireAdmin, ACFController.deleteFieldGroup);

// Legacy routes for compatibility
router.get('/custom-fields/groups', ACFController.getFieldGroups);
router.get('/custom-fields/groups/:id', ACFController.getFieldGroup);
router.post('/custom-fields/groups', authenticateToken, requireAdmin, ACFController.createFieldGroup);
router.put('/custom-fields/groups/:id', authenticateToken, requireAdmin, ACFController.updateFieldGroup);
router.delete('/custom-fields/groups/:id', authenticateToken, requireAdmin, ACFController.deleteFieldGroup);

// Field Values
router.get('/custom-fields/:entityType/:entityId', ACFController.getFieldValues);
router.post('/custom-fields/:entityType/:entityId', authenticateToken, ACFController.saveFieldValues);

// Export/Import
router.post('/custom-fields/export', authenticateToken, requireAdmin, ACFController.exportFieldGroups);
router.post('/custom-fields/import', authenticateToken, requireAdmin, ACFController.importFieldGroups);

export default router;