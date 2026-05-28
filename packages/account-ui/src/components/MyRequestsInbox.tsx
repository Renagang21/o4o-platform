/**
 * MyRequestsInbox
 *
 * WO-O4O-MYPAGE-MY-REQUESTS-INBOX-COMPONENT-V1
 *
 * 통합 신청함 공통 컴포넌트.
 * 데이터 fetch / merge 는 호출 측(서비스 페이지)이 담당한다.
 * 이 컴포넌트는 렌더링 전담.
 *
 * canonical reference: KPA-Society MyRequestsPage
 */

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Loader2,
  AlertCircle,
  Inbox,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import { RequestStatusBadge } from './RequestStatusBadge.js';
import { RequestTypeBadge } from './RequestTypeBadge.js';
import type { RequestStatusConfig } from './RequestStatusBadge.js';
import type { RequestTypeConfig } from './RequestTypeBadge.js';

// ============================================================================
// Types
// ============================================================================

export type MyRequestEntityType =
  | 'forum_category'
  | 'forum_delete'
  | 'course'
  | 'course_enrollment'
  | 'instructor_qualification'
  | 'membership'
  | 'service_application'
  | 'store_application'
  | 'partner_application'
  | 'other'
  | string;

export type MyRequestStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'cancelled'
  | 'revoked'
  | 'in_progress'
  | 'completed'
  | string;

export interface MyRequestItem {
  id: string;
  entityType: MyRequestEntityType;
  status: MyRequestStatus;
  displayTitle: string;
  displayDescription?: string | null;
  reviewComment?: string | null;
  revisionNote?: string | null;
  reviewedAt?: string | null;
  resultEntityId?: string | null;
  resultMetadata?: Record<string, unknown> | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  href?: string;
  serviceKey?: string;
  payload?: Record<string, unknown>;
}

export interface MyRequestTypeFilterTab {
  key: string;
  label: string;
  entityTypes?: string[];
}

export interface MyRequestsInboxProps {
  items: MyRequestItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  typeFilters?: MyRequestTypeFilterTab[];
  statusOverrides?: Partial<Record<string, RequestStatusConfig>>;
  typeOverrides?: Partial<Record<string, RequestTypeConfig>>;
  getItemHref?: (item: MyRequestItem) => string | undefined;
  emptyTitle?: string;
  emptyDescription?: string;
  actionSection?: ReactNode;
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const DEFAULT_FILTERS: MyRequestTypeFilterTab[] = [
  { key: '', label: '전체' },
];

// ============================================================================
// Component
// ============================================================================

export function MyRequestsInbox({
  items,
  loading,
  error,
  onRetry,
  typeFilters = DEFAULT_FILTERS,
  statusOverrides,
  typeOverrides,
  getItemHref,
  emptyTitle,
  emptyDescription,
  actionSection,
  className,
}: MyRequestsInboxProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState(typeFilters[0]?.key ?? '');

  const filtered = typeFilter
    ? items.filter(item => {
        const tab = typeFilters.find(t => t.key === typeFilter);
        if (tab?.entityTypes) return tab.entityTypes.includes(item.entityType);
        return item.entityType === typeFilter;
      })
    : items;

  const pendingCount = items.filter(
    i => i.status === 'pending' || i.status === 'submitted' || i.status === 'revision_requested',
  ).length;
  const approvedCount = items.filter(i => i.status === 'approved').length;

  return (
    <div className={className}>
      {/* Stats */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{items.length}</div>
            <div className="text-xs text-slate-500">전체 신청</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-xs text-slate-500">진행 중</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <div className="text-xs text-slate-500">승인됨</div>
          </div>
        </div>
      )}

      {/* Action section slot (e.g. "새 신청하기") */}
      {actionSection}

      {/* Type filter tabs */}
      {typeFilters.length > 1 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {typeFilters.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTypeFilter(tab.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                typeFilter === tab.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-slate-500">불러오는 중...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="mt-3 text-red-600">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
          )}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="mt-3 text-lg font-medium text-slate-700">
            {emptyTitle ?? (typeFilter ? '해당 유형의 신청 내역이 없습니다' : '아직 신청한 내역이 없습니다')}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {emptyDescription ?? '새 포럼이나 강좌를 신청하면 여기에 표시됩니다'}
          </p>
        </div>
      )}

