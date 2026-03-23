/**
 * AppManager — Shared types & constants
 *
 * WO-O4O-APP-MANAGER-SERVICE-SPLIT-V1
 * Extracted from AppManager.ts
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Package mapping: appId -> package folder name
 * Used to resolve lifecycle hook paths
 */
export const PACKAGE_MAP: Record<string, string> = {
  'forum': 'forum-app',
  'forum-core': 'forum-app',
  'forum-yaksa': 'forum-yaksa',
  'lms-core': 'lms-core',
  'organization-core': 'organization-core',
  'organization-forum': 'organization-forum',
  'dropshipping': 'dropshipping-core',
  'dropshipping-core': 'dropshipping-core',
  'dropshipping-cosmetics': 'dropshipping-cosmetics',
  'membership-yaksa': 'membership-yaksa',
  'sellerops': 'sellerops',
  'supplierops': 'supplierops',
  'cms-core': 'cms-core',
  'market-trial': 'market-trial',
};

/**
 * Root path to packages directory
 * Resolved from app-manager/ subdirectory
 */
export const PACKAGES_ROOT = resolve(__dirname, '../../../../../packages');
