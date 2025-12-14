/**
 * @o4o/ecommerce-core
 *
 * E-commerce Core Engine
 * 판매 원장(Source of Truth) - 주문/결제/판매유형 통합 관리
 *
 * @packageDocumentation
 */

// Manifest
export { ecommerceCoreManifest, manifest } from './manifest.js';

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Hooks & Events
export * from './hooks/index.js';

// Lifecycle
export * from './lifecycle/index.js';

// Backend Module (ModuleLoader용)
export { createRoutes, entities as backendEntities, services as backendServices } from './backend/index.js';
