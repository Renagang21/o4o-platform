"use strict";
/**
 * 재입고 알림 서비스
 * 품절 상품 알림 신청, 재입고 시 자동 알림
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restockNotificationService = exports.RestockNotificationService = void 0;
const connection_1 = require("../database/connection");
const Product_1 = require("../entities/Product");
const ProductVariation_1 = require("../entities/ProductVariation");
const User_1 = require("../entities/User");
const email_service_1 = require("./email.service");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
const events_1 = require("events");
const ioredis_1 = require("ioredis");
class RestockNotificationService extends events_1.EventEmitter {
    constructor() {
        super();
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        this.variationRepository = connection_1.AppDataSource.getRepository(ProductVariation_1.ProductVariation);
        this.userRepository = connection_1.AppDataSource.getRepository(User_1.User);
        // 알림 저장소 (실제로는 DB)
        this.notifications = new Map();
        this.notificationQueues = new Map();
        this.redis = new ioredis_1.Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        });
        this.setupEventListeners();
    }
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 재고 업데이트 이벤트 리스닝
        this.on('stockUpdated', async (data) => {
            await this.processStockUpdate(data);
        });
    }
    /**
     * 재입고 알림 신청
     */
    async subscribeToRestock(productId, data) {
        // 상품 확인
        const product = await this.productRepository.findOne({
            where: { id: productId }
        });
        if (!product) {
            throw new Error('Product not found');
        }
        // 재고 확인 (이미 재고가 있으면 알림 불필요)
        let currentStock = product.stock || 0;
        let sku = product.sku;
        let attributes = {};
        if (data.variationId) {
            const variation = await this.variationRepository.findOne({
                where: { id: data.variationId }
            });
            if (variation) {
                currentStock = variation.stock;
                sku = variation.sku;
                attributes = variation.attributes;
            }
        }
        if (currentStock > 0) {
            throw new Error('Product is currently in stock');
        }
        // 중복 신청 확인
        const existingKey = this.getNotificationKey(productId, data.variationId, data.userId || data.email);
        const existing = await this.redis.get(existingKey);
        if (existing) {
            throw new Error('You have already subscribed to restock notifications for this product');
        }
        // 알림 생성
        const notification = {
            id: this.generateNotificationId(),
            userId: data.userId || '',
            productId,
            variationId: data.variationId,
            email: data.email,
            phone: data.phone,
            notificationType: data.notificationType || 'email',
            status: 'active',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90일 후 만료
            metadata: {
                productName: product.name,
                sku,
                attributes,
                priceWhenRequested: product.price
            }
        };
        // 저장
        this.notifications.set(notification.id, notification);
        await this.redis.setex(existingKey, 90 * 24 * 60 * 60, notification.id); // 90일
        // 큐에 추가
        this.addToQueue(notification);
        // 통계 업데이트
        await this.updateStatistics(productId, 'subscribe');
        simpleLogger_1.default.info(`Restock notification subscribed: ${notification.id} for product ${productId}`);
        return notification;
    }
    /**
     * 알림 취소
     */
    async unsubscribeFromRestock(notificationId, userId) {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            throw new Error('Notification not found');
        }
        // 권한 확인
        if (userId && notification.userId !== userId) {
            throw new Error('Unauthorized');
        }
        // 상태 업데이트
        notification.status = 'cancelled';
        // Redis에서 제거
        const key = this.getNotificationKey(notification.productId, notification.variationId, notification.userId || notification.email);
        await this.redis.del(key);
        // 큐에서 제거
        this.removeFromQueue(notification);
        // 통계 업데이트
        await this.updateStatistics(notification.productId, 'unsubscribe');
        simpleLogger_1.default.info(`Restock notification cancelled: ${notificationId}`);
    }
    /**
     * 재고 업데이트 처리
     */
    async processStockUpdate(data) {
        // 재입고 확인 (0 -> 양수)
        if (data.previousStock <= 0 && data.currentStock > 0) {
            await this.sendRestockNotifications(data.productId, data.variationId);
        }
    }
    /**
     * 재입고 알림 발송
     */
    async sendRestockNotifications(productId, variationId) {
        const queueKey = `${productId}:${variationId || 'default'}`;
        const queue = this.notificationQueues.get(queueKey);
        if (!queue || queue.notifications.length === 0) {
            return;
        }
        const product = await this.productRepository.findOne({
            where: { id: productId }
        });
        if (!product)
            return;
        let variation = null;
        if (variationId) {
            variation = await this.variationRepository.findOne({
                where: { id: variationId }
            });
        }
        const batchSize = 100; // 배치 처리
        let processedCount = 0;
        for (let i = 0; i < queue.notifications.length; i += batchSize) {
            const batch = queue.notifications.slice(i, i + batchSize);
            await Promise.all(batch.map(async (notification) => {
                if (notification.status === 'active') {
                    try {
                        await this.sendNotification(notification, product, variation);
                        // 상태 업데이트
                        notification.status = 'notified';
                        notification.notifiedAt = new Date();
                        processedCount++;
                    }
                    catch (error) {
                        simpleLogger_1.default.error(`Failed to send restock notification ${notification.id}:`, error);
                    }
                }
            }));
        }
        // 큐 업데이트
        queue.processedCount = processedCount;
        queue.lastProcessedAt = new Date();
        // 알림 발송 완료 이벤트
        this.emit('restockNotificationsSent', {
            productId,
            variationId,
            totalSent: processedCount
        });
        simpleLogger_1.default.info(`Sent ${processedCount} restock notifications for product ${productId}`);
        // 큐 정리
        this.cleanupQueue(queueKey);
    }
    /**
     * 개별 알림 발송
     */
    async sendNotification(notification, product, variation) {
        var _a, _b;
        const stock = variation ? variation.stock : product.stock;
        const price = variation ? variation.price : product.price;
        const sku = variation ? variation.sku : product.sku;
        // 이메일 수신자 결정
        let recipientEmail = notification.email;
        if (!recipientEmail && notification.userId) {
            const user = await this.userRepository.findOne({
                where: { id: notification.userId }
            });
            recipientEmail = user === null || user === void 0 ? void 0 : user.email;
        }
        if (!recipientEmail) {
            throw new Error('No email address for notification');
        }
        // 알림 유형별 발송
        switch (notification.notificationType) {
            case 'email':
            case 'all':
                await this.sendEmailNotification(recipientEmail, {
                    productName: product.name,
                    productId: product.id,
                    sku,
                    price,
                    stock,
                    image: (_a = product.images) === null || _a === void 0 ? void 0 : _a[0],
                    attributes: (_b = notification.metadata) === null || _b === void 0 ? void 0 : _b.attributes
                });
                break;
            case 'sms':
                if (notification.phone) {
                    await this.sendSmsNotification(notification.phone, {
                        productName: product.name,
                        stock
                    });
                }
                break;
            case 'push':
                if (notification.userId) {
                    await this.sendPushNotification(notification.userId, {
                        productName: product.name,
                        productId: product.id
                    });
                }
                break;
        }
    }
    /**
     * 이메일 알림 발송
     */
    async sendEmailNotification(email, data) {
        const subject = `🎉 ${data.productName} 재입고 알림`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>기다리시던 상품이 재입고되었습니다!</h2>
        
        ${data.image ? `<img src="${data.image}" alt="${data.productName}" style="max-width: 100%; height: auto;">` : ''}
        
        <h3>${data.productName}</h3>
        ${data.sku ? `<p>SKU: ${data.sku}</p>` : ''}
        ${data.attributes ? `<p>옵션: ${JSON.stringify(data.attributes)}</p>` : ''}
        
        <p style="font-size: 24px; color: #ff6b6b;">
          ₩${data.price.toLocaleString()}
        </p>
        
        <p>현재 재고: <strong>${data.stock}개</strong></p>
        
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/products/${data.productId}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
            지금 구매하기
          </a>
        </div>
        
        <p style="color: #666; font-size: 12px;">
          * 재고가 한정되어 있으니 서둘러 구매해주세요.<br>
          * 이 알림은 1회만 발송됩니다.
        </p>
      </div>
    `;
        await email_service_1.emailService.sendEmail({
            to: email,
            subject,
            html
        });
    }
    /**
     * SMS 알림 발송
     */
    async sendSmsNotification(phone, data) {
        // SMS 서비스 연동 (실제 구현 필요)
        const message = `[재입고 알림] ${data.productName}이(가) 재입고되었습니다. 현재 재고: ${data.stock}개`;
        simpleLogger_1.default.info(`SMS notification would be sent to ${phone}: ${message}`);
    }
    /**
     * 푸시 알림 발송
     */
    async sendPushNotification(userId, data) {
        // 푸시 알림 서비스 연동 (실제 구현 필요)
        simpleLogger_1.default.info(`Push notification would be sent to user ${userId}`);
    }
    /**
     * 큐에 추가
     */
    addToQueue(notification) {
        const queueKey = `${notification.productId}:${notification.variationId || 'default'}`;
        if (!this.notificationQueues.has(queueKey)) {
            this.notificationQueues.set(queueKey, {
                productId: notification.productId,
                variationId: notification.variationId,
                notifications: [],
                processedCount: 0
            });
        }
        const queue = this.notificationQueues.get(queueKey);
        queue.notifications.push(notification);
    }
    /**
     * 큐에서 제거
     */
    removeFromQueue(notification) {
        const queueKey = `${notification.productId}:${notification.variationId || 'default'}`;
        const queue = this.notificationQueues.get(queueKey);
        if (queue) {
            queue.notifications = queue.notifications.filter(n => n.id !== notification.id);
        }
    }
    /**
     * 큐 정리
     */
    cleanupQueue(queueKey) {
        const queue = this.notificationQueues.get(queueKey);
        if (queue) {
            // 발송 완료된 알림 제거
            queue.notifications = queue.notifications.filter(n => n.status === 'active');
            // 빈 큐 제거
            if (queue.notifications.length === 0) {
                this.notificationQueues.delete(queueKey);
            }
        }
    }
    /**
     * 알림 키 생성
     */
    getNotificationKey(productId, variationId, identifier) {
        return `restock:${productId}:${variationId || 'default'}:${identifier}`;
    }
    /**
     * ID 생성
     */
    generateNotificationId() {
        return `RSN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 통계 업데이트
     */
    async updateStatistics(productId, action) {
        const key = `restock_stats:${productId}`;
        if (action === 'subscribe') {
            await this.redis.hincrby(key, 'total_subscriptions', 1);
            await this.redis.hincrby(key, 'active_subscriptions', 1);
        }
        else {
            await this.redis.hincrby(key, 'active_subscriptions', -1);
        }
        await this.redis.hset(key, 'last_updated', Date.now().toString());
    }
    /**
     * 상품별 알림 신청 수 조회
     */
    async getProductNotificationCount(productId) {
        const stats = await this.redis.hget(`restock_stats:${productId}`, 'active_subscriptions');
        return parseInt(stats || '0');
    }
    /**
     * 사용자별 알림 신청 목록
     */
    async getUserNotifications(userId) {
        return Array.from(this.notifications.values())
            .filter(n => n.userId === userId && n.status === 'active')
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * 만료된 알림 정리 (크론)
     */
    async cleanupExpiredNotifications() {
        const now = new Date();
        let cleanedCount = 0;
        for (const [id, notification] of this.notifications) {
            if (notification.expiresAt < now) {
                notification.status = 'expired';
                this.removeFromQueue(notification);
                this.notifications.delete(id);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            simpleLogger_1.default.info(`Cleaned up ${cleanedCount} expired restock notifications`);
        }
    }
    /**
     * 알림 통계
     */
    async getNotificationStatistics() {
        const stats = {
            totalActive: 0,
            totalNotified: 0,
            topRequestedProducts: [],
            conversionRate: 0
        };
        // 전체 통계
        for (const notification of this.notifications.values()) {
            if (notification.status === 'active') {
                stats.totalActive++;
            }
            else if (notification.status === 'notified') {
                stats.totalNotified++;
            }
        }
        // 상품별 통계
        const productCounts = new Map();
        for (const notification of this.notifications.values()) {
            const count = productCounts.get(notification.productId) || 0;
            productCounts.set(notification.productId, count + 1);
        }
        stats.topRequestedProducts = Array.from(productCounts.entries())
            .map(([productId, count]) => ({ productId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        // 전환율 (알림 -> 구매)
        // 실제로는 주문 데이터와 연계하여 계산
        stats.conversionRate = stats.totalNotified > 0
            ? 0.15 // 임시값 15%
            : 0;
        return stats;
    }
}
exports.RestockNotificationService = RestockNotificationService;
// 싱글톤 인스턴스
exports.restockNotificationService = new RestockNotificationService();
//# sourceMappingURL=RestockNotificationService.js.map