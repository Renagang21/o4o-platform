/**
 * Content Editor Types
 * @o4o/content-editor
 */

export interface EditorContent {
  html: string;
  json?: Record<string, unknown>;
}

/**
 * Toolbar preset — 용도별 버튼 구성
 * - full: 표준 편집기 (기본값) — 모든 기능 포함 (AI, 이미지, 동영상, 서식, HTML 탭)
 * - compact: 경량 입력 전용 (포럼 댓글 등) — 기본 서식만, HTML 탭 없음
 *
 * 용도별(guide/lesson/store/blog 등) 분리 preset은 사용하지 않는다.
 * 기능 차이는 저장 대상·AI context·props로 구분한다.
 */
export type EditorPreset = 'full' | 'compact';

export interface ContentEditorProps {
  /** 초기 HTML 콘텐츠 */
  value?: string;
  /** 콘텐츠 변경 시 콜백 */
  onChange?: (content: EditorContent) => void;
  /** 저장 콜백 */
  onSave?: (content: EditorContent) => void;
  /** 플레이스홀더 텍스트 */
  placeholder?: string;
  /** 편집 가능 여부 */
  editable?: boolean;
  /** 자동 저장 간격 (ms), 0이면 비활성화 */
  autoSaveInterval?: number;
  /** 에디터 높이 */
  minHeight?: string;
  /** 클래스명 */
  className?: string;
  /** Toolbar preset (기본: 'full') */
  preset?: EditorPreset;
  /** 템플릿 기능 활성화 (기본: false) */
  showTemplateActions?: boolean;
  /**
   * WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1:
   *   편집기 사용 화면의 용도 분류 (product / qr_code / pop / general).
   *   불러오기 모달의 분류 탭 자동선택 + 저장 모달의 용도 기본선택에 사용.
   *   미전달 시 불러오기='전체', 저장 기본='general'(기타). 다른 분류 수동 선택은 항상 가능.
   */
  templateCategory?: string;
  /** 템플릿 목록 */
  templates?: ContentTemplate[];
  /** 템플릿 로딩 콜백 (모달 열릴 때 호출) */
  onLoadTemplates?: () => void;
  /** 템플릿 저장 콜백 (isPublic은 operator/admin만 true 가능) */
  onSaveAsTemplate?: (name: string, category: string, isPublic: boolean) => void;
  /** 공용 템플릿 생성 권한 여부 (operator/admin) */
  canCreatePublicTemplate?: boolean;
  /** 템플릿 목록 로딩 중 */
  templatesLoading?: boolean;
  /** 템플릿 저장 중 */
  templatesSaving?: boolean;
  /** 템플릿 사용 기록 콜백 (fire-and-forget) */
  onUseTemplate?: (templateId: string) => void;
  /** 이미지 업로드 핸들러 — 파일 → URL 반환 */
  onImageUpload?: (file: File) => Promise<string>;
  /** 기존 이미지 목록 (선택 삽입용) */
  existingImages?: { id: string; url: string; label?: string }[];
  /** WO-NETURE-DESCRIPTION-IMAGE-MEDIA-LIBRARY-INTEGRATION-V1:
   *  공용 미디어 라이브러리 선택 콜백.
   *  호출 시 insertImage 함수를 받아 부모가 picker를 열고, 선택 완료 시 insertImage(url)로 에디터에 삽입. */
  onMediaLibraryPick?: (insertImage: (url: string) => void) => void;
  /**
   * WO-O4O-CONTENT-EDITOR-AI-AUTH-HEADERS-V1: AI API 요청 추가 헤더.
   * - AI fetch 호출 시 headers에 병합됨 (Authorization: Bearer 등)
   * - 미제공 시 credentials: 'include' fallback 유지
   */
  aiRequestHeaders?: Record<string, string>;
  /**
   * WO-O4O-AI-CONTENT-COMMUNITY-SAVE-INTEGRATION-V1: AI 결과를 커뮤니티(포럼)에 저장 버튼 표시.
   * - true 시 AiContentModal에 "커뮤니티 저장" 버튼 활성화
   */
  showCommunitySave?: boolean;
  /**
   * WO-O4O-AI-STORE-CONTENT-DIRECT-SAVE-V1: AI 결과를 내 매장 콘텐츠로 저장 버튼 표시.
   * - true 시 AiContentModal에 "내 매장 저장" 버튼 활성화 (store owner 전용)
   * - API 403 시 오류 메시지 표시 (store owner가 아닌 경우)
   */
  showStoreSave?: boolean;
}

export interface ToolbarProps {
  editor: any; // TipTap Editor instance
}

export interface ImageUploadConfig {
  /** 이미지 업로드 핸들러 */
  onUpload?: (file: File) => Promise<string>;
  /** 최대 파일 크기 (bytes) */
  maxSize?: number;
  /** 허용 파일 타입 */
  acceptedTypes?: string[];
}

export interface VideoEmbedConfig {
  /** 지원 플랫폼 */
  platforms: ('youtube' | 'vimeo')[];
  /** 기본 비디오 크기 */
  defaultWidth?: number;
  defaultHeight?: number;
}

export interface EditorConfig {
  image?: ImageUploadConfig;
  video?: VideoEmbedConfig;
}

/**
 * Content Template — 저장된 HTML 콘텐츠 템플릿
 * WO-O4O-CONTENT-TEMPLATE-SYSTEM-V1
 */
export interface ContentTemplate {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  contentHtml: string;
  isPublic?: boolean;
  usageCount?: number;
  lastUsedAt?: string | null;
}

/**
 * 템플릿 용도 분류 (고정) — WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1
 *
 * 자유 입력이 아닌 고정 분류. 향후 용도 추가는 이 배열에만 항목을 더한다.
 * 내부 코드(code)는 `content_templates.category`(기존 컬럼) 값과 동일하게 저장한다.
 */
export interface TemplateCategoryDef {
  /** 내부 코드 — DB category 컬럼 값 */
  code: string;
  /** 화면 명칭 */
  label: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategoryDef[] = [
  { code: 'product', label: '상품' },
  { code: 'qr_code', label: 'QR 코드' },
  { code: 'pop', label: 'POP' },
  { code: 'general', label: '기타' },
];

const TEMPLATE_CATEGORY_CODES = TEMPLATE_CATEGORIES.map((c) => c.code);

/** code → 화면 명칭 (미정의/legacy code 는 '기타') */
export function templateCategoryLabel(code: string | null | undefined): string {
  const found = TEMPLATE_CATEGORIES.find((c) => c.code === code);
  return found ? found.label : '기타';
}

/**
 * 분류값 정규화 — 고정 분류(product/qr_code/pop/general)가 아니면 'general'(기타)로 취급.
 * 기존(notice/guide/email/forum 등) 또는 분류값 없는 템플릿 호환 처리(§10).
 * 원본 템플릿 데이터는 변경하지 않고 표시·필터 단계에서만 정규화한다.
 */
export function normalizeTemplateCategory(category: string | null | undefined): string {
  return category && TEMPLATE_CATEGORY_CODES.includes(category) ? category : 'general';
}
