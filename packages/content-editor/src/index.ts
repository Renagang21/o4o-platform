/**
 * @o4o/content-editor
 * Rich text content editor for O4O Platform
 */

// WO-O4O-LMS-LESSON-AI-ASSIST-V1: AiContentModal 외부 export 추가 (LessonModal 직접 mount용)
export { RichTextEditor, Toolbar, ContentPreview, ContentRenderer, TemplateModal, SaveTemplateModal, AiContentModal } from './components';
// WO-O4O-TABLET-CONTENT-RENDERER-VARIANT-FIX-V1: 설명서/일반 콘텐츠가 섞이는 슬롯의 variant 판별
export { hasStoreDescriptionMarkup } from './components';
// WO-O4O-SCREEN-SET-CORNER-CONTENT-FREE-AUTHORING-AND-LLM-ASSIST-V1:
//   공용 LLM 작업 보조 패널(복사/붙여넣기 안내 전용 — LLM API 호출·계정 연동·대화 저장 없음)
export { LlmAssistPanel } from './components';
export type { LlmAssistPanelProps } from './components';
export { sanitizeHtml, sanitizeRichHtml, isBlankHtml } from './sanitize';
export { handleClipboardPaste, compressImage } from './utils/handleImagePaste';
// WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1: 고정 분류 상수/헬퍼
export { TEMPLATE_CATEGORIES, templateCategoryLabel, normalizeTemplateCategory } from './types';
export type {
  ContentEditorProps,
  EditorContent,
  MediaInsert,
  EditorPreset,
  ImageUploadConfig,
  VideoEmbedConfig,
  EditorConfig,
  ContentTemplate,
  TemplateCategoryDef,
} from './types';
