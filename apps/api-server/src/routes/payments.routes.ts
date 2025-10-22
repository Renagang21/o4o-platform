import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import express from 'express';
import paymentController from '../controllers/PaymentController';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error-handler';

const router: Router = Router();

// Middleware to capture raw body for webhook signature verification
const captureRawBody = (req: Request, res: Response, next: NextFunction) => {
  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    (req as any).rawBody = Buffer.concat(chunks).toString('utf8');
    next();
  });
};

// Express JSON parser that preserves rawBody for webhooks
const webhookBodyParser = express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
});

// Validation middleware
const validatePreparePayment = [
  body('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('orderName').notEmpty().withMessage('Order name is required'),
  body('successUrl').isURL().withMessage('Success URL must be a valid URL'),
  body('failUrl').isURL().withMessage('Fail URL must be a valid URL'),
  body('customerEmail').optional().isEmail().withMessage('Customer email must be valid'),
  body('customerMobilePhone').optional().isMobilePhone('any').withMessage('Customer mobile phone must be valid')
];

const validateConfirmPayment = [
  body('paymentKey').notEmpty().withMessage('Payment key is required'),
  body('orderId').isUUID().withMessage('Order ID must be a valid UUID'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
];

const validateCancelPayment = [
  param('paymentKey').notEmpty().withMessage('Payment key is required'),
  body('cancelReason').notEmpty().withMessage('Cancel reason is required'),
  body('cancelAmount').optional().isFloat({ min: 0 }).withMessage('Cancel amount must be a positive number')
];

const validatePaymentId = [
  param('id').isUUID().withMessage('Payment ID must be a valid UUID')
];

const validateOrderId = [
  param('orderId').isUUID().withMessage('Order ID must be a valid UUID')
];

/**
 * @route   POST /api/v1/payments/prepare
 * @desc    결제 준비
 * @access  Private
 */
router.post(
  '/prepare',
  authenticate,
  validatePreparePayment,
  asyncHandler(paymentController.preparePayment)
);

/**
 * @route   POST /api/v1/payments/confirm
 * @desc    결제 승인 (토스페이먼츠 리다이렉트 후)
 * @access  Public (토스페이먼츠에서 직접 호출)
 */
router.post(
  '/confirm',
  validateConfirmPayment,
  asyncHandler(paymentController.confirmPayment)
);

/**
 * @route   POST /api/v1/payments/:paymentKey/cancel
 * @desc    결제 취소/환불
 * @access  Private
 */
router.post(
  '/:paymentKey/cancel',
  authenticate,
  validateCancelPayment,
  asyncHandler(paymentController.cancelPayment)
);

/**
 * @route   POST /api/v1/payments/webhook
 * @desc    토스페이먼츠 웹훅 수신
 * @access  Public (토스페이먼츠에서 직접 호출)
 * @note    rawBody를 사용하므로 별도의 body parser 적용
 */
router.post(
  '/webhook',
  webhookBodyParser,
  asyncHandler(paymentController.handleWebhook)
);

/**
 * @route   GET /api/v1/payments/:id
 * @desc    결제 정보 조회
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  validatePaymentId,
  asyncHandler(paymentController.getPayment)
);

/**
 * @route   GET /api/v1/payments/order/:orderId
 * @desc    주문의 결제 정보 조회
 * @access  Private
 */
router.get(
  '/order/:orderId',
  authenticate,
  validateOrderId,
  asyncHandler(paymentController.getPaymentByOrderId)
);

export default router;
