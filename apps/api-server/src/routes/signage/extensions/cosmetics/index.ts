/**
 * Cosmetics Extension - Main Export
 *
 * WO-SIGNAGE-PHASE3-DEV-COSMETICS
 *
 * Digital Signage Cosmetics Extension Module
 * Provides brand-specific content management for cosmetics stores
 */

export * from './entities/index.js';
export * from './dto/index.js';
export * from './repositories/cosmetics.repository.js';
export * from './services/cosmetics.service.js';
export * from './controllers/cosmetics.controller.js';
export { createCosmeticsRouter } from './cosmetics.routes.js';
