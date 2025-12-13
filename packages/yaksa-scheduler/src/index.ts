/**
 * Yaksa Scheduler
 * Phase 19-A: Central Scheduler Infrastructure
 * Phase 19-B: Permitted State Automation Handlers
 *
 * Central scheduling service for Yaksa apps providing:
 * - Cron-based job scheduling
 * - Job execution logging
 * - Failure queue with retry logic
 * - Admin API for management
 * - Pre-built handlers for common automations
 */

// Manifest
export { manifest } from './manifest.js';

// Extension routes
export { createRoutes } from './extension.js';

// Backend exports
export * from './backend/entities/index.js';
export * from './backend/services/index.js';
export * from './backend/controllers/index.js';

// Job handlers (Phase 19-B)
export * from './handlers/index.js';

// Lifecycle hooks
export * from './lifecycle/index.js';
