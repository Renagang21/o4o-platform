import axios from 'axios';
import { Review } from '../../types/review';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const reviewService = {
  async getReviewsByProduct(productId: string): Promise<Review[]> {
    const response = await axios.get(`${API_URL}/reviews/product/${productId}`);
    return response.data;
  },

  async getReviewsByUser(userId: string): Promise<Review[]> {
    const response = await axios.get(`${API_URL}/reviews/user/${userId}`);
    return response.data;
  },

  async addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const response = await axios.post(`${API_URL}/reviews`, review);
    return response.data;
  },

  async updateReview(id: string, review: Partial<Review>): Promise<Review> {
    const response = await axios.put(`${API_URL}/reviews/${id}`, review);
    return response.data;
  },

  async deleteReview(id: string): Promise<void> {
    await axios.delete(`${API_URL}/reviews/${id}`);
  },
}; 