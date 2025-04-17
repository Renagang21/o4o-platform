import axios from 'axios';
import { Product } from '../../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface ComparisonItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  addedAt: string;
}

export const productComparisonService = {
  async getComparisonList(userId: string): Promise<ComparisonItem[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/comparison`);
    return response.data;
  },

  async addToComparison(userId: string, productId: string): Promise<ComparisonItem> {
    const response = await axios.post(`${API_URL}/users/${userId}/comparison`, { productId });
    return response.data;
  },

  async removeFromComparison(userId: string, productId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/comparison/${productId}`);
  },

  async clearComparison(userId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/comparison`);
  },

  async getComparisonFeatures(productIds: string[]): Promise<{
    features: {
      name: string;
      values: { [productId: string]: string };
    }[];
  }> {
    const response = await axios.post(`${API_URL}/products/comparison/features`, { productIds });
    return response.data;
  }
}; 