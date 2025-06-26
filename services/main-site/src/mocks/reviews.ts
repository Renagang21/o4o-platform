import { Review, ReviewSummary, ReviewReport, ReviewStats } from '../types/review';

// 리뷰 Mock 데이터
export const mockReviews: Review[] = [
  {
    id: '1',
    productId: '1', // 삼성 갤럭시 노트북
    productName: '삼성 갤럭시 노트북 15인치',
    userId: '9', // 일반고객
    userName: '김**',
    userType: 'customer',
    orderId: '1',
    orderItemId: '1',
    title: '정말 만족스러운 노트북입니다!',
    content: '회사 업무용으로 구매했는데 정말 만족합니다. 성능도 좋고 디자인도 깔끔해요. 배터리도 하루 종일 사용할 수 있을 정도로 오래갑니다. 화면 품질도 선명하고 키보드 타이핑감도 좋습니다. 다만 조금 무거운 편이라 휴대하기엔 부담스러울 수 있어요.',
    rating: 5,
    images: [
      {
        id: 'img1',
        url: '/images/reviews/laptop-review-1.jpg',
        alt: '노트북 사용 모습',
        order: 1,
      },
      {
        id: 'img2',
        url: '/images/reviews/laptop-review-2.jpg',
        alt: '노트북 화면',
        order: 2,
      },
    ],
    type: 'purchase',
    status: 'published',
    isPurchaseVerified: true,
    helpfulCount: 24,
    helpfulUserIds: ['3', '7', '8'],
    createdAt: '2024-06-05T14:30:00Z',
    updatedAt: '2024-06-05T14:30:00Z',
  },
  {
    id: '2',
    productId: '1',
    productName: '삼성 갤럭시 노트북 15인치',
    userId: '3', // VIP 리테일러
    userName: '이**',
    userType: 'retailer',
    orderId: '1',
    orderItemId: '1',
    title: '비즈니스용으로 추천합니다',
    content: '매장에서 판매하기 위해 먼저 테스트해봤는데, 고객들이 만족할 만한 품질입니다. 가성비가 좋고 A/S도 잘 되는 편이에요. 다만 게임용으로는 부족할 수 있습니다.',
    rating: 4,
    images: [],
    type: 'purchase',
    status: 'published',
    isPurchaseVerified: true,
    helpfulCount: 12,
    helpfulUserIds: ['9', '10'],
    createdAt: '2024-06-03T09:15:00Z',
    updatedAt: '2024-06-03T09:15:00Z',
  },
  {
    id: '3',
    productId: '2', // iPhone 15 Pro
    productName: 'iPhone 15 Pro 128GB',
    userId: '10', // 일반고객2
    userName: '박**',
    userType: 'customer',
    title: '역시 아이폰이네요',
    content: '안드로이드에서 넘어왔는데 확실히 부드럽고 안정적이에요. 카메라 성능이 특히 인상적입니다. 다만 가격이 부담스럽긴 하네요.',
    rating: 4,
    images: [
      {
        id: 'img3',
        url: '/images/reviews/iphone-review-1.jpg',
        alt: '아이폰 카메라 샘플',
        order: 1,
      },
    ],
    type: 'experience',
    status: 'published',
    isPurchaseVerified: false,
    helpfulCount: 8,
    helpfulUserIds: ['3', '9'],
    createdAt: '2024-06-04T16:20:00Z',
    updatedAt: '2024-06-04T16:20:00Z',
  },
  {
    id: '4',
    productId: '3', // 블루투스 이어폰
    productName: '블루투스 무선 이어폰',
    userId: '9',
    userName: '김**',
    userType: 'customer',
    orderId: '2',
    orderItemId: '3',
    title: '가성비 좋은 이어폰',
    content: '이 가격에 이 정도 음질이면 만족스럽습니다. 배터리도 꽤 오래가고 연결도 안정적이에요. 통화 품질도 나쁘지 않습니다.',
    rating: 4,
    images: [],
    type: 'purchase',
    status: 'published',
    isPurchaseVerified: true,
    helpfulCount: 15,
    helpfulUserIds: ['7', '8', '10'],
    createdAt: '2024-06-06T11:45:00Z',
    updatedAt: '2024-06-06T11:45:00Z',
  },
  {
    id: '5',
    productId: '4', // 텀블러
    productName: '스테인리스 스틸 텀블러',
    userId: '7', // Gold 리테일러
    userName: '정**',
    userType: 'retailer',
    orderId: '2',
    orderItemId: '4',
    title: '보온 효과가 정말 좋아요',
    content: '아침에 넣은 커피가 저녁까지도 따뜻하게 유지됩니다. 디자인도 심플하고 좋네요. 고객들 반응도 좋습니다.',
    rating: 5,
    images: [
      {
        id: 'img4',
        url: '/images/reviews/tumbler-review-1.jpg',
        alt: '텀블러 사용 모습',
        order: 1,
      },
    ],
    type: 'purchase',
    status: 'published',
    isPurchaseVerified: true,
    helpfulCount: 6,
    helpfulUserIds: ['3', '9'],
    createdAt: '2024-05-25T13:30:00Z',
    updatedAt: '2024-05-25T13:30:00Z',
  },
  {
    id: '6',
    productId: '1',
    productName: '삼성 갤럭시 노트북 15인치',
    userId: '11', // 새 고객
    userName: '최**',
    userType: 'customer',
    title: '배송이 너무 늦었어요',
    content: '제품 자체는 나쁘지 않지만 배송이 예상보다 3일이나 늦었습니다. 급하게 필요했는데 아쉬웠어요.',
    rating: 3,
    images: [],
    type: 'experience',
    status: 'published',
    isPurchaseVerified: false,
    helpfulCount: 2,
    helpfulUserIds: ['9'],
    createdAt: '2024-06-07T09:20:00Z',
    updatedAt: '2024-06-07T09:20:00Z',
  },
  {
    id: '7',
    productId: '2',
    productName: 'iPhone 15 Pro 128GB',
    userId: '12', // 새 고객2
    userName: '한**',
    userType: 'customer',
    title: '완전 만족!',
    content: '드디어 기다리던 아이폰을 샀네요! 카메라가 진짜 좋고 성능도 빠릅니다. 배터리도 하루 종일 쓸 수 있어요.',
    rating: 5,
    images: [],
    type: 'experience',
    status: 'pending', // 승인 대기
    isPurchaseVerified: false,
    helpfulCount: 0,
    helpfulUserIds: [],
    createdAt: '2024-06-08T15:10:00Z',
    updatedAt: '2024-06-08T15:10:00Z',
  },
];

