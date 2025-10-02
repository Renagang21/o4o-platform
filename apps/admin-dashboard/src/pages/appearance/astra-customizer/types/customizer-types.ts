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
 * 헤더 설정
 */
export interface HeaderSettings {
  layout: 'header-main-layout-1' | 'header-main-layout-2' | 'header-main-layout-3';
  sticky: boolean;
  transparentHeader: boolean;
  
  // 헤더 섹션별 설정
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
 * 푸터 설정
 */
export interface FooterSettings {
  layout: 'footer-layout-1' | 'footer-layout-2' | 'footer-layout-3';
  
  // 위젯 영역
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
  
  // 하단 바
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
 * 블로그/아카이브 설정
 */
export interface BlogSettings {
  // 아카이브 페이지
  archive: {
    layout: 'blog-layout-1' | 'blog-layout-2' | 'blog-layout-3';
    columns: ResponsiveValue<number>;
    contentWidth: 'default' | 'narrow' | 'full';
    showFeaturedImage: boolean;
    imagePosition: 'top' | 'left' | 'right';
    imageSize: 'thumbnail' | 'medium' | 'large' | 'full';
    
    // 메타 정보
    meta: {
      showAuthor: boolean;
      showDate: boolean;
      showCategory: boolean;
      showComments: boolean;
      showReadTime: boolean;
    };
    
    // 요약
    excerpt: {
      length: number;
      readMoreText: string;
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
    };
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
  onSettingChange?: (section: keyof AstraCustomizerSettings, value: any) => void;
  onSave?: (settings: AstraCustomizerSettings) => Promise<void>;
  onPublish?: (settings: AstraCustomizerSettings) => Promise<void>;
  onReset?: () => void;
  onDeviceChange?: (device: PreviewDevice) => void;
}

// ============================================
// 유틸리티 타입
// ============================================

/**
 * Deep Partial 타입 (중첩된 객체도 부분적으로 만들기)
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 설정 섹션 키 타입
 */
export type SettingSection = keyof AstraCustomizerSettings;

/**
 * 설정 변경 액션 타입
 */
export interface SettingChangeAction {
  section: SettingSection;
  path: string[];
  value: any;
}
