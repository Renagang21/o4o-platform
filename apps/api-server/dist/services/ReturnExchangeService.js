"use strict";
/**
 * 반품/교환 처리 서비스
 * 반품 신청, 교환 처리, 환불 관리
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnExchangeService = exports.ReturnExchangeService = void 0;
const connection_1 = require("../database/connection");
const Order_1 = require("../entities/Order");
const Product_1 = require("../entities/Product");
const TossPaymentsService_1 = require("./TossPaymentsService");
const ShippingTrackingService_1 = require("./ShippingTrackingService");
const simpleLogger_1 = __importDefault(require("../utils/simpleLogger"));
const events_1 = require("events");
class ReturnExchangeService extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        // 반품 요청 저장소 (실제로는 DB)
        this.returnRequests = new Map();
        // 반품 정책
        this.returnPolicy = {
            daysAllowed: 7, // 7일 이내 반품 가능
            conditions: [
                '미개봉/미사용 제품',
                '상품 택(TAG) 제거 안됨',
                '구매 영수증 보유',
                '원 포장 상태 유지'
            ],
            excludedCategories: [
                'perishable', // 신선식품
                'custom', // 주문제작
                'digital', // 디지털 상품
                'underwear' // 속옷류
            ],
            restockingFee: 10, // 10% 재입고 수수료
            shippingCostResponsibility: {
                defective: 'merchant',
                wrongItem: 'merchant',
                changedMind: 'customer',
                sizeIssue: 'customer',
                damaged: 'merchant'
            }
        };
    }
    /**
     * 반품/교환 신청
     */
    async createReturnRequest(userId, orderId, data) {
        // 주문 확인
        const order = await this.orderRepository.findOne({
            where: { id: orderId, userId },
            relations: ['items', 'items.product']
        });
        if (!order) {
            throw new Error('Order not found');
        }
        // 반품 가능 기간 확인
        this.validateReturnEligibility(order);
        // 상품별 반품 가능 여부 확인
        for (const item of data.items) {
            await this.validateItemEligibility(item, order);
        }
        // 반품 비용 계산
        const returnCost = this.calculateReturnCost(data.reasonCategory, order);
        // 반품 요청 생성
        const returnRequest = {
            id: this.generateReturnId(),
            orderId,
            userId,
            type: data.type,
            status: 'requested',
            items: data.items,
            reason: data.reason,
            reasonCategory: data.reasonCategory,
            description: data.description,
            images: data.images,
            returnShipping: {
                cost: returnCost.shippingCost,
                paidBy: returnCost.paidBy
            },
            requestedAt: new Date()
        };
        // 저장
        this.returnRequests.set(returnRequest.id, returnRequest);
        // 알림 발송
        this.emit('returnRequested', {
            returnId: returnRequest.id,
            orderId,
            userId,
            type: data.type
        });
        simpleLogger_1.default.info(`Return request created: ${returnRequest.id} for order ${orderId}`);
        return returnRequest;
    }
    /**
     * 반품 요청 승인
     */
    async approveReturn(returnId, adminNotes) {
        const returnRequest = this.returnRequests.get(returnId);
        if (!returnRequest) {
            throw new Error('Return request not found');
        }
        if (returnRequest.status !== 'requested') {
            throw new Error('Return request cannot be approved in current status');
        }
        returnRequest.status = 'approved';
        returnRequest.approvedAt = new Date();
        returnRequest.metadata = {
            ...returnRequest.metadata,
            adminNotes
        };
        // 반품 라벨 생성
        const returnLabel = await this.generateReturnLabel(returnRequest);
        // 고객에게 반품 안내 이메일
        await this.sendReturnInstructions(returnRequest, returnLabel);
        // 이벤트 발생
        this.emit('returnApproved', {
            returnId,
            orderId: returnRequest.orderId,
            userId: returnRequest.userId
        });
        return returnRequest;
    }
    /**
     * 반품 요청 거절
     */
    async rejectReturn(returnId, reason) {
        const returnRequest = this.returnRequests.get(returnId);
        if (!returnRequest) {
            throw new Error('Return request not found');
        }
        returnRequest.status = 'rejected';
        returnRequest.metadata = {
            ...returnRequest.metadata,
            rejectionReason: reason,
            rejectedAt: new Date()
        };
        // 거절 알림
        this.emit('returnRejected', {
            returnId,
            orderId: returnRequest.orderId,
            userId: returnRequest.userId,
            reason
        });
        return returnRequest;
    }
    /**
     * 반품 상품 수령 확인
     */
    async confirmReturnReceived(returnId, condition) {
        const returnRequest = this.returnRequests.get(returnId);
        if (!returnRequest) {
            throw new Error('Return request not found');
        }
        if (returnRequest.status !== 'approved') {
            throw new Error('Invalid return status');
        }
        returnRequest.status = 'processing';
        if (returnRequest.returnShipping) {
            returnRequest.returnShipping.receivedAt = new Date();
        }
        // 상품 상태에 따른 처리
        if (condition === 'good') {
            // 정상 반품 처리
            if (returnRequest.type === 'return') {
                await this.processRefund(returnRequest);
            }
            else {
                await this.processExchange(returnRequest);
            }
        }
        else {
            // 상태 불량 시 추가 검토
            returnRequest.metadata = {
                ...returnRequest.metadata,
                inspectionResult: condition,
                requiresReview: true
            };
            // 관리자 알림
            this.emit('returnInspectionFailed', {
                returnId,
                condition,
                orderId: returnRequest.orderId
            });
        }
        return returnRequest;
    }
    /**
     * 환불 처리
     */
    async processRefund(returnRequest) {
        var _a, _b, _c;
        const order = await this.orderRepository.findOne({
            where: { id: returnRequest.orderId }
        });
        if (!order)
            return;
        // 환불 금액 계산
        let refundAmount = 0;
        for (const item of returnRequest.items) {
            const orderItem = (_a = order.items) === null || _a === void 0 ? void 0 : _a.find(oi => oi.id === item.orderItemId);
            if (orderItem) {
                refundAmount += orderItem.price * item.quantity;
            }
        }
        // 재입고 수수료 차감 (단순 변심인 경우)
        if (returnRequest.reasonCategory === 'changed_mind') {
            const restockingFee = refundAmount * (this.returnPolicy.restockingFee / 100);
            refundAmount -= restockingFee;
        }
        // 반품 배송비 차감 (고객 부담인 경우)
        if (((_b = returnRequest.returnShipping) === null || _b === void 0 ? void 0 : _b.paidBy) === 'customer') {
            refundAmount -= returnRequest.returnShipping.cost;
        }
        // 결제 취소 처리
        try {
            const paymentKey = (_c = order.metadata) === null || _c === void 0 ? void 0 : _c.paymentKey;
            if (paymentKey) {
                const result = await TossPaymentsService_1.tossPaymentsService.cancelPayment(paymentKey, `반품 처리 - ${returnRequest.reason}`, refundAmount);
                returnRequest.refund = {
                    amount: refundAmount,
                    method: 'original',
                    processedAt: new Date(),
                    transactionId: result.data.transactionKey
                };
            }
        }
        catch (error) {
            simpleLogger_1.default.error('Refund processing failed:', error);
            // 포인트로 환불
            returnRequest.refund = {
                amount: refundAmount,
                method: 'points',
                processedAt: new Date()
            };
        }
        // 재고 복구
        await this.restoreInventory(returnRequest);
        // 반품 완료 처리
        returnRequest.status = 'completed';
        returnRequest.completedAt = new Date();
        // 완료 알림
        this.emit('returnCompleted', {
            returnId: returnRequest.id,
            orderId: returnRequest.orderId,
            userId: returnRequest.userId,
            refundAmount
        });
    }
    /**
     * 교환 처리
     */
    async processExchange(returnRequest) {
        // 교환 상품 재고 확인
        for (const item of returnRequest.items) {
            if (item.exchangeProductId) {
                const product = await this.productRepository.findOne({
                    where: { id: item.exchangeProductId }
                });
                if (!product || product.stock < item.quantity) {
                    throw new Error(`Exchange product out of stock: ${item.exchangeProductId}`);
                }
            }
        }
        // 새 주문 생성 (교환)
        const exchangeOrder = await this.createExchangeOrder(returnRequest);
        // 교환 배송 시작
        const trackingInfo = await ShippingTrackingService_1.shippingTrackingService.registerTracking(exchangeOrder.id, this.generateTrackingNumber(), 'cj' // 기본 택배사
        );
        returnRequest.exchangeShipping = {
            trackingNumber: trackingInfo.trackingNumber,
            carrier: trackingInfo.carrier,
            shippedAt: new Date()
        };
        // 교환 완료 처리
        returnRequest.status = 'completed';
        returnRequest.completedAt = new Date();
        // 완료 알림
        this.emit('exchangeCompleted', {
            returnId: returnRequest.id,
            orderId: returnRequest.orderId,
            newOrderId: exchangeOrder.id,
            userId: returnRequest.userId
        });
    }
    /**
     * 반품 가능 여부 확인
     */
    validateReturnEligibility(order) {
        var _a;
        // 배송 완료 확인
        if (order.status !== 'delivered' && order.status !== 'completed') {
            throw new Error('Only delivered orders can be returned');
        }
        // 반품 가능 기간 확인
        const deliveredDate = ((_a = order.shipping) === null || _a === void 0 ? void 0 : _a.deliveredAt) || order.updatedAt;
        const daysSinceDelivery = (Date.now() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDelivery > this.returnPolicy.daysAllowed) {
            throw new Error(`Return period expired. Returns are allowed within ${this.returnPolicy.daysAllowed} days`);
        }
    }
    /**
     * 상품별 반품 가능 여부 확인
     */
    async validateItemEligibility(item, order) {
        var _a;
        // 주문 항목 확인
        const orderItem = (_a = order.items) === null || _a === void 0 ? void 0 : _a.find(oi => oi.id === item.orderItemId);
        if (!orderItem) {
            throw new Error(`Order item not found: ${item.orderItemId}`);
        }
        // 수량 확인
        if (item.quantity > orderItem.quantity) {
            throw new Error(`Invalid return quantity for item ${item.orderItemId}`);
        }
        // 상품 카테고리 확인
        const product = await this.productRepository.findOne({
            where: { id: item.productId },
            relations: ['category']
        });
        if (product === null || product === void 0 ? void 0 : product.category) {
            if (this.returnPolicy.excludedCategories.includes(product.category)) {
                throw new Error(`Product category ${product.category} is not eligible for return`);
            }
        }
    }
    /**
     * 반품 비용 계산
     */
    calculateReturnCost(reasonCategory, order) {
        const paidBy = this.returnPolicy.shippingCostResponsibility[reasonCategory] || 'customer';
        // 배송비 계산 (무게/크기 기반)
        let shippingCost = 3000; // 기본 배송비
        if (order.items) {
            const totalWeight = order.items.reduce((sum, item) => {
                var _a;
                return sum + (((_a = item.product) === null || _a === void 0 ? void 0 : _a.weight) || 0) * item.quantity;
            }, 0);
            if (totalWeight > 5000) { // 5kg 초과
                shippingCost = 5000;
            }
            else if (totalWeight > 10000) { // 10kg 초과
                shippingCost = 10000;
            }
        }
        return {
            shippingCost: paidBy === 'customer' ? shippingCost : 0,
            paidBy
        };
    }
    /**
     * 재고 복구
     */
    async restoreInventory(returnRequest) {
        for (const item of returnRequest.items) {
            const product = await this.productRepository.findOne({
                where: { id: item.productId }
            });
            if (product) {
                product.stock = (product.stock || 0) + item.quantity;
                await this.productRepository.save(product);
                simpleLogger_1.default.info(`Inventory restored: Product ${item.productId}, Quantity ${item.quantity}`);
            }
        }
    }
    /**
     * 교환 주문 생성
     */
    async createExchangeOrder(returnRequest) {
        const originalOrder = await this.orderRepository.findOne({
            where: { id: returnRequest.orderId },
            relations: ['items']
        });
        if (!originalOrder) {
            throw new Error('Original order not found');
        }
        // 새 주문 생성 (교환)
        const exchangeOrder = this.orderRepository.create({
            user: { id: returnRequest.userId },
            orderNumber: this.generateOrderNumber(),
            status: Order_1.OrderStatus.PROCESSING,
            paymentStatus: Order_1.PaymentStatus.PAID, // 이미 결제됨
            totalAmount: 0, // 교환은 추가 비용 없음
            billingAddress: originalOrder.billingAddress,
            shippingAddress: originalOrder.shippingAddress,
            items: [], // 교환 상품으로 채움
            metadata: {
                isExchange: true,
                originalOrderId: originalOrder.id,
                returnRequestId: returnRequest.id
            }
        });
        const savedOrder = await this.orderRepository.save(exchangeOrder);
        return (Array.isArray(savedOrder) ? savedOrder[0] : savedOrder);
    }
    /**
     * 반품 라벨 생성
     */
    async generateReturnLabel(returnRequest) {
        // PDF 생성 (실제 구현 필요)
        return Buffer.from('Return shipping label');
    }
    /**
     * 반품 안내 이메일
     */
    async sendReturnInstructions(returnRequest, returnLabel) {
        // 이메일 발송 (EmailService 연동)
        simpleLogger_1.default.info(`Sending return instructions for ${returnRequest.id}`);
    }
    /**
     * ID 생성
     */
    generateReturnId() {
        return `RET${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }
    generateOrderNumber() {
        return `EXC${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }
    generateTrackingNumber() {
        return `${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
    }
    /**
     * 반품 요청 조회
     */
    async getReturnRequest(returnId) {
        return this.returnRequests.get(returnId) || null;
    }
    /**
     * 사용자별 반품 내역
     */
    async getUserReturns(userId, page = 1, limit = 10) {
        const allReturns = Array.from(this.returnRequests.values())
            .filter(r => r.userId === userId)
            .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
        const start = (page - 1) * limit;
        const end = start + limit;
        return {
            returns: allReturns.slice(start, end),
            total: allReturns.length
        };
    }
    /**
     * 반품 통계
     */
    async getReturnStatistics(startDate, endDate) {
        const returns = Array.from(this.returnRequests.values())
            .filter(r => r.requestedAt >= startDate && r.requestedAt <= endDate);
        const stats = {
            totalReturns: returns.filter(r => r.type === 'return').length,
            totalExchanges: returns.filter(r => r.type === 'exchange').length,
            reasonBreakdown: {},
            totalRefundAmount: 0,
            averageProcessingTime: 0
        };
        let totalProcessingTime = 0;
        let processedCount = 0;
        returns.forEach(r => {
            // 이유별 통계
            stats.reasonBreakdown[r.reasonCategory] = (stats.reasonBreakdown[r.reasonCategory] || 0) + 1;
            // 환불 금액
            if (r.refund) {
                stats.totalRefundAmount += r.refund.amount;
            }
            // 처리 시간
            if (r.completedAt) {
                const processingTime = r.completedAt.getTime() - r.requestedAt.getTime();
                totalProcessingTime += processingTime;
                processedCount++;
            }
        });
        // 평균 처리 시간 (일 단위)
        if (processedCount > 0) {
            stats.averageProcessingTime = totalProcessingTime / processedCount / (1000 * 60 * 60 * 24);
        }
        return stats;
    }
}
exports.ReturnExchangeService = ReturnExchangeService;
// 싱글톤 인스턴스
exports.returnExchangeService = new ReturnExchangeService();
//# sourceMappingURL=ReturnExchangeService.js.map