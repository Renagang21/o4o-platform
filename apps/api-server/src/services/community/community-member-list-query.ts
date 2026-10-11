/** Bounded, literal name search for community-scoped member lists. */
export interface CommunityMemberListQuery {
  q: string;
  page: number;
  pageSize: number;
  status?: string;
  paginate?: boolean;
}
export class CommunityMemberListQueryError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
export function parseCommunityMemberListQuery(
  query: Record<string, unknown>, statuses: readonly string[],
): CommunityMemberListQuery {
  const invalid = () => new CommunityMemberListQueryError('INVALID_QUERY', '검색어 또는 페이지 조건을 확인하세요.');
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) throw invalid();
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n > max) throw invalid();
    return n;
  };
  if (query.q !== undefined && (typeof query.q !== 'string' || query.q.trim().length > 100)) throw invalid();
  const status = query.status === undefined || query.status === '' ? undefined : query.status;
  if (status !== undefined && (typeof status !== 'string' || !statuses.includes(status))) {
    throw new CommunityMemberListQueryError('INVALID_STATUS', '알 수 없는 가입 상태입니다.');
  }
  return { q: typeof query.q === 'string' ? query.q.trim() : '', page: integer(query.page, 1, 1000000),
    pageSize: integer(query.pageSize, 20, 100), paginate: query.page !== undefined || query.pageSize !== undefined, status: status as string | undefined };
}
export const DEFAULT_MEMBER_LIST_QUERY: CommunityMemberListQuery = { q: '', page: 1, pageSize: 20, paginate: true };
export function communityMemberListFilter(params: unknown[], query: CommunityMemberListQuery): string {
  let filter = '';
  if (query.status) { params.push(query.status); filter += ` AND cm.status = $${params.length}`; }
  if (query.q) {
    params.push(`%${query.q.replace(/[\\%_]/g, '\\$&')}%`);
    filter += ` AND u.name ILIKE $${params.length} ESCAPE E'\\\\'`;
  }
  return filter;
}
export function communityMemberPagination(total: number, query: CommunityMemberListQuery) {
  if (query.paginate === false) return { total, totalPages: 1, page: 1, pageSize: Math.max(20, total) };
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  return { total, totalPages, page: Math.min(query.page, totalPages), pageSize: query.pageSize };
}
