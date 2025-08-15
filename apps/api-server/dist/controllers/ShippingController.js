"use strict";
/**
 * Shipping Controller
 * 배송 관리 API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingController = void 0;
const ShippingService_1 = require("../services/shipping/ShippingService");
const connection_1 = require("../database/connection");
const Order_1 = require("../entities/Order");
const Shipment_1 = require("../entities/Shipment");
class ShippingController {
    constructor() {
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.shipmentRepository = connection_1.AppDataSource.getRepository(Shipment_1.Shipment);
    }
    /**
     * Get shipping rates for an order
     * GET /api/v1/shipping/rates/:orderId
     */
    async getShippingRates(req, res) {
        try {
            const { orderId } = req.params;
            const rates = await ShippingService_1.shippingService.calculateShippingRates(orderId);
            res.json({
                success: true,
                data: rates
            });
        }
        catch (error) {
            console.error('Get shipping rates error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get shipping rates'
            });
        }
    }
    /**
     * Create shipping label
     * POST /api/v1/shipping/label
     */
    async createShippingLabel(req, res) {
        try {
            const { orderId, carrier } = req.body;
            if (!orderId || !carrier) {
                return res.status(400).json({
                    success: false,
                    message: 'Order ID and carrier are required'
                });
            }
            const label = await ShippingService_1.shippingService.createShippingLabel(orderId, carrier);
            res.json({
                success: true,
                data: label
            });
        }
        catch (error) {
            console.error('Create shipping label error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create shipping label'
            });
        }
    }
    /**
     * Track shipment
     * GET /api/v1/shipping/track/:trackingNumber
     */
    async trackShipment(req, res) {
        try {
            const { trackingNumber } = req.params;
            const { carrier } = req.query;
            const tracking = await ShippingService_1.shippingService.trackShipment(trackingNumber, carrier);
            res.json({
                success: true,
                data: tracking
            });
        }
        catch (error) {
            console.error('Track shipment error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to track shipment'
            });
        }
    }
    /**
     * Cancel shipment
     * DELETE /api/v1/shipping/cancel/:trackingNumber
     */
    async cancelShipment(req, res) {
        try {
            const { trackingNumber } = req.params;
            const cancelled = await ShippingService_1.shippingService.cancelShipment(trackingNumber);
            res.json({
                success: true,
                data: { cancelled }
            });
        }
        catch (error) {
            console.error('Cancel shipment error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to cancel shipment'
            });
        }
    }
    /**
     * Get shipping history for an order
     * GET /api/v1/shipping/history/:orderId
     */
    async getShippingHistory(req, res) {
        try {
            const { orderId } = req.params;
            const history = await ShippingService_1.shippingService.getShippingHistory(orderId);
            res.json({
                success: true,
                data: history
            });
        }
        catch (error) {
            console.error('Get shipping history error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get shipping history'
            });
        }
    }
    /**
     * Webhook handler for carrier updates
     * POST /api/v1/shipping/webhook/:carrier
     */
    async handleCarrierWebhook(req, res) {
        try {
            const { carrier } = req.params;
            const data = req.body;
            await ShippingService_1.shippingService.handleCarrierWebhook(carrier, data);
            // Most carriers expect a simple 200 OK response
            res.status(200).send('OK');
        }
        catch (error) {
            console.error('Carrier webhook error:', error);
            res.status(500).json({
                success: false,
                message: 'Webhook processing failed'
            });
        }
    }
    /**
     * Get available carriers
     * GET /api/v1/shipping/carriers
     */
    async getAvailableCarriers(req, res) {
        try {
            const carriers = await ShippingService_1.shippingService.getAvailableCarriers();
            res.json({
                success: true,
                data: carriers
            });
        }
        catch (error) {
            console.error('Get carriers error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get carriers'
            });
        }
    }
    /**
     * Bulk create shipping labels
     * POST /api/v1/shipping/bulk-label
     */
    async bulkCreateLabels(req, res) {
        try {
            const { orderIds, carrier } = req.body;
            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Order IDs array is required'
                });
            }
            const results = [];
            const errors = [];
            for (const orderId of orderIds) {
                try {
                    const label = await ShippingService_1.shippingService.createShippingLabel(orderId, carrier);
                    results.push({
                        orderId,
                        success: true,
                        label
                    });
                }
                catch (error) {
                    errors.push({
                        orderId,
                        success: false,
                        error: error.message
                    });
                }
            }
            res.json({
                success: true,
                data: {
                    successful: results,
                    failed: errors,
                    summary: {
                        total: orderIds.length,
                        succeeded: results.length,
                        failed: errors.length
                    }
                }
            });
        }
        catch (error) {
            console.error('Bulk create labels error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create labels'
            });
        }
    }
    /**
     * Update all tracking information
     * POST /api/v1/shipping/update-tracking
     */
    async updateAllTracking(req, res) {
        try {
            await ShippingService_1.shippingService.updateAllTracking();
            res.json({
                success: true,
                message: 'Tracking update initiated'
            });
        }
        catch (error) {
            console.error('Update tracking error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update tracking'
            });
        }
    }
    /**
     * Get shipment statistics
     * GET /api/v1/shipping/stats
     */
    async getShipmentStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const query = this.shipmentRepository
                .createQueryBuilder('shipment')
                .select('shipment.carrier', 'carrier')
                .addSelect('shipment.status', 'status')
                .addSelect('COUNT(*)', 'count')
                .addSelect('AVG(shipment.shippingCost)', 'avgCost');
            if (startDate && endDate) {
                query.where('shipment.createdAt BETWEEN :startDate AND :endDate', {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate)
                });
            }
            const stats = await query
                .groupBy('shipment.carrier')
                .addGroupBy('shipment.status')
                .getRawMany();
            // Calculate summary
            const summary = {
                totalShipments: stats.reduce((sum, s) => sum + parseInt(s.count), 0),
                byCarrier: {},
                byStatus: {}
            };
            stats.forEach(stat => {
                // By carrier
                if (!summary.byCarrier[stat.carrier]) {
                    summary.byCarrier[stat.carrier] = {
                        total: 0,
                        avgCost: 0,
                        statuses: {}
                    };
                }
                summary.byCarrier[stat.carrier].total += parseInt(stat.count);
                summary.byCarrier[stat.carrier].avgCost = parseFloat(stat.avgCost);
                summary.byCarrier[stat.carrier].statuses[stat.status] = parseInt(stat.count);
                // By status
                if (!summary.byStatus[stat.status]) {
                    summary.byStatus[stat.status] = 0;
                }
                summary.byStatus[stat.status] += parseInt(stat.count);
            });
            res.json({
                success: true,
                data: {
                    raw: stats,
                    summary
                }
            });
        }
        catch (error) {
            console.error('Get shipment stats error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to get statistics'
            });
        }
    }
}
exports.ShippingController = ShippingController;
//# sourceMappingURL=ShippingController.js.map