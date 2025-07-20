import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Review, 
  ReviewsResponse, 
  ReviewFilters, 
  UpdateReviewDto,
  ReviewStats
} from '@o4o/types';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ApiError } from '@/types/api';

// Fetch product reviews
export const useProductReviews = (productId: string, filters?: ReviewFilters) => {
  return useQuery<ReviewsResponse>({
    queryKey: ['reviews', 'product', productId, filters],
    queryFn: () => api.reviews.getProductReviews(productId, filters),
    enabled: !!productId
  });
};

// Fetch single review
export const useReview = (id: string) => {
  return useQuery<Review>({
    queryKey: ['review', id],
    queryFn: () => api.reviews.getReview(id),
    enabled: !!id
  });
};

// Fetch user's reviews
export const useMyReviews = (filters?: ReviewFilters) => {
  return useQuery<ReviewsResponse>({
    queryKey: ['reviews', 'my-reviews', filters],
    queryFn: () => api.reviews.getUserReviews(filters)
  });
};

// Get review stats for a product
export const useProductReviewStats = (productId: string) => {
  return useQuery<ReviewStats>({
    queryKey: ['reviews', 'stats', productId],
    queryFn: () => api.reviews.getProductReviewStats(productId),
    enabled: !!productId
  });
};

// Check if user can review
export const useCanReviewProduct = (productId: string) => {
  return useQuery<{ canReview: boolean; reason?: string }>({
    queryKey: ['reviews', 'can-review', productId],
    queryFn: () => api.reviews.canReviewProduct(productId),
    enabled: !!productId
  });
};

// Create review
export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.reviews.createReview,
    onSuccess: (review) => {
      // Invalidate product reviews
      queryClient.invalidateQueries({ 
        queryKey: ['reviews', 'product', review.productId] 
      });
      // Invalidate product stats
      queryClient.invalidateQueries({ 
        queryKey: ['reviews', 'stats', review.productId] 
      });
      // Invalidate can review status
      queryClient.invalidateQueries({ 
        queryKey: ['reviews', 'can-review', review.productId] 
      });
      // Invalidate my reviews
      queryClient.invalidateQueries({ 
        queryKey: ['reviews', 'my-reviews'] 
      });
      // Update product review count
      queryClient.invalidateQueries({ 
        queryKey: ['product', review.productId] 
      });
      
      toast.success('리뷰가 성공적으로 작성되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '리뷰 작성에 실패했습니다.';
      toast.error(message);
    }
  });
};

// Update review
export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReviewDto }) => 
      api.reviews.updateReview(id, data),
    onSuccess: (review) => {
      // Invalidate specific review
      queryClient.invalidateQueries({ 
        queryKey: ['review', review.id] 
      });
      // Invalidate product reviews
      queryClient.invalidateQueries({ 
        queryKey: ['reviews', 'product', review.productId] 
      });
      // Invalidate my reviews
      queryClient.invalidateQueries({ 
        queryKey: ['reviews', 'my-reviews'] 
      });
      
      toast.success('리뷰가 수정되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '리뷰 수정에 실패했습니다.';
      toast.error(message);
    }
  });
};

// Delete review
export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.reviews.deleteReview,
    onSuccess: () => {
      // Invalidate all reviews queries
      queryClient.invalidateQueries({ 
        queryKey: ['reviews'] 
      });
      
      toast.success('리뷰가 삭제되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '리뷰 삭제에 실패했습니다.';
      toast.error(message);
    }
  });
};

// Mark review as helpful
export const useMarkReviewHelpful = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) => 
      api.reviews.markHelpful(id, { helpful }),
    onSuccess: (review) => {
      // Update the specific review in cache
      queryClient.setQueryData(['review', review.id], review);
      
      // Invalidate product reviews to update helpful counts
      queryClient.invalidateQueries({ 
        queryKey: ['reviews', 'product', review.productId] 
      });
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '오류가 발생했습니다.';
      toast.error(message);
    }
  });
};

// Report review
export const useReportReview = () => {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      api.reviews.reportReview(id, reason),
    onSuccess: () => {
      toast.success('리뷰가 신고되었습니다. 검토 후 조치하겠습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '신고에 실패했습니다.';
      toast.error(message);
    }
  });
};

// Upload review images
export const useUploadReviewImages = () => {
  return useMutation({
    mutationFn: api.reviews.uploadImages,
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '이미지 업로드에 실패했습니다.';
      toast.error(message);
    }
  });
};

// Admin hooks
export const useAdminReviews = (filters?: ReviewFilters) => {
  return useQuery<ReviewsResponse>({
    queryKey: ['reviews', 'admin', filters],
    queryFn: () => api.reviews.admin.getAllReviews(filters)
  });
};

export const useApproveReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.reviews.admin.approveReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('리뷰가 승인되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '승인에 실패했습니다.';
      toast.error(message);
    }
  });
};

export const useRejectReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      api.reviews.admin.rejectReview(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('리뷰가 거부되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '거부에 실패했습니다.';
      toast.error(message);
    }
  });
};

export const useHideReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.reviews.admin.hideReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('리뷰가 숨김 처리되었습니다.');
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.message || '숨김 처리에 실패했습니다.';
      toast.error(message);
    }
  });
};