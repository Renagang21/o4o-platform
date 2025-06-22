// UAGB Extensions Index
// 모든 UAGB (Spectra 스타일) 블록들을 통합 관리

// 🎯 Core Common System
export * from './tiptap-block';

// 🔥 UAGB 블록들 (완성된 13개 블록)

// 1. Basic Content Blocks
export { default as UAGBCallToActionBlock } from './UAGBCallToActionBlock';
export { default as UAGBInfoBoxBlock } from './UAGBInfoBoxBlock';
export { default as UAGBContainerBlock } from './UAGBContainerBlock';
export { default as UAGBAdvancedHeadingBlock } from './UAGBAdvancedHeadingBlock';

// 2. Content Display Blocks  
export { default as UAGBPostGridBlock } from './UAGBPostGridBlock';
export { default as UAGBArchiveBlock } from './UAGBArchiveBlock';
export { default as UAGBCounterBlock } from './UAGBCounterBlock';
export { default as UAGBVideoBlock } from './UAGBVideoBlock';

// 3. Interactive Blocks
export { default as UAGBButtonsBlock } from './UAGBButtonsBlock';
export { default as UAGBFormsBlock } from './UAGBFormsBlock';
export { default as UAGBImageBlock } from './UAGBImageBlock';

// 🆕 4. Advanced Management Blocks (새로 추가)
export { default as UAGBContentManagerBlock } from './UAGBContentManagerBlock';
export { default as UAGBSocialShareBlock } from './UAGBSocialShareBlock';
export { default as UAGBUserDashboardBlock } from './UAGBUserDashboardBlock';

// 🔧 블록 타입 정의들
export type {
  // Basic Blocks
  UAGBCallToActionAttributes,
  UAGBInfoBoxAttributes,
  UAGBContainerAttributes,
  UAGBAdvancedHeadingAttributes,
  
  // Content Display Blocks
  UAGBPostGridAttributes,
  UAGBArchiveAttributes,
  UAGBCounterAttributes,
  UAGBVideoAttributes,
  
  // Interactive Blocks
  UAGBButtonsAttributes,
  UAGBFormsAttributes,
  UAGBImageAttributes,
  
  // Advanced Management Blocks
  UAGBContentManagerAttributes,
  UAGBSocialShareAttributes,
  UAGBUserDashboardAttributes
} from './UAGBCallToActionBlock';

export type { UAGBInfoBoxAttributes } from './UAGBInfoBoxBlock';
export type { UAGBContainerAttributes } from './UAGBContainerBlock';
export type { UAGBAdvancedHeadingAttributes } from './UAGBAdvancedHeadingBlock';
export type { UAGBPostGridAttributes } from './UAGBPostGridBlock';
export type { UAGBArchiveAttributes, UAGBArchiveItem } from './UAGBArchiveBlock';
export type { UAGBCounterAttributes } from './UAGBCounterBlock';
export type { UAGBVideoAttributes } from './UAGBVideoBlock';
export type { UAGBButtonsAttributes } from './UAGBButtonsBlock';
export type { UAGBFormsAttributes, UAGBFormField } from './UAGBFormsBlock';
export type { UAGBImageAttributes } from './UAGBImageBlock';
export type { UAGBContentManagerAttributes } from './UAGBContentManagerBlock';
export type { UAGBSocialShareAttributes, SocialPlatform } from './UAGBSocialShareBlock';
export type { UAGBUserDashboardAttributes, DashboardWidget, UserStats } from './UAGBUserDashboardBlock';

// 🚀 블록 그룹 정의
export const UAGBBlockGroups = {
  // 기본 콘텐츠 블록들
  basic: [
    'uagb/call-to-action',
    'uagb/info-box', 
    'uagb/container',
    'uagb/advanced-heading'
  ],
  
  // 콘텐츠 표시 블록들
  content: [
    'uagb/post-grid',
    'uagb/archive',
    'uagb/counter',
    'uagb/video'
  ],
  
  // 상호작용 블록들
  interactive: [
    'uagb/buttons',
    'uagb/forms',
    'uagb/image'
  ],
  
  // 고급 관리 블록들 (Post Creation Mode 관련)
  management: [
    'uagb/content-manager',
    'uagb/social-share',
    'uagb/user-dashboard'
  ]
};

// 🎯 모든 UAGB 블록 배열 (Editor에서 사용)
export const AllUAGBBlocks = [
  // Basic Content Blocks
  'UAGBCallToActionBlock',
  'UAGBInfoBoxBlock',
  'UAGBContainerBlock', 
  'UAGBAdvancedHeadingBlock',
  
  // Content Display Blocks
  'UAGBPostGridBlock',
  'UAGBArchiveBlock',
  'UAGBCounterBlock',
  'UAGBVideoBlock',
  
  // Interactive Blocks
  'UAGBButtonsBlock',
  'UAGBFormsBlock',
  'UAGBImageBlock',
  
  // 🆕 Advanced Management Blocks
  'UAGBContentManagerBlock',
  'UAGBSocialShareBlock',
  'UAGBUserDashboardBlock'
] as const;

