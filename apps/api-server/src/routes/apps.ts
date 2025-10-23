/**
 * Apps Routes
 */

import { Router } from 'express';
import { appsController } from '../controllers/apps.controller';

const router: Router = Router();

// Get all apps
router.get('/', appsController.getAll.bind(appsController));

// Get overall usage statistics
router.get('/usage/overall', appsController.getOverallUsage.bind(appsController));

// Get app by slug
router.get('/:slug', appsController.getBySlug.bind(appsController));

// Install app
router.post('/:slug/install', appsController.install.bind(appsController));

// Get app instance
router.get('/:slug/instance', appsController.getInstance.bind(appsController));

// Update app config
router.put('/:slug/config', appsController.updateConfig.bind(appsController));

// Execute app action
router.post('/:slug/execute', appsController.execute.bind(appsController));

// Get app usage statistics
router.get('/:slug/usage', appsController.getUsage.bind(appsController));

export default router;
