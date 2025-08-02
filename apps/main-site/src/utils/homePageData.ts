// 🏠 홈페이지 콘텐츠 관리 시스템

export interface ServiceCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  status: 'available' | 'coming_soon';
  href: string;
  adminHref?: string; // 관리자용 링크
  userHref?: string;  // 일반 사용자용 링크
  color: string;
  buttonText?: string;
  isEditable: boolean;
}

export interface HomePageData {
  services: ServiceCard[];
  lastUpdated: string;
  version: string;
}

// 기본 홈페이지 데이터
export const getDefaultHomeData = (): HomePageData => ({
  services: [
    {
      id: 'dropshipping',
      title: '드랍쉬핑',
      description: '정보 중심 제품의 B2B2C 플랫폼',
      icon: '🛍️',
      features: ['4-Way 생태계', '파트너 시스템', '등급별 혜택', '신뢰도 기반 거래'],
      status: 'available',
      href: '/dropshipping', // 모든 사용자가 여기로 → DropshippingRouter가 쇼핑몰로 리다이렉트
      adminHref: '/dropshipping/dashboard',
      userHref: '/dropshipping/shop',
      color: 'from-blue-500 to-purple-600',
      buttonText: '시작하기',
      isEditable: false
    },
    {
      id: 'signage',
      title: '디지털 사이니지',
      description: '매장 TV 콘텐츠 관리 시스템',
      icon: '📺',
      features: ['콘텐츠 관리', '매장 TV 동기화', '수동 선택 방식', '실시간 업데이트'],
      status: 'available',
      href: '/signage', // 모든 사용자가 여기로
      adminHref: '/signage/dashboard',
      userHref: '/signage',
      color: 'from-green-500 to-teal-600',
      buttonText: '시작하기',
      isEditable: false
    },
    {
      id: 'forum',
      title: '포럼',
      description: '전문가와 고객이 만나는 지식 커뮤니티',
      icon: '💬',
      features: ['전문가 상담', 'Q&A 시스템', '카테고리별 게시판', '실시간 소통'],
      status: 'available',
      href: '/forum', // 모든 사용자가 여기로
      adminHref: '/forum/dashboard',
      userHref: '/forum/dashboard',
      color: 'from-purple-500 to-pink-600',
      buttonText: '시작하기',
      isEditable: false
    }
  ],
  lastUpdated: new Date().toISOString(),
  version: '1.0'
});

// 사용자 역할에 따른 링크 반환 - 워드프레스 스타일로 모든 사용자가 같은 링크
export const getServiceLink = (service: ServiceCard, userRole?: string): string => {
  // 워드프레스 스타일: 모든 사용자가 같은 링크로 이동
  // 관리자 기능은 AdminBar를 통해 접근
  return service.href;
};

// 홈페이지 데이터 로드
export const loadHomePageData = (): HomePageData => {
  try {
    const saved = localStorage.getItem('homepage_data');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('홈페이지 데이터 로드 실패:', error);
  }
  return getDefaultHomeData();
};

// 홈페이지 데이터 저장
export const saveHomePageData = (data: HomePageData): void => {
  try {
    const updatedData = {
      ...data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('homepage_data', JSON.stringify(updatedData));
  } catch (error) {
    console.error('홈페이지 데이터 저장 실패:', error);
  }
};

// 특정 서비스 업데이트
export const updateService = (serviceId: string, updates: Partial<ServiceCard>): void => {
  const data = loadHomePageData();
  const serviceIndex = data.services.findIndex(s => s.id === serviceId);
  
  if (serviceIndex !== -1) {
    data.services[serviceIndex] = {
      ...data.services[serviceIndex],
      ...updates
    };
    saveHomePageData(data);
  }
};
