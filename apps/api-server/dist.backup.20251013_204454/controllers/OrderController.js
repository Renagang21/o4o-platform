"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const OrderService_1 = require("../services/OrderService");
const Order_1 = require("../entities/Order");
const express_validator_1 = require("express-validator");
const logger_1 = __importDefault(require("../utils/logger"));
class OrderController {
    constructor() {
        /**
         * GET /api/orders
         * Get user's orders with filtering
         */
        this.getOrders = async (req, res, next) => {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                const filters = {
                    ...req.query,
                    page: req.query.page ? parseInt(req.query.page) : 1,
                    limit: req.query.limit ? parseInt(req.query.limit) : 10
                };
                // For non-admin users, only show their own orders
                if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
                    // Add buyer filter implicitly by modifying the service call
                }
                const result = await this.orderService.getOrders(filters);
                res.json({
                    success: true,
                    data: result.orders,
                    pagination: {
                        current: filters.page || 1,
                        pageSize: filters.limit || 10,
                        total: result.total,
                        totalPages: Math.ceil(result.total / (filters.limit || 10))
                    }
                });
            }
            catch (error) {
                logger_1.default.error('Error getting orders:', error);
                next(error);
            }
        };
        /**
         * GET /api/orders/:id
         * Get single order by ID
         */
        this.getOrder = async (req, res, next) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                // For non-admin users, only allow access to their own orders
                const buyerId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'admin' ? undefined : userId;
                const order = await this.orderService.getOrderById(id, buyerId);
                res.json({
                    success: true,
                    data: order
                });
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Order not found') {
                    res.status(404).json({ success: false, message: 'Order not found' });
                    return;
                }
                logger_1.default.error('Error getting order:', error);
                next(error);
            }
        };
        /**
         * POST /api/orders
         * Create new order directly
         */
        this.createOrder = async (req, res, next) => {
            var _a;
            try {
                // Validate input
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation error',
                        errors: errors.array()
                    });
                    return;
                }
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                const orderRequest = req.body;
                const order = await this.orderService.createOrder(userId, orderRequest);
                res.status(201).json({
                    success: true,
                    data: order,
                    message: 'Order created successfully'
                });
            }
            catch (error) {
                logger_1.default.error('Error creating order:', error);
                next(error);
            }
        };
        /**
         * POST /api/orders/from-cart
         * Create order from cart
         */
        this.createOrderFromCart = async (req, res, next) => {
            var _a;
            try {
                // Validate input
                const errors = (0, express_validator_1.validationResult)(req);
                if (!errors.isEmpty()) {
                    res.status(400).json({
                        success: false,
                        message: 'Validation error',
                        errors: errors.array()
                    });
                    return;
                }
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                const orderRequest = {
                    ...req.body,
                    cartId: req.body.cartId || userId // Use userId as cartId if not provided
                };
                const order = await this.orderService.createOrderFromCart(userId, orderRequest);
                res.status(201).json({
                    success: true,
                    data: order,
                    message: 'Order created successfully from cart'
                });
            }
            catch (error) {
                if (error instanceof Error && error.message.includes('Cart is empty')) {
                    res.status(400).json({ success: false, message: error.message });
                    return;
                }
                logger_1.default.error('Error creating order from cart:', error);
                next(error);
            }
        };
        /**
         * PATCH /api/orders/:id/status
         * Update order status (admin only)
         */
        this.updateOrderStatus = async (req, res, next) => {
            var _a;
            try {
                const { id } = req.params;
                const { status } = req.body;
                // Only admin can update order status
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                    res.status(403).json({ success: false, message: 'Forbidden' });
                    return;
                }
                if (!Object.values(Order_1.OrderStatus).includes(status)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid status',
                        validStatuses: Object.values(Order_1.OrderStatus)
                    });
                    return;
                }
                const order = await this.orderService.updateOrderStatus(id, status);
                res.json({
                    success: true,
                    data: order,
                    message: 'Order status updated successfully'
                });
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Order not found') {
                    res.status(404).json({ success: false, message: 'Order not found' });
                    return;
                }
                logger_1.default.error('Error updating order status:', error);
                next(error);
            }
        };
        /**
         * PATCH /api/orders/:id/payment-status
         * Update payment status (admin only)
         */
        this.updatePaymentStatus = async (req, res, next) => {
            var _a;
            try {
                const { id } = req.params;
                const { paymentStatus } = req.body;
                // Only admin can update payment status
                if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'admin') {
                    res.status(403).json({ success: false, message: 'Forbidden' });
                    return;
                }
                if (!Object.values(Order_1.PaymentStatus).includes(paymentStatus)) {
                    res.status(400).json({
                        success: false,
                        message: 'Invalid payment status',
                        validStatuses: Object.values(Order_1.PaymentStatus)
                    });
                    return;
                }
                const order = await this.orderService.updatePaymentStatus(id, paymentStatus);
                res.json({
                    success: true,
                    data: order,
                    message: 'Payment status updated successfully'
                });
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Order not found') {
                    res.status(404).json({ success: false, message: 'Order not found' });
                    return;
                }
                logger_1.default.error('Error updating payment status:', error);
                next(error);
            }
        };
        /**
         * POST /api/orders/:id/cancel
         * Cancel order
         */
        this.cancelOrder = async (req, res, next) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const { reason } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                // First check if user owns this order (unless admin)
                if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
                    await this.orderService.getOrderById(id, userId);
                }
                const order = await this.orderService.cancelOrder(id, reason);
                res.json({
                    success: true,
                    data: order,
                    message: 'Order cancelled successfully'
                });
            }
            catch (error) {
                if (error instanceof Error) {
                    if (error.message === 'Order not found') {
                        res.status(404).json({ success: false, message: 'Order not found' });
                        return;
                    }
                    if (error.message.includes('cannot be cancelled')) {
                        res.status(400).json({ success: false, message: error.message });
                        return;
                    }
                }
                logger_1.default.error('Error cancelling order:', error);
                next(error);
            }
        };
        /**
         * POST /api/orders/:id/refund
         * Request refund
         */
        this.requestRefund = async (req, res, next) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const { reason, amount } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                if (!reason) {
                    res.status(400).json({ success: false, message: 'Reason is required' });
                    return;
                }
                // First check if user owns this order (unless admin)
                if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin') {
                    await this.orderService.getOrderById(id, userId);
                }
                const order = await this.orderService.requestRefund(id, reason, amount);
                res.json({
                    success: true,
                    data: order,
                    message: 'Refund requested successfully'
                });
            }
            catch (error) {
                if (error instanceof Error) {
                    if (error.message === 'Order not found') {
                        res.status(404).json({ success: false, message: 'Order not found' });
                        return;
                    }
                    if (error.message.includes('cannot be refunded')) {
                        res.status(400).json({ success: false, message: error.message });
                        return;
                    }
                }
                logger_1.default.error('Error requesting refund:', error);
                next(error);
            }
        };
        /**
         * POST /api/orders/:id/reorder
         * Create new order based on existing order
         */
        this.reorder = async (req, res, next) => {
            var _a;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                // Get original order
                const originalOrder = await this.orderService.getOrderById(id, userId);
                // Create new order with same items and addresses
                const newOrderRequest = {
                    items: originalOrder.items,
                    billingAddress: originalOrder.billingAddress,
                    shippingAddress: originalOrder.shippingAddress,
                    paymentMethod: originalOrder.paymentMethod,
                    notes: `Reorder from ${originalOrder.orderNumber}`
                };
                const newOrder = await this.orderService.createOrder(userId, newOrderRequest);
                res.status(201).json({
                    success: true,
                    data: newOrder,
                    message: 'Reorder created successfully'
                });
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Order not found') {
                    res.status(404).json({ success: false, message: 'Order not found' });
                    return;
                }
                logger_1.default.error('Error reordering:', error);
                next(error);
            }
        };
        /**
         * GET /api/orders/stats
         * Get order statistics
         */
        this.getOrderStats = async (req, res, next) => {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                // For non-admin users, only show their own stats
                const buyerId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'admin' ? undefined : userId;
                const stats = await this.orderService.getOrderStats(buyerId);
                res.json({
                    success: true,
                    data: stats
                });
            }
            catch (error) {
                logger_1.default.error('Error getting order stats:', error);
                next(error);
            }
        };
        /**
         * GET /api/orders/:id/tracking
         * Get order tracking information
         */
        this.getOrderTracking = async (req, res, next) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                const buyerId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'admin' ? undefined : userId;
                const order = await this.orderService.getOrderById(id, buyerId);
                if (!order.trackingNumber) {
                    res.status(404).json({
                        success: false,
                        message: 'Tracking information not available'
                    });
                    return;
                }
                // TODO: Integrate with actual shipping carrier APIs
                const trackingData = {
                    trackingNumber: order.trackingNumber,
                    carrier: 'CJ대한통운', // Default carrier
                    status: order.status,
                    estimatedDelivery: null,
                    history: [
                        {
                            status: 'Order Confirmed',
                            location: '온라인',
                            timestamp: order.confirmedDate,
                            description: '주문이 확인되었습니다.'
                        },
                        ...(order.shippingDate ? [{
                                status: 'Shipped',
                                location: '물류센터',
                                timestamp: order.shippingDate,
                                description: '상품이 출고되었습니다.'
                            }] : []),
                        ...(order.deliveryDate ? [{
                                status: 'Delivered',
                                location: order.shippingAddress.address,
                                timestamp: order.deliveryDate,
                                description: '배송이 완료되었습니다.'
                            }] : [])
                    ]
                };
                res.json({
                    success: true,
                    data: trackingData
                });
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Order not found') {
                    res.status(404).json({ success: false, message: 'Order not found' });
                    return;
                }
                logger_1.default.error('Error getting order tracking:', error);
                next(error);
            }
        };
        /**
         * GET /api/orders/:id/invoice
         * Download order invoice
         */
        this.downloadInvoice = async (req, res, next) => {
            var _a, _b;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    res.status(401).json({ success: false, message: 'Unauthorized' });
                    return;
                }
                const buyerId = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'admin' ? undefined : userId;
                const order = await this.orderService.getOrderById(id, buyerId);
                // TODO: Generate PDF invoice
                // For now, return order data as JSON
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.orderNumber}.json"`);
                res.json({
                    invoice: {
                        orderNumber: order.orderNumber,
                        orderDate: order.orderDate,
                        buyer: {
                            name: order.buyerName,
                            email: order.buyerEmail
                        },
                        items: order.items,
                        summary: order.summary,
                        billingAddress: order.billingAddress
                    }
                });
            }
            catch (error) {
                if (error instanceof Error && error.message === 'Order not found') {
                    res.status(404).json({ success: false, message: 'Order not found' });
                    return;
                }
                logger_1.default.error('Error downloading invoice:', error);
                next(error);
            }
        };
        this.orderService = new OrderService_1.OrderService();
    }
}
exports.OrderController = OrderController;
//# sourceMappingURL=OrderController.js.map