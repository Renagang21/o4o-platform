/**
 * LMS-Core
 *
 * Learning Management System core functionality
 *
 * @package @o4o/lms-core
 * @version 0.1.0
 */

// Manifest
export { manifest } from './manifest.js';
export { manifest as default } from './manifest.js';

// Backend entities and utils (imported directly by API server from src/)
export * from './entities/index.js';
export * from './utils/index.js';

// Entity list for TypeORM
import * as Entities from './entities/index.js';
export const entities = Object.values(Entities).filter(
  (item) => typeof item === 'function' && item.prototype
);
