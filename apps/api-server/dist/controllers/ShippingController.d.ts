/**
 * Shipping Controller
 * 배송 관리 API
 */
import { Request, Response } from 'express';
export declare class ShippingController {
    private orderRepository;
    private shipmentRepository;
    /**
     * Get shipping rates for an order
     * GET /api/v1/shipping/rates/:orderId
     */
    getShippingRates(req: Request, res: Response): Promise<void>;
    /**
     * Create shipping label
     * POST /api/v1/shipping/label
     */
    createShippingLabel(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Track shipment
     * GET /api/v1/shipping/track/:trackingNumber
     */
    trackShipment(req: Request, res: Response): Promise<void>;
    /**
     * Cancel shipment
     * DELETE /api/v1/shipping/cancel/:trackingNumber
     */
    cancelShipment(req: Request, res: Response): Promise<void>;
    /**
     * Get shipping history for an order
     * GET /api/v1/shipping/history/:orderId
     */
    getShippingHistory(req: Request, res: Response): Promise<void>;
    /**
     * Webhook handler for carrier updates
     * POST /api/v1/shipping/webhook/:carrier
     */
    handleCarrierWebhook(req: Request, res: Response): Promise<void>;
    /**
     * Get available carriers
     * GET /api/v1/shipping/carriers
     */
    getAvailableCarriers(req: Request, res: Response): Promise<void>;
    /**
     * Bulk create shipping labels
     * POST /api/v1/shipping/bulk-label
     */
    bulkCreateLabels(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update all tracking information
     * POST /api/v1/shipping/update-tracking
     */
    updateAllTracking(req: Request, res: Response): Promise<void>;
    /**
     * Get shipment statistics
     * GET /api/v1/shipping/stats
     */
    getShipmentStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ShippingController.d.ts.map