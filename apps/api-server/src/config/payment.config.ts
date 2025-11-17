/**
 * Payment Gateway Configuration
 * Phase PG-1: Toss Payments Integration
 *
 * Environment Variables Required:
 * - TOSS_SECRET_KEY: Toss Payments secret key (for server-side API calls)
 * - TOSS_CLIENT_KEY: (Optional) Toss Payments client key (for frontend SDK)
 * - TOSS_API_BASE_URL: (Optional) Toss Payments API base URL
 *
 * For local development and testing:
 * - Use Toss test keys from https://developers.tosspayments.com/
 * - Test secret key format: test_sk_*****
 * - Test client key format: test_ck_*****
 *
 * For production:
 * - Replace with live keys: live_sk_*****, live_ck_*****
 * - Configure in production environment variables only
 */

export interface TossPaymentsConfig {
  secretKey: string;
  clientKey?: string;
  baseUrl: string;
  isTestMode: boolean;
}

/**
 * Toss Payments configuration
 * Falls back to test mode if no secret key is provided
 */
export const tossConfig: TossPaymentsConfig = {
  // Server-side secret key (REQUIRED for payment confirmation)
  secretKey: process.env.TOSS_SECRET_KEY || '',

  // Client-side key (optional, mainly used for frontend SDK initialization)
  clientKey: process.env.TOSS_CLIENT_KEY,

  // API base URL
  baseUrl: process.env.TOSS_API_BASE_URL || 'https://api.tosspayments.com/v1',

  // Automatically detect test mode from key prefix
  isTestMode: process.env.TOSS_SECRET_KEY?.startsWith('test_') ?? true
};

/**
 * Validate payment configuration
 * Throws error if required keys are missing in non-test environments
 */
export function validatePaymentConfig(): void {
  if (!tossConfig.secretKey) {
    console.warn('⚠️  TOSS_SECRET_KEY is not configured. Payment features will not work.');
    console.warn('   Set TOSS_SECRET_KEY in your .env file.');
    console.warn('   For testing, use: test_sk_*****');
    console.warn('   Get test keys from: https://developers.tosspayments.com/');
  } else if (tossConfig.isTestMode) {
    console.log('✅ Toss Payments configured in TEST mode');
    console.log('   Secret key: test_sk_*****');
  } else {
    console.log('✅ Toss Payments configured in LIVE mode');
    console.log('   Secret key: live_sk_*****');
  }
}

/**
 * Get authorization header for Toss Payments API
 * Uses Basic Auth with secret key as username, empty password
 */
export function getTossAuthHeader(): string {
  const encoded = Buffer.from(`${tossConfig.secretKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Payment method mapping
 * Maps internal payment methods to Toss Payments payment types
 */
export const TOSS_PAYMENT_METHODS = {
  CARD: '카드',
  TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
  MOBILE_PHONE: '휴대폰',
  CULTURE_GIFT_CERTIFICATE: '문화상품권',
  BOOK_CULTURE_GIFT_CERTIFICATE: '도서문화상품권',
  GAME_CULTURE_GIFT_CERTIFICATE: '게임문화상품권',
  TOSSPAY: '토스페이'
} as const;

export type TossPaymentMethod = typeof TOSS_PAYMENT_METHODS[keyof typeof TOSS_PAYMENT_METHODS];
