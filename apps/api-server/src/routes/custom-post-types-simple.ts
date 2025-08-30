import { Router } from 'express';
import { CPTController } from '../controllers/cptController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router: Router = Router();

// Public routes
router.get('/', CPTController.getAllCPTs);
router.get('/:slug', CPTController.getCPT);
router.get('/:slug/posts', CPTController.getCPTPosts);

// Admin routes
router.post('/', authenticateToken, requireAdmin, CPTController.createCPT);
router.put('/:slug', authenticateToken, requireAdmin, CPTController.updateCPT);
router.delete('/:slug', authenticateToken, requireAdmin, CPTController.deleteCPT);

// Initialize default CPTs
router.post('/init-defaults', authenticateToken, requireAdmin, CPTController.initializeDefaults);

export default router;