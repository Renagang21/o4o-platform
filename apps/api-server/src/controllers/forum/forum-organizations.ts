/**
 * Forum Service Organization ID Constants
 *
 * WO-O4O-FORUM-ORGANIZATION-MAPPING-IMPLEMENTATION-V1
 *
 * Fixed UUIDs matching the seeded records in the `organizations` table.
 * Migration: 2026020400002-SeedForumServiceOrganizations
 *
 * These IDs are injected via forumContextMiddleware in each service's routes.
 */
export const FORUM_ORGS = {
  GLYCOPHARM: 'a1b2c3d4-0001-4000-a000-forum00000001',
} as const;