// 상품별 리뷰 요약
export const mockReviewSummaries: ReviewSummary[] = [
  {
    productId: '1', // 삼성 갤럭시 노트북
    totalCount: 4,
    averageRating: 4.0,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 1,
      4: 1,
      5: 2,
    },
    recommendationRate: 75, // 4점 이상 비율
  },
  {
    productId: '2', // iPhone 15 Pro
    totalCount: 2,
    averageRating: 4.5,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 1,
      5: 1,
    },
    recommendationRate: 100,
  },
  {
    productId: '3', // 블루투스 이어폰
    totalCount: 1,
    averageRating: 4.0,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 1,
      5: 0,
    },
    recommendationRate: 100,
  },
  {
    productId: '4', // 텀블러
    totalCount: 1,
    averageRating: 5.0,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 1,
    },
    recommendationRate: 100,
  },
];

// 리뷰 신고
export const mockReviewReports: ReviewReport[] = [
  {
    id: '1',
    reviewId: '6',
    reporterId: '3',
    reporterName: '이영희',
    reason: 'inappropriate',
    description: '상품과 관련 없는 배송 불만을 리뷰에 작성했습니다.',
    status: 'pending',
    createdAt: '2024-06-07T10:30:00Z',
  },
];

// 리뷰 통계 (관리자용)
export const mockReviewStats: ReviewStats = {
  totalReviews: 7,
  pendingReviews: 1,
  reportedReviews: 1,
  averageRating: 4.2,
  reviewsThisMonth: 7,
  topRatedProducts: [
    {
      productId: '4',
      productName: '스테인리스 스틸 텀블러',
      averageRating: 5.0,
      reviewCount: 1,
    },
    {
      productId: '2',
      productName: 'iPhone 15 Pro 128GB',
      averageRating: 4.5,
      reviewCount: 2,
    },
    {
      productId: '1',
      productName: '삼성 갤럭시 노트북 15인치',
      averageRating: 4.0,
      reviewCount: 4,
    },
  ],
};

// 유틸리티 함수들
export const getReviewsByProduct = (productId: string): Review[] => {
  return mockReviews.filter(review => 
    review.productId === productId && review.status === 'published'
  );
};

export const getReviewsByUser = (userId: string): Review[] => {
  return mockReviews.filter(review => review.userId === userId);
};

export const getReviewsByStatus = (status: string): Review[] => {
  return mockReviews.filter(review => review.status === status);
};

export const getReviewSummary = (productId: string): ReviewSummary | undefined => {
  return mockReviewSummaries.find(summary => summary.productId === productId);
};

export const canUserReviewProduct = (userId: string, productId: string, orderId?: string): boolean => {
  // 해당 상품을 구매한 사용자만 리뷰 작성 가능
  // 이미 리뷰를 작성했다면 false 반환
  const existingReview = mockReviews.find(review => 
    review.userId === userId && 
    review.productId === productId &&
    review.orderId === orderId
  );
  
  return !existingReview;
};

export const calculateAverageRating = (reviews: Review[]): number => {
  if (reviews.length === 0) return 0;
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((totalRating / reviews.length) * 10) / 10;
};

export const getRatingDistribution = (reviews: Review[]) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    distribution[review.rating as keyof typeof distribution]++;
  });
  return distribution;
};