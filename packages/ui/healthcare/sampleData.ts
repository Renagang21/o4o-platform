// Healthcare platform sample data for testing

export interface ExpertContent {
  id: string;
  title: string;
  author: {
    name: string;
    title: string;
    profileImage: string;
    verified: boolean;
  };
  summary: string;
  thumbnail: string;
  readTime: number;
  likes: number;
  views: number;
  category: string;
  publishedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  discountPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  description: string;
  badges?: string[];
}

export interface TrendingIssue {
  id: string;
  title: string;
  description: string;
  image: string;
  relatedProducts?: string[];
  views: number;
  category: string;
}

export interface BusinessBanner {
  id: string;
  type: 'partners' | 'signage' | 'crowdfunding';
  title: string;
  subtitle: string;
  ctaText: string;
  link: string;
  backgroundColor: string;
  textColor: string;
  image?: string;
}

// Expert content sample data
export const expertContents: ExpertContent[] = [
  {
    id: 'expert-1',
    title: '겨울철 면역력 강화를 위한 영양소 가이드',
    author: {
      name: '김민수',
      title: '내과 전문의',
      profileImage: 'https://via.placeholder.com/80x80?text=Dr.Kim',
      verified: true
    },
    summary: '추운 겨울철 감기와 독감을 예방하고 면역력을 강화하는 필수 영양소와 섭취 방법을 전문의가 직접 알려드립니다.',
    thumbnail: 'https://via.placeholder.com/400x300?text=Immune+System',
    readTime: 5,
    likes: 342,
    views: 2847,
    category: 'health',
    publishedAt: new Date('2025-01-28')
  },
  {
    id: 'expert-2',
    title: '건조한 계절, 올바른 스킨케어 루틴',
    author: {
      name: '이정희',
      title: '피부과 전문의',
      profileImage: 'https://via.placeholder.com/80x80?text=Dr.Lee',
      verified: true
    },
    summary: '겨울철 건조한 피부를 위한 단계별 스킨케어 루틴과 제품 선택 가이드를 피부과 전문의가 제안합니다.',
    thumbnail: 'https://via.placeholder.com/400x300?text=Skincare+Routine',
    readTime: 7,
    likes: 528,
    views: 4231,
    category: 'beauty',
    publishedAt: new Date('2025-01-27')
  },
  {
    id: 'expert-3',
    title: '운동 후 근육 회복을 돕는 보충제',
    author: {
      name: '박준영',
      title: '스포츠의학 전문가',
      profileImage: 'https://via.placeholder.com/80x80?text=Dr.Park',
      verified: true
    },
    summary: '효과적인 근육 회복과 성장을 위한 운동 후 보충제 섭취 가이드와 추천 제품을 소개합니다.',
    thumbnail: 'https://via.placeholder.com/400x300?text=Muscle+Recovery',
    readTime: 6,
    likes: 289,
    views: 1923,
    category: 'fitness',
    publishedAt: new Date('2025-01-26')
  },
  {
    id: 'expert-4',
    title: '갱년기 여성을 위한 호르몬 관리법',
    author: {
      name: '최은영',
      title: '산부인과 전문의',
      profileImage: 'https://via.placeholder.com/80x80?text=Dr.Choi',
      verified: true
    },
    summary: '갱년기 증상 완화와 건강한 호르몬 밸런스를 위한 생활습관과 영양 관리법을 전문의가 상세히 설명합니다.',
    thumbnail: 'https://via.placeholder.com/400x300?text=Hormone+Balance',
    readTime: 8,
    likes: 412,
    views: 3156,
    category: 'womens-health',
    publishedAt: new Date('2025-01-25')
  }
];

