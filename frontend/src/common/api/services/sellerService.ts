import axios from 'axios';
import { Product, Order } from '../../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const sellerService = {
  async getProducts(sellerId: string): Promise<Product[]> {
    const response = await axios.get(`${API_URL}/sellers/${sellerId}/products`);
    return response.data;
  },

  async addProduct(sellerId: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const response = await axios.post(`${API_URL}/sellers/${sellerId}/products`, product);
    return response.data;
  },

  async updateProduct(sellerId: string, productId: string, product: Partial<Product>): Promise<Product> {
    const response = await axios.put(`${API_URL}/sellers/${sellerId}/products/${productId}`, product);
    return response.data;
  },

  async deleteProduct(sellerId: string, productId: string): Promise<void> {
    await axios.delete(`${API_URL}/sellers/${sellerId}/products/${productId}`);
  },

  async getOrders(sellerId: string): Promise<Order[]> {
    const response = await axios.get(`${API_URL}/sellers/${sellerId}/orders`);
    return response.data;
  },

  async updateOrderStatus(sellerId: string, orderId: string, status: string): Promise<Order> {
    const response = await axios.put(`${API_URL}/sellers/${sellerId}/orders/${orderId}/status`, { status });
    return response.data;
  },

  async getSalesStatistics(sellerId: string): Promise<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    monthlySales: { month: string; sales: number }[];
  }> {
    const response = await axios.get(`${API_URL}/sellers/${sellerId}/statistics`);
    return response.data;
  }
}; 