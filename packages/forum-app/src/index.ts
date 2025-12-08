// Backend exports (compiled)
export * from './backend/entities/index.js';

// Backend types and DTOs
export * from './backend/types/index.js';

// Manifest export
export { forumManifest } from './manifest.js';
export { default } from './manifest.js';

// Public UI exports (templates and components for public-facing pages)
// Note: Re-export specific items to avoid naming conflicts with entities
export {
  ForumBlockRenderer,
  type ForumBlockRendererProps,
  CommentSection,
  type CommentSectionProps,
} from './public-ui/components/index.js';

// Template exports with aliased names to avoid conflicts
export {
  ForumHomeTemplate,
  type ForumHomeTemplateProps,
  type ForumHomeData,
  PostListTemplate,
  type PostListTemplateProps,
  type PostListData,
  type PostListPagination,
  PostSingleTemplate,
  type PostSingleTemplateProps,
  type PostSingleData,
  type ForumPostFull,
  type ForumAuthor,
  CategoryArchiveTemplate,
  type CategoryArchiveTemplateProps,
  type CategoryArchiveData,
} from './templates/index.js';

// Re-export template types with 'Template' prefix to avoid conflicts
export type { ForumCategory as ForumCategoryTemplate } from './templates/ForumHome.js';
export type { ForumPostSummary as ForumPostSummaryTemplate } from './templates/ForumHome.js';
export type { ForumComment as ForumCommentTemplate } from './public-ui/components/CommentSection.js';

// Note: Admin UI components and services are source-only and imported directly via:
// import('@o4o-apps/forum/src/admin-ui/pages/ComponentName')
// import from '@o4o-apps/forum/src/backend/services/forum.service'
