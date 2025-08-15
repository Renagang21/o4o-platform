import axios from 'axios';
import { config } from 'dotenv';
import logger from '../utils/logger';

config();

// TossPayments configuration
export const tossPaymentsConfig = {
  clientKey: process.env.TOSS_CLIENT_KEY || 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq',
  secretKey: process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R',
  apiUrl: process.env.TOSS_API_URL || 'https://api.tosspayments.com/v1',
  webhookSecret: process.env.TOSS_WEBHOOK_SECRET || '',
  
  // URLs for payment callbacks
  successUrl: process.env.PAYMENT_SUCCESS_URL || 'http://localhost:3000/payment/success',
  failUrl: process.env.PAYMENT_FAIL_URL || 'http://localhost:3000/payment/fail',
  webhookUrl: process.env.PAYMENT_WEBHOOK_URL || 'http://localhost:3001/api/v1/toss-payments/webhook',
  
  // Payment settings
  currency: 'KRW',
  country: 'KR',
  
  // Test mode flag
  isTestMode: process.env.NODE_ENV !== 'production' || process.env.TOSS_CLIENT_KEY?.startsWith('test_'),
};

// Create axios instance for TossPayments API
export const tossPaymentsClient = axios.create({
  baseURL: tossPaymentsConfig.apiUrl,
  headers: {
    'Authorization': `Basic ${Buffer.from(tossPaymentsConfig.secretKey + ':').toString('base64')}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor for logging
tossPaymentsClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[TossPayments Request]', {
        method: config.method,
        url: config.url,
        data: config.data,
      });
    }
    return config;
  },
  (error) => {
    console.error('[TossPayments Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
tossPaymentsClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[TossPayments Response]', {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('[TossPayments API Error]', {
        status: error.response.status,
        code: error.response.data?.code,
        message: error.response.data?.message,
      });
      
      // Throw custom error with TossPayments error details
      const customError = new Error(error.response.data?.message || 'TossPayments API Error');
      (customError as any).code = error.response.data?.code;
      (customError as any).status = error.response.status;
      throw customError;
    }
    
    console.error('[TossPayments Network Error]', error.message);
    throw error;
  }
);

// Payment methods enum
export enum PaymentMethod {
  CARD = '카드',
  VIRTUAL_ACCOUNT = '가상계좌',
  TRANSFER = '계좌이체',
  MOBILE_PHONE = '휴대폰',
  CULTURE_GIFT_CARD = '문화상품권',
  BOOK_GIFT_CARD = '도서문화상품권',
  GAME_GIFT_CARD = '게임문화상품권',
  EASY_PAY = '간편결제',
}

// Payment status enum
export enum PaymentStatus {
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_DEPOSIT = 'WAITING_FOR_DEPOSIT',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
  PARTIAL_CANCELED = 'PARTIAL_CANCELED',
  ABORTED = 'ABORTED',
  EXPIRED = 'EXPIRED',
}

// Card company codes
export const CardCompanyCodes = {
  '국민': 'KOOKMIN',
  '신한': 'SHINHAN',
  '삼성': 'SAMSUNG',
  '현대': 'HYUNDAI',
  '롯데': 'LOTTE',
  'BC': 'BC',
  '농협': 'NONGHYUP',
  '하나': 'HANA',
  '우리': 'WOORI',
  '씨티': 'CITI',
  '카카오뱅크': 'KAKAOBANK',
  '케이뱅크': 'KBANK',
  '토스뱅크': 'TOSSBANK',
} as const;

// Validate configuration on startup
export function validateTossPaymentsConfig(): void {
  const warnings: string[] = [];
  
  if (!tossPaymentsConfig.clientKey) {
    warnings.push('TOSS_CLIENT_KEY is not configured');
  }
  
  if (!tossPaymentsConfig.secretKey) {
    warnings.push('TOSS_SECRET_KEY is not configured');
  }
  
  if (tossPaymentsConfig.isTestMode) {
    logger.warn('⚠️  TossPayments is running in TEST MODE');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  TossPayments configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  } else {
    logger.info('✅ TossPayments configuration validated successfully');
  }
}

// Export helper functions
export async function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  try {
    const response = await tossPaymentsClient.post(`/payments/${paymentKey}`, {
      orderId,
      amount,
    });
    return response.data;
  } catch (error) {
    console.error('Payment confirmation failed:', error);
    throw error;
  }
}

export async function cancelPayment(paymentKey: string, cancelReason: string) {
  try {
    const response = await tossPaymentsClient.post(`/payments/${paymentKey}/cancel`, {
      cancelReason,
    });
    return response.data;
  } catch (error) {
    console.error('Payment cancellation failed:', error);
    throw error;
  }
}

export async function getPayment(paymentKey: string) {
  try {
    const response = await tossPaymentsClient.get(`/payments/${paymentKey}`);
    return response.data;
  } catch (error) {
    console.error('Failed to get payment:', error);
    throw error;
  }
}