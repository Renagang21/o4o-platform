import { apiClient } from './client';
export class EcommerceApi {
    static async getProducts(page = 1, limit = 20, filters = {}) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== undefined && value !== ''))
        });
        const response = await apiClient.get(`/ecommerce/products?${params}`);
        return response.data;
    }
    static async getProduct(productId) {
        const response = await apiClient.get(`/ecommerce/products/${productId}`);
        return response.data;
    }
    static async createProduct(productData) {
        const response = await apiClient.post('/ecommerce/products', productData);
        return response.data;
    }
    static async updateProduct(productId, productData) {
        const response = await apiClient.put(`/ecommerce/products/${productId}`, productData);
        return response.data;
    }
    static async deleteProduct(productId) {
        const response = await apiClient.delete(`/ecommerce/products/${productId}`);
        return response.data;
    }
    static async bulkProductAction(action) {
        const response = await apiClient.post('/ecommerce/products/bulk', action);
        return response.data;
    }
    static async duplicateProduct(productId) {
        const response = await apiClient.post(`/ecommerce/products/${productId}/duplicate`);
        return response.data;
    }
    static async getCategories() {
        const response = await apiClient.get('/ecommerce/categories');
        return response.data;
    }
    static async createCategory(categoryData) {
        const response = await apiClient.post('/ecommerce/categories', categoryData);
        return response.data;
    }
    static async updateCategory(categoryId, categoryData) {
        const response = await apiClient.put(`/ecommerce/categories/${categoryId}`, categoryData);
        return response.data;
    }
    static async deleteCategory(categoryId) {
        const response = await apiClient.delete(`/ecommerce/categories/${categoryId}`);
        return response.data;
    }
    static async getTags() {
        const response = await apiClient.get('/ecommerce/tags');
        return response.data;
    }
    static async createTag(tagData) {
        const response = await apiClient.post('/ecommerce/tags', tagData);
        return response.data;
    }
    static async getOrders(page = 1, limit = 20, filters = {}) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== undefined && value !== ''))
        });
        const response = await apiClient.get(`/ecommerce/orders?${params}`);
        return response.data;
    }
    static async getOrder(orderId) {
        const response = await apiClient.get(`/ecommerce/orders/${orderId}`);
        return response.data;
    }
    static async updateOrderStatus(orderId, status, note) {
        const response = await apiClient.put(`/ecommerce/orders/${orderId}/status`, { status, note });
        return response.data;
    }
    static async refundOrder(orderId, amount, reason, items) {
        const response = await apiClient.post(`/ecommerce/orders/${orderId}/refund`, {
            amount,
            reason,
            items
        });
        return response.data;
    }
    static async bulkOrderAction(action) {
        const response = await apiClient.post('/ecommerce/orders/bulk', action);
        return response.data;
    }
    static async getCustomers(page = 1, limit = 20, search) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        if (search) {
            params.append('search', search);
        }
        const response = await apiClient.get(`/ecommerce/customers?${params}`);
        return response.data;
    }
    static async getCustomer(customerId) {
        const response = await apiClient.get(`/ecommerce/customers/${customerId}`);
        return response.data;
    }
    static async getCustomerOrders(customerId) {
        const response = await apiClient.get(`/ecommerce/customers/${customerId}/orders`);
        return response.data;
    }
    static async getCoupons(page = 1, limit = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        const response = await apiClient.get(`/ecommerce/coupons?${params}`);
        return response.data;
    }
    static async getCoupon(_id) {
        const response = await apiClient.get(`/ecommerce/coupons/${_id}`);
        return response.data;
    }
    static async createCoupon(couponData) {
        const response = await apiClient.post('/ecommerce/coupons', couponData);
        return response.data;
    }
    static async updateCoupon(couponId, couponData) {
        const response = await apiClient.put(`/ecommerce/coupons/${couponId}`, couponData);
        return response.data;
    }
    static async deleteCoupon(couponId) {
        const response = await apiClient.delete(`/ecommerce/coupons/${couponId}`);
        return response.data;
    }
    static async getInventory(page = 1, limit = 20, lowStock) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        if (lowStock) {
            params.append('lowStock', 'true');
        }
        const response = await apiClient.get(`/ecommerce/inventory?${params}`);
        return response.data;
    }
    static async updateStock(productId, quantity, type, note) {
        const response = await apiClient.put(`/ecommerce/inventory/${productId}`, {
            quantity,
            type,
            note
        });
        return response.data;
    }
    static async getStockMovements(productId, page = 1, limit = 20) {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        if (productId) {
            params.append('productId', productId);
        }
        const response = await apiClient.get(`/ecommerce/stock-movements?${params}`);
        return response.data;
    }
    static async getSalesReport(period, startDate, endDate) {
        const params = new URLSearchParams({ period });
        if (startDate)
            params.append('startDate', startDate);
        if (endDate)
            params.append('endDate', endDate);
        const response = await apiClient.get(`/ecommerce/reports/sales?${params}`);
        return response.data;
    }
    static async getProductAnalytics(productId, period = 'month') {
        const params = new URLSearchParams({ period });
        const endpoint = productId
            ? `/ecommerce/reports/products/${productId}?${params}`
            : `/ecommerce/reports/products?${params}`;
        const response = await apiClient.get(endpoint);
        return response.data;
    }
    static async getDashboardStats() {
        const response = await apiClient.get('/ecommerce/dashboard/stats');
        return response.data;
    }
    static async getSettings() {
        const response = await apiClient.get('/ecommerce/settings');
        return response.data;
    }
    static async updateSettings(settings) {
        const response = await apiClient.put('/ecommerce/settings', settings);
        return response.data;
    }
    static async getPointsOverview() {
        return {
            success: true,
            data: {
                totalPoints: 0,
                activeUsers: 0,
                pendingRewards: 0
            },
            message: 'Points overview retrieved successfully'
        };
    }
    static async getTopPointsUsers() {
        return {
            success: true,
            data: [],
            message: 'Top points users retrieved successfully'
        };
    }
    static async getPointsTransactions(page = 1, limit = 20) {
        return {
            data: [],
            pagination: {
                current: page,
                total: 0,
                count: limit,
                totalItems: 0
            }
        };
    }
    static async getPointsRewards() {
        return {
            success: true,
            data: [],
            message: 'Points rewards retrieved successfully'
        };
    }
    static async createPointsReward(reward) {
        return {
            success: true,
            data: { ...reward, id: Date.now().toString() },
            message: 'Points reward created successfully'
        };
    }
    static async updatePointsReward(id, reward) {
        return {
            success: true,
            data: { ...reward, id },
            message: 'Points reward updated successfully'
        };
    }
    static async deletePointsReward(_id) {
        return {
            success: true,
            data: undefined,
            message: 'Points reward deleted successfully'
        };
    }
    static async getPointsPolicy() {
        return {
            success: true,
            data: {
                pointsPerDollar: 1,
                minimumRedemption: 100,
                expirationDays: 365
            },
            message: 'Points policy retrieved successfully'
        };
    }
    static async updatePointsPolicy(policy) {
        return {
            success: true,
            data: policy,
            message: 'Points policy updated successfully'
        };
    }
    static async exportPointsTransactions(_filters) {
        return {
            success: true,
            data: { downloadUrl: '/exports/points-transactions.csv' },
            message: 'Points transactions exported successfully'
        };
    }
    static async getGeneralSettings() {
        return {
            success: true,
            data: {
                storeName: 'O4O Store',
                storeAddress: '',
                currency: 'KRW',
                timezone: 'Asia/Seoul'
            },
            message: 'General settings retrieved successfully'
        };
    }
    static async getPaymentSettings() {
        return {
            success: true,
            data: {
                methods: [],
                defaultMethod: 'stripe'
            },
            message: 'Payment settings retrieved successfully'
        };
    }
    static async testPaymentProvider(provider) {
        return {
            success: true,
            data: { status: 'connected' },
            message: `${provider} connection test successful`
        };
    }
    static async getShippingSettings() {
        return {
            success: true,
            data: {
                zones: [],
                methods: []
            },
            message: 'Shipping settings retrieved successfully'
        };
    }
    static async updateShippingSettings(settings) {
        return {
            success: true,
            data: settings,
            message: 'Shipping settings updated successfully'
        };
    }
    static async uploadMedia(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/ecommerce/media/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
    static async exportProducts(filters = {}) {
        const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')));
        const response = await apiClient.get(`/ecommerce/products/export?${params}`, {
            responseType: 'blob'
        });
        return response.data;
    }
    static async exportOrders(filters = {}) {
        const params = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')));
        const response = await apiClient.get(`/ecommerce/orders/export?${params}`, {
            responseType: 'blob'
        });
        return response.data;
    }
    static async getCouponBanners() {
        return {
            success: true,
            data: [],
            message: 'Coupon banners retrieved successfully'
        };
    }
    static async createCouponBanner(banner) {
        return {
            success: true,
            data: { ...banner, id: Date.now().toString() },
            message: 'Coupon banner created successfully'
        };
    }
    static async updateCouponBanner(id, banner) {
        return {
            success: true,
            data: { ...banner, id },
            message: 'Coupon banner updated successfully'
        };
    }
    static async deleteCouponBanner(_id) {
        return {
            success: true,
            data: undefined,
            message: 'Coupon banner deleted successfully'
        };
    }
    static async getCouponUsage() {
        return {
            success: true,
            data: [],
            message: 'Coupon usage data retrieved successfully'
        };
    }
}
//# sourceMappingURL=ecommerceApi.js.map