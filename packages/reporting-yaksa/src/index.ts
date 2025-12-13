/**
 * Reporting-Yaksa Extension App
 *
 * 약사회 신상신고 시스템
 *
 * @package @o4o/reporting-yaksa
 * @version 1.0.0
 */

// Manifest
export { reportingYaksaManifest, reportingYaksaManifest as manifest } from './manifest.js';
export { reportingYaksaManifest as default } from './manifest.js';

// Lifecycle
export * from './lifecycle/index.js';

// Backend
export * from './backend/index.js';

// Types
export * from './types/index.js';

// Frontend (Admin UI)
export * from './frontend/index.js';

// Re-export createRoutes from backend/routes
export { createReportingRoutes as createRoutes } from './backend/routes/index.js';
