// Mock Data for Neture P0 Prototype

export interface Supplier {
  id: string;
  slug: string;
  name: string;
  logo: string;
  category: string;
  shortDescription: string;
  description: string;
  products: Product[];
  pricingPolicy: string;
  moq: string;
  shippingPolicy: {
    standard: string;
    island: string;
    mountain: string;
  };
  contact: {
    email: string;
    phone: string;
    website: string;
    kakao: string;
  };
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
}

export interface PartnershipRequest {
  id: string;
  seller: {
    id: string;
    name: string;
    serviceType: string;
    storeUrl: string;
  };
  productCount: number;
  period: {
    start: string;
    end: string;
  };
  revenueStructure: string;
  status: 'OPEN' | 'MATCHED' | 'CLOSED';
  products: { id: string; name: string; category: string }[];
  promotionScope: {
    sns: boolean;
    content: boolean;
    banner: boolean;
    other: string;
  };
  contact: {
    email: string;
    phone: string;
    kakao: string;
  };
  createdAt: string;
  matchedAt: string | null;
}

export const mockSuppliers: Supplier[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    slug: "abc-pharma",
    name: "ABC 제약",
    logo: "https://via.placeholder.com/150",
    category: "의약품",
    shortDescription: "검증된 의약품 공급자",
    description: "ABC 제약은 20년 경력의 의약품 전문 공급자입니다. 품질과 신뢰를 최우선으로 하며, 다양한 의약품을 공급하고 있습니다.",
    products: [
      { id: "1", name: "비타민 C", category: "건강기능식품", description: "고함량 비타민 C" },
      { id: "2", name: "오메가3", category: "건강기능식품", description: "프리미엄 오메가3" },
      { id: "3", name: "유산균", category: "건강기능식품", description: "장 건강 유산균" }
    ],
    pricingPolicy: "도매가 기준 20% 할인",
    moq: "50개 이상",
    shippingPolicy: {
      standard: "무료 배송",
      island: "3,000원",
      mountain: "5,000원"
    },
    contact: {
      email: "contact@abc-pharma.com",
      phone: "02-1234-5678",
      website: "https://abc-pharma.com",
      kakao: "https://pf.kakao.com/abc-pharma"
    }
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    slug: "xyz-health",
    name: "XYZ 헬스케어",
    logo: "https://via.placeholder.com/150",
    category: "건강기능식품",
    shortDescription: "프리미엄 건강기능식품 전문",
    description: "XYZ 헬스케어는 프리미엄 건강기능식품을 전문으로 공급하는 기업입니다.",
    products: [
      { id: "4", name: "콜라겐", category: "건강기능식품", description: "피부 건강 콜라겐" },
      { id: "5", name: "루테인", category: "건강기능식품", description: "눈 건강 루테인" }
    ],
    pricingPolicy: "도매가 기준 15% 할인",
    moq: "30개 이상",
    shippingPolicy: {
      standard: "무료 배송",
      island: "3,000원",
      mountain: "5,000원"
    },
    contact: {
      email: "info@xyz-health.com",
      phone: "02-9876-5432",
      website: "https://xyz-health.com",
      kakao: "https://pf.kakao.com/xyz-health"
    }
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    slug: "wellbeing-lab",
    name: "웰빙랩",
    logo: "https://via.placeholder.com/150",
    category: "의료기기",
    shortDescription: "디지털 헬스케어 기기 전문",
    description: "웰빙랩은 최신 디지털 헬스케어 기기를 공급하는 전문 기업입니다.",
    products: [
      { id: "6", name: "혈당 측정기", category: "의료기기", description: "정확한 혈당 측정" },
      { id: "7", name: "혈압계", category: "의료기기", description: "가정용 혈압계" }
    ],
    pricingPolicy: "도매가 기준 25% 할인",
    moq: "20개 이상",
    shippingPolicy: {
      standard: "무료 배송",
      island: "5,000원",
      mountain: "7,000원"
    },
    contact: {
      email: "support@wellbeing-lab.com",
      phone: "02-5555-6666",
      website: "https://wellbeing-lab.com",
      kakao: "https://pf.kakao.com/wellbeing-lab"
    }
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    slug: "green-nature",
    name: "그린네이처",
    logo: "https://via.placeholder.com/150",
    category: "건강기능식품",
    shortDescription: "천연 원료 건강식품",
    description: "그린네이처는 천연 원료로 만든 프리미엄 건강식품을 공급합니다.",
    products: [
      { id: "8", name: "홍삼", category: "건강기능식품", description: "6년근 홍삼" },
      { id: "9", name: "프로폴리스", category: "건강기능식품", description: "면역력 프로폴리스" }
    ],
    pricingPolicy: "도매가 기준 18% 할인",
    moq: "40개 이상",
    shippingPolicy: {
      standard: "무료 배송",
      island: "3,000원",
      mountain: "5,000원"
    },
    contact: {
      email: "hello@green-nature.com",
      phone: "02-7777-8888",
      website: "https://green-nature.com",
      kakao: "https://pf.kakao.com/green-nature"
    }
  }
];

