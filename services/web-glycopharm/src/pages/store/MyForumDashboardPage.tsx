/**
 * MyForumDashboardPage - 내 포럼 관리 대시보드
 *
 * WO-O4O-USER-DASHBOARD-FORUM-MY-FORUM-V1 + WO-O4O-FORUM-MY-CATEGORIES-API-V1
 * 대시보드 Forum 메뉴를 "공개 포럼 허브"에서 "내 포럼 관리"로 재정의
 *
 * 기존 자산 재사용:
 *   - forumRequestApi.getMyRequests() — 내 신청 목록
 *   - forumRequestApi.getMyCategories() — 내가 만든 포럼 목록
 *   - RequestCategoryPage (/forum/request-category) — 신청 폼
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  MessageSquarePlus,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronRight,
  Loader2,
  AlertCircle,
  Inbox,
  Layers,
  Pencil,
  X,
  Save,
  Trash2,
} from 'lucide-react';
import { forumRequestApi } from '@/services/api';

// ============================================================================
// Types
// ============================================================================

type RequestStatus = 'pending' | 'revision_requested' | 'approved' | 'rejected';

interface ForumRequest {
  id: string;
  name: string;
  description: string;
  reason?: string;
  status: RequestStatus;
  requesterId: string;
  requesterName: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdCategoryId?: string;
  createdCategorySlug?: string;
  createdAt: string;
  updatedAt: string;
}

interface MyForumCategory {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  forumType?: string;
  accessLevel?: string;
  isActive: boolean;
  postCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    deleteRequestStatus?: 'pending' | 'approved' | 'rejected';
    deleteRequestReason?: string;
    deleteRequestedAt?: string;
    deleteReviewComment?: string;
  } | null;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending: {
    label: '검토 중',
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    icon: Clock,
  },
  revision_requested: {
    label: '보완 요청',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    icon: RotateCcw,
  },
  approved: {
    label: '승인됨',
    color: 'text-green-700',
    bg: 'bg-green-50',
    icon: CheckCircle,
  },
  rejected: {
    label: '거절됨',
    color: 'text-red-700',
    bg: 'bg-red-50',
    icon: XCircle,
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ============================================================================
// Component
// ============================================================================

interface EditFormData {
  name: string;
  description: string;
  iconEmoji: string;
  iconUrl: string;
}

export default function MyForumDashboardPage() {
  const [requests, setRequests] = useState<ForumRequest[]>([]);
  const [myCategories, setMyCategories] = useState<MyForumCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Edit modal state — WO-O4O-FORUM-OWNER-BASIC-EDIT-V1
  const [editingCategory, setEditingCategory] = useState<MyForumCategory | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ name: '', description: '', iconEmoji: '', iconUrl: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete request modal state — WO-O4O-FORUM-DELETE-REQUEST-V1
  const [deletingCategory, setDeletingCategory] = useState<MyForumCategory | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
    loadMyCategories();
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await forumRequestApi.getMyRequests();
      if (response.error) {
        setError(response.error.message);
      } else {
        setRequests((response.data || []) as ForumRequest[]);
      }
    } catch {
      setError('포럼 신청 내역을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await forumRequestApi.getMyCategories();
      setMyCategories((response.data || []) as MyForumCategory[]);
    } catch {
      // 실패 시 빈 배열 유지 — 신청 내역과 독립적으로 처리
    } finally {
      setCategoriesLoading(false);
    }
  };

  const openEdit = (cat: MyForumCategory) => {
    setEditingCategory(cat);
    setEditForm({
      name: cat.name,
      description: cat.description || '',
      iconEmoji: (cat as any).iconEmoji || '',
      iconUrl: (cat as any).iconUrl || '',
    });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    const trimmedName = editForm.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setEditError('포럼 이름은 2~50자여야 합니다');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await forumRequestApi.updateMyCategory(editingCategory.id, {
        name: trimmedName,
        description: editForm.description.trim() || undefined,
        iconEmoji: editForm.iconEmoji.trim() || undefined,
        iconUrl: editForm.iconUrl.trim() || undefined,
      });
      if (res.error) {
        setEditError(res.error.message);
      } else {
        setEditingCategory(null);
        loadMyCategories();
      }
    } catch {
      setEditError('저장 중 오류가 발생했습니다.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deletingCategory) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      const res = await forumRequestApi.requestDeleteCategory(deletingCategory.id, {
        reason: deleteReason.trim() || undefined,
      });
      if (res.error) {
        setDeleteError(res.error.message);
      } else {
        setDeletingCategory(null);
        setDeleteReason('');
        loadMyCategories();
      }
    } catch {
      setDeleteError('삭제 요청 중 오류가 발생했습니다.');
    } finally {
      setDeleteSaving(false);
    }
  };

  const getDeleteStatus = (cat: MyForumCategory) => cat.metadata?.deleteRequestStatus;

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'revision_requested').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="max-w-4xl">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-teal-600" />
          내 포럼
        </h1>
        <p className="text-slate-500 mt-1">
          내가 신청하거나 운영하는 포럼을 관리합니다
        </p>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <Link
          to="/forum/request-category"
          className="flex items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
            <MessageSquarePlus className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <div className="font-semibold text-teal-800">포럼 개설 신청</div>
            <div className="text-sm text-teal-600">새로운 포럼을 요청합니다</div>
          </div>
        </Link>

        <Link
          to="/forum"
          className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-800">커뮤니티 포럼</div>
            <div className="text-sm text-slate-500">전체 포럼 탐색 및 참여</div>
          </div>
        </Link>
      </div>

      {/* ── Summary Stats ── */}
      {!isLoading && !error && requests.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{requests.length}</div>
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

      {/* ── Forum Requests Section ── */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-3">내 포럼 신청 내역</h2>

        {isLoading && (
          <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            <span className="ml-2 text-slate-500">불러오는 중...</span>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="mt-3 text-red-600">{error}</p>
            <button
              onClick={loadRequests}
              className="mt-3 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {!isLoading && !error && requests.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="mt-3 text-lg font-medium text-slate-700">아직 신청한 포럼이 없습니다</h3>
            <p className="mt-1 text-sm text-slate-500">
              원하는 주제의 포럼을 신청해보세요
            </p>
            <Link
              to="/forum/request-category"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
            >
              <MessageSquarePlus className="w-4 h-4" />
              새 포럼 신청
            </Link>
          </div>
        )}

        {!isLoading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((request) => {
              const status = STATUS_CONFIG[request.status];
              const StatusIcon = status.icon;
              const isExpanded = expandedId === request.id;

              return (
                <div
                  key={request.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                >
                  {/* Request Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg ${status.bg} flex items-center justify-center shrink-0`}>
                        <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      </div>
                      <div className="text-left min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate">{request.name}</h3>
                        <p className="text-xs text-slate-500">{formatDate(request.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-slate-100">
                      <div className="pt-4 space-y-3">
                        <div>
                          <div className="text-xs font-medium text-slate-500 mb-1">포럼 설명</div>
                          <p className="text-sm text-slate-700">{request.description}</p>
                        </div>

                        {request.reason && (
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-1">신청 사유</div>
                            <p className="text-sm text-slate-700">{request.reason}</p>
                          </div>
                        )}

                        {request.reviewComment && (
                          <div className={`p-3 rounded-lg ${
                            request.status === 'approved' ? 'bg-green-50' :
                            request.status === 'revision_requested' ? 'bg-orange-50' :
                            'bg-red-50'
                          }`}>
                            <div className={`text-xs font-medium mb-1 ${
                              request.status === 'approved' ? 'text-green-700' :
                              request.status === 'revision_requested' ? 'text-orange-700' :
                              'text-red-700'
                            }`}>
                              {request.status === 'revision_requested' ? '보완 요청 사항' : '관리자 의견'}
                            </div>
                            <p className={`text-sm ${
                              request.status === 'approved' ? 'text-green-600' :
                              request.status === 'revision_requested' ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {request.reviewComment}
                            </p>
                            {request.reviewedAt && (
                              <p className="text-xs text-slate-500 mt-1">
                                {formatDate(request.reviewedAt)} 검토
                              </p>
                            )}
                          </div>
                        )}

                        {request.status === 'approved' && request.createdCategorySlug && (
                          <Link
                            to={`/forum?category=${request.createdCategorySlug}`}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            생성된 포럼 보기
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

      {/* ── My Active Forums ── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">내가 운영 중인 포럼</h2>

        {categoriesLoading && (
          <div className="flex items-center justify-center py-8 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
            <span className="ml-2 text-sm text-slate-500">불러오는 중...</span>
          </div>
        )}

        {!categoriesLoading && myCategories.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-6 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="mt-2 text-sm text-slate-500">
              아직 운영 중인 포럼이 없습니다
            </p>
            <p className="text-xs text-slate-400 mt-1">
              포럼 개설 신청이 승인되면 여기에 표시됩니다
            </p>
          </div>
        )}

        {!categoriesLoading && myCategories.length > 0 && (
          <div className="space-y-3">
            {myCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200"
              >
                <Link
                  to={`/forum?category=${cat.slug}`}
                  className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                >
                  <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    {(cat as any).iconEmoji ? (
                      <span className="text-lg">{(cat as any).iconEmoji}</span>
                    ) : (
                      <MessageSquare className="w-4 h-4 text-teal-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 truncate">{cat.name}</h3>
                      {!cat.isActive && (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-500">비활성</span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-slate-500 truncate">{cat.description}</p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {getDeleteStatus(cat) === 'pending' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600">삭제 요청 중</span>
                  )}
                  {getDeleteStatus(cat) === 'rejected' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500" title={cat.metadata?.deleteReviewComment || ''}>삭제 반려</span>
                  )}
                  <div className="text-right mr-1">
                    <div className="text-sm font-medium text-slate-700">{cat.postCount}</div>
                    <div className="text-xs text-slate-400">게시글</div>
                  </div>
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                    title="포럼 정보 수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {getDeleteStatus(cat) !== 'pending' && (
                    <button
                      onClick={() => { setDeletingCategory(cat); setDeleteReason(''); setDeleteError(null); }}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="삭제 요청"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete Request Modal — WO-O4O-FORUM-DELETE-REQUEST-V1 ── */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !deleteSaving && setDeletingCategory(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">포럼 삭제 요청</h3>
              <button
                onClick={() => !deleteSaving && setDeletingCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <p className="font-medium">"{deletingCategory.name}" 포럼의 삭제를 요청합니다.</p>
              <p className="mt-1 text-amber-600">운영자가 검토한 후 승인/반려됩니다. 승인 시 포럼이 비활성화됩니다.</p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                삭제 사유 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="삭제를 요청하는 이유를 입력해주세요"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingCategory(null)}
                disabled={deleteSaving}
                className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteRequest}
                disabled={deleteSaving}
                className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleteSaving ? '요청 중...' : '삭제 요청'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal — WO-O4O-FORUM-OWNER-BASIC-EDIT-V1 ── */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !editSaving && setEditingCategory(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">포럼 정보 수정</h3>
              <button
                onClick={() => !editSaving && setEditingCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {editError}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                포럼 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                maxLength={50}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">{editForm.name.length}/50</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">포럼 설명</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm resize-none"
              />
            </div>

            {/* Icon Emoji */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                아이콘 이모지 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                value={editForm.iconEmoji}
                onChange={(e) => setEditForm({ ...editForm, iconEmoji: e.target.value })}
                placeholder="예: 💊"
                maxLength={4}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Icon URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                아이콘 URL <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <input
                type="url"
                value={editForm.iconUrl}
                onChange={(e) => setEditForm({ ...editForm, iconUrl: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingCategory(null)}
                disabled={editSaving}
                className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className="flex-1 px-4 py-2.5 text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {editSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
