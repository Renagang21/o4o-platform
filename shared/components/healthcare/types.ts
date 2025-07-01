// Healthcare platform types and interfaces

export interface HealthcareBlock {
  id: string;
  type: 'hero' | 'expert-content' | 'product-list' | 'trending' | 'business-banners' | 'community-banner';
  order: number;
  visible: boolean;
  mobileVisible?: boolean;
  data: any;
}

export interface HeroBlockData {
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  backgroundImage: string;
  mobileImage?: string;
  textColor?: string;
  overlayOpacity?: number;
}

export interface ExpertContentBlockData {
  title: string;
  subtitle?: string;
  contentIds: string[];
  layout: 'grid' | 'carousel' | 'list';
  showCount: number;
}

export interface ProductListBlockData {
  title: string;
  subtitle?: string;
  productIds: string[];
  layout: 'grid' | 'horizontal-scroll' | 'list';
  columns: number;
  showPrice: boolean;
  showRating: boolean;
  productType: 'recommended' | 'new' | 'popular' | 'custom';
}

export interface TrendingBlockData {
  title: string;
  subtitle?: string;
  issueIds: string[];
  layout: 'grid' | 'carousel';
  showRelatedProducts: boolean;
}

export interface BusinessBannersBlockData {
  title?: string;
  bannerIds: string[];
  layout: 'horizontal' | 'vertical' | 'mixed';
  spacing: 'compact' | 'normal' | 'relaxed';
}

export interface CommunityBannerBlockData {
  bannerId: string;
  position: 'header' | 'top' | 'middle' | 'bottom';
  showRecentQA: boolean;
  qaCount: number;
}

export interface DragDropState {
  draggedIndex: number | null;
  draggedOverIndex: number | null;
}

export interface EditorMode {
  isEditing: boolean;
  selectedBlock?: string;
}

export interface BlockActions {
  onMove: (fromIndex: number, toIndex: number) => void;
  onEdit: (blockId: string, data: any) => void;
  onDelete: (blockId: string) => void;
  onToggleVisibility: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
}

export interface ResponsiveSettings {
  desktop: {
    visible: boolean;
    layout?: string;
    columns?: number;
  };
  tablet: {
    visible: boolean;
    layout?: string;
    columns?: number;
  };
  mobile: {
    visible: boolean;
    layout?: string;
    columns?: number;
  };
}