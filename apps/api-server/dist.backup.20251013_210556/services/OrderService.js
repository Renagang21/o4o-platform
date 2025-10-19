"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const connection_1 = require("../database/connection");
const Order_1 = require("../entities/Order");
const User_1 = require("../entities/User");
const Cart_1 = require("../entities/Cart");
const CartItem_1 = require("../entities/CartItem");
const Partner_1 = require("../entities/Partner");
const PartnerCommission_1 = require("../entities/PartnerCommission");
const Product_1 = require("../entities/Product");
const logger_1 = __importDefault(require("../utils/logger"));
class OrderService {
    constructor() {
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        this.cartRepository = connection_1.AppDataSource.getRepository(Cart_1.Cart);
        this.cartItemRepository = connection_1.AppDataSource.getRepository(CartItem_1.CartItem);
        this.partnerRepository = connection_1.AppDataSource.getRepository(Partner_1.Partner);
        this.partnerCommissionRepository = connection_1.AppDataSource.getRepository(PartnerCommission_1.PartnerCommission);
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
    }
    /**
     * Create order from items directly
     */
    async createOrder(buyerId, request) {
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Get buyer information
            const buyer = await this.userRepository.findOne({ where: { id: buyerId } });
            if (!buyer) {
                throw new Error('Buyer not found');
            }
            // Validate items if provided
            if (!request.items || request.items.length === 0) {
                throw new Error('Order must contain at least one item');
            }
            // Calculate order summary
            const summary = this.calculateOrderSummary(request.items);
            // Create order
            const order = new Order_1.Order();
            order.orderNumber = this.generateOrderNumber();
            order.buyerId = buyerId;
            order.buyerType = buyer.role;
            order.buyerName = buyer.name;
            order.buyerEmail = buyer.email;
            order.items = request.items;
            order.summary = summary;
            order.billingAddress = request.billingAddress;
            order.shippingAddress = request.shippingAddress;
            order.paymentMethod = request.paymentMethod;
            order.notes = request.notes;
            order.customerNotes = request.customerNotes;
            order.status = Order_1.OrderStatus.PENDING;
            order.paymentStatus = Order_1.PaymentStatus.PENDING;
            const savedOrder = await queryRunner.manager.save(Order_1.Order, order);
            await queryRunner.commitTransaction();
            logger_1.default.info(`Order created: ${savedOrder.orderNumber}`, {
                orderId: savedOrder.id,
                buyerId,
                total: savedOrder.summary.total
            });
            return savedOrder;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            logger_1.default.error('Failed to create order:', error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Create order from cart
     */
    async createOrderFromCart(buyerId, request) {
        const queryRunner = connection_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // Get cart with items
            const cart = await this.cartRepository.findOne({
                where: { userId: buyerId },
                relations: ['items', 'items.product']
            });
            if (!cart || !cart.items || cart.items.length === 0) {
                throw new Error('Cart is empty or not found');
            }
            // Convert cart items to order items
            const orderItems = cart.items.map((cartItem) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    id: cartItem.id,
                    productId: cartItem.productId,
                    productName: ((_a = cartItem.product) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown Product',
                    productSku: ((_b = cartItem.product) === null || _b === void 0 ? void 0 : _b.sku) || '',
                    productImage: ((_c = cartItem.product) === null || _c === void 0 ? void 0 : _c.featuredImageUrl) || '',
                    productBrand: (_d = cartItem.product) === null || _d === void 0 ? void 0 : _d.brand,
                    quantity: cartItem.quantity,
                    unitPrice: cartItem.unitPrice || 0,
                    totalPrice: (cartItem.unitPrice || 0) * cartItem.quantity,
                    supplierId: ((_e = cartItem.product) === null || _e === void 0 ? void 0 : _e.supplierId) || '',
                    supplierName: ((_f = cartItem.product) === null || _f === void 0 ? void 0 : _f.supplierName) || '',
                    attributes: cartItem.attributes
                });
            });
            // Create order using the items
            const order = await this.createOrder(buyerId, {
                items: orderItems,
                billingAddress: request.billingAddress,
                shippingAddress: request.shippingAddress,
                paymentMethod: request.paymentMethod,
                notes: request.notes,
                customerNotes: request.customerNotes
            });
            // Clear cart after successful order creation
            await queryRunner.manager.remove(CartItem_1.CartItem, cart.items);
            await queryRunner.manager.remove(Cart_1.Cart, cart);
            await queryRunner.commitTransaction();
            logger_1.default.info(`Order created from cart: ${order.orderNumber}`, {
                orderId: order.id,
                buyerId,
                cartId: request.cartId
            });
            return order;
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            logger_1.default.error('Failed to create order from cart:', error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    /**
     * Get orders with filters
     */
    async getOrders(filters = {}) {
        const query = this.orderRepository.createQueryBuilder('order')
            .leftJoinAndSelect('order.buyer', 'buyer');
        // Apply filters
        if (filters.status) {
            query.andWhere('order.status = :status', { status: filters.status });
        }
        if (filters.paymentStatus) {
            query.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus: filters.paymentStatus });
        }
        if (filters.buyerType) {
            query.andWhere('order.buyerType = :buyerType', { buyerType: filters.buyerType });
        }
        if (filters.dateFrom) {
            query.andWhere('order.orderDate >= :dateFrom', { dateFrom: filters.dateFrom });
        }
        if (filters.dateTo) {
            query.andWhere('order.orderDate <= :dateTo', { dateTo: filters.dateTo });
        }
        if (filters.minAmount) {
            query.andWhere('CAST(order.summary->>\'total\' AS DECIMAL) >= :minAmount', { minAmount: filters.minAmount });
        }
        if (filters.maxAmount) {
            query.andWhere('CAST(order.summary->>\'total\' AS DECIMAL) <= :maxAmount', { maxAmount: filters.maxAmount });
        }
        if (filters.search) {
            query.andWhere('(order.orderNumber ILIKE :search OR order.buyerName ILIKE :search OR order.buyerEmail ILIKE :search)', { search: `%${filters.search}%` });
        }
        // Sorting
        const sortBy = filters.sortBy || 'orderDate';
        const sortOrder = filters.sortOrder || 'desc';
        switch (sortBy) {
            case 'totalAmount':
                query.orderBy('CAST(order.summary->>\'total\' AS DECIMAL)', sortOrder.toUpperCase());
                break;
            case 'status':
                query.orderBy('order.status', sortOrder.toUpperCase());
                break;
            case 'buyerName':
                query.orderBy('order.buyerName', sortOrder.toUpperCase());
                break;
            default:
                query.orderBy('order.orderDate', sortOrder.toUpperCase());
        }
        // Pagination
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const offset = (page - 1) * limit;
        query.skip(offset).take(limit);
        const [orders, total] = await query.getManyAndCount();
        return { orders, total };
    }
    /**
     * Get single order by ID
     */
    async getOrderById(orderId, buyerId) {
        const query = this.orderRepository.createQueryBuilder('order')
            .leftJoinAndSelect('order.buyer', 'buyer')
            .where('order.id = :orderId', { orderId });
        if (buyerId) {
            query.andWhere('order.buyerId = :buyerId', { buyerId });
        }
        const order = await query.getOne();
        if (!order) {
            throw new Error('Order not found');
        }
        return order;
    }
    /**
     * Update order status
     */
    async updateOrderStatus(orderId, status) {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!order) {
            throw new Error('Order not found');
        }
        order.status = status;
        // Update timestamp based on status
        switch (status) {
            case Order_1.OrderStatus.CONFIRMED:
                order.confirmedDate = new Date();
                break;
            case Order_1.OrderStatus.SHIPPED:
                order.shippingDate = new Date();
                break;
            case Order_1.OrderStatus.DELIVERED:
                order.deliveryDate = new Date();
                break;
            case Order_1.OrderStatus.CANCELLED:
                order.cancelledDate = new Date();
                break;
        }
        const savedOrder = await this.orderRepository.save(order);
        logger_1.default.info(`Order status updated: ${order.orderNumber}`, {
            orderId,
            newStatus: status
        });
        return savedOrder;
    }
    /**
     * Update payment status
     */
    async updatePaymentStatus(orderId, paymentStatus) {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!order) {
            throw new Error('Order not found');
        }
        order.paymentStatus = paymentStatus;
        if (paymentStatus === Order_1.PaymentStatus.COMPLETED) {
            order.paymentDate = new Date();
            // Auto-confirm order when payment is completed
            if (order.status === Order_1.OrderStatus.PENDING) {
                order.status = Order_1.OrderStatus.CONFIRMED;
                order.confirmedDate = new Date();
            }
        }
        const savedOrder = await this.orderRepository.save(order);
        logger_1.default.info(`Payment status updated: ${order.orderNumber}`, {
            orderId,
            newPaymentStatus: paymentStatus
        });
        return savedOrder;
    }
    /**
     * Cancel order
     */
    async cancelOrder(orderId, reason) {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!order) {
            throw new Error('Order not found');
        }
        if (!order.canBeCancelled()) {
            throw new Error('Order cannot be cancelled in current status');
        }
        order.status = Order_1.OrderStatus.CANCELLED;
        order.cancelledDate = new Date();
        order.cancellationReason = reason;
        const savedOrder = await this.orderRepository.save(order);
        logger_1.default.info(`Order cancelled: ${order.orderNumber}`, {
            orderId,
            reason
        });
        return savedOrder;
    }
    /**
     * Request refund
     */
    async requestRefund(orderId, reason, amount) {
        const order = await this.orderRepository.findOne({ where: { id: orderId } });
        if (!order) {
            throw new Error('Order not found');
        }
        if (!order.canBeRefunded()) {
            throw new Error('Order cannot be refunded');
        }
        order.returnReason = reason;
        order.refundAmount = amount || order.summary.total;
        order.paymentStatus = Order_1.PaymentStatus.REFUNDED;
        order.refundDate = new Date();
        const savedOrder = await this.orderRepository.save(order);
        logger_1.default.info(`Refund requested: ${order.orderNumber}`, {
            orderId,
            refundAmount: order.refundAmount,
            reason
        });
        return savedOrder;
    }
    /**
     * Get order statistics
     */
    async getOrderStats(buyerId) {
        const query = this.orderRepository.createQueryBuilder('order');
        if (buyerId) {
            query.where('order.buyerId = :buyerId', { buyerId });
        }
        const [orders, totalOrders] = await query.getManyAndCount();
        const totalSpent = orders.reduce((sum, order) => sum + order.summary.total, 0);
        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        const recentOrdersQuery = this.orderRepository.createQueryBuilder('order')
            .orderBy('order.orderDate', 'DESC')
            .take(5);
        if (buyerId) {
            recentOrdersQuery.where('order.buyerId = :buyerId', { buyerId });
        }
        const recentOrders = await recentOrdersQuery.getMany();
        return {
            totalOrders,
            totalSpent,
            averageOrderValue,
            recentOrders
        };
    }
    // Private helper methods
    generateOrderNumber() {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.getTime().toString().slice(-6);
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `ORD${dateStr}${timeStr}${randomStr}`;
    }
    calculateOrderSummary(items) {
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        // TODO: Implement proper discount, shipping, and tax calculation
        const discount = 0;
        const shipping = subtotal > 50000 ? 0 : 3000; // Free shipping over 50,000 KRW
        const tax = Math.round(subtotal * 0.1); // 10% tax
        const total = subtotal + shipping + tax - discount;
        return {
            subtotal,
            discount,
            shipping,
            tax,
            total
        };
    }
    /**
     * Create partner commissions for order (문서 #66: 주문 완료 시 커미션 생성)
     */
    async createPartnerCommissions(order, referralCode) {
        if (!referralCode) {
            return [];
        }
        try {
            // 파트너 찾기
            const partner = await this.partnerRepository.findOne({
                where: { referralCode, isActive: true, status: Partner_1.PartnerStatus.ACTIVE },
                relations: ['seller']
            });
            if (!partner) {
                logger_1.default.warn(`Partner not found for referral code: ${referralCode}`);
                return [];
            }
            const commissions = [];
            // 각 주문 항목에 대해 커미션 생성
            for (const item of order.items) {
                // 제품 정보 조회
                const product = await this.productRepository.findOne({
                    where: { id: item.productId }
                });
                if (!product) {
                    logger_1.default.warn(`Product not found: ${item.productId}`);
                    continue;
                }
                // 커미션 계산 (문서 #66: 공급자가 설정한 단일 비율)
                const commissionRate = product.partnerCommissionRate || 5; // 기본 5%
                const { commission } = PartnerCommission_1.PartnerCommission.calculateCommission(item.unitPrice, item.quantity, commissionRate);
                // 커미션 엔티티 생성
                const partnerCommission = this.partnerCommissionRepository.create({
                    partnerId: partner.id,
                    orderId: order.id,
                    productId: item.productId,
                    sellerId: partner.sellerId,
                    orderAmount: item.totalPrice,
                    productPrice: item.unitPrice,
                    quantity: item.quantity,
                    commissionRate: commissionRate,
                    commissionAmount: commission,
                    referralCode: referralCode,
                    status: PartnerCommission_1.CommissionStatus.PENDING,
                    convertedAt: new Date()
                });
                const savedCommission = await this.partnerCommissionRepository.save(partnerCommission);
                commissions.push(savedCommission);
                // 파트너 성과 업데이트
                await this.updatePartnerPerformance(partner, item.totalPrice, commission);
            }
            logger_1.default.info(`Created ${commissions.length} partner commissions for order ${order.orderNumber}`);
            return commissions;
        }
        catch (error) {
            logger_1.default.error('Error creating partner commissions:', error);
            throw error;
        }
    }
    /**
     * Update partner performance metrics
     */
    async updatePartnerPerformance(partner, orderValue, commission) {
        try {
            partner.recordOrder(orderValue, commission);
            await this.partnerRepository.save(partner);
            logger_1.default.info(`Partner performance updated: ${partner.id}`);
        }
        catch (error) {
            logger_1.default.error('Error updating partner performance:', error);
        }
    }
    /**
     * Confirm partner commissions (문서 #66: 반품 기간 경과 후 커미션 확정)
     */
    async confirmPartnerCommissions(orderId) {
        try {
            const commissions = await this.partnerCommissionRepository.find({
                where: { orderId, status: PartnerCommission_1.CommissionStatus.PENDING }
            });
            for (const commission of commissions) {
                commission.confirm();
                await this.partnerCommissionRepository.save(commission);
            }
            logger_1.default.info(`Confirmed ${commissions.length} partner commissions for order ${orderId}`);
        }
        catch (error) {
            logger_1.default.error('Error confirming partner commissions:', error);
            throw error;
        }
    }
    /**
     * Cancel partner commissions (주문 취소/반품 시)
     */
    async cancelPartnerCommissions(orderId, reason) {
        try {
            const commissions = await this.partnerCommissionRepository.find({
                where: { orderId }
            });
            for (const commission of commissions) {
                if (commission.canCancel()) {
                    commission.cancel(reason);
                    await this.partnerCommissionRepository.save(commission);
                }
            }
            logger_1.default.info(`Cancelled ${commissions.length} partner commissions for order ${orderId}`);
        }
        catch (error) {
            logger_1.default.error('Error cancelling partner commissions:', error);
            throw error;
        }
    }
    /**
     * Get partner commissions for order
     */
    async getOrderCommissions(orderId) {
        try {
            return await this.partnerCommissionRepository.find({
                where: { orderId },
                relations: ['partner', 'product', 'seller']
            });
        }
        catch (error) {
            logger_1.default.error('Error fetching order commissions:', error);
            throw error;
        }
    }
    /**
     * Track referral click (파트너 링크 클릭 시)
     */
    async trackReferralClick(referralCode, metadata) {
        try {
            const partner = await this.partnerRepository.findOne({
                where: { referralCode, isActive: true, status: Partner_1.PartnerStatus.ACTIVE }
            });
            if (!partner) {
                return false;
            }
            // 클릭 추적
            partner.recordClick();
            await this.partnerRepository.save(partner);
            logger_1.default.info(`Referral click tracked: ${referralCode}`, metadata);
            return true;
        }
        catch (error) {
            logger_1.default.error('Error tracking referral click:', error);
            return false;
        }
    }
}
exports.OrderService = OrderService;
//# sourceMappingURL=OrderService.js.map