/**
 * Channels Routes
 * Phase PD-9: Multichannel RPA 1차
 *
 * API routes for multichannel management
 */

import { Router } from 'express';
import { ChannelsController } from '../../controllers/v1/channels.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { ensureAuthenticated } from '../../middleware/permission.middleware.js';

const router: Router = Router();

// All routes require authentication
router.use(requireAuth);
router.use(ensureAuthenticated);

// Available channels
router.get('/', ChannelsController.listAvailableChannels);

// Channel account management
router.get('/accounts', ChannelsController.getChannelAccounts);
router.post('/accounts', ChannelsController.createChannelAccount);
router.put('/accounts/:id', ChannelsController.updateChannelAccount);
router.delete('/accounts/:id', ChannelsController.deleteChannelAccount);

// Product management
router.post('/accounts/:accountId/products', ChannelsController.createProductLinks);
router.post('/accounts/:accountId/products/export', ChannelsController.exportProducts);
router.get('/accounts/:accountId/products', ChannelsController.getProductLinks);
router.delete('/products/links/:linkId', ChannelsController.deleteProductLink);

// Order management
router.post('/accounts/:accountId/orders/import', ChannelsController.importOrders);
router.get('/accounts/:accountId/orders', ChannelsController.getOrderLinks);
router.get('/accounts/:accountId/stats', ChannelsController.getImportStats);
router.post('/orders/links/:linkId/retry', ChannelsController.retryOrderImport);

export default router;
