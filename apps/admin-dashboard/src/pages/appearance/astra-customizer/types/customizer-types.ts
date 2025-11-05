/**
 * Astra Customizer TypeScript Type Definitions
 * 모든 커스터마이저 관련 타입을 정의합니다.
 */

// ============================================
// 기본 타입 정의
// ============================================

/**
 * 반응형 값 타입 - 데스크탑/태블릿/모바일 값을 각각 설정
 */
export interface ResponsiveValue<T> {
  desktop: T;
  tablet: T;
  mobile: T;
}

/**
 * 색상 상태 타입 - 일반/호버 상태 색상
 */
export interface ColorState {
  normal: string;
  hover?: string;
}

/**
 * 폰트 가중치 타입
 */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/**
 * 텍스트 변형 타입
 */
export type TextTransform = 'none' | 'capitalize' | 'uppercase' | 'lowercase';

/**
 * 텍스트 정렬 타입
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

// ============================================
// 섹션별 설정 인터페이스
// ============================================

/**
 * 사이트 아이덴티티 설정
 */
export interface SiteIdentitySettings {
  logo: {
    desktop: string | null;
    mobile: string | null;
    width: ResponsiveValue<number>;
  };
  siteTitle: {
    show: boolean;
    text: string;
    color: ColorState;
    typography: TypographySettings;
  };
  tagline: {
    show: boolean;
    text: string;
    color: ColorState;
    typography: TypographySettings;
  };
  favicon: string | null;
}

/**
 * 타이포그래피 설정
 */
export interface TypographySettings {
  fontFamily: string;
  fontSize: ResponsiveValue<number>;
  fontWeight: FontWeight;
  lineHeight: ResponsiveValue<number>;
  letterSpacing: ResponsiveValue<number>;
  textTransform: TextTransform;
  textDecoration?: string;
}

/**
 * 전역 색상 설정
 */
export interface GlobalColorsSettings {
  // 기본 색상
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  linkColor: ColorState;
  borderColor: string;
  
  // 배경 색상
  bodyBackground: string;
  contentBackground: string;
  
  // 테마 색상 팔레트
  palette: {
    [key: string]: string;
  };
}

/**
 * 전역 타이포그래피 설정
 */
export interface GlobalTypographySettings {
  // 기본 폰트
  bodyFont: TypographySettings;
  
  // 제목 폰트 (H1-H6)
  headings: {
    h1: TypographySettings;
    h2: TypographySettings;
    h3: TypographySettings;
    h4: TypographySettings;
    h5: TypographySettings;
    h6: TypographySettings;
  };
  
  // 버튼 폰트
  button: TypographySettings;
}

/**
 * 컨테이너 레이아웃 설정
 */
export interface ContainerSettings {
  layout: 'boxed' | 'full-width' | 'fluid';
  width: ResponsiveValue<number>;
  padding: ResponsiveValue<{
    top: number;
    right: number;
    bottom: number;
    left: number;
  }>;
  margin: ResponsiveValue<{
    top: number;
    bottom: number;
  }>;
}

/**
 * 사이드바 설정
 */
export interface SidebarSettings {
  layout: 'no-sidebar' | 'left-sidebar' | 'right-sidebar' | 'both-sidebars';
  width: ResponsiveValue<number>;
  gap: ResponsiveValue<number>;
}

/**
 * 헤더 모듈 타입
 */
export type HeaderModuleType =
  | 'logo'
  | 'site-title'
  | 'primary-menu'
  | 'secondary-menu'
  | 'search'
  | 'account'
  | 'cart'
  | 'button'
  | 'html'
  | 'widget'
  | 'social'
  | 'role-switcher';

/**
 * Logo Module Settings
 */
