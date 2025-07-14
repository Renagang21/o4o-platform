import { TestPageData } from '../types/testData';

export const testPageData: TestPageData = {
  banners: [
    {
      id: 'test-products',
      title: '상품 관리',
      description: '상품 CRUD 기능 테스트',
      path: '/supplier/products',
      icon: '📦',
      category: 'feature',
      status: 'active'
    },
    {
      id: 'test-orders',
      title: '주문/결제',
      description: '주문 및 결제 기능 테스트',
      path: '/shop',
      icon: '💳',
      category: 'feature',
      status: 'active'
    },
    {
      id: 'test-signage',
      title: '디지털 사이니지',
      description: '디지털 사이니지 관리 테스트',
      path: '/signage',
      icon: '📺',
      category: 'feature',
      status: 'coming'
    },
    {
      id: 'test-admin',
      title: '관리자 대시보드',
      description: '관리자 기능 테스트',
      path: '/admin',
      icon: '⚙️',
      category: 'utility',
      status: 'active'
    },
    {
      id: 'test-forum',
      title: '포럼',
      description: '커뮤니티 MVP 기능 테스트 (별도 앱으로 이전됨)',
      path: '#',
      icon: '💬',
      category: 'feature',
      status: 'moved'
    },
    {
      id: 'test-dashboard',
      title: '테스트 대시보드',
      description: '개발자 테스트 도구',
      path: '/test-dashboard',
      icon: '🧪',
      category: 'utility',
      status: 'active'
    }
  ],
  accounts: [
    {
      id: 'admin',
      role: '관리자',
      username: 'admin01',
      password: 'Test1234!',
      description: '모든 기능에 접근 가능'
    },
    {
      id: 'supplier',
      role: '공급사',
      username: 'supplier01',
      password: 'Test1234!',
      description: '상품 등록 및 관리'
    },
    {
      id: 'retailer',
      role: '셀러',
      username: 'retailer01',
      password: 'Test1234!',
      description: '상품 판매 및 주문 관리'
    },
    {
      id: 'customer',
      role: '일반회원',
      username: 'customer01',
      password: 'Test1234!',
      description: '상품 구매 및 리뷰'
    }
  ]
};