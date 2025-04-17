import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { reviewService } from '../api/services/reviewService';
import { Review } from '../types/review';

interface ReviewContextType {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  addReview: (review: Omit<Review, 'id' | 'createdAt'>) => Promise<void>;
  updateReview: (id: string, review: Partial<Review>) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  getReviewsByProduct: (productId: string) => Promise<Review[]>;
  getReviewsByUser: (userId: string) => Promise<Review[]>;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const useReview = () => {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
};

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadUserReviews();
    }
  }, [user]);

  const loadUserReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const userReviews = await reviewService.getReviewsByUser(user!.id);
      setReviews(userReviews);
    } catch (err) {
      setError('리뷰를 불러오는 중 오류가 발생했습니다.');
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const addReview = async (review: Omit<Review, 'id' | 'createdAt'>) => {
    try {
      setLoading(true);
      setError(null);
      const newReview = await reviewService.addReview(review);
      setReviews(prev => [...prev, newReview]);
    } catch (err) {
      setError('리뷰를 추가하는 중 오류가 발생했습니다.');
      console.error('Error adding review:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateReview = async (id: string, review: Partial<Review>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedReview = await reviewService.updateReview(id, review);
      setReviews(prev => prev.map(r => (r.id === id ? updatedReview : r)));
    } catch (err) {
      setError('리뷰를 수정하는 중 오류가 발생했습니다.');
      console.error('Error updating review:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await reviewService.deleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError('리뷰를 삭제하는 중 오류가 발생했습니다.');
      console.error('Error deleting review:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getReviewsByProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);
      return await reviewService.getReviewsByProduct(productId);
    } catch (err) {
      setError('상품 리뷰를 불러오는 중 오류가 발생했습니다.');
      console.error('Error getting product reviews:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getReviewsByUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      return await reviewService.getReviewsByUser(userId);
    } catch (err) {
      setError('사용자 리뷰를 불러오는 중 오류가 발생했습니다.');
      console.error('Error getting user reviews:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReviewContext.Provider
      value={{
        reviews,
        loading,
        error,
        addReview,
        updateReview,
        deleteReview,
        getReviewsByProduct,
        getReviewsByUser,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}; 