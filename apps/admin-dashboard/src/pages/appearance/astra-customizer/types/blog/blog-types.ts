/**
 * Blog Type Definitions
 * 블로그 관련 타입을 정의합니다.
 */

import type { FontWeight, ResponsiveValue } from '../common/base-types';

/**
 * 포스트 메타 아이템
 */
export interface PostMetaItem {
  id: string;
  label: string;
  enabled: boolean;
  showIcon: boolean;
  order: number;
  icon?: string;
}

/**
 * 블로그 레이아웃 타입
 */
export type BlogLayoutType = 'grid' | 'list' | 'masonry';

/**
 * 카드 스타일 타입
 */
export type CardStyleType = 'boxed' | 'flat' | 'shadow';

/**
 * 페이지네이션 타입
 */
export type PaginationType = 'numbers' | 'prev-next' | 'infinite-scroll';

/**
 * 이미지 비율 타입
 */
export type ImageRatioType = '16:9' | '4:3' | '1:1' | 'custom';

/**
 * 정렬 옵션 타입
 */
export type SortOrderType = 'date-desc' | 'date-asc' | 'popular' | 'views' | 'title';

/**
 * 포스트 아이템 인터페이스
 */
export interface PostItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  featuredImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
  author: {
    id: string;
    name: string;
    avatar?: string;
    url?: string;
  };
  date: string;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    url: string;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    url: string;
  }>;
  commentCount: number;
  viewCount?: number;
  readTime?: number;
  url: string;
  status: 'published' | 'draft' | 'private';
}

/**
 * 블로그 아카이브 컨텍스트
 */
export interface BlogArchiveContext {
  type: 'home' | 'category' | 'tag' | 'author' | 'date' | 'search';
  title?: string;
  description?: string;
  posts: PostItem[];
  totalPosts: number;
  currentPage: number;
  totalPages: number;
  postsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
  };
  tag?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
  };
  author?: {
    id: string;
    name: string;
    bio?: string;
    avatar?: string;
  };
  searchQuery?: string;
}

/**
 * 블로그/아카이브 설정
 */
export interface BlogSettings {
  // 아카이브 페이지
  archive: {
    // 헤더 및 UI 옵션
    showArchiveHeader?: boolean;
    showLayoutSwitcher?: boolean;
    showSortOptions?: boolean;

    // 레이아웃 설정
    layout: BlogLayoutType;
    columns: ResponsiveValue<number>;
    cardStyle: CardStyleType;
    cardSpacing: number;
    contentWidth: 'default' | 'narrow' | 'full';

    // 썸네일 설정
    featuredImage: {
      enabled: boolean;
      ratio: ImageRatioType;
      customRatio: { width: number; height: number };
      size: 'thumbnail' | 'medium' | 'large' | 'full';
      position: 'top' | 'left' | 'right';
      hoverEffect: 'none' | 'zoom' | 'fade' | 'overlay';
      fallbackImage?: string;
    };

    // 포스트 메타 설정
    meta: {
      items: PostMetaItem[];
      position: 'before-title' | 'after-title' | 'bottom';
      separator: string;
      showIcons: boolean;
      colors: {
        text: string;
        links: string;
        icons: string;
      };
    };

    // 콘텐츠 설정
    content: {
      showTitle: boolean;
      titleTag: 'h1' | 'h2' | 'h3';
      showExcerpt: boolean;
      excerptLength: number;
      excerptSource: 'auto' | 'manual' | 'content';
      readMoreText: string;
      showReadMoreButton: boolean;
    };

    // 페이지네이션
    pagination: {
      enabled: boolean;
      type: PaginationType;
      postsPerPage: number;
      showNumbers: boolean;
      showPrevNext: boolean;
      prevText: string;
      nextText: string;
      infiniteScrollThreshold: number;
    };

    // 정렬 및 필터
    sorting: {
      defaultOrder: SortOrderType;
      showSortOptions: boolean;
      enableSearch: boolean;
      enableFilters: boolean;
    };

    // 스타일링
    styling: {
      titleColor: string;
      titleHoverColor: string;
      excerptColor: string;
      metaColor: string;
      backgroundColor: string;
      borderColor: string;
      borderRadius: number;
      cardPadding: number;
      typography: {
        titleSize: ResponsiveValue<number>;
        titleWeight: FontWeight;
        excerptSize: ResponsiveValue<number>;
        metaSize: ResponsiveValue<number>;
      };
    };
  };

  // 단일 포스트
  single: {
    layout: 'default' | 'narrow' | 'full';
    showFeaturedImage: boolean;
    showBreadcrumb: boolean;
    showPostNavigation: boolean;
    showAuthorBox: boolean;
    showRelatedPosts: boolean;
    relatedPostsCount: number;

    // 메타 정보
    meta: {
      showAuthor: boolean;
      showDate: boolean;
      showCategory: boolean;
      showTags: boolean;
      showComments: boolean;
      showReadTime: boolean;
      showViews: boolean;
      position: 'before-title' | 'after-title' | 'bottom';
    };

    // 관련 포스트
    relatedPosts: {
      title: string;
      layout: BlogLayoutType;
      columns: ResponsiveValue<number>;
      basedOn: 'category' | 'tags' | 'author';
    };
  };

  // 카테고리/태그 아카이브
  taxonomy: {
    showDescription: boolean;
    showPostCount: boolean;
    showHierarchy: boolean;
    inheritArchiveSettings: boolean;
  };
}
