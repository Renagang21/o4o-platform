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

// Backend exports (compiled)
export * from './backend/entities/index.js';

// Backend types and DTOs
export * from './backend/types/index.js';

// Backend services
export * from './backend/services/index.js';

// Backend controllers
export * from './backend/controllers/index.js';

// Backend utils
export * from './backend/utils/index.js';

// Manifest export
export { forumManifest, manifest, default as manifestDefault } from './manifest.js';

// Entity list for TypeORM
import * as Entities from './backend/entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);

// Import route factories
import { createSearchRoutes } from './backend/routes/index.js';

/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource?: DataSource | any): Router {
  const router = Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', app: 'forum-core' });
  });

  // Mount search routes if dataSource is provided
  if (dataSource) {
    try {
      const searchRoutes = createSearchRoutes(dataSource);
      router.use('/search', searchRoutes);
    } catch (error) {
      console.error('[forum-app] Failed to initialize search routes:', error);
    }
  }

  return router;
}

// Alias for manifest compatibility
export const createRoutes = routes;

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
// import('@o4o/forum-core/src/admin-ui/pages/ComponentName')
// import from '@o4o/forum-core/src/backend/services/forum.service'