// Product sample data
export const recommendedProducts: Product[] = [
  {
    id: 'prod-1',
    name: '비타민D 3000IU',
    brand: '헬스케어랩',
    price: 29000,
    discountPrice: 23200,
    image: 'https://via.placeholder.com/300x300?text=Vitamin+D',
    rating: 4.8,
    reviewCount: 1247,
    category: 'supplements',
    description: '면역력 강화와 뼈 건강을 위한 고함량 비타민D',
    badges: ['베스트셀러', '20% 할인']
  },
  {
    id: 'prod-2',
    name: '프리미엄 히알루론산 세럼',
    brand: '뷰티케어',
    price: 48000,
    discountPrice: 38400,
    image: 'https://via.placeholder.com/300x300?text=HA+Serum',
    rating: 4.9,
    reviewCount: 892,
    category: 'skincare',
    description: '건조한 피부를 위한 고농축 보습 세럼',
    badges: ['신제품', '20% 할인']
  },
  {
    id: 'prod-3',
    name: '프로바이오틱스 유산균',
    brand: '장건강연구소',
    price: 35000,
    image: 'https://via.placeholder.com/300x300?text=Probiotics',
    rating: 4.7,
    reviewCount: 2156,
    category: 'supplements',
    description: '장 건강과 면역력 증진을 위한 100억 유산균',
    badges: ['인기상품']
  },
  {
    id: 'prod-4',
    name: '스마트 혈압측정기',
    brand: '메디텍',
    price: 89000,
    discountPrice: 71200,
    image: 'https://via.placeholder.com/300x300?text=BP+Monitor',
    rating: 4.6,
    reviewCount: 543,
    category: 'medical-devices',
    description: '블루투스 연동 가정용 혈압측정기',
    badges: ['20% 할인']
  },
  {
    id: 'prod-5',
    name: '마그네슘 컴플렉스',
    brand: '슬립웰',
    price: 25000,
    image: 'https://via.placeholder.com/300x300?text=Magnesium',
    rating: 4.8,
    reviewCount: 1893,
    category: 'supplements',
    description: '편안한 수면과 근육 이완을 위한 마그네슘',
    badges: ['베스트셀러']
  },
  {
    id: 'prod-6',
    name: '저분자 콜라겐 파우더',
    brand: '뷰티인사이드',
    price: 42000,
    discountPrice: 33600,
    image: 'https://via.placeholder.com/300x300?text=Collagen',
    rating: 4.7,
    reviewCount: 1567,
    category: 'beauty-supplements',
    description: '피부 탄력과 관절 건강을 위한 콜라겐',
    badges: ['20% 할인', '인기상품']
  }
];

export const newProducts: Product[] = [
  {
    id: 'new-1',
    name: '차세대 혈당측정기 프로',
    brand: '글루코케어',
    price: 125000,
    discountPrice: 99000,
    image: 'https://via.placeholder.com/300x300?text=Glucose+Pro',
    rating: 5.0,
    reviewCount: 23,
    category: 'medical-devices',
    description: 'AI 분석 기능이 탑재된 최신 혈당측정기',
    badges: ['NEW', '런칭특가']
  },
  {
    id: 'new-2',
    name: '식물성 단백질 파우더',
    brand: '그린프로틴',
    price: 38000,
    image: 'https://via.placeholder.com/300x300?text=Plant+Protein',
    rating: 4.5,
    reviewCount: 67,
    category: 'supplements',
    description: '완두콩과 현미 단백질로 만든 비건 프로틴',
    badges: ['NEW', '비건']
  },
  {
    id: 'new-3',
    name: '저분자 콜라겐 젤리',
    brand: '젤리뷰티',
    price: 32000,
    image: 'https://via.placeholder.com/300x300?text=Collagen+Jelly',
    rating: 4.9,
    reviewCount: 45,
    category: 'beauty-supplements',
    description: '맛있게 먹는 콜라겐 젤리 스틱',
    badges: ['NEW']
  },
  {
    id: 'new-4',
    name: '스마트 체지방 측정기',
    brand: '바디스캔',
    price: 78000,
    discountPrice: 62400,
    image: 'https://via.placeholder.com/300x300?text=Body+Scale',
    rating: 4.8,
    reviewCount: 89,
    category: 'medical-devices',
    description: '앱 연동 체성분 분석기',
    badges: ['NEW', '20% 할인']
  }
];

export const popularProducts: Product[] = [
  {
    id: 'pop-1',
    name: '종합비타민 멀티케어',
    brand: '비타민팜',
    price: 35000,
    discountPrice: 28000,
    image: 'https://via.placeholder.com/300x300?text=Multivitamin',
    rating: 4.9,
    reviewCount: 5421,
    category: 'supplements',
    description: '하루 한 알로 챙기는 종합 영양제',
    badges: ['베스트셀러', '1위']
  },
  {
    id: 'pop-2',
    name: '레티놀 아이크림',
    brand: '아이케어',
    price: 58000,
    image: 'https://via.placeholder.com/300x300?text=Eye+Cream',
    rating: 4.8,
    reviewCount: 3287,
    category: 'skincare',
    description: '눈가 주름 개선 기능성 아이크림',
    badges: ['인기상품']
  },
  {
    id: 'pop-3',
    name: '다이어트 보조제 슬림',
    brand: '다이어트랩',
    price: 49000,
    discountPrice: 39200,
    image: 'https://via.placeholder.com/300x300?text=Diet+Supplement',
    rating: 4.6,
    reviewCount: 2893,
    category: 'diet',
    description: '가르시니아 함유 체지방 감소 보조제',
    badges: ['화제상품', '20% 할인']
  },
  {
    id: 'pop-4',
    name: '프리미엄 단백질 쉐이크',
    brand: '머슬팜',
    price: 65000,
    image: 'https://via.placeholder.com/300x300?text=Protein+Shake',
    rating: 4.9,
    reviewCount: 4156,
    category: 'sports-nutrition',
    description: 'WPI 분리유청 단백질 파우더',
    badges: ['베스트셀러']
  }
];

