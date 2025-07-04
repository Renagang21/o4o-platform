// UAGB Archive Block - Spectra 스타일
// WordPress Archive 같은 블로그/포스트 아카이브 블록

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { 
  UAGBCommonAttributes, 
  generateBlockId
} from './tiptap-block';
import UAGBArchiveView from './UAGBArchiveView';

// 아카이브 아이템 인터페이스
export interface UAGBArchiveItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  categories: string[];
  tags: string[];
  featured_image: string;
  slug: string;
  status: 'published' | 'draft';
  view_count: number;
  comment_count: number;
}

// 아카이브 필터 옵션
export interface UAGBArchiveFilter {
  type: 'date' | 'category' | 'tag' | 'author';
  value: string;
  label: string;
  count: number;
}

// UAGB Archive 속성 정의
export interface UAGBArchiveAttributes extends UAGBCommonAttributes {
  // Archive Settings
  archiveType: 'posts' | 'pages' | 'custom';
  postType: string;
  
  // Layout Options
  layout: 'list' | 'grid' | 'masonry' | 'timeline' | 'calendar';
  columns: number;
  columnsTablet: number;
  columnsMobile: number;
  
  // Display Options
  showFeaturedImage: boolean;
  showExcerpt: boolean;
  showMeta: boolean;
  showAuthor: boolean;
  showDate: boolean;
  showCategories: boolean;
  showTags: boolean;
  showCommentCount: boolean;
  showViewCount: boolean;
  showReadMore: boolean;
  
  // Content Settings
  excerptLength: number;
  readMoreText: string;
  dateFormat: 'default' | 'relative' | 'custom';
  customDateFormat: string;
  
  // Archive Grouping
  enableGrouping: boolean;
  groupBy: 'year' | 'month' | 'category' | 'tag' | 'author';
  showGroupTitle: boolean;
  showGroupCount: boolean;
  collapsibleGroups: boolean;
  
  // Filtering & Search
  enableFilters: boolean;
  enableSearch: boolean;
  enableSorting: boolean;
  sortBy: 'date' | 'title' | 'author' | 'views' | 'comments';
  sortOrder: 'asc' | 'desc';
  availableFilters: ('date' | 'category' | 'tag' | 'author')[];
  
  // Pagination
  enablePagination: boolean;
  postsPerPage: number;
  paginationType: 'numbered' | 'load-more' | 'infinite-scroll';
  showPaginationInfo: boolean;
  
  // Timeline Specific (for timeline layout)
  timelineOrientation: 'vertical' | 'horizontal';
  timelineAlignment: 'left' | 'center' | 'right' | 'alternating';
  showTimelineDots: boolean;
  timelineDotColor: string;
  timelineLineColor: string;
  
  // Calendar Specific (for calendar layout)
  calendarStartDay: 0 | 1; // 0 = Sunday, 1 = Monday
  showCalendarNavigation: boolean;
  highlightToday: boolean;
  
  // Typography
  titleFontFamily: string;
  titleFontSize: number;
  titleFontSizeTablet: number;
  titleFontSizeMobile: number;
  titleFontWeight: string;
  titleColor: string;
  titleColorHover: string;
  
  excerptFontFamily: string;
  excerptFontSize: number;
  excerptFontSizeTablet: number;
  excerptFontSizeMobile: number;
  excerptColor: string;
  excerptLineHeight: number;
  
  metaFontSize: number;
  metaColor: string;
  metaFontWeight: string;
  
  groupTitleFontSize: number;
  groupTitleColor: string;
  groupTitleFontWeight: string;
  
  // Styling
  itemBackgroundColor: string;
  itemBorderColor: string;
  itemBorderWidth: number;
  itemBorderRadius: number;
  itemPadding: number;
  itemShadow: boolean;
  itemShadowColor: string;
  
  // Hover Effects
  enableHoverEffect: boolean;
  hoverBackgroundColor: string;
  hoverBorderColor: string;
  hoverShadowColor: string;
  hoverTransform: 'none' | 'scale' | 'translateY';
  
  // Spacing
  itemSpacing: number;
  itemSpacingTablet: number;
  itemSpacingMobile: number;
  groupSpacing: number;
  
  // Advanced
  enableLazyLoad: boolean;
  enableSEOOptimization: boolean;
  customCSSClass: string;
  enableAnalytics: boolean;
  
  // Data Source (for demo/development)
  demoMode: boolean;
  demoDataType: 'blog' | 'news' | 'portfolio' | 'ecommerce';
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    uagbArchive: {
      setUAGBArchive: (attrs: Partial<UAGBArchiveAttributes>) => ReturnType;
      updateUAGBArchive: (attrs: Partial<UAGBArchiveAttributes>) => ReturnType;
    };
  }
}

