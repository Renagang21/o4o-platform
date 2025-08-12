"use strict";
/**
 * 주문 상태 자동화 서비스
 * 주문 처리 워크플로우 자동화 및 알림
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderAutomationService = exports.OrderAutomationService = void 0;
const Order_1 = require("../entities/Order");
const connection_1 = require("../database/connection");
const email_service_1 = require("./email.service");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
const events_1 = require("events");
const cron_1 = require("cron");
class OrderAutomationService extends events_1.EventEmitter {
    constructor() {
        super();
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.statusRules = [];
        this.notificationRules = new Map();
        this.cronJobs = [];
        this.initializeRules();
        this.initializeCronJobs();
    }
    /**
     * 상태 전환 규칙 초기화
     */
    initializeRules() {
        // 결제 완료 → 처리중
        this.addStatusRule({
            fromStatus: 'pending',
            toStatus: 'processing',
            condition: (order) => order.paymentStatus === 'paid',
            action: async (order) => {
                await this.sendOrderConfirmation(order);
                await this.notifyWarehouse(order);
            }
        });
        // 처리중 → 배송준비
        this.addStatusRule({
            fromStatus: 'processing',
            toStatus: 'ready_to_ship',
            condition: (order) => {
                var _a;
                // 모든 상품이 준비되었는지 확인
                return ((_a = order.items) === null || _a === void 0 ? void 0 : _a.every(item => item.status === 'prepared')) || false;
            },
            delayMinutes: 30 // 30분 후 자동 전환
        });
        // 배송준비 → 배송중
        this.addStatusRule({
            fromStatus: 'ready_to_ship',
            toStatus: 'shipped',
            condition: (order) => {
                var _a;
                // 운송장 번호가 등록되었는지 확인
                return !!((_a = order.shipping) === null || _a === void 0 ? void 0 : _a.trackingNumber);
            },
            action: async (order) => {
                await this.sendShippingNotification(order);
            }
        });
        // 배송중 → 배송완료
        this.addStatusRule({
            fromStatus: 'shipped',
            toStatus: 'delivered',
            condition: (order) => {
                var _a;
                // 배송 API 연동 또는 예상 배송일 기준
                const estimatedDelivery = (_a = order.shipping) === null || _a === void 0 ? void 0 : _a.estimatedDelivery;
                if (estimatedDelivery) {
                    return new Date() >= new Date(estimatedDelivery);
                }
                return false;
            },
            action: async (order) => {
                await this.sendDeliveryConfirmation(order);
                await this.requestReview(order);
            }
        });
        // 배송완료 → 구매확정
        this.addStatusRule({
            fromStatus: 'delivered',
            toStatus: 'completed',
            condition: (order) => {
                var _a;
                // 배송 후 7일 자동 구매확정
                const deliveredAt = (_a = order.metadata) === null || _a === void 0 ? void 0 : _a.deliveredAt;
                if (deliveredAt) {
                    const daysSinceDelivery = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
                    return daysSinceDelivery >= 7;
                }
                return false;
            },
            delayMinutes: 10080 // 7일
        });
        // 알림 규칙 설정
        this.setNotificationRules();
    }
    /**
     * 알림 규칙 설정
     */
    setNotificationRules() {
        // 주문 접수 알림
        this.notificationRules.set('pending', [
            {
                type: 'email',
                template: 'order_received'
            },
            {
                type: 'admin',
                template: 'new_order_admin'
            }
        ]);
        // 결제 완료 알림
        this.notificationRules.set('processing', [
            {
                type: 'email',
                template: 'payment_confirmed'
            }
        ]);
        // 배송 시작 알림
        this.notificationRules.set('shipped', [
            {
                type: 'email',
                template: 'order_shipped'
            },
            {
                type: 'sms',
                template: 'shipping_sms'
            }
        ]);
        // 배송 완료 알림
        this.notificationRules.set('delivered', [
            {
                type: 'email',
                template: 'order_delivered'
            }
        ]);
        // 주문 취소 알림
        this.notificationRules.set('cancelled', [
            {
                type: 'email',
                template: 'order_cancelled'
            },
            {
                type: 'admin',
                template: 'order_cancelled_admin'
            }
        ]);
    }
    /**
     * 크론 작업 초기화
     */
    initializeCronJobs() {
        // 매 10분마다 주문 상태 자동 업데이트 체크
        const statusCheckJob = new cron_1.CronJob('*/10 * * * *', async () => {
            await this.checkAndUpdateOrderStatuses();
        });
        // 매일 오전 9시 리뷰 요청 이메일 발송
        const reviewReminderJob = new cron_1.CronJob('0 9 * * *', async () => {
            await this.sendReviewReminders();
        });
        // 매일 자정 통계 업데이트
        const statsUpdateJob = new cron_1.CronJob('0 0 * * *', async () => {
            await this.updateOrderStatistics();
        });
        // 매시간 재고 부족 알림 체크
        const inventoryCheckJob = new cron_1.CronJob('0 * * * *', async () => {
            await this.checkLowInventory();
        });
        this.cronJobs = [
            statusCheckJob,
            reviewReminderJob,
            statsUpdateJob,
            inventoryCheckJob
        ];
        // 크론 작업 시작
        this.cronJobs.forEach(job => job.start());
    }
    /**
     * 상태 전환 규칙 추가
     */
    addStatusRule(rule) {
        this.statusRules.push(rule);
    }
    /**
     * 주문 상태 자동 업데이트 체크
     */
    async checkAndUpdateOrderStatuses() {
        try {
            const orders = await this.orderRepository.find({
                where: [
                    { status: Order_1.OrderStatus.PENDING },
                    { status: Order_1.OrderStatus.PROCESSING },
                    { status: Order_1.OrderStatus.READY_TO_SHIP },
                    { status: Order_1.OrderStatus.SHIPPED },
                    { status: Order_1.OrderStatus.DELIVERED }
                ],
                relations: ['items', 'items.product', 'shipping']
            });
            for (const order of orders) {
                await this.processOrderStatusRules(order);
            }
        }
        catch (error) {
            simpleLogger_1.default.error('Failed to check order statuses:', error);
        }
    }
    /**
     * 주문 상태 규칙 처리
     */
    async processOrderStatusRules(order) {
        var _a;
        const applicableRules = this.statusRules.filter(rule => rule.fromStatus === order.status);
        for (const rule of applicableRules) {
            if (rule.condition(order)) {
                // 지연 시간이 설정된 경우
                if (rule.delayMinutes) {
                    const lastStatusChange = ((_a = order.metadata) === null || _a === void 0 ? void 0 : _a.lastStatusChange) || order.updatedAt;
                    const minutesSinceChange = (Date.now() - new Date(lastStatusChange).getTime()) / (1000 * 60);
                    if (minutesSinceChange < rule.delayMinutes) {
                        continue;
                    }
                }
                // 상태 업데이트
                await this.updateOrderStatus(order, rule.toStatus);
                // 액션 실행
                if (rule.action) {
                    await rule.action(order);
                }
                // 알림 발송
                await this.sendStatusNotifications(order, rule.toStatus);
                simpleLogger_1.default.info(`Order ${order.id} status changed from ${rule.fromStatus} to ${rule.toStatus}`);
                break;
            }
        }
    }
    /**
     * 주문 상태 업데이트
     */
    async updateOrderStatus(order, newStatus) {
        var _a;
        const previousStatus = order.status;
        order.status = newStatus;
        order.metadata = {
            ...order.metadata,
            lastStatusChange: new Date().toISOString(),
            statusHistory: [
                ...(((_a = order.metadata) === null || _a === void 0 ? void 0 : _a.statusHistory) || []),
                {
                    from: previousStatus,
                    to: newStatus,
                    timestamp: new Date().toISOString()
                }
            ]
        };
        await this.orderRepository.save(order);
        // 이벤트 발생
        this.emit('statusChanged', {
            orderId: order.id,
            previousStatus,
            newStatus,
            order
        });
    }
    /**
     * 상태 변경 알림 발송
     */
    async sendStatusNotifications(order, status) {
        const notifications = this.notificationRules.get(status) || [];
        for (const notification of notifications) {
            try {
                switch (notification.type) {
                    case 'email':
                        await this.sendEmailNotification(order, notification.template);
                        break;
                    case 'sms':
                        await this.sendSmsNotification(order, notification.template);
                        break;
                    case 'admin':
                        await this.sendAdminNotification(order, notification.template);
                        break;
                    case 'webhook':
                        await this.sendWebhookNotification(order, notification.template);
                        break;
                }
            }
            catch (error) {
                simpleLogger_1.default.error(`Failed to send ${notification.type} notification:`, error);
            }
        }
    }
    /**
     * 이메일 알림 발송
     */
    async sendEmailNotification(order, template) {
        var _a;
        const customerEmail = (_a = order.billing) === null || _a === void 0 ? void 0 : _a.email;
        if (!customerEmail)
            return;
        const emailData = this.prepareEmailData(order, template);
        await email_service_1.emailService.sendEmail({
            to: customerEmail,
            subject: emailData.subject,
            text: JSON.stringify(emailData.data)
        });
    }
    /**
     * SMS 알림 발송 (구현 필요)
     */
    async sendSmsNotification(order, template) {
        var _a;
        const phoneNumber = (_a = order.billing) === null || _a === void 0 ? void 0 : _a.phone;
        if (!phoneNumber)
            return;
        // SMS 서비스 연동 필요
        simpleLogger_1.default.info(`SMS notification would be sent to ${phoneNumber} with template ${template}`);
    }
    /**
     * 관리자 알림 발송
     */
    async sendAdminNotification(order, template) {
        var _a;
        // 관리자 이메일 목록 조회
        const adminEmails = ((_a = process.env.ADMIN_EMAILS) === null || _a === void 0 ? void 0 : _a.split(',')) || [];
        for (const email of adminEmails) {
            const emailData = this.prepareEmailData(order, template);
            await email_service_1.emailService.sendEmail({
                to: email.trim(),
                subject: `[Admin] ${emailData.subject}`,
                text: JSON.stringify(emailData.data)
            });
        }
    }
    /**
     * 웹훅 알림 발송
     */
    async sendWebhookNotification(order, template) {
        var _a, _b, _c;
        const webhookUrl = process.env.ORDER_WEBHOOK_URL;
        if (!webhookUrl)
            return;
        const payload = {
            event: `order.${order.status}`,
            timestamp: new Date().toISOString(),
            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                totalAmount: order.totalAmount,
                customer: {
                    name: `${(_a = order.billing) === null || _a === void 0 ? void 0 : _a.firstName} ${(_b = order.billing) === null || _b === void 0 ? void 0 : _b.lastName}`,
                    email: (_c = order.billing) === null || _c === void 0 ? void 0 : _c.email
                }
            }
        };
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': process.env.WEBHOOK_SECRET || ''
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`Webhook failed: ${response.status}`);
            }
        }
        catch (error) {
            simpleLogger_1.default.error('Webhook notification failed:', error);
        }
    }
    /**
     * 이메일 데이터 준비
     */
    prepareEmailData(order, template) {
        var _a, _b, _c, _d, _e;
        const subjects = {
            order_received: `주문이 접수되었습니다 #${order.orderNumber}`,
            payment_confirmed: `결제가 완료되었습니다 #${order.orderNumber}`,
            order_shipped: `상품이 발송되었습니다 #${order.orderNumber}`,
            order_delivered: `상품이 배송 완료되었습니다 #${order.orderNumber}`,
            order_cancelled: `주문이 취소되었습니다 #${order.orderNumber}`,
            review_request: `구매하신 상품은 어떠셨나요? #${order.orderNumber}`
        };
        return {
            subject: subjects[template] || `주문 업데이트 #${order.orderNumber}`,
            data: {
                orderNumber: order.orderNumber,
                customerName: `${(_a = order.billing) === null || _a === void 0 ? void 0 : _a.firstName} ${(_b = order.billing) === null || _b === void 0 ? void 0 : _b.lastName}`,
                orderStatus: order.status,
                totalAmount: order.totalAmount,
                trackingNumber: (_c = order.shipping) === null || _c === void 0 ? void 0 : _c.trackingNumber,
                trackingUrl: (_d = order.shipping) === null || _d === void 0 ? void 0 : _d.trackingUrl,
                items: (_e = order.items) === null || _e === void 0 ? void 0 : _e.map(item => {
                    var _a;
                    return ({
                        name: (_a = item.product) === null || _a === void 0 ? void 0 : _a.name,
                        quantity: item.quantity,
                        price: item.price
                    });
                })
            }
        };
    }
    /**
     * 주문 확인 이메일 발송
     */
    async sendOrderConfirmation(order) {
        await this.sendEmailNotification(order, 'order_confirmation');
    }
    /**
     * 창고 알림
     */
    async notifyWarehouse(order) {
        // 창고 시스템 연동
        simpleLogger_1.default.info(`Warehouse notified for order ${order.orderNumber}`);
    }
    /**
     * 배송 알림 발송
     */
    async sendShippingNotification(order) {
        await this.sendEmailNotification(order, 'order_shipped');
    }
    /**
     * 배송 완료 확인
     */
    async sendDeliveryConfirmation(order) {
        await this.sendEmailNotification(order, 'order_delivered');
    }
    /**
     * 리뷰 요청
     */
    async requestReview(order) {
        // 배송 완료 3일 후 리뷰 요청
        setTimeout(async () => {
            await this.sendEmailNotification(order, 'review_request');
        }, 3 * 24 * 60 * 60 * 1000);
    }
    /**
     * 리뷰 리마인더 발송
     */
    async sendReviewReminders() {
        try {
            // 배송 완료 후 7-14일 사이 리뷰 미작성 주문 조회
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 14);
            const fourteenDaysAgo = new Date();
            fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 7);
            const orders = await this.orderRepository
                .createQueryBuilder('order')
                .where('order.status = :status', { status: 'delivered' })
                .andWhere('order.updatedAt BETWEEN :start AND :end', {
                start: sevenDaysAgo,
                end: fourteenDaysAgo
            })
                .andWhere('order.metadata->>"reviewRequested" IS NULL')
                .getMany();
            for (const order of orders) {
                await this.requestReview(order);
                order.metadata = {
                    ...order.metadata,
                    reviewRequested: new Date().toISOString()
                };
                await this.orderRepository.save(order);
            }
            simpleLogger_1.default.info(`Sent review reminders for ${orders.length} orders`);
        }
        catch (error) {
            simpleLogger_1.default.error('Failed to send review reminders:', error);
        }
    }
    /**
     * 주문 통계 업데이트
     */
    async updateOrderStatistics() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            // 오늘의 주문 통계
            const stats = await this.orderRepository
                .createQueryBuilder('order')
                .select('COUNT(*)', 'totalOrders')
                .addSelect('SUM(order.totalAmount)', 'totalRevenue')
                .addSelect('AVG(order.totalAmount)', 'averageOrderValue')
                .where('order.createdAt BETWEEN :today AND :tomorrow', {
                today,
                tomorrow
            })
                .getRawOne();
            simpleLogger_1.default.info('Daily order statistics:', stats);
            // 통계를 별도 테이블에 저장하거나 대시보드로 전송
            this.emit('dailyStats', stats);
        }
        catch (error) {
            simpleLogger_1.default.error('Failed to update order statistics:', error);
        }
    }
    /**
     * 재고 부족 체크
     */
    async checkLowInventory() {
        // ProductVariation 엔티티와 연동하여 재고 체크
        simpleLogger_1.default.info('Checking low inventory...');
        // 재고 부족 상품 알림
        this.emit('lowInventory', {
            timestamp: new Date(),
            products: [] // 실제 구현 시 재고 부족 상품 목록
        });
    }
    /**
     * 서비스 시작
     */
    start() {
        simpleLogger_1.default.info('Order automation service started');
        this.cronJobs.forEach(job => job.start());
    }
    /**
     * 서비스 중지
     */
    stop() {
        simpleLogger_1.default.info('Order automation service stopped');
        this.cronJobs.forEach(job => job.stop());
    }
}
exports.OrderAutomationService = OrderAutomationService;
// 싱글톤 인스턴스
exports.orderAutomationService = new OrderAutomationService();
//# sourceMappingURL=OrderAutomationService.js.map