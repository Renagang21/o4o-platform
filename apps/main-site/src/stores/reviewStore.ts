import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Review, 
  ReviewSummary, 
  ReviewReport, 
  ReviewStats,
  CreateReviewRequest, 
  UpdateReviewRequest, 
  ReviewFilters,
  ReviewRating 
} from '../types/review';
import { 
  mockReviews, 
  mockReviewSummaries, 
  mockReviewReports, 
  mockReviewStats,
  getReviewsByProduct,
  getReviewsByUser,
  getReviewsByStatus,
  getReviewSummary,
  canUserReviewProduct,
  calculateAverageRating,
  getRatingDistribution
} from '../mocks/reviews';

interface ReviewState {
  reviews: Review[];
  currentReview: Review | null;
  reviewSummaries: ReviewSummary[];
  reviewReports: ReviewReport[];
  reviewStats: ReviewStats;
  filters: ReviewFilters;
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
}

interface ReviewActions {
  // 리뷰 조회
  fetchReviews: (filters?: Partial<ReviewFilters>) => Promise<void>;
  fetchReviewsByProduct: (productId: string) => Promise<void>;
  fetchReviewsByUser: (userId: string) => Promise<void>;
  fetchReview: (id: string) => Promise<void>;
  
  // 리뷰 관리
  createReview: (data: CreateReviewRequest) => Promise<void>;
  updateReview: (id: string, data: UpdateReviewRequest) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  
  // 리뷰 상태 관리
  publishReview: (id: string) => Promise<void>;
  hideReview: (id: string) => Promise<void>;
  
  // 도움됨 투표
  toggleHelpful: (reviewId: string, userId: string) => Promise<void>;
  
  // 리뷰 신고
  reportReview: (reviewId: string, reporterId: string, reason: string, description: string) => Promise<void>;
  
  // 리뷰 요약 정보
  fetchReviewSummary: (productId: string) => Promise<ReviewSummary | null>;
  updateProductRating: (productId: string) => Promise<void>;
  
  // 필터 및 검색
  setFilters: (filters: Partial<ReviewFilters>) => void;
  clearFilters: () => void;
  
  // 유틸리티
  canUserReview: (userId: string, productId: string, orderId?: string) => boolean;
  clearError: () => void;
  setCurrentReview: (review: Review | null) => void;
  
  // 관리자용
  fetchReviewStats: () => Promise<void>;
  fetchReviewReports: () => Promise<void>;
  resolveReport: (reportId: string, resolverId: string) => Promise<void>;
}

