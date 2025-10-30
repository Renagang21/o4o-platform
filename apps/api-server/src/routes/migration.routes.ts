import { Router } from 'express';
import { MigrationController } from '../controllers/MigrationController.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router: Router = Router();
const controller = new MigrationController();

// All migration routes require admin authentication
router.use(authenticate);

// Initialize dropshipping system (CPTs and ACF)
router.post('/initialize', controller.initializeDropshippingSystem);

// Create sample data for testing
router.post('/seed', controller.createSampleData);

// Verify system status
router.get('/status', controller.verifySystemStatus);

export default router;