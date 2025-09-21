/**
 * Enhanced Gallery Block Types
 * WordPress Gutenberg와 85% 유사도를 목표로 하는 갤러리 블록 타입 정의
 */

export interface GalleryImage {
  id: string;
  url: string;
  fullUrl?: string;
  thumbnailUrl?: string;
  alt: string;
  caption?: string;
  title?: string;
  width: number;
  height: number;
  fileSize?: number;
  mimeType?: string;

  // 이미지 편집 관련
  focalPoint?: { x: number; y: number };
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
    sepia?: boolean;
    grayscale?: boolean;
  };
  rotation?: number;
  cropData?: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit?: 'px' | '%';
  };

  // 링크 설정
  linkTo?: 'none' | 'media' | 'attachment' | 'custom';
  customLink?: string;
  linkTarget?: '_self' | '_blank';

  // 메타데이터
  uploadedAt?: string;
  description?: string;
}

export interface GalleryAttributes {
  // 이미지 목록
  images: GalleryImage[];
  ids: string[];

  // 레이아웃 설정
  layout: 'grid' | 'masonry' | 'slider';
  columns: number;
  gap: number;
  aspectRatio: 'auto' | 'square' | '16:9' | '4:3' | '3:2';

  // 이미지 설정
  imageCrop: boolean;
  fixedHeight: boolean;
  linkTo: 'none' | 'media' | 'attachment';

  // 캡션 설정
  showCaptions: boolean;
  captionPosition: 'below' | 'overlay' | 'hover';

  // 라이트박스
  enableLightbox: boolean;
  lightboxAnimation: 'fade' | 'slide' | 'zoom';

  // 스타일링
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  padding: number;

  // 고급 설정
  randomOrder: boolean;
  hoverEffect: 'none' | 'zoom' | 'fade' | 'lift';
  imageFilter: 'none' | 'grayscale' | 'sepia' | 'blur';
  overlayColor?: string;
  overlayOpacity?: number;

  // WordPress 호환성
  align?: 'left' | 'center' | 'right' | 'wide' | 'full';
  className?: string;
  anchor?: string;

