import { Router } from 'express';
import { ACFController } from '../../controllers/acfController';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

const router: Router = Router();

// Field Groups API - v1 endpoints
router.get('/field-groups', ACFController.getFieldGroups);
router.get('/field-groups/:id', ACFController.getFieldGroup);
router.post('/field-groups', authenticateToken, requireAdmin, ACFController.createFieldGroup);
router.put('/field-groups/:id', authenticateToken, requireAdmin, ACFController.updateFieldGroup);
router.delete('/field-groups/:id', authenticateToken, requireAdmin, ACFController.deleteFieldGroup);

// Field Values API
router.get('/fields/:entityType/:entityId', ACFController.getFieldValues);
router.post('/fields/:entityType/:entityId', authenticateToken, ACFController.saveFieldValues);

// Utility endpoints
router.post('/export', authenticateToken, requireAdmin, ACFController.exportFieldGroups);
router.post('/import', authenticateToken, requireAdmin, ACFController.importFieldGroups);

// Get available field types
router.get('/field-types', (req, res) => {
  const fieldTypes = [
    { value: 'text', label: 'Text', category: 'basic' },
    { value: 'textarea', label: 'Textarea', category: 'basic' },
    { value: 'number', label: 'Number', category: 'basic' },
    { value: 'email', label: 'Email', category: 'basic' },
    { value: 'url', label: 'URL', category: 'basic' },
    { value: 'password', label: 'Password', category: 'basic' },
    { value: 'select', label: 'Select', category: 'choice' },
    { value: 'checkbox', label: 'Checkbox', category: 'choice' },
    { value: 'radio', label: 'Radio Button', category: 'choice' },
    { value: 'toggle', label: 'Toggle', category: 'choice' },
    { value: 'date', label: 'Date', category: 'datetime' },
    { value: 'datetime_local', label: 'Date Time', category: 'datetime' },
    { value: 'time', label: 'Time', category: 'datetime' },
    { value: 'image', label: 'Image', category: 'media' },
    { value: 'file', label: 'File', category: 'media' },
    { value: 'gallery', label: 'Gallery', category: 'media' },
    { value: 'wysiwyg', label: 'WYSIWYG Editor', category: 'content' },
    { value: 'code', label: 'Code', category: 'content' },
    { value: 'color', label: 'Color Picker', category: 'layout' },
    { value: 'range', label: 'Range', category: 'layout' },
    { value: 'repeater', label: 'Repeater', category: 'layout' },
    { value: 'group', label: 'Group', category: 'layout' },
    { value: 'taxonomy', label: 'Taxonomy', category: 'relational' },
    { value: 'post_object', label: 'Post Object', category: 'relational' },
    { value: 'page_link', label: 'Page Link', category: 'relational' },
    { value: 'user', label: 'User', category: 'relational' }
  ];

  res.json({
    success: true,
    data: fieldTypes
  });
});

export default router;