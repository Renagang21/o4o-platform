/**
 * Forum Cosmetics Backend
 *
 * Exports all backend components for the cosmetics forum extension.
 */

// Entities
export * from './entities/index.js';

// Services
export * from './services/index.js';

// Controllers
export * from './controllers/index.js';

// Routes
export { createCosmeticsForumRoutes, createCosmeticsSearchRoutes } from './routes/index.js';
