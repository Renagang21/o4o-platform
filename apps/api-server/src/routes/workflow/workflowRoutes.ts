import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { WorkflowController } from '../../controllers/workflow/workflowController';
import { authenticate as authMiddleware } from '../../middleware/auth.middleware';
import { rateLimitConfig } from '../../config/production.config';

const router: ExpressRouter = Router();
const workflowController = new WorkflowController();

// Apply authentication to all workflow routes
router.use(authMiddleware);

// Apply rate limiting for workflow operations
router.use((rateLimitConfig as any).workflow || rateLimitConfig.general);

// Workflow Management APIs (4 endpoints)
router.get('/order-status', workflowController.getOrderStatusWorkflow);
router.post('/order-status/transition', workflowController.transitionOrderStatus);
router.get('/inventory-alerts', workflowController.getInventoryAlerts);
router.get('/commission-process', workflowController.getCommissionProcessWorkflow);

// Bonus endpoints for workflow management
router.get('/stats', workflowController.getWorkflowStats);
router.post('/validate-transition', workflowController.validateTransition);
router.get('/definition/:workflowName', workflowController.getWorkflowDefinition);
router.post('/bulk-transition', workflowController.bulkStatusTransition);
router.get('/health', workflowController.getWorkflowHealth);

export default router;