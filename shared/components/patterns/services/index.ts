export { ServicesGrid } from './ServicesGrid';
export { ServicesList } from './ServicesList';
export { ServicesFeature } from './ServicesFeature';

// Services pattern metadata for the block editor
export const servicesPatterns = [
  {
    id: 'services-grid',
    name: 'Services Grid',
    description: '서비스 카드 그리드 레이아웃',
    component: 'ServicesGrid',
    category: 'services',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '우리의 서비스',
      description: '전문적이고 체계적인 서비스로 고객의 성공을 지원합니다.',
      columns: 3,
      cardStyle: 'detailed',
      showFeatures: true
    }
  },
  {
    id: 'services-list',
    name: 'Services List',
    description: '서비스 상세 목록 형태',
    component: 'ServicesList',
    category: 'services',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '서비스 상세 안내',
      description: '각 서비스의 상세 내용과 포함 사항을 확인해보세요.',
      showExpandable: true,
      showPricing: true,
      showRatings: true
    }
  },
  {
    id: 'services-feature',
    name: 'Featured Service',
    description: '주요 서비스 강조 표시',
    component: 'ServicesFeature',
    category: 'services',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '주요 서비스',
      serviceTitle: '웹 개발 서비스',
      serviceDescription: '최신 기술을 활용한 전문적인 웹 개발 서비스를 제공합니다.',
      mainImage: '/api/placeholder/600/400',
      features: ['반응형 디자인', 'SEO 최적화', '성능 최적화'],
      layout: 'image-left'
    }
  }
];