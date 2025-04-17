import axios from 'axios';
import { Order, OrderItem } from '../../types/order';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const orderService = {
  async createOrder(userId: string, orderData: {
    items: OrderItem[];
    shippingAddressId: string;
    paymentMethod: string;
  }): Promise<Order> {
    const response = await axios.post(`${API_URL}/users/${userId}/orders`, orderData);
    return response.data;
  },

  async getOrders(userId: string): Promise<Order[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/orders`);
    return response.data;
  },

  async getOrder(userId: string, orderId: string): Promise<Order> {
    const response = await axios.get(`${API_URL}/users/${userId}/orders/${orderId}`);
    return response.data;
  },

  async cancelOrder(userId: string, orderId: string): Promise<Order> {
    const response = await axios.put(`${API_URL}/users/${userId}/orders/${orderId}/cancel`);
    return response.data;
  },

  async updateOrderStatus(userId: string, orderId: string, status: string): Promise<Order> {
    const response = await axios.put(`${API_URL}/users/${userId}/orders/${orderId}/status`, { status });
    return response.data;
  }
}; 