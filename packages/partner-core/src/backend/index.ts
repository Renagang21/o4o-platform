/**
 * Partner Core Backend Exports
 *
 * ModuleLoader를 위한 백엔드 통합 export
 *
 * @package @o4o/partner-core
 */

// Entities
export * from '../entities/index.js';

// Services
export * from '../services/index.js';

// Extension System
export * from '../partner-extension.js';

// Lifecycle Hooks
export * from '../lifecycle/index.js';

// Manifest
export { partnerCoreManifest } from '../manifest.js';