export interface LogoModuleSettings {
  logoUrl?: string;
  href?: string;
  width?: number;
  retinaUrl?: string;
  // 공통 설정
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Primary Menu Module Settings
 */
export interface MenuModuleSettings {
  menuRef?: 'primary' | 'secondary' | 'footer';
  style?: 'default' | 'minimal' | 'bordered';
  itemGap?: number;
  // 공통 설정
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Button Module Settings
 */
export interface ButtonModuleSettings {
  label?: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  borderRadius?: number;
  // 공통 설정
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Social Icons Module Settings
 */
export interface SocialIconsModuleSettings {
  links?: Array<{ type: string; url: string }>;
  shape?: 'circle' | 'square' | 'rounded';
  size?: number;
  colorMode?: 'brand' | 'monochrome';
  // 공통 설정
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Secondary Menu Module Settings
 */
export interface SecondaryMenuModuleSettings extends MenuModuleSettings {
  // Inherits from MenuModuleSettings
  // menuRef defaults to 'secondary'
}

/**
 * Search Module Settings
 */
export interface SearchModuleSettings {
  variant?: 'icon' | 'input';
  placeholder?: string;
  autocomplete?: boolean;
  // 공통 설정
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Cart Module Settings
 */
export interface CartModuleSettings {
  showCount?: boolean;
  showTotal?: boolean;
  action?: 'mini-cart' | 'page';
  // 공통 설정
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Role Switcher Module Settings
 */
export interface RoleSwitcherModuleSettings {
  displayCondition?: 'always' | 'multi-role';
  showLabel?: boolean;
  variant?: 'icon-only' | 'with-label';
  // 공통 설정
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * Widget Module Settings
 */
export interface WidgetModuleSettings {
  widgetAreaId?: string;
  // 공통 설정
  alignment?: 'left' | 'center' | 'right';
  visibility?: { desktop: boolean; tablet: boolean; mobile: boolean };
  spacing?: {
    margin: { top: number; right: number; bottom: number; left: number };
    padding: { top: number; right: number; bottom: number; left: number };
  };
  className?: string;
  ariaLabel?: string;
}

/**
 * 모듈 설정 인터페이스
 */
export interface ModuleConfig {
  id: string;
  type: HeaderModuleType;
  label?: string;
  settings: {
    // 공통 설정
    visibility?: ResponsiveValue<boolean> | { desktop: boolean; tablet: boolean; mobile: boolean };
    customClass?: string;

    // 모듈별 설정
    [key: string]: any;
  };
}

/**
 * 헤더 빌더 레이아웃
 */
export interface HeaderBuilderLayout {
  above: {
    left: ModuleConfig[];
    center: ModuleConfig[];
    right: ModuleConfig[];
    settings: {
      enabled: boolean;
      height: ResponsiveValue<number>;
      background: string;
      padding?: ResponsiveValue<{ top: number; bottom: number }>;
    };
  };
  primary: {
    left: ModuleConfig[];
    center: ModuleConfig[];
    right: ModuleConfig[];
    settings: {
      height: ResponsiveValue<number>;
      background: string;
      padding?: ResponsiveValue<{ top: number; bottom: number }>;
    };
  };
  below: {
    left: ModuleConfig[];
    center: ModuleConfig[];
    right: ModuleConfig[];
    settings: {
      enabled: boolean;
      height: ResponsiveValue<number>;
      background: string;
      padding?: ResponsiveValue<{ top: number; bottom: number }>;
    };
  };
}

/**
 * Sticky Header Settings
 */
export interface StickyHeaderSettings {
  enabled: boolean;
  triggerHeight: number; // 스크롤 높이 (px)
  stickyOn: ('above' | 'primary' | 'below')[];
  shrinkEffect: boolean;
  shrinkHeight: ResponsiveValue<number>; // 축소 시 높이
  backgroundColor?: string;
  backgroundOpacity: number; // 0-1
  boxShadow: boolean;
  shadowIntensity: 'light' | 'medium' | 'strong';
  animationDuration: number; // ms
  hideOnScrollDown?: boolean;
  zIndex: number;
}

/**
 * Mobile Header Settings
 */
export interface MobileHeaderSettings {
  enabled: boolean;
  breakpoint: number; // px
  mobileLogoUrl?: string;
  mobileLogoWidth?: number;
  hamburgerStyle: 'default' | 'animated' | 'minimal';
  menuPosition: 'left' | 'right' | 'fullscreen';
  menuAnimation: 'slide' | 'fade' | 'push';
  overlayEnabled: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  backgroundColor?: string;
  textColor?: string;
  showAccountIcon?: boolean;
  showCartIcon?: boolean;
  showSearchIcon?: boolean;
  submenuStyle: 'accordion' | 'dropdown';
  closeOnItemClick?: boolean;
  swipeToClose?: boolean;
}

/**
 * 헤더 설정 (기존 + 새로운 빌더 레이아웃)
 */
export interface HeaderSettings {
  layout: 'header-main-layout-1' | 'header-main-layout-2' | 'header-main-layout-3';
  sticky: boolean;
  transparentHeader: boolean;
  
  // 새로운 빌더 레이아웃
  builder?: HeaderBuilderLayout;
  
  // Sticky Header 상세 설정
  stickySettings?: StickyHeaderSettings;
  
  // Mobile Header 설정
  mobileSettings?: MobileHeaderSettings;
  
  // 기존 설정 (하위 호환성)
  above: {
    enabled: boolean;
    height: ResponsiveValue<number>;
    background: string;
    content: Array<'menu' | 'search' | 'account' | 'cart' | 'custom-html'>;
  };
  
