import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { paymentService } from '../api/services/paymentService';
import { PaymentInfo, PaymentMethod, PaymentHistory } from '../types/payment';

interface PaymentContextType {
  paymentMethods: PaymentMethod[];
  paymentHistory: PaymentHistory[];
  loading: boolean;
  error: string | null;
  processPayment: (orderId: string, paymentInfo: PaymentInfo) => Promise<{ success: boolean; message: string }>;
  cancelPayment: (paymentId: string) => Promise<{ success: boolean; message: string }>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
};

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadPaymentData();
    }
  }, [user]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [methods, history] = await Promise.all([
        paymentService.getPaymentMethods(),
        paymentService.getPaymentHistory(user!.id.toString()),
      ]);
      setPaymentMethods(methods);
      setPaymentHistory(history);
    } catch (err) {
      setError('결제 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('Error loading payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (orderId: string, paymentInfo: PaymentInfo) => {
    try {
      setLoading(true);
      setError(null);
      const result = await paymentService.processPayment(orderId, paymentInfo);
      if (result.success) {
        await loadPaymentData();
      }
      return result;
    } catch (err) {
      setError('결제를 처리하는 중 오류가 발생했습니다.');
      console.error('Error processing payment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = async (paymentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const result = await paymentService.cancelPayment(paymentId);
      if (result.success) {
        await loadPaymentData();
      }
      return result;
    } catch (err) {
      setError('결제를 취소하는 중 오류가 발생했습니다.');
      console.error('Error cancelling payment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <PaymentContext.Provider
      value={{
        paymentMethods,
        paymentHistory,
        loading,
        error,
        processPayment,
        cancelPayment,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}; 