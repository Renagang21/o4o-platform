/**
 * Payment Success Callback Page
 * Phase PG-1: Toss Payments Success Handler
 *
 * This page is called by Toss Payments after successful payment
 * Query params: paymentKey, orderId, amount
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { CheckCircle, Loader, XCircle } from 'lucide-react';
import { useCartStore } from '../../stores/cartStore';
import { authClient } from '@o4o/auth-client';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cartStore = useCartStore();

  const [processing, setProcessing] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      const paymentKey = searchParams.get('paymentKey');
      const orderId = searchParams.get('orderId');
      const amount = searchParams.get('amount');

      // Validation
      if (!paymentKey || !orderId || !amount) {
        setError('Invalid payment information.');
        setProcessing(false);
        return;
      }

      try {
        // Call backend to confirm payment
        const response = await authClient.api.post('/api/v1/payments/toss/confirm', {
          paymentKey,
          orderId,
          amount: parseFloat(amount),
        });

        if (response.data.success) {
          setSuccess(true);
          setOrderNumber(response.data.data.orderNumber);

          // Clear cart after successful payment
          cartStore.clearCart();

          // Redirect to order success page after 2 seconds
          setTimeout(() => {
            navigate(`/order/success/${response.data.data.orderId}`);
          }, 2000);
        } else {
          setError(response.data.message || 'Payment confirmation failed.');
        }
      } catch (err: any) {
        console.error('Payment confirmation failed:', err);
        setError(err.response?.data?.message || 'An error occurred during payment confirmation.');
      } finally {
        setProcessing(false);
      }
    };

    confirmPayment();
  }, [searchParams, navigate, cartStore]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            {processing && (
              <div className="text-center">
                <Loader className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Processing Payment...
                </h2>
                <p className="text-gray-600">
                  Please wait while we confirm your payment.
                </p>
              </div>
            )}

            {!processing && success && (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Payment Successful!
                </h2>
                <p className="text-gray-600 mb-4">
                  Order Number: {orderNumber}
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to order details page...
                </p>
              </div>
            )}

            {!processing && error && (
              <div className="text-center">
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Payment Confirmation Failed
                </h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/store/checkout')}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate('/store/products')}
                    className="w-full py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentSuccessPage;
