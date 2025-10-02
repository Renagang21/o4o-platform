import { Router } from 'express';
import { ThemeController } from '../../controllers/ThemeController';
import { authenticateToken } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/auth';

const router: Router = Router();
const themeController = new ThemeController();

// Public routes
router.get('/marketplace', themeController.searchMarketplace);
router.get('/:id/preview', themeController.getThemePreview);

// Protected routes
router.use(authenticateToken);
router.use(requireAdmin);

// Theme management
router.get('/', themeController.getAllThemes);
router.get('/active', themeController.getActiveTheme);
router.get('/:id', themeController.getThemeById);

// Theme installation and activation
router.post('/install', themeController.installTheme);
router.post('/upload', themeController.uploadTheme);
router.post('/:id/activate', themeController.activateTheme);
router.post('/:id/deactivate', themeController.deactivateTheme);
router.delete('/:id/uninstall', themeController.uninstallTheme);

// Theme updates and customization
router.put('/:id/update', themeController.updateTheme);
router.put('/:id/customize', themeController.saveCustomizations);

// Hook system (for testing)
router.post('/hooks/execute', themeController.executeHook);

// Customizer routes are now in /api/v1/settings/customizer

export default router;