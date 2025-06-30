export { HeroSimple } from './HeroSimple';
export { HeroImage } from './HeroImage';
export { HeroSplit } from './HeroSplit';
export { HeroMinimal } from './HeroMinimal';

// Pattern metadata for the block editor
export const heroPatterns = [
  {
    id: 'hero-simple',
    name: 'Simple Hero',
    description: '그라디언트 배경의 간단한 히어로 섹션',
    component: 'HeroSimple',
    category: 'hero',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '환영합니다',
      subtitle: '새로운 시작',
      description: '더 나은 경험을 위한 완벽한 솔루션을 제공합니다.',
      backgroundGradient: 'from-blue-600 to-purple-600'
    }
  },
  {
    id: 'hero-image',
    name: 'Hero with Image',
    description: '이미지와 함께하는 히어로 섹션',
    component: 'HeroImage',
    category: 'hero',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '혁신적인 솔루션',
      subtitle: '새로운 기술',
      description: '최첨단 기술로 더 나은 미래를 만들어갑니다.',
      heroImage: '/api/placeholder/600/400'
    }
  },
  {
    id: 'hero-split',
    name: 'Split Hero',
    description: '콘텐츠와 이미지가 분할된 히어로 섹션',
    component: 'HeroSplit',
    category: 'hero',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: '성공을 위한 파트너',
      subtitle: '믿을 수 있는',
      description: '전문적이고 체계적인 서비스로 목표 달성을 지원합니다.',
      rightImage: '/api/placeholder/500/400'
    }
  },
  {
    id: 'hero-minimal',
    name: 'Minimal Hero',
    description: '미니멀한 디자인의 히어로 섹션',
    component: 'HeroMinimal',
    category: 'hero',
    preview: '/api/placeholder/400/200',
    defaultProps: {
      title: 'Simple.',
      subtitle: 'Creative Studio',
      backgroundColor: 'bg-white',
      textColor: 'text-gray-900'
    }
  }
];