      {/* Item list */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(item => {
            const isExpanded = expandedId === item.id;
            const forumType = item.payload?.forumType as string | undefined;
            const resultSlug = item.resultMetadata?.slug as string | undefined;
            const itemHref = getItemHref?.(item);
            const reason = item.payload?.reason as string | undefined;
            const tags = item.payload?.tags as string[] | undefined;
            const adminFeedback = (item.revisionNote || item.reviewComment) as string | undefined;

            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <RequestTypeBadge entityType={item.entityType} overrides={typeOverrides} />
                        <h3 className="font-semibold text-slate-800 truncate">{item.displayTitle}</h3>
                        {forumType === 'closed' && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600 shrink-0">
                            비공개
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <RequestStatusBadge status={item.status} overrides={statusOverrides} />
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <div className="pt-4 space-y-3">
                      {/* Description */}
                      {!!item.displayDescription && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">설명</div>
                          <p className="text-sm text-slate-700">{String(item.displayDescription)}</p>
                        </div>
                      )}

                      {/* Reason (forum-specific) */}
                      {!!reason && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">신청 사유</div>
                          <p className="text-sm text-slate-700">{reason}</p>
                        </div>
                      )}

                      {/* Forum type badge */}
                      {forumType && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">포럼 유형</div>
                          <span
                            className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                              forumType === 'closed'
                                ? 'bg-slate-100 text-slate-600'
                                : 'bg-blue-50 text-blue-600'
                            }`}
                          >
                            {forumType === 'closed' ? '비공개 포럼' : '공개 포럼'}
                          </span>
                        </div>
                      )}

                      {/* Tags (forum-specific) */}
                      {item.entityType === 'forum_category' && tags && tags.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1.5">태그</div>
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((tag: string) => (
                              <span
                                key={tag}
                                className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin feedback */}
                      {!!adminFeedback && (
                        <div
                          className={`p-3 rounded-lg ${
                            item.status === 'approved'
                              ? 'bg-green-50'
                              : item.status === 'revision_requested'
                              ? 'bg-orange-50'
                              : item.status === 'rejected'
                              ? 'bg-red-50'
                              : 'bg-slate-50'
                          }`}
                        >
                          <div
                            className={`text-xs font-medium mb-1 ${
                              item.status === 'approved'
                                ? 'text-green-700'
                                : item.status === 'revision_requested'
                                ? 'text-orange-700'
                                : item.status === 'rejected'
                                ? 'text-red-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {item.status === 'revision_requested' ? '보완 요청 사항' : '관리자 의견'}
                          </div>
                          <p
                            className={`text-sm ${
                              item.status === 'approved'
                                ? 'text-green-600'
                                : item.status === 'revision_requested'
                                ? 'text-orange-600'
                                : item.status === 'rejected'
                                ? 'text-red-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {adminFeedback}
                          </p>
                          {item.reviewedAt && (
                            <p className="text-xs text-slate-500 mt-1">{formatDate(item.reviewedAt)} 검토</p>
                          )}
                        </div>
                      )}

                      {/* Result link — approved forum category */}
                      {item.status === 'approved' &&
                        item.entityType === 'forum_category' &&
                        resultSlug && (
                          <Link
                            to={`/forum?category=${resultSlug}`}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            생성된 포럼 보기
                          </Link>
                        )}

                      {/* Generic result link */}
                      {itemHref && !(item.status === 'approved' && item.entityType === 'forum_category' && resultSlug) && (
                        <Link
                          to={itemHref}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                        >
                          <MessageSquare className="w-4 h-4" />
                          상세 보기
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
