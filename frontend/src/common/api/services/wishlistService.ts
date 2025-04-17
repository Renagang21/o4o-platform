import axios from 'axios';
import { Product } from '../../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  createdAt: string;
}

export const wishlistService = {
  async getWishlist(userId: string): Promise<WishlistItem[]> {
    const response = await axios.get(`${API_URL}/users/${userId}/wishlist`);
    return response.data;
  },

  async addToWishlist(userId: string, productId: string): Promise<WishlistItem> {
    const response = await axios.post(`${API_URL}/users/${userId}/wishlist`, { productId });
    return response.data;
  },

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/wishlist/${productId}`);
  },

  async clearWishlist(userId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/wishlist`);
  },

  async moveToCart(userId: string, productId: string): Promise<void> {
    await axios.post(`${API_URL}/users/${userId}/wishlist/${productId}/move-to-cart`);
  }
}; 