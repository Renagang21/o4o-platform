/**
 * MyRequestsPage - 통합 신청 내역 (MyPage)
 *
 * WO-KPA-A-MYPAGE-UNIFIED-REQUEST-INBOX-V1
 *
 * 포럼/강좌/강사/가입 등 모든 승인형 요청을 한 곳에서 확인.
 * 두 데이터 소스를 병합:
 *  1) mypageApi.getMyApprovalRequests() — kpa_approval_requests
 *  2) forumRequestApi.getMyRequests() — forum_category_requests (기존 포럼)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  FileEdit,
  ChevronRight,
  Loader2,
  AlertCircle,
  Inbox,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Users,
  Ban,
  Send,
} from 'lucide-react';
import { mypageApi } from '../../api/mypage';
import type { UnifiedRequestItem } from '../../api/mypage';
import { forumRequestApi } from '../../api/forum';

// ============================================================================
// Entity type config
// ============================================================================

const ENTITY_TYPE_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; color: string; bg: string }> = {
  forum_category: { label: '포럼', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
  course: { label: '강좌', icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
  instructor_qualification: { label: '강사', icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  membership: { label: '가입', icon: Users, color: 'text-orange-600', bg: 'bg-orange-50' },
};

const ENTITY_TYPE_TABS = [
  { key: '', label: '전체' },
  { key: 'forum_category', label: '포럼' },
  { key: 'course', label: '강좌' },
  { key: 'instructor_qualification', label: '강사' },
  { key: 'membership', label: '가입' },
];

// ============================================================================
// Status config
// ============================================================================

type RequestStatus = 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected' | 'revision_requested' | 'cancelled' | 'revoked';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  draft: { label: '임시저장', color: 'text-slate-600', bg: 'bg-slate-100', icon: FileEdit },
  pending: { label: '검토 중', color: 'text-yellow-700', bg: 'bg-yellow-50', icon: Clock },
  submitted: { label: '제출됨', color: 'text-blue-700', bg: 'bg-blue-50', icon: Send },
  approved: { label: '승인됨', color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle },
  rejected: { label: '거절됨', color: 'text-red-700', bg: 'bg-red-50', icon: XCircle },
  revision_requested: { label: '보완 요청', color: 'text-orange-700', bg: 'bg-orange-50', icon: RotateCcw },
  cancelled: { label: '취소됨', color: 'text-slate-500', bg: 'bg-slate-100', icon: Ban },
  revoked: { label: '철회됨', color: 'text-slate-500', bg: 'bg-slate-100', icon: Ban },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================================
// Normalize forum-core data → UnifiedRequestItem
// ============================================================================

function normalizeForumRequest(raw: any): UnifiedRequestItem {
  return {
    id: raw.id,
    entityType: 'forum_category',
    status: raw.status || 'pending',
    displayTitle: raw.name || raw.payload?.name || '포럼 신청',
    displayDescription: raw.description || raw.payload?.description || '',
    reviewComment: raw.reviewComment || raw.review_comment || null,
    revisionNote: raw.revisionNote || raw.revision_note || null,
    reviewedAt: raw.reviewedAt || raw.reviewed_at || null,
    resultEntityId: raw.createdCategoryId || raw.result_entity_id || null,
    resultMetadata: raw.createdCategorySlug
      ? { slug: raw.createdCategorySlug }
      : raw.result_metadata || null,
    submittedAt: raw.submittedAt || raw.submitted_at || raw.createdAt || raw.created_at || null,
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
    payload: {
      name: raw.name,
      description: raw.description,
      reason: raw.reason,
      forumType: raw.forumType || raw.forum_type || raw.payload?.forumType,
    },
  };
}

// ============================================================================
// Component
// ============================================================================

export default function MyRequestsPage() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('entityType') || '';

  const [items, setItems] = useState<UnifiedRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState(initialType);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 두 소스 병렬 호출
      const [approvalRes, forumRes] = await Promise.all([
        mypageApi.getMyApprovalRequests().catch(() => ({ data: [] } as any)),
        forumRequestApi.getMyRequests().catch(() => ({ data: [] } as any)),
      ]);

      const approvalItems: UnifiedRequestItem[] = (approvalRes as any)?.data || [];
      const forumRaw: any[] = (forumRes as any)?.data || [];
      const forumItems = forumRaw.map(normalizeForumRequest);

      // 병합 + id 기준 중복 제거 (approval 우선)
      const seen = new Set(approvalItems.map(i => i.id));
      const merged = [...approvalItems];
      for (const fi of forumItems) {
        if (!seen.has(fi.id)) {
          merged.push(fi);
          seen.add(fi.id);
        }
      }

      // 최신순 정렬
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setItems(merged);
    } catch {
      setError('신청 내역을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 필터링
  const filtered = typeFilter
    ? items.filter(i => i.entityType === typeFilter)
    : items;

  const pendingCount = items.filter(i => i.status === 'pending' || i.status === 'submitted' || i.status === 'revision_requested').length;
  const approvedCount = items.filter(i => i.status === 'approved').length;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" />
          내 신청 내역
        </h1>
        <p className="text-slate-500 mt-1">포럼, 강좌, 강사 등 모든 승인 요청을 확인합니다</p>
      </div>

      {/* Stats */}
      {!isLoading && !error && items.length > 0 && (
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

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {ENTITY_TYPE_TABS.map(tab => (
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

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-slate-500">불러오는 중...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="mt-3 text-red-600">{error}</p>
          <button onClick={loadData} className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            다시 시도
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="mt-3 text-lg font-medium text-slate-700">
            {typeFilter ? '해당 유형의 신청 내역이 없습니다' : '아직 신청한 내역이 없습니다'}
          </h3>
          <p className="mt-1 text-sm text-slate-500">새 포럼이나 강좌를 신청하면 여기에 표시됩니다</p>
          <Link
            to="/mypage/my-forums/request"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <MessageSquare className="w-4 h-4" />새 포럼 신청
          </Link>
        </div>
      )}

      {/* Request list */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(item => {
            const typeConfig = ENTITY_TYPE_CONFIG[item.entityType] || ENTITY_TYPE_CONFIG.forum_category;
            const TypeIcon = typeConfig.icon;
            const statusConfig = STATUS_CONFIG[item.status as RequestStatus] || STATUS_CONFIG.pending;
            const isExpanded = expandedId === item.id;
            const forumType = item.payload?.forumType;
            const resultSlug = item.resultMetadata?.slug;

            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Card header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg ${typeConfig.bg} flex items-center justify-center shrink-0`}>
                      <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${typeConfig.bg} ${typeConfig.color} shrink-0`}>
                          {typeConfig.label}
                        </span>
                        <h3 className="font-semibold text-slate-800 truncate">{item.displayTitle}</h3>
                        {forumType === 'closed' && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600 shrink-0">비공개</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <div className="pt-4 space-y-3">
                      {/* Description */}
                      {item.displayDescription && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">설명</div>
                          <p className="text-sm text-slate-700">{item.displayDescription}</p>
                        </div>
                      )}

                      {/* Reason (forum-specific) */}
                      {item.payload?.reason && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">신청 사유</div>
                          <p className="text-sm text-slate-700">{item.payload.reason}</p>
                        </div>
                      )}

                      {/* Forum type badge */}
                      {forumType && (
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">포럼 유형</div>
                          <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                            forumType === 'closed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {forumType === 'closed' ? '비공개 포럼' : '공개 포럼'}
                          </span>
                        </div>
                      )}

                      {/* Admin feedback */}
                      {(item.reviewComment || item.revisionNote) && (
                        <div className={`p-3 rounded-lg ${
                          item.status === 'approved' ? 'bg-green-50' :
                          item.status === 'revision_requested' ? 'bg-orange-50' :
                          item.status === 'rejected' ? 'bg-red-50' : 'bg-slate-50'
                        }`}>
                          <div className={`text-xs font-medium mb-1 ${
                            item.status === 'approved' ? 'text-green-700' :
                            item.status === 'revision_requested' ? 'text-orange-700' :
                            item.status === 'rejected' ? 'text-red-700' : 'text-slate-600'
                          }`}>
                            {item.status === 'revision_requested' ? '보완 요청 사항' : '관리자 의견'}
                          </div>
                          <p className={`text-sm ${
                            item.status === 'approved' ? 'text-green-600' :
                            item.status === 'revision_requested' ? 'text-orange-600' :
                            item.status === 'rejected' ? 'text-red-600' : 'text-slate-600'
                          }`}>
                            {item.revisionNote || item.reviewComment}
                          </p>
                          {item.reviewedAt && (
                            <p className="text-xs text-slate-500 mt-1">{formatDate(item.reviewedAt)} 검토</p>
                          )}
                        </div>
                      )}

                      {/* Result link */}
                      {item.status === 'approved' && item.entityType === 'forum_category' && resultSlug && (
                        <Link
                          to={`/forum?category=${resultSlug}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />생성된 포럼 보기
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