export const mockPartnershipRequests: PartnershipRequest[] = [
  {
    id: "660e8400-e29b-41d4-a716-446655440001",
    seller: {
      id: "seller-1",
      name: "서울약국",
      serviceType: "glycopharm",
      storeUrl: "https://glycopharm.co.kr/store/seoul-pharmacy"
    },
    productCount: 12,
    period: {
      start: "2026-02-01",
      end: "2026-07-31"
    },
    revenueStructure: "매출의 5% 수익 배분 (홍보 활동 기준)",
    status: "OPEN",
    products: [
      { id: "1", name: "당뇨 영양제", category: "건강기능식품" },
      { id: "2", name: "혈당 측정기", category: "의료기기" },
      { id: "3", name: "당뇨 간식", category: "건강식품" }
    ],
    promotionScope: {
      sns: true,
      content: true,
      banner: false,
      other: "월 1회 뉴스레터 발송"
    },
    contact: {
      email: "seoul@pharmacy.com",
      phone: "010-1234-5678",
      kakao: "https://pf.kakao.com/seoul-pharmacy"
    },
    createdAt: "2026-01-15T00:00:00Z",
    matchedAt: null
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440002",
    seller: {
      id: "seller-2",
      name: "부산약국",
      serviceType: "glycopharm",
      storeUrl: "https://glycopharm.co.kr/store/busan-pharmacy"
    },
    productCount: 8,
    period: {
      start: "2026-01-20",
      end: "2026-06-30"
    },
    revenueStructure: "매출의 7% 수익 배분 (SNS 홍보 기준)",
    status: "OPEN",
    products: [
      { id: "4", name: "비타민 D", category: "건강기능식품" },
      { id: "5", name: "오메가3", category: "건강기능식품" }
    ],
    promotionScope: {
      sns: true,
      content: false,
      banner: true,
      other: ""
    },
    contact: {
      email: "busan@pharmacy.com",
      phone: "010-9876-5432",
      kakao: "https://pf.kakao.com/busan-pharmacy"
    },
    createdAt: "2026-01-10T00:00:00Z",
    matchedAt: null
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440003",
    seller: {
      id: "seller-3",
      name: "뷰티코스메틱",
      serviceType: "k-cosmetics",
      storeUrl: "https://k-cosmetics.co.kr/store/beauty-cosmetic"
    },
    productCount: 15,
    period: {
      start: "2026-02-15",
      end: "2026-08-15"
    },
    revenueStructure: "매출의 10% 수익 배분 (전체 판매 기준)",
    status: "MATCHED",
    products: [
      { id: "6", name: "비타민C 세럼", category: "화장품" },
      { id: "7", name: "콜라겐 크림", category: "화장품" },
      { id: "8", name: "선크림", category: "화장품" }
    ],
    promotionScope: {
      sns: true,
      content: true,
      banner: true,
      other: "인스타그램 스토리 주 2회"
    },
    contact: {
      email: "beauty@cosmetic.com",
      phone: "010-5555-6666",
      kakao: "https://pf.kakao.com/beauty-cosmetic"
    },
    createdAt: "2026-01-05T00:00:00Z",
    matchedAt: "2026-01-18T00:00:00Z"
  }
];
