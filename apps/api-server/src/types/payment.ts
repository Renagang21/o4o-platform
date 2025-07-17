/**
 * Payment-related type definitions
 */

import { PaymentMethod } from '../entities/Order';

// Gateway response types
export interface GatewayResponse {
  paymentId: string;
  redirectUrl?: string;
  method?: 'redirect' | 'direct';
  error?: string;
}

export interface RefundGatewayResponse {
  success: boolean;
  refundTransactionId?: string;
  error?: string;
}

// Webhook data types
export interface PaymentWebhookData {
  paymentId?: string;
  transactionId?: string;
  status?: string;
  failureReason?: string;
  paymentDetails?: PaymentDetailsData;
  [key: string]: unknown;
}

export interface PaymentDetailsData {
  cardNumber?: string;
  cardType?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  virtualAccountNumber?: string;
  virtualAccountBank?: string;
  virtualAccountExpiry?: string;
}

// Payment metadata types
export interface PaymentMetadata {
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  adminNotes?: string;
}

// Sanitized payment response types
export interface SanitizedPayment {
  id: string;
  orderId: string;
  userId: string;
  type: string;
  provider: string;
  method: string;
  status: string;
  amount: number;
  currency: string;
  transactionId: string;
  gatewayTransactionId?: string;
  gatewayPaymentId?: string;
  paymentDetails?: {
    cardNumber?: string | null;
    cardType?: string;
    bankName?: string;
    accountNumber?: string | null;
  };
  failureReason?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  originalPaymentId?: string;
  refundReason?: string;
  refundRequestedBy?: string;
  refundRequestedAt?: Date;
  refundProcessedAt?: Date;
  metadata?: PaymentMetadata;
  createdAt: Date;
  updatedAt: Date;
  // Explicitly removing sensitive fields
  gatewayResponse?: undefined;
  webhookData?: undefined;
}

// Request types
export interface CreatePaymentRequest {
  orderId: string;
  paymentMethod: string;
  provider?: string;
}

export interface ProcessPaymentCompletionRequest {
  transactionId: string;
  gatewayTransactionId: string;
  status: 'success' | 'failed';
  gatewayData?: PaymentWebhookData;
}

export interface ProcessRefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

// Query types
export interface PaymentHistoryQuery {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

// Payment method info
export interface PaymentMethodInfo {
  provider: string;
  methods: string[];
  name: string;
  description: string;
}