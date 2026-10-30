import type { createServiceApprovalApi, ServiceApprovalItem } from './serviceApproval';

type ServiceApprovalListParams = NonNullable<Parameters<ReturnType<typeof createServiceApprovalApi>['operatorServiceApprovalApi']['list']>[0]>;

export interface ServiceApprovalFilters {
  statusFilter: string;
  serviceFilter: string;
  searchQuery: string;
  dateFrom: string;
  dateTo: string;
  scoreRange: '' | 'low' | 'mid' | 'high';
  filterHasIssues: boolean;
  priorityFilter: '' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/** 화면 필터를 기존 목록 API 계약으로 변환한다. 검색/기간 값은 정규화하지 않는다. */
export function buildServiceApprovalListParams(filters: ServiceApprovalFilters, page = 1): ServiceApprovalListParams {
  const { statusFilter, serviceFilter, searchQuery, dateFrom, dateTo, scoreRange, filterHasIssues, priorityFilter } = filters;
  const scoreParams: { minScore?: number; maxScore?: number } =
    scoreRange === 'low' ? { minScore: 0, maxScore: 59 }
    : scoreRange === 'mid' ? { minScore: 60, maxScore: 79 }
    : scoreRange === 'high' ? { minScore: 80 }
    : {};
  return {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    serviceKey: serviceFilter || undefined,
    search: searchQuery || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit: 30,
    ...scoreParams,
    hasIssues: filterHasIssues ? 'true' : undefined,
    priority: priorityFilter || undefined,
  };
}

/** 현재 목록에서 pending인 승인 레코드만 반환한다. offerId와 혼동하지 않는다. */
export function getSelectedPendingServiceApprovalIds(
  items: readonly ServiceApprovalItem[],
  selectedIds: ReadonlySet<string>,
): string[] {
  return [...selectedIds].filter(id => items.find(item => item.id === id)?.approvalStatus === 'pending');
}
