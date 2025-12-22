/**
 * Forum Templates
 *
 * Public-facing templates for forum pages.
 * These templates are used by the CMS routing system to render forum content.
 */

// Forum Home Template
export { ForumHomeTemplate } from './ForumHome.js';
export type {
  ForumHomeTemplateProps,
  ForumHomeData,
  ForumCategory,
  ForumPostSummary,
} from './ForumHome.js';

// Post List Template
export { PostListTemplate } from './PostList.js';
export type {
  PostListTemplateProps,
  PostListData,
  PostListPagination,
} from './PostList.js';

// Post Single Template
export { PostSingleTemplate } from './PostSingle.js';
export type {
  PostSingleTemplateProps,
  PostSingleData,
  ForumPostFull,
  ForumAuthor,
} from './PostSingle.js';

// Category Archive Template
export { CategoryArchiveTemplate } from './CategoryArchive.js';
export type {
  CategoryArchiveTemplateProps,
  CategoryArchiveData,
} from './CategoryArchive.js';
