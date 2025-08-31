import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { TossPaymentsAdvancedService, BillingKeyRequest, PartialCancelRequest, EscrowConfirmRequest, CashReceiptRequest } from '../../services/toss-payments-advanced.service';
import { SubscriptionService, CreateSubscriptionRequest } from '../../services/subscription.service';
import { asyncHandler, createForbiddenError, createValidationError, createNotFoundError } from '../../middleware/errorHandler.middleware';
import logger from '../../utils/logger';

export class AdvancedPaymentController {
  private tossPaymentsService: TossPaymentsAdvancedService;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.tossPaymentsService = new TossPaymentsAdvancedService();
    this.subscriptionService = new SubscriptionService();
  }

  // POST /api/payments/subscriptions - 정기결제 등록
  createSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      planId,
      cardNumber,
      cardExpirationYear,
      cardExpirationMonth,
      cardPassword,
      customerBirthday,
      trialDays,
      metadata
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Subscription access required');
    }

    // Validate required fields
    if (!planId) {
      throw createValidationError('Plan ID is required');
    }

    if (!cardNumber || !cardExpirationYear || !cardExpirationMonth) {
      throw createValidationError('Card information is required');
    }

    try {
      const customerKey = `customer_${currentUser.id}`;

      // 1. 빌링키 발급
      const billingKeyRequest: BillingKeyRequest = {
        customerKey,
        customerName: currentUser.name,
        customerEmail: currentUser.email,
        cardNumber,
        cardExpirationYear,
        cardExpirationMonth,
        cardPassword,
        customerBirthday,
      };

      const billingKeyResponse = await this.tossPaymentsService.issueBillingKey(billingKeyRequest);

      // 2. 구독 생성
      const subscriptionRequest: CreateSubscriptionRequest = {
        customerId: currentUser.id,
        planId,
        billingKey: billingKeyResponse.billingKey,
        trialDays,
        metadata,
      };

      const subscription = await this.subscriptionService.createSubscription(subscriptionRequest);

      logger.info('Subscription created successfully', {
        userId: currentUser?.id,
        subscriptionId: subscription.id,
        planId,
        billingKey: billingKeyResponse.billingKey,
      });

      res.status(201).json({
        success: true,
        data: {
          subscription,
          billingKey: {
            billingKey: billingKeyResponse.billingKey,
            card: billingKeyResponse.card,
            authenticatedAt: billingKeyResponse.authenticatedAt,
          }
        },
        message: 'Subscription created successfully',
      });
    } catch (error) {
      logger.error('Error creating subscription:', {
        userId: currentUser?.id,
        planId,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/payments/subscriptions/:id/cancel - 정기결제 취소
  cancelSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { id: subscriptionId } = req.params;
    const { reason, cancelImmediately = false } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Subscription access required');
    }

    try {
      // 구독 정보 확인
      const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
      
      if (!subscription) {
        throw createNotFoundError('Subscription not found');
      }

      // 소유권 확인 (admin/manager가 아닌 경우)
      if (!['admin', 'manager'].includes(currentUser.role) && subscription.customerId !== currentUser.id) {
        throw createForbiddenError('Access denied to this subscription');
      }

      const cancelledSubscription = await this.subscriptionService.cancelSubscription(
        subscriptionId, 
        reason,
        cancelImmediately
      );

      logger.info('Subscription cancelled', {
        userId: currentUser?.id,
        subscriptionId,
        cancelImmediately,
        reason,
      });

      res.json({
        success: true,
        data: cancelledSubscription,
        message: 'Subscription cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling subscription:', {
        userId: currentUser?.id,
        subscriptionId,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/payments/:id/partial-cancel - 부분 취소
  partialCancel = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { id: paymentKey } = req.params;
    const {
      cancelAmount,
      cancelReason,
      refundReceiveAccount,
      taxFreeAmount,
      taxExemptionAmount
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Payment cancellation access required');
    }

    // Validate required fields
    if (!cancelAmount || cancelAmount <= 0) {
      throw createValidationError('Valid cancel amount is required');
    }

    if (!cancelReason) {
      throw createValidationError('Cancel reason is required');
    }

    try {
      // 결제 정보 확인 및 권한 체크
      await this.validatePaymentAccess(paymentKey, currentUser);

      const partialCancelRequest: PartialCancelRequest = {
        paymentKey,
        cancelAmount,
        cancelReason,
        refundReceiveAccount,
        taxFreeAmount,
        taxExemptionAmount,
      };

      const cancelResult = await this.tossPaymentsService.partialCancel(partialCancelRequest);

      logger.info('Partial cancel completed', {
        userId: currentUser?.id,
        paymentKey,
        cancelAmount,
        cancelReason,
      });

      res.json({
        success: true,
        data: cancelResult,
        message: 'Partial cancel completed successfully',
      });
    } catch (error) {
      logger.error('Error processing partial cancel:', {
        userId: currentUser?.id,
        paymentKey,
        cancelAmount,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/payments/escrow/confirm - 에스크로 구매 확정
  confirmEscrow = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      paymentKey,
      confirmAmount,
      deliveryDate
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Escrow confirmation access required');
    }

    // Validate required fields
    if (!paymentKey) {
      throw createValidationError('Payment key is required');
    }

    try {
      // 결제 정보 확인 및 권한 체크
      await this.validatePaymentAccess(paymentKey, currentUser);

      const escrowRequest: EscrowConfirmRequest = {
        paymentKey,
        confirmAmount,
        deliveryDate,
      };

      const confirmResult = await this.tossPaymentsService.confirmEscrow(escrowRequest);

      logger.info('Escrow confirmed', {
        userId: currentUser?.id,
        paymentKey,
        confirmAmount,
        deliveryDate,
      });

      res.json({
        success: true,
        data: confirmResult,
        message: 'Escrow confirmed successfully',
      });
    } catch (error) {
      logger.error('Error confirming escrow:', {
        userId: currentUser?.id,
        paymentKey,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/payments/cash-receipt - 현금영수증 발급
  issueCashReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const {
      paymentKey,
      type,
      registrationNumber
    } = req.body;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Cash receipt access required');
    }

    // Validate required fields
    if (!paymentKey) {
      throw createValidationError('Payment key is required');
    }

    if (!type || !['personal', 'business'].includes(type)) {
      throw createValidationError('Valid receipt type is required (personal or business)');
    }

    if (!registrationNumber) {
      throw createValidationError('Registration number is required');
    }

    try {
      // 결제 정보 확인 및 권한 체크
      await this.validatePaymentAccess(paymentKey, currentUser);

      const cashReceiptRequest: CashReceiptRequest = {
        paymentKey,
        type,
        registrationNumber,
      };

      const receiptResult = await this.tossPaymentsService.issueCashReceipt(cashReceiptRequest);

      logger.info('Cash receipt issued', {
        userId: currentUser?.id,
        paymentKey,
        type,
        receiptKey: receiptResult.receiptKey,
      });

      res.json({
        success: true,
        data: receiptResult,
        message: 'Cash receipt issued successfully',
      });
    } catch (error) {
      logger.error('Error issuing cash receipt:', {
        userId: currentUser?.id,
        paymentKey,
        type,
        error: error.message,
      });
      throw error;
    }
  });

  // GET /api/payments/settlements/:date - 결제 정산 조회
  getSettlements = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { date } = req.params;

    // Check permissions - admin only
    if (!['admin', 'manager'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Admin access required for settlement data');
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw createValidationError('Invalid date format. Use YYYY-MM-DD');
    }

    try {
      const settlements = await this.tossPaymentsService.getSettlements(date);

      logger.info('Settlement data retrieved', {
        userId: currentUser?.id,
        date,
        totalAmount: settlements.totalAmount,
        settlementStatus: settlements.settlementStatus,
      });

      res.json({
        success: true,
        data: settlements,
        message: 'Settlement data retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving settlement data:', {
        userId: currentUser?.id,
        date,
        error: error.message,
      });
      throw error;
    }
  });

  // Helper methods

  private async validatePaymentAccess(paymentKey: string, user: any): Promise<void> {
    try {
      const { AppDataSource } = await import('../../database/connection');
      const paymentRepository = AppDataSource.getRepository('Payment');
      
      const payment = await paymentRepository.findOne({
        where: { paymentKey },
        relations: ['order', 'order.vendor']
      });

      if (!payment) {
        throw createNotFoundError('Payment not found');
      }

      // Admin과 Manager는 모든 결제에 접근 가능
      if (['admin', 'manager'].includes(user.role)) {
        return;
      }

      // Vendor는 자신의 결제만 접근 가능
      if (user.role === 'vendor') {
        const { AppDataSource } = await import('../../database/connection');
        const vendorRepository = AppDataSource.getRepository('VendorInfo');
        const vendor = await vendorRepository.findOne({ where: { userId: user.id } });
        
        if (!vendor || !payment.order || payment.order.vendorId !== vendor.id) {
          throw createForbiddenError('Access denied to this payment');
        }
        return;
      }

      // 기타 역할은 접근 불가
      throw createForbiddenError('Insufficient permissions');
      
    } catch (error) {
      if (error.message.includes('Access denied') || error.message.includes('not found')) {
        throw error;
      }
      logger.error('Error validating payment access:', error);
      throw createForbiddenError('Unable to validate payment access');
    }
  }

  // GET /api/payments/subscriptions - 구독 목록 조회 (보너스 엔드포인트)
  getSubscriptions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { customerId } = req.query;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Subscription access required');
    }

    try {
      let targetCustomerId = currentUser.id;

      // Admin/Manager can query other customers
      if (['admin', 'manager'].includes(currentUser.role) && customerId) {
        targetCustomerId = customerId as string;
      }

      const subscriptions = await this.subscriptionService.getCustomerSubscriptions(targetCustomerId);

      res.json({
        success: true,
        data: subscriptions,
        message: 'Subscriptions retrieved successfully',
      });
    } catch (error) {
      logger.error('Error retrieving subscriptions:', {
        userId: currentUser?.id,
        customerId,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/payments/subscriptions/:id/pause - 구독 일시정지 (보너스 엔드포인트)
  pauseSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { id: subscriptionId } = req.params;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Subscription access required');
    }

    try {
      // 구독 정보 확인
      const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
      
      if (!subscription) {
        throw createNotFoundError('Subscription not found');
      }

      // 소유권 확인
      if (!['admin', 'manager'].includes(currentUser.role) && subscription.customerId !== currentUser.id) {
        throw createForbiddenError('Access denied to this subscription');
      }

      const pausedSubscription = await this.subscriptionService.pauseSubscription(subscriptionId);

      logger.info('Subscription paused', {
        userId: currentUser?.id,
        subscriptionId,
      });

      res.json({
        success: true,
        data: pausedSubscription,
        message: 'Subscription paused successfully',
      });
    } catch (error) {
      logger.error('Error pausing subscription:', {
        userId: currentUser?.id,
        subscriptionId,
        error: error.message,
      });
      throw error;
    }
  });

  // POST /api/payments/subscriptions/:id/resume - 구독 재개 (보너스 엔드포인트)
  resumeSubscription = asyncHandler(async (req: AuthRequest, res: Response) => {
    const currentUser = req.user;
    const { id: subscriptionId } = req.params;

    // Check permissions
    if (!['admin', 'manager', 'vendor', 'supplier'].includes(currentUser?.role || '')) {
      throw createForbiddenError('Subscription access required');
    }

    try {
      // 구독 정보 확인
      const subscription = await this.subscriptionService.getSubscriptionById(subscriptionId);
      
      if (!subscription) {
        throw createNotFoundError('Subscription not found');
      }

      // 소유권 확인
      if (!['admin', 'manager'].includes(currentUser.role) && subscription.customerId !== currentUser.id) {
        throw createForbiddenError('Access denied to this subscription');
      }

      const resumedSubscription = await this.subscriptionService.resumeSubscription(subscriptionId);

      logger.info('Subscription resumed', {
        userId: currentUser?.id,
        subscriptionId,
      });

      res.json({
        success: true,
        data: resumedSubscription,
        message: 'Subscription resumed successfully',
      });
    } catch (error) {
      logger.error('Error resuming subscription:', {
        userId: currentUser?.id,
        subscriptionId,
        error: error.message,
      });
      throw error;
    }
  });
}