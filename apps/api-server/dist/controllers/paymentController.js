"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const connection_1 = require("../database/connection");
const Payment_1 = require("../entities/Payment");
const Order_1 = require("../entities/Order");
const Product_1 = require("../entities/Product");
class PaymentController {
    constructor() {
        this.paymentRepository = connection_1.AppDataSource.getRepository(Payment_1.Payment);
        this.orderRepository = connection_1.AppDataSource.getRepository(Order_1.Order);
        this.productRepository = connection_1.AppDataSource.getRepository(Product_1.Product);
        // 결제 요청 생성
        this.createPaymentRequest = async (req, res) => {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { orderId, paymentMethod, provider = Payment_1.PaymentProvider.IAMPORT } = req.body;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                // 주문 확인
                const order = await this.orderRepository.findOne({
                    where: { id: orderId, userId },
                    relations: ['items', 'items.product']
                });
                if (!order) {
                    return res.status(404).json({
                        success: false,
                        error: 'Order not found'
                    });
                }
                if (order.paymentStatus !== Order_1.PaymentStatus.PENDING) {
                    return res.status(400).json({
                        success: false,
                        error: 'Order payment already processed'
                    });
                }
                // 재고 재확인
                for (const orderItem of order.items) {
                    if (!orderItem.product.isInStock()) {
                        return res.status(400).json({
                            success: false,
                            error: `Product ${orderItem.product.name} is no longer in stock`
                        });
                    }
                    if (orderItem.product.manageStock &&
                        orderItem.product.stockQuantity < orderItem.quantity) {
                        return res.status(400).json({
                            success: false,
                            error: `Insufficient stock for ${orderItem.product.name}`
                        });
                    }
                }
                // 결제 객체 생성
                const payment = new Payment_1.Payment();
                payment.orderId = orderId;
                payment.userId = userId;
                payment.type = Payment_1.PaymentType.PAYMENT;
                payment.provider = provider;
                payment.method = paymentMethod;
                payment.amount = order.totalAmount;
                payment.currency = 'KRW';
                payment.status = Payment_1.PaymentGatewayStatus.PENDING;
                payment.transactionId = payment.generateTransactionId();
                payment.metadata = {
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    source: 'web'
                };
                const savedPayment = await this.paymentRepository.save(payment);
                // 결제 게이트웨이별 처리
                let gatewayResponse;
                switch (provider) {
                    case Payment_1.PaymentProvider.IAMPORT:
                        gatewayResponse = await this.processIamportPayment(savedPayment, order);
                        break;
                    case Payment_1.PaymentProvider.TOSS_PAYMENTS:
                        gatewayResponse = await this.processTossPayment(savedPayment, order);
                        break;
                    case Payment_1.PaymentProvider.KAKAO_PAY:
                        gatewayResponse = await this.processKakaoPayment(savedPayment, order);
                        break;
                    default:
                        gatewayResponse = { paymentId: '', error: 'Unsupported payment provider' };
                }
                if (gatewayResponse.error) {
                    await this.paymentRepository.update(savedPayment.id, {
                        status: Payment_1.PaymentGatewayStatus.FAILED,
                        failureReason: gatewayResponse.error
                    });
                    return res.status(400).json({
                        success: false,
                        error: gatewayResponse.error
                    });
                }
                // 게이트웨이 응답 저장
                await this.paymentRepository.update(savedPayment.id, {
                    gatewayPaymentId: gatewayResponse.paymentId,
                    gatewayResponse: gatewayResponse
                });
                res.status(201).json({
                    success: true,
                    data: {
                        paymentId: savedPayment.id,
                        transactionId: savedPayment.transactionId,
                        gateway: gatewayResponse
                    }
                });
            }
            catch (error) {
                console.error('Error creating payment request:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to create payment request'
                });
            }
        };
        // 결제 완료 처리 (웹훅)
        this.processPaymentCompletion = async (req, res) => {
            try {
                const { transactionId, gatewayTransactionId, status, gatewayData } = req.body;
                const payment = await this.paymentRepository.findOne({
                    where: { transactionId },
                    relations: ['order']
                });
                if (!payment) {
                    return res.status(404).json({
                        success: false,
                        error: 'Payment not found'
                    });
                }
                // 트랜잭션 시작
                const queryRunner = connection_1.AppDataSource.createQueryRunner();
                await queryRunner.connect();
                await queryRunner.startTransaction();
                try {
                    // 결제 상태 업데이트
                    const newStatus = status === 'success'
                        ? Payment_1.PaymentGatewayStatus.COMPLETED
                        : Payment_1.PaymentGatewayStatus.FAILED;
                    await queryRunner.manager.update(Payment_1.Payment, payment.id, {
                        status: newStatus,
                        gatewayTransactionId,
                        webhookData: gatewayData,
                        ...(status === 'failed' && { failureReason: gatewayData === null || gatewayData === void 0 ? void 0 : gatewayData.failureReason })
                    });
                    if (newStatus === Payment_1.PaymentGatewayStatus.COMPLETED) {
                        // 주문 상태 업데이트
                        await queryRunner.manager.update(Order_1.Order, payment.orderId, {
                            paymentStatus: Order_1.PaymentStatus.PAID,
                            status: Order_1.OrderStatus.CONFIRMED,
                            paymentId: payment.id,
                            paymentMethod: payment.method
                        });
                        // 결제 세부 정보 저장
                        if (gatewayData === null || gatewayData === void 0 ? void 0 : gatewayData.paymentDetails) {
                            await queryRunner.manager.update(Payment_1.Payment, payment.id, {
                                paymentDetails: this.sanitizePaymentDetails(gatewayData.paymentDetails)
                            });
                        }
                    }
                    else {
                        // 결제 실패 시 재고 복구
                        const order = await queryRunner.manager.findOne(Order_1.Order, {
                            where: { id: payment.orderId },
                            relations: ['items', 'items.product']
                        });
                        if (order) {
                            for (const orderItem of order.items) {
                                if (orderItem.product.manageStock) {
                                    await queryRunner.manager.update(Product_1.Product, orderItem.productId, {
                                        stockQuantity: orderItem.product.stockQuantity + orderItem.quantity
                                    });
                                }
                            }
                            await queryRunner.manager.update(Order_1.Order, payment.orderId, {
                                paymentStatus: Order_1.PaymentStatus.FAILED
                            });
                        }
                    }
                    await queryRunner.commitTransaction();
                    res.json({
                        success: true,
                        message: `Payment ${newStatus}`
                    });
                }
                catch (error) {
                    await queryRunner.rollbackTransaction();
                    throw error;
                }
                finally {
                    await queryRunner.release();
                }
            }
            catch (error) {
                console.error('Error processing payment completion:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to process payment completion'
                });
            }
        };
        // 환불 처리
        this.processRefund = async (req, res) => {
            var _a, _b;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { paymentId, amount, reason } = req.body;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                const originalPayment = await this.paymentRepository.findOne({
                    where: { id: paymentId },
                    relations: ['order']
                });
                if (!originalPayment) {
                    return res.status(404).json({
                        success: false,
                        error: 'Payment not found'
                    });
                }
                // 관리자가 아닌 경우 본인 결제만 환불 가능
                if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) !== 'admin' && originalPayment.userId !== userId) {
                    return res.status(403).json({
                        success: false,
                        error: 'Insufficient permissions'
                    });
                }
                if (!originalPayment.canRefund()) {
                    return res.status(400).json({
                        success: false,
                        error: 'Payment cannot be refunded'
                    });
                }
                const refundAmount = amount || originalPayment.amount;
                if (refundAmount > originalPayment.amount) {
                    return res.status(400).json({
                        success: false,
                        error: 'Refund amount cannot exceed original payment amount'
                    });
                }
                // 트랜잭션 시작
                const queryRunner = connection_1.AppDataSource.createQueryRunner();
                await queryRunner.connect();
                await queryRunner.startTransaction();
                try {
                    // 환불 결제 객체 생성
                    const refundPayment = new Payment_1.Payment();
                    refundPayment.orderId = originalPayment.orderId;
                    refundPayment.userId = originalPayment.userId;
                    refundPayment.type = refundAmount === originalPayment.amount
                        ? Payment_1.PaymentType.REFUND
                        : Payment_1.PaymentType.PARTIAL_REFUND;
                    refundPayment.provider = originalPayment.provider;
                    refundPayment.method = originalPayment.method;
                    refundPayment.amount = refundAmount;
                    refundPayment.currency = originalPayment.currency;
                    refundPayment.status = Payment_1.PaymentGatewayStatus.PROCESSING;
                    refundPayment.transactionId = refundPayment.generateTransactionId();
                    refundPayment.originalPaymentId = originalPayment.id;
                    refundPayment.refundReason = reason;
                    refundPayment.refundRequestedBy = userId;
                    refundPayment.refundRequestedAt = new Date();
                    const savedRefund = await queryRunner.manager.save(refundPayment);
                    // 게이트웨이 환불 요청
                    const gatewayResponse = await this.processGatewayRefund(originalPayment, refundAmount, reason);
                    if (gatewayResponse.success) {
                        // 환불 성공
                        await queryRunner.manager.update(Payment_1.Payment, savedRefund.id, {
                            status: Payment_1.PaymentGatewayStatus.COMPLETED,
                            gatewayTransactionId: gatewayResponse.refundTransactionId,
                            gatewayResponse: gatewayResponse,
                            refundProcessedAt: new Date()
                        });
                        // 전액 환불인 경우 주문 상태 변경
                        if (refundAmount === originalPayment.amount) {
                            await queryRunner.manager.update(Order_1.Order, originalPayment.orderId, {
                                paymentStatus: Order_1.PaymentStatus.REFUNDED,
                                status: Order_1.OrderStatus.REFUNDED
                            });
                            // 재고 복구
                            const order = await queryRunner.manager.findOne(Order_1.Order, {
                                where: { id: originalPayment.orderId },
                                relations: ['items', 'items.product']
                            });
                            if (order) {
                                for (const orderItem of order.items) {
                                    if (orderItem.product.manageStock) {
                                        await queryRunner.manager.update(Product_1.Product, orderItem.productId, {
                                            stockQuantity: orderItem.product.stockQuantity + orderItem.quantity
                                        });
                                    }
                                }
                            }
                        }
                    }
                    else {
                        // 환불 실패
                        await queryRunner.manager.update(Payment_1.Payment, savedRefund.id, {
                            status: Payment_1.PaymentGatewayStatus.FAILED,
                            failureReason: gatewayResponse.error
                        });
                    }
                    await queryRunner.commitTransaction();
                    res.json({
                        success: gatewayResponse.success,
                        data: {
                            refundId: savedRefund.id,
                            transactionId: savedRefund.transactionId,
                            amount: refundAmount,
                            status: gatewayResponse.success ? 'completed' : 'failed'
                        },
                        ...(gatewayResponse.error && { error: gatewayResponse.error })
                    });
                }
                catch (error) {
                    await queryRunner.rollbackTransaction();
                    throw error;
                }
                finally {
                    await queryRunner.release();
                }
            }
            catch (error) {
                console.error('Error processing refund:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to process refund'
                });
            }
        };
        // 결제 내역 조회
        this.getPaymentHistory = async (req, res) => {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                const { page = 1, limit = 10, type, status } = req.query;
                if (!userId) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }
                const skip = (Number(page) - 1) * Number(limit);
                const queryBuilder = this.paymentRepository
                    .createQueryBuilder('payment')
                    .leftJoinAndSelect('payment.order', 'order')
                    .where('payment.userId = :userId', { userId });
                if (type) {
                    queryBuilder.andWhere('payment.type = :type', { type });
                }
                if (status) {
                    queryBuilder.andWhere('payment.status = :status', { status });
                }
                queryBuilder
                    .orderBy('payment.createdAt', 'DESC')
                    .skip(skip)
                    .take(Number(limit));
                const [payments, totalCount] = await queryBuilder.getManyAndCount();
                // 민감한 정보 제거
                const sanitizedPayments = payments.map((payment) => {
                    const { gatewayResponse, webhookData, ...sanitizedPayment } = payment;
                    return {
                        ...sanitizedPayment,
                        gatewayResponse: undefined,
                        webhookData: undefined,
                        paymentDetails: payment.paymentDetails ? {
                            cardNumber: payment.getMaskedCardNumber(),
                            cardType: payment.paymentDetails.cardType,
                            bankName: payment.paymentDetails.bankName,
                            accountNumber: payment.getMaskedAccountNumber()
                        } : undefined
                    };
                });
                res.json({
                    success: true,
                    data: {
                        payments: sanitizedPayments,
                        pagination: {
                            page: Number(page),
                            limit: Number(limit),
                            totalCount,
                            totalPages: Math.ceil(totalCount / Number(limit))
                        }
                    }
                });
            }
            catch (error) {
                console.error('Error fetching payment history:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch payment history'
                });
            }
        };
        // 결제 수단 조회
        this.getPaymentMethods = async (req, res) => {
            try {
                const paymentMethods = [
                    {
                        provider: Payment_1.PaymentProvider.IAMPORT,
                        methods: ['card', 'bank_transfer', 'virtual_account', 'phone'],
                        name: '아임포트',
                        description: '국내 주요 결제 수단 지원'
                    },
                    {
                        provider: Payment_1.PaymentProvider.TOSS_PAYMENTS,
                        methods: ['card', 'bank_transfer', 'virtual_account', 'mobile'],
                        name: '토스페이먼츠',
                        description: '간편 결제 및 다양한 결제 수단'
                    },
                    {
                        provider: Payment_1.PaymentProvider.KAKAO_PAY,
                        methods: ['kakao_pay'],
                        name: '카카오페이',
                        description: '카카오톡 간편 결제'
                    },
                    {
                        provider: Payment_1.PaymentProvider.NAVER_PAY,
                        methods: ['naver_pay'],
                        name: '네이버페이',
                        description: '네이버 간편 결제'
                    }
                ];
                res.json({
                    success: true,
                    data: paymentMethods
                });
            }
            catch (error) {
                console.error('Error fetching payment methods:', error);
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch payment methods'
                });
            }
        };
    }
    // 결제 게이트웨이별 처리 메서드들
    async processIamportPayment(payment, order) {
        // 아임포트 결제 요청 로직
        try {
            // 실제 구현에서는 아임포트 SDK 사용
            return {
                paymentId: `imp_${Date.now()}`,
                redirectUrl: `https://pg.iamport.kr/payments/${payment.transactionId}`,
                method: 'redirect'
            };
        }
        catch (error) {
            return { paymentId: '', error: 'Iamport payment initialization failed' };
        }
    }
    async processTossPayment(payment, order) {
        // 토스페이먼츠 결제 요청 로직
        try {
            return {
                paymentId: `toss_${Date.now()}`,
                redirectUrl: `https://api.tosspayments.com/v1/payments/${payment.transactionId}`,
                method: 'redirect'
            };
        }
        catch (error) {
            return { paymentId: '', error: 'Toss Payments initialization failed' };
        }
    }
    async processKakaoPayment(payment, order) {
        // 카카오페이 결제 요청 로직
        try {
            return {
                paymentId: `kakao_${Date.now()}`,
                redirectUrl: `https://open-api.kakaopay.com/online/v1/payment/ready`,
                method: 'redirect'
            };
        }
        catch (error) {
            return { paymentId: '', error: 'Kakao Pay initialization failed' };
        }
    }
    async processGatewayRefund(originalPayment, amount, reason) {
        // 게이트웨이별 환불 처리
        try {
            switch (originalPayment.provider) {
                case Payment_1.PaymentProvider.IAMPORT:
                    // 아임포트 환불 API 호출
                    break;
                case Payment_1.PaymentProvider.TOSS_PAYMENTS:
                    // 토스페이먼츠 환불 API 호출
                    break;
                // ... 다른 게이트웨이들
            }
            return {
                success: true,
                refundTransactionId: `refund_${Date.now()}`
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Gateway refund failed'
            };
        }
    }
    sanitizePaymentDetails(details) {
        // 민감한 정보 마스킹
        if (details.cardNumber) {
            details.cardNumber = details.cardNumber.replace(/(\d{4})\d{8}(\d{4})/, '$1********$2');
        }
        if (details.accountNumber) {
            details.accountNumber = details.accountNumber.replace(/(\d{3})\d+(\d{3})/, '$1***$2');
        }
        return details;
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=paymentController.js.map