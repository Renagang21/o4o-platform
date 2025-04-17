import axios from 'axios';
import { PaymentInfo } from '../../types/payment';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const paymentService = {
  async processPayment(userId: string, orderId: string, paymentInfo: PaymentInfo): Promise<{
    success: boolean;
    transactionId: string;
    message: string;
  }> {
    const response = await axios.post(`${API_URL}/users/${userId}/orders/${orderId}/payment`, paymentInfo);
    return response.data;
  },

  async getPaymentMethods(): Promise<{
    id: string;
    name: string;
    description: string;
  }[]> {
    const response = await axios.get(`${API_URL}/payment-methods`);
    return response.data;
  },

  async getPaymentHistory(userId: string): Promise<{
    id: string;
    orderId: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/payments`);
    return response.data;
  },

  async cancelPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(`${API_URL}/payments/${paymentId}/cancel`);
    return response.data;
  },
}; 