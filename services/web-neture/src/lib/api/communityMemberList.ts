export interface CommunityMemberListOptions { q?: string; page?: number; pageSize?: number; status?: string }
export interface CommunityMemberPagination { page: number; pageSize: number; total: number; totalPages: number }
export interface CommunityMemberPage<T> { rows: T[]; pagination: CommunityMemberPagination }
/** Old serving API revisions omit metadata during rollout; preserve their existing rows. */
export function communityMemberPage<T>(rows: T[], pagination?: CommunityMemberPagination): CommunityMemberPage<T> {
  return { rows, pagination: pagination ?? { page: 1, pageSize: Math.max(20, rows.length), total: rows.length, totalPages: 1 } };
}
