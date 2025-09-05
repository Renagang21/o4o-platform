import { Router } from 'express';
import { MenuController } from '../controllers/menu/MenuController';
import { authenticateToken } from '../middleware/auth';
import { checkRole } from '../middleware/checkRole';

const router: Router = Router();
const menuController = new MenuController();

// All menu item routes require authentication
router.use(authenticateToken);

// Admin and Editor routes
router.post('/', checkRole(['admin', 'editor']), menuController.addMenuItem);
router.put('/:id', checkRole(['admin', 'editor']), menuController.updateMenuItem);
router.delete('/:id', checkRole(['admin', 'editor']), menuController.deleteMenuItem);

export default router;