export const UAGBArchiveBlock = Node.create({
  name: 'uagb/archive',
  
  group: 'block',
  atom: true,
  
  addAttributes() {
    return {
      // 블록 식별
      block_id: {
        default: () => generateBlockId(),
        parseHTML: element => element.getAttribute('data-block-id'),
        renderHTML: attributes => ({ 'data-block-id': attributes.block_id }),
      },
      classMigrate: {
        default: false,
      },
      
      // Archive Settings
      archiveType: { default: 'posts' },
      postType: { default: 'post' },
      
      // 🆕 Dynamic Data Source (Post Creation Mode 연동)
      dynamicSourceType: { default: 'blog' },
      dynamicSourceTable: { default: '' },
      enableRealTimeData: { default: false },
      dataRefreshInterval: { default: 30000 }, // 30초
      
      // Layout Options
      layout: { default: 'grid' },
      columns: { default: 3 },
      columnsTablet: { default: 2 },
      columnsMobile: { default: 1 },
      
      // Display Options
      showFeaturedImage: { default: true },
      showExcerpt: { default: true },
      showMeta: { default: true },
      showAuthor: { default: true },
      showDate: { default: true },
      showCategories: { default: true },
      showTags: { default: false },
      showCommentCount: { default: false },
      showViewCount: { default: false },
      showReadMore: { default: true },
      
      // Content Settings
      excerptLength: { default: 150 },
      readMoreText: { default: 'Read More' },
      dateFormat: { default: 'default' },
      customDateFormat: { default: 'Y-m-d' },
      
      // Archive Grouping
      enableGrouping: { default: false },
      groupBy: { default: 'year' },
      showGroupTitle: { default: true },
      showGroupCount: { default: true },
      collapsibleGroups: { default: false },
      
      // Filtering & Search
      enableFilters: { default: false },
      enableSearch: { default: false },
      enableSorting: { default: false },
      sortBy: { default: 'date' },
      sortOrder: { default: 'desc' },
      availableFilters: { default: ['date', 'category'] },
      
      // Pagination
      enablePagination: { default: true },
      postsPerPage: { default: 9 },
      paginationType: { default: 'numbered' },
      showPaginationInfo: { default: true },
      
      // Timeline Specific
      timelineOrientation: { default: 'vertical' },
      timelineAlignment: { default: 'left' },
      showTimelineDots: { default: true },
      timelineDotColor: { default: '#3b82f6' },
      timelineLineColor: { default: '#e5e7eb' },
      
      // Calendar Specific
      calendarStartDay: { default: 1 },
      showCalendarNavigation: { default: true },
      highlightToday: { default: true },
      
      // Typography
      titleFontFamily: { default: 'inherit' },
      titleFontSize: { default: 20 },
      titleFontSizeTablet: { default: 18 },
      titleFontSizeMobile: { default: 16 },
      titleFontWeight: { default: '600' },
      titleColor: { default: '#1f2937' },
      titleColorHover: { default: '#3b82f6' },
      
      excerptFontFamily: { default: 'inherit' },
      excerptFontSize: { default: 16 },
      excerptFontSizeTablet: { default: 15 },
      excerptFontSizeMobile: { default: 14 },
      excerptColor: { default: '#6b7280' },
      excerptLineHeight: { default: 1.6 },
      
      metaFontSize: { default: 13 },
      metaColor: { default: '#9ca3af' },
      metaFontWeight: { default: '400' },
      
      groupTitleFontSize: { default: 24 },
      groupTitleColor: { default: '#374151' },
      groupTitleFontWeight: { default: '700' },
      
      // Styling
      itemBackgroundColor: { default: '#ffffff' },
      itemBorderColor: { default: '#e5e7eb' },
      itemBorderWidth: { default: 1 },
      itemBorderRadius: { default: 8 },
      itemPadding: { default: 20 },
      itemShadow: { default: true },
      itemShadowColor: { default: 'rgba(0, 0, 0, 0.1)' },
      
      // Hover Effects
      enableHoverEffect: { default: true },
      hoverBackgroundColor: { default: '#f9fafb' },
      hoverBorderColor: { default: '#d1d5db' },
      hoverShadowColor: { default: 'rgba(0, 0, 0, 0.15)' },
      hoverTransform: { default: 'translateY' },
      
      // Spacing
      itemSpacing: { default: 24 },
      itemSpacingTablet: { default: 20 },
      itemSpacingMobile: { default: 16 },
      groupSpacing: { default: 40 },
      
      // Advanced
      enableLazyLoad: { default: true },
      enableSEOOptimization: { default: true },
      customCSSClass: { default: '' },
      enableAnalytics: { default: false },
      
      // Data Source
      demoMode: { default: true },
      demoDataType: { default: 'blog' },
      
      // Common UAGB attributes
      blockTopMargin: { default: 0 },
      blockRightMargin: { default: 0 },
      blockBottomMargin: { default: 0 },
      blockLeftMargin: { default: 0 },
      blockTopMarginTablet: { default: 0 },
      blockRightMarginTablet: { default: 0 },
      blockBottomMarginTablet: { default: 0 },
      blockLeftMarginTablet: { default: 0 },
      blockTopMarginMobile: { default: 0 },
      blockRightMarginMobile: { default: 0 },
      blockBottomMarginMobile: { default: 0 },
      blockLeftMarginMobile: { default: 0 },
      
      blockTopPadding: { default: 0 },
      blockRightPadding: { default: 0 },
      blockBottomPadding: { default: 0 },
      blockLeftPadding: { default: 0 },
      blockTopPaddingTablet: { default: 0 },
      blockRightPaddingTablet: { default: 0 },
      blockBottomPaddingTablet: { default: 0 },
      blockLeftPaddingTablet: { default: 0 },
      blockTopPaddingMobile: { default: 0 },
      blockRightPaddingMobile: { default: 0 },
      blockBottomPaddingMobile: { default: 0 },
      blockLeftPaddingMobile: { default: 0 },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="uagb/archive"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'uagb/archive',
          'class': `uagb-block-${HTMLAttributes['data-block-id']} uagb-archive`,
        },
        HTMLAttributes
      ),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UAGBArchiveView);
  },

  addCommands() {
    return {
      setUAGBArchive:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
      updateUAGBArchive:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        },
    };
  },
});

