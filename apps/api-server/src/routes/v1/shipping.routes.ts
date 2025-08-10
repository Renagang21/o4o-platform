/**
 * Shipping Routes
 * 배송 관리 API 라우트
 */

import { Router } from 'express';
import { ShippingController } from '../../controllers/ShippingController';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

const router: any = Router();
const shippingController = new ShippingController();

// Public webhook endpoint (no auth required for carrier callbacks)
router.post('/webhook/:carrier', shippingController.handleCarrierWebhook.bind(shippingController));

// Apply authentication to all other routes
router.use(authenticateToken);

// Get shipping rates for an order
router.get('/rates/:orderId', shippingController.getShippingRates.bind(shippingController));

// Track shipment (customers can track their own orders)
router.get('/track/:trackingNumber', shippingController.trackShipment.bind(shippingController));

// Get shipping history for an order
router.get('/history/:orderId', shippingController.getShippingHistory.bind(shippingController));

// Admin only routes
router.use(requireAdmin);

// Create shipping label
router.post('/label', shippingController.createShippingLabel.bind(shippingController));

// Bulk create shipping labels
router.post('/bulk-label', shippingController.bulkCreateLabels.bind(shippingController));

// Cancel shipment
router.delete('/cancel/:trackingNumber', shippingController.cancelShipment.bind(shippingController));

// Get available carriers
router.get('/carriers', shippingController.getAvailableCarriers.bind(shippingController));

// Update all tracking information
router.post('/update-tracking', shippingController.updateAllTracking.bind(shippingController));

// Get shipment statistics
router.get('/stats', shippingController.getShipmentStats.bind(shippingController));

export default router;