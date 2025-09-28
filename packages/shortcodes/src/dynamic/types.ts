/**
 * Dynamic Shortcode Types
 * CPT/ACF/Meta 데이터 접근을 위한 동적 shortcode 타입 정의
 */

export interface DynamicShortcodeContext {
  postId?: string;
  postType?: string;
  userId?: string;
  siteUrl?: string;
  apiUrl?: string;
  currentPath?: string;
}

export interface CPTListShortcodeAttributes {
  type: string;           // CPT slug (e.g., 'ds_product')
  count?: number;         // 표시할 개수
  orderby?: 'date' | 'title' | 'menu_order' | 'rand';
  order?: 'ASC' | 'DESC';
  meta_key?: string;      // 메타 필드로 필터링
  meta_value?: string;
  status?: 'publish' | 'draft' | 'private' | 'any';
  template?: 'default' | 'grid' | 'list' | 'card';
  columns?: number;       // 그리드 레이아웃 컬럼 수
  show_thumbnail?: boolean;
  show_excerpt?: boolean;
  show_meta?: boolean;
  cache?: boolean;        // 캐싱 여부
}

export interface CPTFieldShortcodeAttributes {
  post_type?: string;     // CPT slug
  post_id?: string;       // 특정 포스트 ID (없으면 현재 포스트)
  field: string;          // 필드명 (title, content, excerpt, date, author 등)
  format?: string;        // 출력 포맷
  default?: string;       // 기본값
  wrapper?: string;       // HTML wrapper tag
  class?: string;         // CSS class
}

export interface ACFFieldShortcodeAttributes {
  name: string;           // ACF 필드명
  post_id?: string;       // 포스트 ID (없으면 현재 포스트)
  format?: 'raw' | 'formatted' | 'html';
  default?: string;
  type?: string;          // 필드 타입 힌트 (image, date, currency 등)
  size?: string;          // 이미지 사이즈 (thumbnail, medium, large, full)
  separator?: string;     // 배열 필드 구분자
  wrapper?: string;
  class?: string;
}

export interface MetaFieldShortcodeAttributes {
  key: string;            // 메타 키
  post_id?: string;       // 포스트 ID
  format?: string;        // 출력 포맷
  default?: string;
  single?: boolean;       // get_post_meta의 single 파라미터
  wrapper?: string;
  class?: string;
}

export interface ConditionalShortcodeAttributes {
  field?: string;         // 체크할 필드명
  value?: string;         // 비교할 값
  operator?: 'equals' | 'not_equals' | 'greater' | 'less' | 'contains' | 'empty' | 'not_empty';
  type?: 'acf' | 'meta' | 'cpt';
}

// CPT 포스트 데이터 타입
export interface CPTPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  featuredImage?: string;
  author?: {
    id: string;
    name: string;
    email?: string;
  };
  date: string;
  modified: string;
  status: string;
  meta?: Record<string, any>;
  acf?: Record<string, any>;
  taxonomies?: {
    categories?: string[];
    tags?: string[];
    [key: string]: string[] | undefined;
  };
}

// ACF 필드 값 타입
export interface ACFFieldValue {
  value: any;
  type: string;
  formatted?: string;
  label?: string;
  choices?: Array<{ value: string; label: string }>;
}

// 동적 데이터 로더 인터페이스
export interface DynamicDataLoader {
  loadCPTList(params: CPTListShortcodeAttributes): Promise<CPTPost[]>;
  loadCPTField(params: CPTFieldShortcodeAttributes): Promise<any>;
  loadACFField(params: ACFFieldShortcodeAttributes): Promise<ACFFieldValue>;
  loadMetaField(params: MetaFieldShortcodeAttributes): Promise<any>;
  evaluateCondition(params: ConditionalShortcodeAttributes): Promise<boolean>;
}

// 포맷터 타입
export type FieldFormatter = (value: any, format?: string) => string;

export interface FieldFormatters {
  date: FieldFormatter;
  currency: FieldFormatter;
  number: FieldFormatter;
  boolean: FieldFormatter;
  array: FieldFormatter;
  image: FieldFormatter;
  url: FieldFormatter;
  email: FieldFormatter;
  phone: FieldFormatter;
  default: FieldFormatter;
}

// 템플릿 렌더러 타입
export type TemplateRenderer = (posts: CPTPost[], attributes: CPTListShortcodeAttributes) => React.ReactElement;

export interface ListTemplates {
  default: TemplateRenderer;
  grid: TemplateRenderer;
  list: TemplateRenderer;
  card: TemplateRenderer;
  [key: string]: TemplateRenderer;
}

// 캐시 설정
export interface CacheConfig {
  enabled: boolean;
  ttl: number;           // Time to live in seconds
  key: (params: any) => string;
}

// 에러 처리
export interface DynamicShortcodeError {
  code: string;
  message: string;
  shortcode: string;
  attributes?: Record<string, any>;
}

// 권한 체크
export interface PermissionChecker {
  canViewPost(postId: string, userId?: string): Promise<boolean>;
  canViewField(fieldName: string, postType: string, userId?: string): Promise<boolean>;
}