/**
 * Payment Fail Callback Page
 * Phase PG-1: Toss Payments Failure Handler
 *
 * This page is called by Toss Payments after payment failure
 * Query params: code, message, orderId
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { XCircle, AlertCircle } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

export const PaymentFailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    const handleFailure = async () => {
      const code = searchParams.get('code');
      const message = searchParams.get('message');
      const orderId = searchParams.get('orderId');

      setErrorCode(code);
      setErrorMessage(message || 'Payment processing failed.');
      setOrderNumber(orderId);

      // Optionally notify backend about the failure
      if (orderId) {
        try {
          await authClient.api.post('/api/v1/payments/toss/fail', {
            orderNumber: orderId,
            errorCode: code,
            errorMessage: message,
          });
        } catch (err) {
          console.error('Failed to notify backend about payment failure:', err);
          // Don't show error to user - this is just for logging
        }
      }
    };

    handleFailure();
  }, [searchParams]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h2>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-800 mb-1">
                      {errorMessage}
                    </p>
                    {errorCode && (
                      <p className="text-xs text-red-600">
                        Error Code: {errorCode}
                      </p>
                    )}
                    {orderNumber && (
                      <p className="text-xs text-red-600">
                        Order Number: {orderNumber}
                      </p>
                    )}
                  </div>
                </div>
              </div>

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

              <div className="mt-6 text-sm text-gray-500">
                <p>Payment failed. Please try again or</p>
                <p>contact customer service if the problem persists.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentFailPage;
