import { authClient } from '@o4o/auth-client';
import { 
  Review, 
  ReviewsResponse, 
  ReviewFilters, 
  CreateReviewDto, 
  UpdateReviewDto,
  ReviewHelpfulDto,
  ReviewStats
} from '@o4o/types';

const API_URL = '/api/v1/reviews';

export const reviewsApi = {
  // Get reviews for a product
  getProductReviews: async (productId: string, filters?: ReviewFilters): Promise<ReviewsResponse> => {
    const response = await authClient.api.get<ReviewsResponse>(`${API_URL}/product/${productId}`, {
      params: filters
    });
    return response.data;
  },

  // Get review by ID
  getReview: async (id: string): Promise<Review> => {
    const response = await authClient.api.get<Review>(`${API_URL}/${id}`);
    return response.data;
  },

  // Get user's reviews
  getUserReviews: async (filters?: ReviewFilters): Promise<ReviewsResponse> => {
    const response = await authClient.api.get<ReviewsResponse>(`${API_URL}/my-reviews`, {
      params: filters
    });
    return response.data;
  },

  // Create a new review
  createReview: async (data: CreateReviewDto): Promise<Review> => {
    const response = await authClient.api.post<Review>(API_URL, data);
    return response.data;
  },

  // Update a review
  updateReview: async (id: string, data: UpdateReviewDto): Promise<Review> => {
    const response = await authClient.api.put<Review>(`${API_URL}/${id}`, data);
    return response.data;
  },

  // Delete a review
  deleteReview: async (id: string): Promise<void> => {
    await authClient.api.delete(`${API_URL}/${id}`);
  },

  // Mark review as helpful/unhelpful
  markHelpful: async (id: string, data: ReviewHelpfulDto): Promise<Review> => {
    const response = await authClient.api.post<Review>(`${API_URL}/${id}/helpful`, data);
    return response.data;
  },

  // Report a review
  reportReview: async (id: string, reason: string): Promise<void> => {
    await authClient.api.post(`${API_URL}/${id}/report`, { reason });
  },

  // Get review statistics for a product
  getProductReviewStats: async (productId: string): Promise<ReviewStats> => {
    const response = await authClient.api.get<ReviewStats>(`${API_URL}/product/${productId}/stats`);
    return response.data;
  },

  // Upload review images
  uploadImages: async (files: File[]): Promise<string[]> => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`images[${index}]`, file);
    });

    const response = await authClient.api.post<{ urls: string[] }>(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data.urls;
  },

  // Check if user can review a product
  canReviewProduct: async (productId: string): Promise<{ canReview: boolean; reason?: string }> => {
    const response = await authClient.api.get<{ canReview: boolean; reason?: string }>(
      `${API_URL}/product/${productId}/can-review`
    );
    return response.data;
  },

  // Admin methods
  admin: {
    // Get all reviews (admin only)
    getAllReviews: async (filters?: ReviewFilters): Promise<ReviewsResponse> => {
      const response = await authClient.api.get<ReviewsResponse>(`${API_URL}/admin`, {
        params: filters
      });
      return response.data;
    },

    // Approve review
    approveReview: async (id: string): Promise<Review> => {
      const response = await authClient.api.post<Review>(`${API_URL}/${id}/approve`);
      return response.data;
    },

    // Reject review
    rejectReview: async (id: string, reason?: string): Promise<Review> => {
      const response = await authClient.api.post<Review>(`${API_URL}/${id}/reject`, { reason });
      return response.data;
    },

    // Hide review
    hideReview: async (id: string): Promise<Review> => {
      const response = await authClient.api.post<Review>(`${API_URL}/${id}/hide`);
      return response.data;
    },

    // Unhide review
    unhideReview: async (id: string): Promise<Review> => {
      const response = await authClient.api.post<Review>(`${API_URL}/${id}/unhide`);
      return response.data;
    }
  }
};