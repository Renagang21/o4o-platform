/**
 * Organization-Forum Integration Extension
 *
 * Provides seamless integration between organization-core and forum-app.
 *
 * Features:
 * - Auto-create forum categories on organization creation
 * - Organization-scoped forum permissions
 * - Hierarchical forum access control
 *
 * @package @o4o-extensions/organization-forum
 * @version 0.1.0
 */

// Manifest
export { manifest } from './manifest.js';
export { manifest as default } from './manifest.js';

// Backend code (imported directly by API server from src/)
// export { OrganizationForumService } from './services/OrganizationForumService.js';
// export { onInstall, onUninstall } from './lifecycle/install.js';