// 🔧 Dynamic Data Integration 유틸리티 함수들

/**
 * Post Creation Mode로 생성된 데이터를 가져오는 인터페이스
 */
export interface DynamicDataQuery {
  postType: string;
  limit: number;
  offset: number;
  orderBy: string;
  sortOrder: 'ASC' | 'DESC';
  filters: {
    categories?: string[];
    tags?: string[];
    author?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    status?: 'published' | 'draft' | 'pending';
  };
  search?: string;
}

/**
 * 동적 데이터 결과 인터페이스
 */
export interface DynamicDataResult {
  items: UAGBArchiveItem[];
  totalCount: number;
  hasMore: boolean;
  metadata: {
    categories: string[];
    tags: string[];
    authors: string[];
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
}

/**
 * 동적 데이터를 가져오는 함수 (실제 API 연동)
 */
export const fetchDynamicArchiveData = async (
  query: DynamicDataQuery
): Promise<DynamicDataResult> => {
  try {
    // 🚀 실제 API 호출 (o4o-apiserver)
    const response = await fetch('http://localhost:3000/api/post-creation/archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postTypeSlug: query.postType,
        limit: query.limit,
        offset: query.offset,
        orderBy: query.orderBy,
        sortOrder: query.sortOrder,
        filters: query.filters,
        search: query.search
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const apiResult = await response.json();
    
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'API request failed');
    }
    
    // API 응답을 우리 형식으로 변환
    return {
      items: apiResult.data.items,
      totalCount: apiResult.data.metadata.totalCount,
      hasMore: apiResult.data.metadata.hasMore,
      metadata: {
        categories: [], // TODO: API에서 카테고리 메타데이터 추가
        tags: [],       // TODO: API에서 태그 메타데이터 추가
        authors: [],    // TODO: API에서 작성자 메타데이터 추가
        dateRange: {
          earliest: '',
          latest: ''
        }
      }
    };
    
  } catch (error) {
    console.error('API call failed, falling back to mock data:', error);
    
    // 개발 모드나 API 실패 시 Mock 데이터 사용
    return generateMockDynamicData(query);
  }
};

/**
 * 개발용 Mock 데이터 생성기
 */
