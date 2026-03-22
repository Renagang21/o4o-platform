/**
 * CMS Content Utilities — Shared types and constants
 *
 * WO-O4O-CMS-CONTENT-ROUTES-SPLIT-V1
 * Extracted from cms-content.routes.ts
 */

// WO-O4O-CMS-VISIBILITY-EXTENSION-PHASE1-V1: local type aliases (matches CmsContent entity)
export type ContentAuthorRole = 'admin' | 'service_admin' | 'supplier' | 'community';
export type ContentVisibilityScope = 'platform' | 'service' | 'organization';

// Supported content types — used in POST and PUT validation
export const VALID_CONTENT_TYPES = ['hero', 'notice', 'guide', 'knowledge'] as const;
