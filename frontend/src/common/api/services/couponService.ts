import axios from 'axios';

export interface Coupon {
  id: string;
  name: string;
  description: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchaseAmount?: number;
  expiryDate: string;
  isUsed: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const couponService = {
  async getUserCoupons(userId: string): Promise<Coupon[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/coupons`);
    return response.data;
  },

  async applyCoupon(orderId: string, couponCode: string): Promise<{ discountAmount: number }> {
    const response = await axios.post(`${API_URL}/orders/${orderId}/apply-coupon`, {
      couponCode,
    });
    return response.data;
  },

  async removeCoupon(orderId: string): Promise<void> {
    await axios.delete(`${API_URL}/orders/${orderId}/coupon`);
  },
}; 