  primary: {
    height: ResponsiveValue<number>;
    background: string;
    menuAlignment: TextAlign;
  };
  
  below: {
    enabled: boolean;
    height: ResponsiveValue<number>;
    background: string;
    content: Array<'menu' | 'search' | 'breadcrumb' | 'custom-html'>;
  };
}

/**
 * 푸터 위젯 타입
 */
export type FooterWidgetType = 
  | 'text' 
  | 'menu' 
  | 'social' 
  | 'contact' 
  | 'copyright' 
  | 'html'
  | 'recent-posts'
  | 'newsletter';

/**
 * 푸터 위젯 설정
 */
export interface FooterWidgetConfig {
  id: string;
  type: FooterWidgetType;
  label?: string;
  settings: {
    // 공통 설정
    title?: string;
    customClass?: string;
    
    // 타입별 설정
    // text widget
    content?: string;
    
    // menu widget
    menuId?: string;
    
    // social widget
    socialLinks?: Array<{
      platform: string;
      url: string;
      icon?: string;
    }>;
    
    // contact widget
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;
    
    // copyright
    copyrightText?: string;
    showYear?: boolean;
    
    // html widget
    htmlContent?: string;
    
    // recent posts
    postCount?: number;
    showDate?: boolean;
    showExcerpt?: boolean;
    
    // newsletter
    formAction?: string;
    placeholder?: string;
    buttonText?: string;
  };
}

/**
 * 푸터 빌더 레이아웃
 */
export interface FooterBuilderLayout {
  widgets: {
    enabled: boolean;
    columns: 1 | 2 | 3 | 4 | 5;
    layout: FooterWidgetConfig[][];
    settings: {
      background: string;
      textColor: string;
      linkColor: ColorState;
      padding: ResponsiveValue<{ top: number; bottom: number }>;
      gap?: number;
    };
  };
  bar: {
    enabled: boolean;
    left: FooterWidgetConfig[];
    right: FooterWidgetConfig[];
    settings: {
      background: string;
      textColor: string;
      linkColor: ColorState;
      padding: ResponsiveValue<{ top: number; bottom: number }>;
      alignment?: 'left' | 'center' | 'right' | 'space-between';
    };
  };
}

/**
 * 푸터 설정 (기존 + 새로운 빌더)
 */
export interface FooterSettings {
  layout: 'footer-layout-1' | 'footer-layout-2' | 'footer-layout-3';
  
  // 새로운 빌더 레이아웃
  builder?: FooterBuilderLayout;
  
  // 기존 위젯 영역 (하위 호환성)
  widgets: {
    enabled: boolean;
    columns: ResponsiveValue<number>;
    background: string;
    textColor: string;
    linkColor: ColorState;
    padding: ResponsiveValue<{
      top: number;
      bottom: number;
    }>;
  };
  
  // 기존 하단 바 (하위 호환성)
  bottomBar: {
    enabled: boolean;
    layout: 'layout-1' | 'layout-2';
    section1: string; // HTML or copyright text
    section2: string; // HTML or menu
    background: string;
    textColor: string;
    linkColor: ColorState;
    padding: ResponsiveValue<{
      top: number;
      bottom: number;
    }>;
  };
}

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

// ============================================
// 메인 커스터마이저 설정 타입
// ============================================

/**
 * 전체 커스터마이저 설정
 */
export interface AstraCustomizerSettings {
  // 전역 설정
  siteIdentity: SiteIdentitySettings;
  colors: GlobalColorsSettings;
  typography: GlobalTypographySettings;
  
  // 레이아웃 설정
  container: ContainerSettings;
  sidebar: SidebarSettings;
  
  // 헤더/푸터
  header: HeaderSettings;
  footer: FooterSettings;
  
  // 콘텐츠 설정
  blog: BlogSettings;
  
  // General 설정
  scrollToTop?: ScrollToTopSettings;
  
  // Button 설정
  buttons?: ButtonVariants;
  
  // Breadcrumbs 설정
  breadcrumbs?: BreadcrumbsSettings;
  
  // 추가 CSS
  customCSS: string;
  