export const useReviewStore = create<ReviewState & ReviewActions>()(
  persist(
    (set, get) => ({
      // State
      reviews: [],
      currentReview: null,
      reviewSummaries: mockReviewSummaries,
      reviewReports: [],
      reviewStats: mockReviewStats,
      filters: {
        sortBy: 'newest',
        sortOrder: 'desc',
      },
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
      isLoading: false,
      error: null,

      // Actions
      fetchReviews: async (newFilters) => {
        set({ isLoading: true, error: null });
        
        try {
          const { filters, pagination } = get();
          const mergedFilters = { ...filters, ...newFilters };
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          let filteredReviews = [...mockReviews];
          
          // 필터링 로직
          if (mergedFilters.productId) {
            filteredReviews = filteredReviews.filter(r => r.productId === mergedFilters.productId);
          }
          
          if (mergedFilters.userId) {
            filteredReviews = filteredReviews.filter(r => r.userId === mergedFilters.userId);
          }
          
          if (mergedFilters.rating) {
            filteredReviews = filteredReviews.filter(r => r.rating === mergedFilters.rating);
          }
          
          if (mergedFilters.status) {
            filteredReviews = filteredReviews.filter(r => r.status === mergedFilters.status);
          }
          
          if (mergedFilters.type) {
            filteredReviews = filteredReviews.filter(r => r.type === mergedFilters.type);
          }
          
          if (mergedFilters.isPurchaseVerified !== undefined) {
            filteredReviews = filteredReviews.filter(r => r.isPurchaseVerified === mergedFilters.isPurchaseVerified);
          }
          
          if (mergedFilters.dateFrom) {
            filteredReviews = filteredReviews.filter(r => r.createdAt >= mergedFilters.dateFrom!);
          }
          
          if (mergedFilters.dateTo) {
            filteredReviews = filteredReviews.filter(r => r.createdAt <= mergedFilters.dateTo!);
          }
          
          // 정렬
          filteredReviews.sort((a, b) => {
            const { sortBy, sortOrder } = mergedFilters;
            let aValue: number | Date;
            let bValue: number | Date;
            
            switch (sortBy) {
              case 'newest':
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
                break;
              case 'oldest':
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
                break;
              case 'rating_high':
                aValue = a.rating;
                bValue = b.rating;
                break;
              case 'rating_low':
                aValue = a.rating;
                bValue = b.rating;
                break;
              case 'helpful':
                aValue = a.helpfulCount;
                bValue = b.helpfulCount;
                break;
              default:
                aValue = new Date(a.createdAt);
                bValue = new Date(b.createdAt);
                break;
            }
            
            const order = sortBy === 'oldest' || sortBy === 'rating_low' ? 'asc' : 'desc';
            
            if (aValue instanceof Date && bValue instanceof Date) {
              return order === 'asc' ? 
                aValue.getTime() - bValue.getTime() :
                bValue.getTime() - aValue.getTime();
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
              return order === 'asc' ? 
                aValue - bValue :
                bValue - aValue;
            }
            return 0;
          });
          
          // 페이지네이션
          const total = filteredReviews.length;
          const totalPages = Math.ceil(total / pagination.pageSize);
          const startIndex = (pagination.current - 1) * pagination.pageSize;
          const endIndex = startIndex + pagination.pageSize;
          const paginatedReviews = filteredReviews.slice(startIndex, endIndex);
          
          set({
            reviews: paginatedReviews,
            filters: mergedFilters,
            pagination: {
              ...pagination,
              total,
              totalPages,
            },
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰를 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchReviewsByProduct: async (productId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const productReviews = getReviewsByProduct(productId);
          
          set({
            reviews: productReviews,
            filters: { ...get().filters, productId },
            pagination: {
              ...get().pagination,
              total: productReviews.length,
              totalPages: Math.ceil(productReviews.length / get().pagination.pageSize),
            },
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '상품 리뷰를 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchReviewsByUser: async (userId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const userReviews = getReviewsByUser(userId);
          
          set({
            reviews: userReviews,
            filters: { ...get().filters, userId },
            pagination: {
              ...get().pagination,
              total: userReviews.length,
              totalPages: Math.ceil(userReviews.length / get().pagination.pageSize),
            },
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '사용자 리뷰를 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchReview: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const review = mockReviews.find(r => r.id === id);
          if (!review) {
            throw new Error('리뷰를 찾을 수 없습니다.');
          }
          
          set({
            currentReview: review,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰를 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      createReview: async (data: CreateReviewRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const newReview: Review = {
            id: Date.now().toString(),
            productId: data.productId,
            productName: '', // 실제로는 productId로 상품명 조회
            userId: '', // 실제로는 현재 로그인 사용자 ID
            userName: '', // 실제로는 현재 로그인 사용자명
            userType: 'customer', // 실제로는 현재 로그인 사용자 타입
            orderId: data.orderId,
            orderItemId: data.orderItemId,
            title: data.title,
            content: data.content,
            rating: data.rating,
            images: [], // 실제로는 이미지 업로드 처리
            type: data.type,
            status: 'pending', // 관리자 승인 대기
            isPurchaseVerified: !!data.orderId,
            helpfulCount: 0,
            helpfulUserIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          // Mock 데이터에 추가
          mockReviews.unshift(newReview);
          
          set({
            currentReview: newReview,
            isLoading: false,
          });
          
          // 상품 평점 업데이트
          get().updateProductRating(data.productId);
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 작성 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      updateReview: async (id: string, data: UpdateReviewRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const reviewIndex = mockReviews.findIndex(r => r.id === id);
          if (reviewIndex === -1) {
            throw new Error('리뷰를 찾을 수 없습니다.');
          }
          
          const updatedReview = {
            ...mockReviews[reviewIndex],
            ...data,
            updatedAt: new Date().toISOString(),
          };
          
          mockReviews[reviewIndex] = updatedReview;
          
          set({
            currentReview: updatedReview,
            isLoading: false,
          });
          
          // 상품 평점 업데이트
          get().updateProductRating(updatedReview.productId);
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 수정 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      deleteReview: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const reviewIndex = mockReviews.findIndex(r => r.id === id);
          if (reviewIndex === -1) {
            throw new Error('리뷰를 찾을 수 없습니다.');
          }
          
          const deletedReview = mockReviews[reviewIndex];
          mockReviews.splice(reviewIndex, 1);
          
          set({
            currentReview: null,
            isLoading: false,
          });
          
          // 상품 평점 업데이트
          get().updateProductRating(deletedReview.productId);
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 삭제 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      publishReview: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const reviewIndex = mockReviews.findIndex(r => r.id === id);
          if (reviewIndex === -1) {
            throw new Error('리뷰를 찾을 수 없습니다.');
          }
          
          mockReviews[reviewIndex] = {
            ...mockReviews[reviewIndex],
            status: 'published',
            updatedAt: new Date().toISOString(),
          };
          
          set({ isLoading: false });
          
          // 상품 평점 업데이트
          get().updateProductRating(mockReviews[reviewIndex].productId);
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 승인 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      hideReview: async (id: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const reviewIndex = mockReviews.findIndex(r => r.id === id);
          if (reviewIndex === -1) {
            throw new Error('리뷰를 찾을 수 없습니다.');
          }
          
          mockReviews[reviewIndex] = {
            ...mockReviews[reviewIndex],
            status: 'hidden',
            updatedAt: new Date().toISOString(),
          };
          
          set({ isLoading: false });
          
          // 상품 평점 업데이트
          get().updateProductRating(mockReviews[reviewIndex].productId);
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 숨김 처리 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      toggleHelpful: async (reviewId: string, userId: string) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const reviewIndex = mockReviews.findIndex(r => r.id === reviewId);
          if (reviewIndex === -1) {
            throw new Error('리뷰를 찾을 수 없습니다.');
          }
          
          const review = mockReviews[reviewIndex];
          const isHelpful = review.helpfulUserIds.includes(userId);
          
          if (isHelpful) {
            // 도움됨 취소
            review.helpfulUserIds = review.helpfulUserIds.filter(id => id !== userId);
            review.helpfulCount = Math.max(0, review.helpfulCount - 1);
          } else {
            // 도움됨 추가
            review.helpfulUserIds.push(userId);
            review.helpfulCount += 1;
          }
          
          mockReviews[reviewIndex] = { ...review };
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '도움됨 처리 중 오류가 발생했습니다.',
          });
        }
      },

      reportReview: async (reviewId: string, reporterId: string, reason: string, description: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const newReport: ReviewReport = {
            id: Date.now().toString(),
            reviewId,
            reporterId,
            reporterName: '', // 실제로는 reporterId로 사용자명 조회
            reason: reason as ReviewReport['reason'],
            description,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          
          mockReviewReports.push(newReport);
          
          set({ isLoading: false });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 신고 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchReviewSummary: async (productId: string) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const summary = getReviewSummary(productId);
          return summary || null;
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 요약을 불러오는 중 오류가 발생했습니다.',
          });
          return null;
        }
      },

      updateProductRating: async (productId: string) => {
        try {
          const productReviews = mockReviews.filter(r => 
            r.productId === productId && r.status === 'published'
          );
          
          const averageRating = calculateAverageRating(productReviews);
          const ratingDistribution = getRatingDistribution(productReviews);
          const recommendationRate = productReviews.length > 0 ? 
            Math.round((productReviews.filter(r => r.rating >= 4).length / productReviews.length) * 100) : 0;
          
          const summaryIndex = mockReviewSummaries.findIndex(s => s.productId === productId);
          const newSummary: ReviewSummary = {
            productId,
            totalCount: productReviews.length,
            averageRating,
            ratingDistribution,
            recommendationRate,
          };
          
          if (summaryIndex >= 0) {
            mockReviewSummaries[summaryIndex] = newSummary;
          } else {
            mockReviewSummaries.push(newSummary);
          }
          
          set(state => ({
            reviewSummaries: [...mockReviewSummaries],
          }));
        } catch (error: any) {
          console.error('상품 평점 업데이트 중 오류:', error);
        }
      },

      setFilters: (newFilters: Partial<ReviewFilters>) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters },
        }));
      },

      clearFilters: () => {
        set({
          filters: {
            sortBy: 'newest',
            sortOrder: 'desc',
          },
        });
      },

      canUserReview: (userId: string, productId: string, orderId?: string) => {
        return canUserReviewProduct(userId, productId, orderId);
      },

      clearError: () => {
        set({ error: null });
      },

      setCurrentReview: (review: Review | null) => {
        set({ currentReview: review });
      },

      fetchReviewStats: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set({
            reviewStats: mockReviewStats,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 통계를 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      fetchReviewReports: async () => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set({
            reviewReports: mockReviewReports,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '리뷰 신고를 불러오는 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },

      resolveReport: async (reportId: string, resolverId: string) => {
        set({ isLoading: true, error: null });
        
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const reportIndex = mockReviewReports.findIndex(r => r.id === reportId);
          if (reportIndex >= 0) {
            mockReviewReports[reportIndex] = {
              ...mockReviewReports[reportIndex],
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
              resolverId,
            };
          }
          
          set({
            reviewReports: [...mockReviewReports],
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error instanceof Error ? error.message : '신고 처리 중 오류가 발생했습니다.',
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'review-storage',
      partialize: (state) => ({}), // 리뷰 데이터는 서버에서 관리하므로 로컬 저장 안함
    }
  )
);