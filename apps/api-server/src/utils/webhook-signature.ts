/**
 * Webhook Signature Utilities
 * HMAC-SHA256 based webhook authentication
 */

import crypto from 'crypto';

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(payload: any, secret: string): string {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
}

/**
 * Verify webhook signature
 */
export function verifySignature(
  payload: any,
  secret: string,
  receivedSignature: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Build HTTP headers for webhook delivery
 */
export function buildWebhookHeaders(
  event: string,
  payload: any,
  secret: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = generateSignature(payload, secret);

  return {
    'Content-Type': 'application/json',
    'X-Webhook-Event': event,
    'X-Webhook-Timestamp': timestamp,
    'X-Webhook-Signature': signature,
    'User-Agent': 'O4O-Webhooks/1.0',
  };
}
