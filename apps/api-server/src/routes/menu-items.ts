import { Router } from 'express';
import { MenuController } from '../controllers/menu/MenuController.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { checkRole } from '../middleware/checkRole.js';

const router: Router = Router();
const menuController = new MenuController();

// All menu item routes require authentication
router.use(authenticate);

// Admin and Editor routes
router.post('/', checkRole(['admin', 'editor']), menuController.addMenuItem);
router.put('/:id', checkRole(['admin', 'editor']), menuController.updateMenuItem);
router.delete('/:id', checkRole(['admin', 'editor']), menuController.deleteMenuItem);

export default router;