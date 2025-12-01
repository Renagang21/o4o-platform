/**
 * Organization-Core
 *
 * 전사 조직 관리 시스템 (Core Domain)
 *
 * @package @o4o/organization-core
 * @version 1.0.0
 */

// Manifest
export { manifest } from './manifest.js';
export { manifest as default } from './manifest.js';

// Types (needed by manifest)
export * from './types/index.js';

// Backend code (imported directly by API server from src/)
// export * from './entities';
// export * from './services';
// export * from './controllers';
// export * from './lifecycle';
// export * from './guards';
// export * from './utils';
