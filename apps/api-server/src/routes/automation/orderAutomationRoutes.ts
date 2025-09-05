import { Router } from 'express';
import { OrderAutomationController } from '../../controllers/automation/orderAutomationController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitConfig } from '../../config/production.config';

const router: Router = Router();
const orderAutomationController = new OrderAutomationController();

// Apply authentication to all automation routes
router.use(authMiddleware);

// Apply rate limiting for automation operations
router.use((rateLimitConfig as any).automation || rateLimitConfig.general);

// Order Automation APIs (5 endpoints)
router.post('/rules', orderAutomationController.createAutomationRule);
router.get('/rules', orderAutomationController.getAutomationRules);
router.put('/rules/:id', orderAutomationController.updateAutomationRule);
router.post('/trigger', orderAutomationController.triggerAutomation);
router.get('/logs', orderAutomationController.getAutomationLogs);

// Bonus endpoints for automation management
router.get('/stats', orderAutomationController.getAutomationStats);
router.post('/setup-defaults', orderAutomationController.setupDefaultRules);
router.post('/test/:id', orderAutomationController.testAutomationRule);
router.delete('/rules/:id', orderAutomationController.deleteAutomationRule);

export default router;