  // 메타 정보
  _meta: {
    version: string;
    lastModified: string;
    isDirty: boolean;
  };
}

// ============================================
// UI 컴포넌트 Props 타입
// ============================================

/**
 * 커스터마이저 섹션 props
 */
export interface CustomizerSectionProps {
  title: string;
  description?: string;
  isActive: boolean;
  onActivate: () => void;
  children: React.ReactNode;
}

/**
 * 커스터마이저 컨트롤 props
 */
export interface CustomizerControlProps<T = any> {
  label: string;
  description?: string;
  value: T;
  onChange: (value: T) => void;
  responsive?: boolean;
  device?: 'desktop' | 'tablet' | 'mobile';
}

/**
 * 미리보기 디바이스 타입
 */
export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

/**
 * 저장 상태 타입
 */
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

// ============================================
// API 관련 타입
// ============================================

/**
 * API 응답 타입
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 설정 저장 요청 타입
 */
export interface SaveSettingsRequest {
  settings: Partial<AstraCustomizerSettings>;
  publish?: boolean;
}

/**
 * 설정 불러오기 응답 타입
 */
export interface LoadSettingsResponse {
  settings: AstraCustomizerSettings;
  presets?: CustomizerPreset[];
}

/**
 * 커스터마이저 프리셋
 */
export interface CustomizerPreset {
  id: string;
  name: string;
  thumbnail?: string;
  settings: Partial<AstraCustomizerSettings>;
  isPremium?: boolean;
}

// ============================================
// 이벤트 타입
// ============================================

/**
 * PostMessage 이벤트 타입
 */
export interface CustomizerMessage {
  type: 'setting-change' | 'device-change' | 'save' | 'reset' | 'preview-ready' | 'selective-refresh' | 'navigate';
  payload?: any;
}

/**
 * 커스터마이저 이벤트 핸들러
 */
export interface CustomizerEventHandlers {
  onSettingChange?: (section: SettingSection, value: any) => void;
  onSave?: (settings: AstraCustomizerSettings) => Promise<void>;
  onPublish?: (settings: AstraCustomizerSettings) => Promise<void>;
  onReset?: () => void;
  onDeviceChange?: (device: PreviewDevice) => void;
}

// ============================================
// 유틸리티 타입
// ============================================

/**
 * Button Style Settings
 */
export interface ButtonStyleSettings {
  // Basic styles
  backgroundColor: string;
  textColor: string;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  borderRadius: number;
  paddingVertical: number;
  paddingHorizontal: number;
  
  // Hover effects
  hoverBackgroundColor: string;
  hoverTextColor: string;
  hoverBorderColor: string;
  hoverTransform?: 'none' | 'scale' | 'translateY';
  transitionDuration: number;
  
  // Typography
  fontFamily?: string;
  fontSize: ResponsiveValue<number>;
  fontWeight: FontWeight;
  textTransform: TextTransform;
  letterSpacing: number;
  
  // Shadow
  boxShadow?: 'none' | 'small' | 'medium' | 'large';
  hoverBoxShadow?: 'none' | 'small' | 'medium' | 'large';
}

/**
 * Button Variants
 */
export interface ButtonVariants {
  primary: ButtonStyleSettings;
  secondary?: Partial<ButtonStyleSettings>;
  outline?: Partial<ButtonStyleSettings>;
  text?: Partial<ButtonStyleSettings>;
  // Global button settings that apply to all variants
  global?: {
    minHeight?: number;
    minWidth?: number;
    displayType?: 'inline-block' | 'block' | 'inline-flex';
    iconSpacing?: number;
  };
}

/**
 * Breadcrumbs Settings
 */
export interface BreadcrumbsSettings {
  enabled: boolean;
  position: 'above-content' | 'below-header';
  homeText: string;
  separator: '>' | '/' | '→' | '•' | '|';
  showCurrentPage: boolean;
  showOnHomepage: boolean;
  
  // Colors
  linkColor: string;
  currentPageColor: string;
  separatorColor: string;
  hoverColor: string;
  
  // Typography
  fontSize: ResponsiveValue<number>;
  fontWeight: FontWeight;
  textTransform: TextTransform;
  
  // Spacing
  itemSpacing: number;
  marginTop: number;
  marginBottom: number;
  
  // Advanced
  maxLength?: number; // Max characters per item before truncation
  showIcons?: boolean;
  mobileHidden?: boolean;
}

/**
 * Breadcrumb Item
 */
export interface BreadcrumbItem {
  label: string;
  url?: string;
  isActive: boolean;
  icon?: string;
}

/**
 * Scroll to Top Settings
 */
export interface ScrollToTopSettings {
  enabled: boolean;
  displayType: 'desktop' | 'mobile' | 'both';
  threshold?: number;
  backgroundColor?: string;
  iconColor?: string;
  position?: 'left' | 'right';
}

/**
 * Deep Partial 타입 (중첩된 객체도 부분적으로 만들기)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 설정 섹션 키 타입
 * Note: 'general' is a UI section that groups scrollToTop, buttons, and breadcrumbs settings
 */
export type SettingSection = keyof AstraCustomizerSettings | 'general';

/**
 * 설정 변경 액션 타입
 */
export interface SettingChangeAction {
  section: SettingSection;
  path: string[];
  value: any;
}
