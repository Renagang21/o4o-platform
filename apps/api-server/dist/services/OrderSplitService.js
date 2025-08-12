"use strict";
/**
 * Order Split Service
 * Automatically splits orders by supplier and forwards to respective suppliers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderSplitService = void 0;
const connection_1 = require("../database/connection");
const Order_1 = require("../entities/Order");
const OrderItem_1 = require("../entities/OrderItem");
const Product_1 = require("../entities/Product");
const VendorOrderItem_1 = require("../entities/VendorOrderItem");
const User_1 = require("../entities/User");
const supplier_connector_1 = require("@o4o/supplier-connector");
class OrderSplitService {
    constructor() {
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.orderItemRepository = connection_1.AppDataSource.getRepository(OrderItem_1.OrderItem);
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        this.vendorOrderItemRepository = connection_1.AppDataSource.getRepository(VendorOrderItem_1.VendorOrderItem);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        this.supplierManager = new supplier_connector_1.SupplierManager();
        this.initializeSuppliers();
    }
    /**
     * Initialize supplier connectors
     */
    async initializeSuppliers() {
        // Load supplier configurations from database or config
        // For now, we'll use sample configurations
        // Add domestic API supplier
        this.supplierManager.addSupplier('domestic-api', {
            type: 'api',
            credentials: {
                apiKey: process.env.DOMESTIC_SUPPLIER_API_KEY,
                endpoint: process.env.DOMESTIC_SUPPLIER_ENDPOINT
            },
            options: {
                rateLimit: 10,
                timeout: 30000,
                retryAttempts: 3
            }
        });
        // Add CSV catalog supplier
        this.supplierManager.addSupplier('csv-catalog', {
            type: 'csv',
            options: {
                webhookUrl: './catalogs/supplier-products.csv',
                rateLimit: 10,
                timeout: 30000,
                retryAttempts: 3
            }
        });
    }
    /**
     * Split order by supplier
     */
    async splitOrderBySupplier(orderId) {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'items.product', 'customer']
        });
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }
        // Group items by supplier/vendor
        const supplierGroups = await this.groupItemsBySupplier(order.items);
        // Create split orders
        const splitOrders = [];
        for (const [key, items] of supplierGroups.entries()) {
            const [supplierId, vendorId] = key.split(':');
            const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const totalCost = items.reduce((sum, item) => sum + (item.product.cost * item.quantity), 0);
            const commission = this.calculateCommission(totalAmount, totalCost);
            splitOrders.push({
                supplierId,
                vendorId,
                items,
                totalAmount,
                totalCost,
                commission
            });
        }
        // Forward orders to suppliers
        await this.forwardToSuppliers(order, splitOrders);
        // Create vendor order items for tracking
        await this.createVendorOrderItems(order, splitOrders);
        return splitOrders;
    }
    /**
     * Group order items by supplier and vendor
     */
    async groupItemsBySupplier(items) {
        const groups = new Map();
        for (const item of items) {
            const product = item.product;
            // Determine supplier based on product metadata
            let supplierId = product.supplierId || 'default';
            const vendorId = product.vendorId || product.userId;
            // If product doesn't have supplier info, find best supplier
            if (!product.supplierId) {
                const bestSupplier = await this.supplierManager.findBestSupplier(product.sku);
                if (bestSupplier) {
                    supplierId = bestSupplier;
                }
            }
            const key = `${supplierId}:${vendorId}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(item);
        }
        return groups;
    }
    /**
     * Forward split orders to respective suppliers
     */
    async forwardToSuppliers(order, splitOrders) {
        const forwardPromises = splitOrders.map(async (splitOrder) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const supplier = this.supplierManager.getSupplier(splitOrder.supplierId);
            if (!supplier) {
                console.error(`Supplier ${splitOrder.supplierId} not found`);
                return;
            }
            // Prepare supplier order
            const supplierOrder = {
                orderId: `${order.id}-${splitOrder.supplierId}`,
                items: splitOrder.items.map(item => ({
                    sku: item.product.sku,
                    quantity: item.quantity,
                    price: item.price,
                    cost: item.product.cost || 0
                })),
                customer: {
                    name: ((_a = order.user) === null || _a === void 0 ? void 0 : _a.name) || order.customerName || '',
                    email: ((_b = order.user) === null || _b === void 0 ? void 0 : _b.email) || order.customerEmail || '',
                    phone: order.customerPhone || ((_c = order.shippingAddress) === null || _c === void 0 ? void 0 : _c.phone) || ''
                },
                shipping: {
                    name: ((_d = order.shippingAddress) === null || _d === void 0 ? void 0 : _d.name) || order.customerName || '',
                    address1: ((_e = order.shippingAddress) === null || _e === void 0 ? void 0 : _e.address) || '',
                    address2: (_f = order.shippingAddress) === null || _f === void 0 ? void 0 : _f.addressDetail,
                    city: ((_g = order.shippingAddress) === null || _g === void 0 ? void 0 : _g.city) || '',
                    state: ((_h = order.shippingAddress) === null || _h === void 0 ? void 0 : _h.state) || '',
                    postalCode: ((_j = order.shippingAddress) === null || _j === void 0 ? void 0 : _j.zipCode) || '',
                    country: ((_k = order.shippingAddress) === null || _k === void 0 ? void 0 : _k.country) || 'KR',
                    phone: ((_l = order.shippingAddress) === null || _l === void 0 ? void 0 : _l.phone) || order.customerPhone
                },
                totalAmount: splitOrder.totalAmount,
                currency: order.currency || 'KRW',
                status: 'pending',
                notes: `Order from O4O Platform - ${order.id}`
            };
            try {
                // Create order with supplier
                const response = await supplier.createOrder(supplierOrder);
                if (response && response.success && response.data) {
                    // Update order item with supplier order ID
                    for (const item of splitOrder.items) {
                        item.supplierOrderId = response.data.supplierOrderId;
                        await this.orderItemRepository.save(item);
                    }
                    console.log(`Order forwarded to supplier ${splitOrder.supplierId}: ${response.data.supplierOrderId}`);
                }
                else {
                    console.error(`Failed to forward order to supplier ${splitOrder.supplierId}`);
                }
            }
            catch (error) {
                console.error(`Error forwarding order to supplier ${splitOrder.supplierId}:`, error);
            }
        });
        await Promise.all(forwardPromises);
    }
    /**
     * Create vendor order items for commission tracking
     */
    async createVendorOrderItems(order, splitOrders) {
        for (const splitOrder of splitOrders) {
            const vendor = await this.userRepository.findOne({
                where: { id: splitOrder.vendorId }
            });
            if (!vendor)
                continue;
            for (const item of splitOrder.items) {
                const vendorOrderItem = this.vendorOrderItemRepository.create({
                    orderId: order.id,
                    vendorId: splitOrder.vendorId,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    cost: item.product.cost,
                    vendorProfit: item.price - item.product.cost,
                    platformCommission: this.calculatePlatformCommission(item.price),
                    affiliateCommission: this.calculateAffiliateCommission(item.price),
                    status: 'pending'
                });
                await this.vendorOrderItemRepository.save(vendorOrderItem);
            }
        }
    }
    /**
     * Calculate commission for split order
     */
    calculateCommission(totalAmount, totalCost) {
        const profit = totalAmount - totalCost;
        const platformRate = 0.03; // 3% platform fee
        const affiliateRate = 0.05; // 5% affiliate commission
        return profit * (platformRate + affiliateRate);
    }
    /**
     * Calculate platform commission
     */
    calculatePlatformCommission(amount) {
        return amount * 0.03; // 3% platform fee
    }
    /**
     * Calculate affiliate commission
     */
    calculateAffiliateCommission(amount) {
        return amount * 0.05; // 5% affiliate commission
    }
    /**
     * Update order status from supplier
     */
    async updateOrderStatusFromSupplier(supplierOrderId, status) {
        const orderItem = await this.orderItemRepository.findOne({
            where: { supplierOrderId },
            relations: ['order']
        });
        if (!orderItem) {
            console.error(`Order item with supplier order ID ${supplierOrderId} not found`);
            return;
        }
        // Update order item status
        orderItem.status = status;
        await this.orderItemRepository.save(orderItem);
        // Check if all items in the order have the same status
        const order = orderItem.order;
        const allItems = await this.orderItemRepository.find({
            where: { orderId: order.id }
        });
        const allSameStatus = allItems.every(item => item.status === status);
        if (allSameStatus) {
            // Update main order status
            order.status = status;
            await this.orderRepository.save(order);
        }
    }
    /**
     * Track shipment from supplier
     */
    async trackShipmentFromSupplier(supplierOrderId) {
        const orderItem = await this.orderItemRepository.findOne({
            where: { supplierOrderId }
        });
        if (!orderItem || !orderItem.trackingNumber) {
            return null;
        }
        // Find the supplier for this order
        const [supplierId] = supplierOrderId.split('-');
        const supplier = this.supplierManager.getSupplier(supplierId);
        if (!supplier) {
            return null;
        }
        return await supplier.getOrderStatus(supplierOrderId);
    }
}
exports.OrderSplitService = OrderSplitService;
//# sourceMappingURL=OrderSplitService.js.map