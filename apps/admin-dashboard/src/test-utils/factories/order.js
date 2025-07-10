export const createMockOrder = (overrides) => {
    const baseOrder = {
        id: 'order_' + Math.random().toString(36).substr(2, 9),
        orderNumber: 'ORD-' + Date.now(),
        status: 'pending',
        customerId: 'cust_' + Math.random().toString(36).substr(2, 9),
        customerName: 'Test Customer',
        customerEmail: 'test@example.com',
        subtotal: 20000,
        tax: 2000,
        shipping: 3000,
        discount: 0,
        total: 25000,
        items: [
            createMockOrderItem(),
        ],
        billingAddress: {
            firstName: 'Test',
            lastName: 'Customer',
            address1: '123 Test Street',
            city: 'Seoul',
            state: 'Seoul',
            postalCode: '12345',
            country: 'KR',
            phone: '010-1234-5678',
            email: 'test@example.com',
        },
        shippingAddress: {
            firstName: 'Test',
            lastName: 'Customer',
            address1: '123 Test Street',
            city: 'Seoul',
            state: 'Seoul',
            postalCode: '12345',
            country: 'KR',
            phone: '010-1234-5678',
            email: 'test@example.com',
        },
        paymentMethod: 'card',
        paymentStatus: 'pending',
        shippingMethod: 'standard',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        refunds: [],
    };
    return { ...baseOrder, ...overrides };
};
export const createMockOrderItem = (overrides) => {
    const baseItem = {
        id: 'item_' + Math.random().toString(36).substr(2, 9),
        productId: 'prod_' + Math.random().toString(36).substr(2, 9),
        productName: 'Test Product',
        productSku: 'TEST-SKU-001',
        quantity: 2,
        price: 10000,
        total: 20000,
        tax: 2000,
    };
    return { ...baseItem, ...overrides };
};
export const createMockOrders = {
    processing: () => createMockOrder({
        status: 'processing',
        paymentStatus: 'completed',
    }),
    completed: () => createMockOrder({
        status: 'completed',
        paymentStatus: 'completed',
        completedAt: new Date().toISOString(),
    }),
    cancelled: () => createMockOrder({
        status: 'cancelled',
        paymentStatus: 'cancelled',
    }),
    refunded: () => createMockOrder({
        status: 'refunded',
        paymentStatus: 'refunded',
        refunds: [{
                id: 'refund_1',
                amount: 25000,
                reason: 'Customer request',
                refundedBy: 'admin',
                refundedAt: new Date().toISOString(),
                items: [],
            }],
    }),
    bulk: () => createMockOrder({
        items: [
            createMockOrderItem({ quantity: 10, total: 100000 }),
            createMockOrderItem({ quantity: 5, total: 50000 }),
            createMockOrderItem({ quantity: 3, total: 30000 }),
        ],
        subtotal: 180000,
        total: 205000,
    }),
};
//# sourceMappingURL=order.js.map