// 📋 블록 메타데이터
export const UAGBBlockMetadata = {
  'uagb/call-to-action': {
    title: 'Call to Action',
    description: 'Create compelling call-to-action sections',
    category: 'basic',
    icon: '📢',
    keywords: ['cta', 'button', 'action', 'conversion']
  },
  'uagb/info-box': {
    title: 'Info Box',
    description: 'Display information in organized boxes',
    category: 'basic', 
    icon: '📋',
    keywords: ['info', 'box', 'feature', 'grid']
  },
  'uagb/container': {
    title: 'Container',
    description: 'Flexible container with advanced layout options',
    category: 'basic',
    icon: '📦',
    keywords: ['container', 'layout', 'wrapper', 'hero']
  },
  'uagb/advanced-heading': {
    title: 'Advanced Heading',
    description: 'Enhanced headings with styling options',
    category: 'basic',
    icon: '📝',
    keywords: ['heading', 'title', 'typography', 'text']
  },
  'uagb/post-grid': {
    title: 'Post Grid',
    description: 'Display posts in customizable grid layouts',
    category: 'content',
    icon: '📰',
    keywords: ['posts', 'grid', 'blog', 'articles']
  },
  'uagb/archive': {
    title: 'Archive',
    description: 'Advanced archive display with dynamic data',
    category: 'content',
    icon: '🗂️',
    keywords: ['archive', 'posts', 'dynamic', 'database']
  },
  'uagb/counter': {
    title: 'Counter',
    description: 'Animated number counters with icons',
    category: 'content',
    icon: '🔢',
    keywords: ['counter', 'number', 'stats', 'animation']
  },
  'uagb/video': {
    title: 'Video',
    description: 'Responsive video player with custom controls',
    category: 'content',
    icon: '🎥',
    keywords: ['video', 'youtube', 'media', 'embed']
  },
  'uagb/buttons': {
    title: 'Buttons',
    description: 'Multiple customizable buttons with advanced styling',
    category: 'interactive',
    icon: '🔘',
    keywords: ['button', 'link', 'action', 'cta']
  },
  'uagb/forms': {
    title: 'Forms',
    description: 'Advanced form builder with Post Creation Mode',
    category: 'interactive',
    icon: '📝',
    keywords: ['form', 'contact', 'post', 'creation', 'database']
  },
  'uagb/image': {
    title: 'Image',
    description: 'Enhanced images with filters and effects',
    category: 'interactive',
    icon: '🖼️',
    keywords: ['image', 'photo', 'gallery', 'filter']
  },
  'uagb/content-manager': {
    title: 'Content Manager',
    description: 'Manage posts created via Form blocks',
    category: 'management',
    icon: '📊',
    keywords: ['content', 'manager', 'posts', 'admin', 'table']
  },
  'uagb/social-share': {
    title: 'Social Share',
    description: 'Korean-optimized social sharing buttons',
    category: 'management',
    icon: '📤',
    keywords: ['social', 'share', 'kakao', 'naver', 'facebook']
  },
  'uagb/user-dashboard': {
    title: 'User Dashboard',
    description: 'Personal dashboard for content creators',
    category: 'management', 
    icon: '👤',
    keywords: ['dashboard', 'user', 'stats', 'analytics', 'profile']
  }
};

// 🔍 블록 검색 및 필터링 유틸리티
export const searchUAGBBlocks = (query: string) => {
  const lowerQuery = query.toLowerCase();
  return Object.entries(UAGBBlockMetadata).filter(([blockType, metadata]) => {
    return (
      metadata.title.toLowerCase().includes(lowerQuery) ||
      metadata.description.toLowerCase().includes(lowerQuery) ||
      metadata.keywords.some(keyword => keyword.includes(lowerQuery)) ||
      blockType.includes(lowerQuery)
    );
  });
};

export const getBlocksByCategory = (category: string) => {
  return Object.entries(UAGBBlockMetadata).filter(([_, metadata]) => 
    metadata.category === category
  );
};

// 📈 블록 사용 통계 (개발용)
export const UAGBBlockStats = {
  totalBlocks: AllUAGBBlocks.length,
  categories: {
    basic: getBlocksByCategory('basic').length,
    content: getBlocksByCategory('content').length,
    interactive: getBlocksByCategory('interactive').length,
    management: getBlocksByCategory('management').length
  },
  features: {
    hasPostCreation: true,
    hasDatabaseIntegration: true,
    hasKoreanSocial: true,
    hasContentManagement: true,
    hasUserDashboard: true
  }
};

// 🎉 완성 현황 로그
console.log(`
🎯 UAGB 블록 시스템 완성!
📊 총 ${UAGBBlockStats.totalBlocks}개 블록 사용 가능
📝 Basic: ${UAGBBlockStats.categories.basic}개
📰 Content: ${UAGBBlockStats.categories.content}개  
🔘 Interactive: ${UAGBBlockStats.categories.interactive}개
📊 Management: ${UAGBBlockStats.categories.management}개

🚀 특별 기능:
✅ Post Creation Mode (Forms → Database)
✅ Dynamic Archive (Database → Display)
✅ Content Manager (Admin Interface)
✅ 한국형 소셜 공유 (카카오톡, 네이버)
✅ 사용자 대시보드 (Analytics)
`);

export default {
  UAGBBlockGroups,
  AllUAGBBlocks,
  UAGBBlockMetadata,
  UAGBBlockStats,
  searchUAGBBlocks,
  getBlocksByCategory
};