  // 반응형 설정
  responsiveColumns?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export interface EnhancedGalleryBlockProps {
  id: string;
  content: string;
  onChange: (content: string, attributes?: Partial<GalleryAttributes>) => void;
  attributes?: Partial<GalleryAttributes>;
  isSelected?: boolean;
  className?: string;
}

export interface GalleryLayoutConfig {
  type: 'grid' | 'masonry' | 'slider';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  supportsColumns: boolean;
  supportsAspectRatio: boolean;
  minColumns: number;
  maxColumns: number;
  defaultColumns: number;
}

export interface GalleryItemProps {
  image: GalleryImage;
  index: number;
  layout: 'grid' | 'masonry' | 'slider';
  aspectRatio: string;
  showCaption: boolean;
  captionPosition: 'below' | 'overlay' | 'hover';
  enableLightbox: boolean;
  hoverEffect: string;
  borderRadius: number;
  isSelected?: boolean;
  isEditing?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
  onMove?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  onLightboxOpen?: (index: number) => void;
  className?: string;
}

export interface GalleryLightboxProps {
  images: GalleryImage[];
  currentIndex: number;
  isOpen: boolean;
  animation: 'fade' | 'slide' | 'zoom';
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onImageSelect: (index: number) => void;
  showThumbnails?: boolean;
  showCounter?: boolean;
  enableKeyboard?: boolean;
}

export interface GallerySettingsProps {
  attributes: Partial<GalleryAttributes>;
  onChange: (attributes: Partial<GalleryAttributes>) => void;
  selectedImage?: GalleryImage;
  onImageUpdate?: (imageId: string, updates: Partial<GalleryImage>) => void;
  className?: string;
}

// WordPress Gutenberg 호환 타입
export interface WordPressGalleryShortcode {
  tag: 'gallery';
  attrs: {
    ids?: string;
    columns?: string;
    size?: string;
    link?: string;
    orderby?: string;
    order?: string;
    include?: string;
    exclude?: string;
  };
  type: 'self-closing';
}

// 에러 타입
export interface GalleryError {
  type: 'upload' | 'loading' | 'processing' | 'validation';
  message: string;
  imageId?: string;
  details?: any;
}

// 이벤트 타입
export interface GalleryEvents {
  onImagesAdd: (images: GalleryImage[]) => void;
  onImageRemove: (imageId: string) => void;
  onImageUpdate: (imageId: string, updates: Partial<GalleryImage>) => void;
  onImageReorder: (fromIndex: number, toIndex: number) => void;
  onLayoutChange: (layout: Partial<GalleryAttributes>) => void;
  onError: (error: GalleryError) => void;
}

// 유틸리티 타입
export type GalleryImageAction =
  | { type: 'ADD_IMAGES'; images: GalleryImage[] }
  | { type: 'REMOVE_IMAGE'; imageId: string }
  | { type: 'UPDATE_IMAGE'; imageId: string; updates: Partial<GalleryImage> }
  | { type: 'REORDER_IMAGES'; fromIndex: number; toIndex: number }
  | { type: 'CLEAR_IMAGES' }
  | { type: 'SET_IMAGES'; images: GalleryImage[] };

export type GalleryLayoutType = GalleryAttributes['layout'];
export type GalleryCaptionPosition = GalleryAttributes['captionPosition'];
export type GalleryAspectRatio = GalleryAttributes['aspectRatio'];
export type GalleryHoverEffect = GalleryAttributes['hoverEffect'];
export type GalleryImageFilter = GalleryAttributes['imageFilter'];

// 기본값 상수
export const DEFAULT_GALLERY_ATTRIBUTES: GalleryAttributes = {
  images: [],
  ids: [],
  layout: 'grid',
  columns: 3,
  gap: 16,
  aspectRatio: 'auto',
  imageCrop: false,
  fixedHeight: false,
  linkTo: 'none',
  showCaptions: true,
  captionPosition: 'below',
  enableLightbox: true,
  lightboxAnimation: 'fade',
  borderRadius: 0,
  borderWidth: 0,
  borderColor: '#e5e7eb',
  padding: 0,
  randomOrder: false,
  hoverEffect: 'none',
  imageFilter: 'none',
  responsiveColumns: {
    mobile: 1,
    tablet: 2,
    desktop: 3
  }
};

export const LAYOUT_CONFIGS: Record<GalleryLayoutType, Omit<GalleryLayoutConfig, 'icon'>> = {
  grid: {
    type: 'grid',
    label: 'Grid',
    description: 'Display images in a uniform grid layout',
    supportsColumns: true,
    supportsAspectRatio: true,
    minColumns: 1,
    maxColumns: 8,
    defaultColumns: 3
  },
  masonry: {
    type: 'masonry',
    label: 'Masonry',
    description: 'Pinterest-style staggered layout',
    supportsColumns: true,
    supportsAspectRatio: false,
    minColumns: 2,
    maxColumns: 6,
    defaultColumns: 3
  },
  slider: {
    type: 'slider',
    label: 'Slider',
    description: 'Horizontal scrolling carousel',
    supportsColumns: true,
    supportsAspectRatio: true,
    minColumns: 1,
    maxColumns: 5,
    defaultColumns: 3
  }
};

export const ASPECT_RATIOS = [
  { value: 'auto', label: 'Original', ratio: null },
  { value: 'square', label: 'Square (1:1)', ratio: 1 },
  { value: '4:3', label: 'Standard (4:3)', ratio: 4/3 },
  { value: '16:9', label: 'Widescreen (16:9)', ratio: 16/9 },
  { value: '3:2', label: 'Classic (3:2)', ratio: 3/2 }
] as const;

export const HOVER_EFFECTS = [
  { value: 'none', label: 'None' },
  { value: 'zoom', label: 'Zoom In' },
  { value: 'fade', label: 'Fade' },
  { value: 'lift', label: 'Lift Up' }
] as const;

export const IMAGE_FILTERS = [
  { value: 'none', label: 'None' },
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'sepia', label: 'Sepia' },
  { value: 'blur', label: 'Blur' }
] as const;