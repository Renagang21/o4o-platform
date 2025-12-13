/**
 * User Entity Re-export
 *
 * The canonical User entity is located in src/modules/auth/entities/User.ts
 * This file re-exports it for backward compatibility with existing imports.
 */
export * from '../modules/auth/entities/User.js';
export { User as default } from '../modules/auth/entities/User.js';