const generateMockDynamicData = (query: DynamicDataQuery): DynamicDataResult => {
  const mockData: UAGBArchiveItem[] = [
    {
      id: '1',
      title: 'Getting Started with React and TypeScript',
      excerpt: 'Learn how to set up a modern React project with TypeScript, ESLint, and best practices for scalable web development.',
      content: 'Full content here...',
      date: '2024-06-20',
      author: 'John Doe',
      categories: ['Programming', 'React'],
      tags: ['react', 'typescript', 'javascript'],
      featured_image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop',
      slug: 'react-typescript-guide',
      status: 'published',
      view_count: 1250,
      comment_count: 23
    },
    {
      id: '2',
      title: 'Modern CSS Techniques for 2024',
      excerpt: 'Discover the latest CSS features including Container Queries, CSS Grid improvements, and new color functions.',
      content: 'Full content here...',
      date: '2024-06-18',
      author: 'Jane Smith',
      categories: ['Design', 'CSS'],
      tags: ['css', 'web-design', 'responsive'],
      featured_image: 'https://images.unsplash.com/photo-1545670723-196ed0954986?w=400&h=250&fit=crop',
      slug: 'modern-css-2024',
      status: 'published',
      view_count: 890,
      comment_count: 15
    },
    {
      id: '3',
      title: 'Building Scalable Node.js APIs',
      excerpt: 'Best practices for creating robust and scalable REST APIs using Node.js, Express, and modern architecture patterns.',
      content: 'Full content here...',
      date: '2024-06-15',
      author: 'Mike Johnson',
      categories: ['Backend', 'Node.js'],
      tags: ['nodejs', 'api', 'express'],
      featured_image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=250&fit=crop',
      slug: 'scalable-nodejs-apis',
      status: 'published',
      view_count: 672,
      comment_count: 8
    }
  ];

  // 필터링 적용
  let filteredData = mockData.filter(item => {
    if (query.filters.status && item.status !== query.filters.status) return false;
    if (query.filters.categories && !query.filters.categories.some(cat => item.categories.includes(cat))) return false;
    if (query.filters.tags && !query.filters.tags.some(tag => item.tags.includes(tag))) return false;
    if (query.filters.author && item.author !== query.filters.author) return false;
    if (query.search && !item.title.toLowerCase().includes(query.search.toLowerCase()) && 
        !item.excerpt.toLowerCase().includes(query.search.toLowerCase())) return false;
    return true;
  });

  // 정렬 적용
  filteredData.sort((a, b) => {
    let comparison = 0;
    switch (query.orderBy) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'views':
        comparison = a.view_count - b.view_count;
        break;
      case 'comments':
        comparison = a.comment_count - b.comment_count;
        break;
      default:
        comparison = 0;
    }
    return query.sortOrder === 'DESC' ? -comparison : comparison;
  });

  // 페이지네이션 적용
  const startIndex = query.offset;
  const endIndex = startIndex + query.limit;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return {
    items: paginatedData,
    totalCount: filteredData.length,
    hasMore: endIndex < filteredData.length,
    metadata: {
      categories: [...new Set(mockData.flatMap(item => item.categories))],
      tags: [...new Set(mockData.flatMap(item => item.tags))],
      authors: [...new Set(mockData.map(item => item.author))],
      dateRange: {
        earliest: mockData.reduce((earliest, item) => 
          new Date(item.date) < new Date(earliest) ? item.date : earliest, 
          mockData[0]?.date || new Date().toISOString()
        ),
        latest: mockData.reduce((latest, item) => 
          new Date(item.date) > new Date(latest) ? item.date : latest, 
          mockData[0]?.date || new Date().toISOString()
        )
      }
    }
  };
};

/**
 * 특정 Post Type의 데이터베이스 스키마 정보 가져오기
 */
export const getPostTypeSchema = async (postType: string) => {
  try {
    const response = await fetch(`/api/post-types/${postType}/schema`);
    if (!response.ok) {
      throw new Error(`Schema API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch post type schema:', error);
    return null;
  }
};

/**
 * 사용 가능한 Post Type 목록 가져오기
 */
export const getAvailablePostTypes = async (): Promise<string[]> => {
  try {
    const response = await fetch('/api/post-types');
    if (!response.ok) {
      throw new Error(`Post Types API Error: ${response.status}`);
    }
    const data = await response.json();
    return data.postTypes || ['blog', 'news', 'portfolio'];
  } catch (error) {
    console.error('Failed to fetch available post types:', error);
    return ['blog', 'news', 'portfolio'];
  }
};

/**
 * 실시간 데이터 업데이트를 위한 WebSocket 연결 (선택적)
 */
export class ArchiveDataStream {
  private ws: WebSocket | null = null;
  private listeners: Map<string, (data: DynamicDataResult) => void> = new Map();

  connect(postType: string) {
    if (typeof window === 'undefined') return;
    
    try {
      this.ws = new WebSocket(`ws://localhost:3001/archive/${postType}`);
      
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.listeners.forEach(listener => listener(data));
      };
      
      this.ws.onclose = () => {
        console.log('Archive data stream disconnected');
        // 재연결 로직 필요시 추가
      };
    } catch (error) {
      console.error('Failed to connect to archive data stream:', error);
    }
  }

  subscribe(id: string, callback: (data: DynamicDataResult) => void) {
    this.listeners.set(id, callback);
  }

  unsubscribe(id: string) {
    this.listeners.delete(id);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

// 글로벌 스트림 인스턴스 (필요시 사용)
export const globalArchiveStream = new ArchiveDataStream();

export default UAGBArchiveBlock;
