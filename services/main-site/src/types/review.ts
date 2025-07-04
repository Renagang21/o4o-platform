// 리뷰 평점
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

// 리뷰 상태
export type ReviewStatus = 
  | 'published'     // 게시됨
  | 'pending'       // 승인 대기
  | 'hidden'        // 숨김 처리
  | 'reported';     // 신고됨

// 리뷰 타입
export type ReviewType = 
  | 'purchase'      // 구매 리뷰
  | 'experience';   // 체험 리뷰

// 리뷰 이미지
export interface ReviewImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
}

// 리뷰
export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userName: string;
  userType: 'customer' | 'retailer';
  orderId?: string;
  orderItemId?: string;
  
  // 리뷰 내용
  title: string;
  content: string;
  rating: ReviewRating;
  images: ReviewImage[];
  
  // 리뷰 메타데이터
  type: ReviewType;
  status: ReviewStatus;
  isPurchaseVerified: boolean;
  
  // 도움이 됨 투표
  helpfulCount: number;
  helpfulUserIds: string[];
  
  // 날짜 정보
  createdAt: string;
  updatedAt: string;
  
  // 관리자 처리
  adminNote?: string;
  moderatedAt?: string;
  moderatorId?: string;
}

// 리뷰 요약 정보
export interface ReviewSummary {
  productId: string;
  totalCount: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recommendationRate: number; // 추천율 (4점 이상 비율)
}

// 리뷰 작성 요청
export interface CreateReviewRequest {
  productId: string;
  orderId?: string;
  orderItemId?: string;
  title: string;
  content: string;
  rating: ReviewRating;
  images?: File[];
  type: ReviewType;
}

// 리뷰 수정 요청
export interface UpdateReviewRequest {
  title?: string;
  content?: string;
  rating?: ReviewRating;
  images?: ReviewImage[];
}

// 리뷰 필터
export interface ReviewFilters {
  productId?: string;
  userId?: string;
  rating?: ReviewRating;
  status?: ReviewStatus;
  type?: ReviewType;
  isPurchaseVerified?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
  sortOrder: 'asc' | 'desc';
}

// 리뷰 신고
export interface ReviewReport {
  id: string;
  reviewId: string;
  reporterId: string;
  reporterName: string;
  reason: 'spam' | 'inappropriate' | 'fake' | 'offensive' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolverId?: string;
}

// 리뷰 통계 (관리자용)
export interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  reportedReviews: number;
  averageRating: number;
  reviewsThisMonth: number;
  topRatedProducts: Array<{
    productId: string;
    productName: string;
    averageRating: number;
    reviewCount: number;
  }>;
}