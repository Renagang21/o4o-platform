/**
 * Toss Payments Integration Utilities
 * Phase PG-1: Client-side Toss Payments SDK integration
 */

// Toss Payments SDK types
declare global {
  interface Window {
    TossPayments: any;
  }
}

export interface TossPaymentWidgetParams {
  orderId: string; // orderNumber from backend
  orderName: string; // e.g., "Áˆ… x 2t"
  amount: number; // total amount
  customerName?: string;
  customerEmail?: string;
  successUrl: string; // callback URL on success
  failUrl: string; // callback URL on failure
}

/**
 * Load Toss Payments SDK script
 * Returns a promise that resolves when the SDK is loaded
 */
export function loadTossPaymentsSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.TossPayments) {
      resolve();
      return;
    }

    // Create script tag
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment-widget';
    script.async = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      console.error('L Failed to load Toss Payments SDK');
      reject(new Error('Failed to load Toss Payments SDK'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Get Toss Payments client key from environment
 */
export function getTossClientKey(): string {
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

  if (!clientKey) {
    console.warn('   VITE_TOSS_CLIENT_KEY is not set. Using test key.');
    // Return a test key for development (replace with actual test key)
    return 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';
  }

  return clientKey;
}

/**
 * Initialize Toss Payments and request payment
 */
export async function requestTossPayment(params: TossPaymentWidgetParams): Promise<void> {
  try {
    // Load SDK if not loaded
    if (!window.TossPayments) {
      await loadTossPaymentsSDK();
    }

    const clientKey = getTossClientKey();
    const tossPayments = window.TossPayments(clientKey);

    // Request payment
    await tossPayments.requestPayment('tÜ', {
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      successUrl: params.successUrl,
      failUrl: params.failUrl,
    });

  } catch (error) {
    console.error('L Toss payment request failed:', error);
    throw error;
  }
}

/**
 * Generate order name from cart items
 * Format: "« ˆø Áˆ… x Nt"
 */
export function generateOrderName(items: { product_name: string }[]): string {
  if (items.length === 0) {
    return 'Áˆ';
  }

  if (items.length === 1) {
    return items[0].product_name;
  }

  return `${items[0].product_name} x ${items.length - 1}t`;
}
