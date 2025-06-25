import { Product } from '../types/product';

// 상품 Mock 데이터
export const mockProducts: Product[] = [
  {
    id: '1',
    name: '삼성 갤럭시 노트북 15인치',
    slug: 'samsung-galaxy-laptop-15',
    description: `
      고성능 노트북으로 업무와 게임 모두 완벽하게 처리할 수 있습니다.
      
      주요 특징:
      - Intel 12세대 i7 프로세서
      - 16GB DDR4 메모리
      - 512GB NVMe SSD
      - 15.6인치 FHD 디스플레이
      - Windows 11 Pro 설치
      
      업무용, 게임용, 학습용 모든 용도에 최적화되어 있습니다.
    `,
    shortDescription: '15인치 고성능 노트북, Intel i7 프로세서',
    images: [
      '/images/products/laptop-1-main.jpg',
      '/images/products/laptop-1-side.jpg',
      '/images/products/laptop-1-keyboard.jpg',
    ],
    basePrice: 1200000,
    stockQuantity: 50,
    minOrderQuantity: 1,
    maxOrderQuantity: 10,
    categories: ['6', '1'], // 노트북, 신상품
    supplierId: '2', // ABC전자
    status: 'active',
    approvalStatus: 'approved',
    pricing: {
      gold: 1200000,     // 기본가
      premium: 1150000,  // 4% 할인
      vip: 1100000,      // 8% 할인
    },
    specifications: {
      'CPU': 'Intel i7-12700H',
      'RAM': '16GB DDR4',
      '저장장치': '512GB NVMe SSD',
      '화면': '15.6인치 FHD (1920x1080)',
      'OS': 'Windows 11 Pro',
      '그래픽': 'Intel Iris Xe Graphics',
      '배터리': '65Wh 리튬이온',
      '무게': '1.8kg',
    },
    brand: '삼성',
    model: 'Galaxy Book3 Pro',
    weight: 1.8,
    dimensions: '355.4 x 229.8 x 15.4mm',
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-01-20T00:00:00Z',
    approvedAt: '2024-01-21T00:00:00Z',
    viewCount: 1250,
    salesCount: 85,
    rating: 4.5,
    reviewCount: 42,
  },
  {
    id: '2',
    name: 'iPhone 15 Pro 128GB',
    slug: 'iphone-15-pro-128gb',
    description: `
      최신 A17 Pro 칩으로 더욱 강력해진 iPhone 15 Pro
      
      주요 특징:
      - A17 Pro 칩
      - 6.1인치 Super Retina XDR 디스플레이
      - Pro 카메라 시스템
      - 티타늄 디자인
      - USB-C 연결
      
      프로급 성능과 촬영 기능을 원하는 사용자에게 최적입니다.
    `,
    shortDescription: 'A17 Pro 칩, 티타늄 디자인, Pro 카메라',
    images: [
      '/images/products/iphone-15-pro-main.jpg',
      '/images/products/iphone-15-pro-back.jpg',
      '/images/products/iphone-15-pro-camera.jpg',
    ],
    basePrice: 1350000,
    stockQuantity: 30,
    minOrderQuantity: 1,
    maxOrderQuantity: 5,
    categories: ['5', '2'], // 스마트폰, 인기상품
    supplierId: '2',
    status: 'active',
    approvalStatus: 'approved',
    pricing: {
      gold: 1350000,
      premium: 1300000,  // 3.7% 할인
      vip: 1250000,      // 7.4% 할인
    },
    specifications: {
      '화면': '6.1인치 Super Retina XDR',
      '칩': 'A17 Pro',
      '저장용량': '128GB',
      '카메라': '48MP 메인 + 12MP 울트라 와이드 + 12MP 망원',
      '배터리': '비디오 재생 최대 23시간',
      '색상': '내추럴 티타늄',
      '방수': 'IP68',
    },
    brand: '애플',
    model: 'iPhone 15 Pro',
    weight: 0.187,
    dimensions: '146.6 x 70.6 x 8.25mm',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-02-01T00:00:00Z',
    approvedAt: '2024-02-02T00:00:00Z',
    viewCount: 2100,
    salesCount: 120,
    rating: 4.8,
    reviewCount: 87,
  },
  {
    id: '3',
    name: '블루투스 무선 이어폰',
    slug: 'bluetooth-wireless-earbuds',
    description: `
      고품질 사운드와 뛰어난 노이즈 캔슬링 기능을 갖춘 무선 이어폰
      
      주요 특징:
      - 액티브 노이즈 캔슬링
      - 최대 30시간 재생
      - IPX7 방수
      - 터치 컨트롤
      - 고속 충전
      
      운동, 출퇴근, 업무 등 모든 상황에서 완벽한 사운드 경험을 제공합니다.
    `,
    shortDescription: '액티브 노이즈 캔슬링, 30시간 재생, IPX7 방수',
    images: [
      '/images/products/earbuds-main.jpg',
      '/images/products/earbuds-case.jpg',
      '/images/products/earbuds-wearing.jpg',
    ],
    basePrice: 180000,
    stockQuantity: 100,
    minOrderQuantity: 2,
    maxOrderQuantity: 20,
    categories: ['4', '3'], // 전자제품, 베스트셀러
    supplierId: '5', // DEF생활용품
    status: 'active',
    approvalStatus: 'approved',
    pricing: {
      gold: 180000,
      premium: 170000,   // 5.6% 할인
      vip: 160000,       // 11.1% 할인
    },
    specifications: {
      '드라이버': '10mm 다이나믹 드라이버',
      '노이즈 캔슬링': '액티브 ANC',
      '재생시간': '이어폰 8시간 + 케이스 22시간',
      '방수등급': 'IPX7',
      '연결': 'Bluetooth 5.3',
      '충전': 'USB-C 고속충전',
      '무게': '이어폰 5g (각), 케이스 45g',
    },
    brand: '소니',
    model: 'WF-1000XM4',
    weight: 0.055,
    dimensions: '케이스: 60 x 40 x 25mm',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    approvedAt: '2024-01-16T00:00:00Z',
    viewCount: 800,
    salesCount: 200,
    rating: 4.3,
    reviewCount: 150,
  },
  {
    id: '4',
    name: '스테인리스 스틸 텀블러',
    slug: 'stainless-steel-tumbler',
    description: `
      보온보냉 기능이 뛰어난 프리미엄 스테인리스 스틸 텀블러
      
      주요 특징:
      - 이중벽 진공 단열
      - 12시간 보온, 24시간 보냉
      - 18/8 스테인리스 스틸
      - 누출 방지 뚜껑
      - 식기세척기 사용 가능
      
      사무실, 운동, 여행 등 다양한 용도로 사용 가능합니다.
    `,
    shortDescription: '12시간 보온, 24시간 보냉, 진공 단열',
    images: [
      '/images/products/tumbler-main.jpg',
      '/images/products/tumbler-lid.jpg',
      '/images/products/tumbler-sizes.jpg',
    ],
    basePrice: 45000,
    stockQuantity: 200,
    minOrderQuantity: 5,
    maxOrderQuantity: 50,
    categories: ['9'], // 주방용품
    supplierId: '5',
    status: 'active',
    approvalStatus: 'approved',
    pricing: {
      gold: 45000,
      premium: 42000,    // 6.7% 할인
      vip: 39000,        // 13.3% 할인
    },
    specifications: {
      '재질': '18/8 스테인리스 스틸',
      '용량': '500ml',
      '보온시간': '12시간 (65°C 이상)',
      '보냉시간': '24시간 (7°C 이하)',
      '크기': '높이 220mm x 직경 80mm',
      '무게': '350g',
      '뚜껑': '누출방지 스크류 타입',
    },
    brand: '써모스',
    model: 'King Tumbler 500',
    weight: 0.35,
    dimensions: '220 x 80 x 80mm',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
    approvedAt: '2024-01-11T00:00:00Z',
    viewCount: 450,
    salesCount: 300,
    rating: 4.7,
    reviewCount: 75,
  },
  {
    id: '5',
    name: '프리미엄 면 티셔츠',
    slug: 'premium-cotton-tshirt',
    description: `
      100% 유기농 면으로 제작된 프리미엄 티셔츠
      
      주요 특징:
      - 100% 유기농 면
      - 친환경 염료 사용
      - 편안한 레귤러 핏
      - 수축 방지 처리
      - 다양한 색상 선택
      
      일상복으로 완벽하며, 여러 벌 구매하시면 더욱 합리적입니다.
    `,
    shortDescription: '100% 유기농 면, 친환경, 레귤러 핏',
    images: [
      '/images/products/tshirt-main.jpg',
      '/images/products/tshirt-colors.jpg',
      '/images/products/tshirt-detail.jpg',
    ],
    basePrice: 25000,
    stockQuantity: 500,
    minOrderQuantity: 10,
    maxOrderQuantity: 100,
    categories: ['12'], // 남성의류
    supplierId: '5',
    status: 'pending', // 승인 대기
    approvalStatus: 'pending',
    pricing: {
      gold: 25000,
      premium: 23000,    // 8% 할인
      vip: 21000,        // 16% 할인
    },
    specifications: {
      '소재': '100% 유기농 면',
      '핏': '레귤러 핏',
      '사이즈': 'S, M, L, XL, XXL',
      '색상': '화이트, 블랙, 네이비, 그레이',
      '관리법': '찬물 세탁, 저온 건조',
      '원산지': '대한민국',
    },
    brand: '베이직코튼',
    model: 'Organic Basic Tee',
    weight: 0.2,
    dimensions: 'M사이즈 기준: 길이 71cm, 가슴둘레 106cm',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
    viewCount: 120,
    salesCount: 0,
    rating: 0,
    reviewCount: 0,
  },
];

// 공급자별 상품 필터링 함수
export const getProductsBySupplier = (supplierId: string): Product[] => {
  return mockProducts.filter(product => product.supplierId === supplierId);
};

// 카테고리별 상품 필터링 함수
export const getProductsByCategory = (categoryId: string): Product[] => {
  return mockProducts.filter(product => product.categories.includes(categoryId));
};

// 상품 검색 함수
export const searchProducts = (query: string): Product[] => {
  const lowercaseQuery = query.toLowerCase();
  return mockProducts.filter(product => 
    product.name.toLowerCase().includes(lowercaseQuery) ||
    product.description.toLowerCase().includes(lowercaseQuery) ||
    product.brand?.toLowerCase().includes(lowercaseQuery)
  );
};