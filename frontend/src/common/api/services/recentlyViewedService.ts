import axios from 'axios';
import { Product } from '../../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface RecentlyViewedItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  viewedAt: string;
}

export const recentlyViewedService = {
  async getRecentlyViewed(userId: string): Promise<RecentlyViewedItem[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/recently-viewed`);
    return response.data;
  },

  async addToRecentlyViewed(userId: string, productId: string): Promise<RecentlyViewedItem> {
    const response = await axios.post(`${API_URL}/users/${userId}/recently-viewed`, { productId });
    return response.data;
  },

  async clearRecentlyViewed(userId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/recently-viewed`);
  },

  async removeFromRecentlyViewed(userId: string, productId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/recently-viewed/${productId}`);
  }
}; 