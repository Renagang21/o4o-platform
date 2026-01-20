/**
 * Signage Extension - Common Module Exports
 *
 * WO-SIGNAGE-PHASE3-DEV-FOUNDATION
 *
 * 모든 Extension에서 사용하는 공통 모듈 re-export
 */

// Types
export * from './extension.types.js';

// Config
export {
  extensionRegistry,
  isExtensionEnabled,
  isExtensionFeatureEnabled,
  canForceContent,
  canUseAiGeneration,
  canSelfEdit,
} from './extension.config.js';

// Guards
export {
  ExtensionRoles,
  requireExtensionEnabled,
  requireExtensionOperator,
  requireExtensionStore,
  allowExtensionStoreRead,
  requireSellerPartner,
  requireSellerAdmin,
  createExtensionGuards,
} from './extension.guards.js';

// Adapter
export { CoreExtensionAdapter, createCoreAdapter } from './extension.adapter.js';

// Router
export {
  createExtensionRouter,
  applyGuards,
  registerExtensionRoutes,
  sendExtensionSuccess,
  sendExtensionList,
  sendExtensionError,
} from './extension.router.js';
export type {
  ExtensionRequest,
  ExtensionRouterOptions,
  ExtensionRouteHandler,
  ExtensionRouteDefinition,
} from './extension.router.js';
