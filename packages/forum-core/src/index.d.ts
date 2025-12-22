/**
 * Forum-Core
 *
 * 커뮤니티 포럼 코어 엔진 (Core Domain)
 *
 * @package @o4o/forum-app
 * @version 1.0.0
 */
import { Router } from 'express';
import type { DataSource } from 'typeorm';
export * from './backend/entities/index.js';
export * from './backend/types/index.js';
export { forumManifest, manifest, default as manifestDefault } from './manifest.js';
import * as Entities from './backend/entities/index.js';
export declare const entities: (typeof Entities.ForumCategory | typeof Entities.ForumPost | typeof Entities.PostType | typeof Entities.PostStatus | typeof Entities.ForumComment | typeof Entities.CommentStatus | typeof Entities.ForumTag)[];
/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export declare function routes(dataSource?: DataSource | any): Router;
export declare const createRoutes: typeof routes;
export { ForumBlockRenderer, type ForumBlockRendererProps, CommentSection, type CommentSectionProps, } from './public-ui/components/index.js';
export { ForumHomeTemplate, type ForumHomeTemplateProps, type ForumHomeData, PostListTemplate, type PostListTemplateProps, type PostListData, type PostListPagination, PostSingleTemplate, type PostSingleTemplateProps, type PostSingleData, type ForumPostFull, type ForumAuthor, CategoryArchiveTemplate, type CategoryArchiveTemplateProps, type CategoryArchiveData, } from './templates/index.js';
export type { ForumCategory as ForumCategoryTemplate } from './templates/ForumHome.js';
export type { ForumPostSummary as ForumPostSummaryTemplate } from './templates/ForumHome.js';
export type { ForumComment as ForumCommentTemplate } from './public-ui/components/CommentSection.js';
//# sourceMappingURL=index.d.ts.map