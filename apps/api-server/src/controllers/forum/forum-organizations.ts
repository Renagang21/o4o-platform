/**
 * Forum Service Organization ID Constants
 *
 * WO-O4O-FORUM-ORGANIZATION-MAPPING-IMPLEMENTATION-V1
 *
 * Fixed UUIDs matching the seeded records in the `organizations` table.
 * Migration: 2026020400002-SeedForumServiceOrganizations
 *
 * These IDs are injected via forumContextMiddleware in each service's routes.
 *
 * WO-O4O-FORUM-ORGS-INVALID-UUID-HOTFIX-V1:
 *   기존 값 'a1b2c3d4-0001-4000-a000-forum00000001' 은 PostgreSQL UUID 형식 위반
 *   (비-hex 문자 f,o,r,u,m + 마지막 세그먼트 13자). production INSERT 실패로
 *   organizations row 가 생성되지 않았고, 모든 forum/posts 조회가 500 (invalid input syntax).
 *   유효한 hex UUID 로 교체. 시각적 흔적 "91c0fa80" (glycofa) 유지.
 */
export const FORUM_ORGS = {
  GLYCOPHARM: 'a1b2c3d4-0001-4000-a000-91c0fa800001',
} as const;
