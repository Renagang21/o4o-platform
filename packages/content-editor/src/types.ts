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
 * - full: CMS/상품 상세 등 풀 기능 (기본값)
 * - compact: 포럼/댓글 등 경량 입력
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
  /** 이미지 업로드 핸들러 — 파일 → URL 반환 */
  onImageUpload?: (file: File) => Promise<string>;
  /** 기존 이미지 목록 (선택 삽입용) */
  existingImages?: { id: string; url: string; label?: string }[];
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
}
