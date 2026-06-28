/**
 * @o4o/content-editor
 * Rich text content editor for O4O Platform
 */

// WO-O4O-LMS-LESSON-AI-ASSIST-V1: AiContentModal 외부 export 추가 (LessonModal 직접 mount용)
export { RichTextEditor, Toolbar, ContentPreview, ContentRenderer, TemplateModal, SaveTemplateModal, AiContentModal } from './components';
export { sanitizeHtml, sanitizeRichHtml, isBlankHtml } from './sanitize';
export { handleClipboardPaste, compressImage } from './utils/handleImagePaste';
// WO-O4O-STANDARD-EDITOR-TEMPLATE-PURPOSE-CATEGORY-V1: 고정 분류 상수/헬퍼
export { TEMPLATE_CATEGORIES, templateCategoryLabel, normalizeTemplateCategory } from './types';
export type {
  ContentEditorProps,
  EditorContent,
  EditorPreset,
  ImageUploadConfig,
  VideoEmbedConfig,
  EditorConfig,
  ContentTemplate,
  TemplateCategoryDef,
} from './types';
