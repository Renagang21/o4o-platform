/**
 * FROZEN CORE PACKAGE
 * Baseline: o4o-operator-os-baseline-v1
 * Structural changes require explicit Work Order.
 *
 * @o4o/asset-copy-core
 *
 * Platform-level Asset Copy Engine.
 * Provides Entity, Service, Interfaces, and Controller Factory.
 *
 * WO-O4O-ASSET-COPY-CORE-EXTRACTION-V1
 *
 * Usage:
 *   import { createAssetCopyController, AssetCopyService } from '@o4o/asset-copy-core';
 *   import { AssetSnapshot } from '@o4o/asset-copy-core/entities';
 */

// Entity
export { AssetSnapshot } from './entities/asset-snapshot.entity.js';

// Service
export { AssetCopyService } from './services/asset-copy.service.js';
export type {
  CopyAssetInput,
  CopyResolvedInput,
  CopyResult,
  ListOptions,
  PaginatedResult,
} from './services/asset-copy.service.js';

// Interfaces
export type { ContentResolver, ResolvedContent } from './interfaces/content-resolver.interface.js';
export type { AssetCopyControllerConfig } from './interfaces/controller-config.interface.js';
export type { PermissionChecker } from './interfaces/permission-checker.interface.js';
export { DefaultPermissionChecker } from './interfaces/permission-checker.interface.js';

// Resolver Base
export { BaseResolver } from './resolver/base-resolver.js';

// Controller Factory
export { createAssetCopyController } from './factory/create-asset-copy-controller.js';