// Trending issues sample data
export const trendingIssues: TrendingIssue[] = [
  {
    id: 'trend-1',
    title: '2025년 주목받는 슈퍼푸드 BEST 5',
    description: '올해 건강 트렌드를 이끌 슈퍼푸드와 그 효능을 알아봅니다.',
    image: 'https://via.placeholder.com/600x400?text=Superfoods+2025',
    relatedProducts: ['prod-1', 'prod-3', 'prod-5'],
    views: 8932,
    category: 'nutrition'
  },
  {
    id: 'trend-2',
    title: '겨울철 우울감 극복하는 자연 요법',
    description: '계절성 우울증을 극복하는 자연 치료법과 영양 보충제를 소개합니다.',
    image: 'https://via.placeholder.com/600x400?text=Winter+Wellness',
    relatedProducts: ['prod-5', 'new-2'],
    views: 6543,
    category: 'mental-health'
  },
  {
    id: 'trend-3',
    title: '30대부터 시작해야 할 안티에이징 케어',
    description: '노화를 늦추고 건강한 피부를 유지하는 안티에이징 전략을 알려드립니다.',
    image: 'https://via.placeholder.com/600x400?text=Anti+Aging',
    relatedProducts: ['prod-2', 'prod-6', 'pop-2'],
    views: 12847,
    category: 'anti-aging'
  },
  {
    id: 'trend-4',
    title: '운동 없이도 기초대사량 높이는 방법',
    description: '일상에서 실천할 수 있는 대사량 증가 방법과 도움되는 보충제를 소개합니다.',
    image: 'https://via.placeholder.com/600x400?text=Metabolism+Boost',
    relatedProducts: ['pop-3', 'pop-4'],
    views: 9287,
    category: 'fitness'
  }
];

// Business banners sample data
export const businessBanners: BusinessBanner[] = [
  {
    id: 'banner-1',
    type: 'partners',
    title: '건강 브랜드 파트너가 되어보세요',
    subtitle: '믿을 수 있는 제품으로 함께 성장하세요',
    ctaText: '파트너 신청하기',
    link: '/partners',
    backgroundColor: '#1e40af',
    textColor: '#ffffff',
    image: 'https://via.placeholder.com/400x200?text=Partners'
  },
  {
    id: 'banner-2',
    type: 'signage',
    title: '스마트한 마케팅 솔루션',
    subtitle: '데이터 기반 타겟 광고로 매출 UP!',
    ctaText: '광고 시작하기',
    link: '/signage',
    backgroundColor: '#374151',
    textColor: '#ffffff',
    image: 'https://via.placeholder.com/400x200?text=Digital+Signage'
  },
  {
    id: 'banner-3',
    type: 'crowdfunding',
    title: '혁신적인 건강 제품을 발견하세요',
    subtitle: '새로운 아이디어에 투자하고 혜택 받기',
    ctaText: '펀딩 둘러보기',
    link: '/crowdfunding',
    backgroundColor: '#059669',
    textColor: '#ffffff',
    image: 'https://via.placeholder.com/400x200?text=Crowdfunding'
  }
];

// Community banner sample data
export const communityBanner = {
  id: 'community-banner',
  title: '건강 고민, 함께 나눠요',
  subtitle: '전문가와 사용자들의 생생한 경험담',
  ctaText: '커뮤니티 참여하기',
  link: '/community',
  backgroundColor: '#7c3aed',
  textColor: '#ffffff',
  recentQA: [
    {
      id: 'qa-1',
      question: '비타민D는 언제 먹는 게 좋나요?',
      answerCount: 5,
      views: 234
    },
    {
      id: 'qa-2',
      question: '콜라겐과 비타민C 같이 먹어도 되나요?',
      answerCount: 3,
      views: 189
    },
    {
      id: 'qa-3',
      question: '운동 전후 단백질 섭취 타이밍은?',
      answerCount: 7,
      views: 412
    }
  ]
};

// Hero section sample data
export const heroSectionData = {
  title: '건강한 삶을 위한 첫걸음',
  subtitle: '전문가가 검증한 건강 정보와 제품을 만나보세요',
  description: '의약품부터 건강기능식품, 의료기기까지 신뢰할 수 있는 헬스케어 플랫폼',
  ctaText: '건강 정보 둘러보기',
  ctaLink: '#expert-content',
  backgroundImage: 'https://via.placeholder.com/1920x600?text=Healthcare+Hero',
  mobileImage: 'https://via.placeholder.com/800x600?text=Healthcare+Hero+Mobile'
};