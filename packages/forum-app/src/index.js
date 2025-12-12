/**
 * Forum-Core
 *
 * 커뮤니티 포럼 코어 엔진 (Core Domain)
 *
 * @package @o4o/forum-app
 * @version 1.0.0
 */
import { Router } from 'express';
// Backend exports (compiled)
export * from './backend/entities/index.js';
// Backend types and DTOs
export * from './backend/types/index.js';
// Manifest export
export { forumManifest, manifest, default as manifestDefault } from './manifest.js';
// Entity list for TypeORM
import * as Entities from './backend/entities/index.js';
export const entities = Object.values(Entities).filter((item) => typeof item === 'function' && item.prototype);
/**
 * Routes factory compatible with Module Loader
 *
 * @param dataSource - TypeORM DataSource from API server
 */
export function routes(dataSource) {
    const router = Router();
    // TODO: Implement actual routes using controllers
    router.get('/health', (req, res) => {
        res.json({ status: 'ok', app: 'forum-core' });
    });
    return router;
}
// Alias for manifest compatibility
export const createRoutes = routes;
// Public UI exports (templates and components for public-facing pages)
// Note: Re-export specific items to avoid naming conflicts with entities
export { ForumBlockRenderer, CommentSection, } from './public-ui/components/index.js';
// Template exports with aliased names to avoid conflicts
export { ForumHomeTemplate, PostListTemplate, PostSingleTemplate, CategoryArchiveTemplate, } from './templates/index.js';
// Note: Admin UI components and services are source-only and imported directly via:
// import('@o4o-apps/forum/src/admin-ui/pages/ComponentName')
// import from '@o4o-apps/forum/src/backend/services/forum.service'
//# sourceMappingURL=index.js.map