/**
 * ForumOwnerDashboard — 내 포럼 관리 대시보드 (전 서비스 공통)
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 * 선행: WO-O4O-FORUM-MY-FORUM-EXPANSION-V1 (K-Cosmetics) →
 *       WO-O4O-GLYCOPHARM-FORUM-DASHBOARD-V1 (GlycoPharm 복제) →
 *       Neture 공급자 공간 복제 → KPA 축소판
 *
 * census(IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1 F31) 기준 4서비스에
 * 285 / 572 / 581 / 576 줄로 복제돼 있었고, GlycoPharm ↔ K-Cosmetics 는
 * 실질 차이가 이모지 placeholder 1줄뿐이었다.
 *
 * 구성 (위→아래)
 *   headerSlot        — 제목·설명 (레이아웃이 담당하면 생략)
 *   Quick Actions     — 개설 신청(links.requestFormHref 있을 때) · 커뮤니티 포럼
 *   noticeSlot        — 서비스 고유 안내 (KPA: 통합 신청함 링크)
 *   Summary Stats     — 신청 통계 (신청 섹션이 켜져 있을 때만)
 *   신청 내역          — api.listMyRequests 가 있을 때만
 *   내가 운영 중인 포럼 — 수정 / 삭제 요청 / (폐쇄형) 회원 관리
 *   Edit / Delete Modal
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
  Users,
} from 'lucide-react';
import type {
  ForumOwnerApi,
  ForumOwnerLinks,
  ForumOwnerRequest,
  ForumOwnerRequestStatus,
  ForumOwnerTheme,
  OwnedForum,
} from './types.js';
import { formatOwnerDate, ownerErrorMessage, resolveForumOwnerTheme } from './theme.js';

const STATUS_CONFIG: Record<
  ForumOwnerRequestStatus,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  pending: { label: '검토 중', color: 'text-yellow-700', bg: 'bg-yellow-50', icon: Clock },
  revision_requested: { label: '보완 요청', color: 'text-orange-700', bg: 'bg-orange-50', icon: RotateCcw },
  approved: { label: '승인됨', color: 'text-green-700', bg: 'bg-green-50', icon: CheckCircle },
  rejected: { label: '거절됨', color: 'text-red-700', bg: 'bg-red-50', icon: XCircle },
};

export interface ForumOwnerDashboardProps {
  api: ForumOwnerApi;
  links: ForumOwnerLinks;
  theme?: Partial<ForumOwnerTheme>;
  /** 제목/설명 영역. 서비스 레이아웃(예: KPA MyPageLayout)이 이미 제목을 그리면 생략한다. */
  headerSlot?: ReactNode;
  /** Quick Actions 아래 서비스 고유 안내 (KPA 통합 신청함 등). */
  noticeSlot?: ReactNode;
  /** 최상위 컨테이너 클래스. 레이아웃 안에 들어갈 때 여백을 서비스가 정한다. */
  containerClassName?: string;
  /** 아이콘 이모지 입력 placeholder — 서비스 성격에 맞춘 예시. */
  emojiPlaceholder?: string;
}

interface EditFormData {
  name: string;
  description: string;
  iconEmoji: string;
  iconUrl: string;
}

export function ForumOwnerDashboard({
  api,
  links,
  theme,
  headerSlot,
  noticeSlot,
  containerClassName = 'max-w-4xl mx-auto py-8 px-4',
  emojiPlaceholder = '예: 💬',
}: ForumOwnerDashboardProps) {
  const t = resolveForumOwnerTheme(theme);
  const showRequests = typeof api.listMyRequests === 'function';

  const [requests, setRequests] = useState<ForumOwnerRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(showRequests);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [ownedForums, setOwnedForums] = useState<OwnedForum[]>([]);
  const [forumsLoading, setForumsLoading] = useState(true);
  const [forumsError, setForumsError] = useState<string | null>(null);

  const [editingForum, setEditingForum] = useState<OwnedForum | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({ name: '', description: '', iconEmoji: '', iconUrl: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingForum, setDeletingForum] = useState<OwnedForum | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!api.listMyRequests) return;
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      setRequests(await api.listMyRequests());
    } catch (err) {
      setRequestsError(ownerErrorMessage(err, '포럼 신청 내역을 불러오지 못했습니다.'));
    } finally {
      setRequestsLoading(false);
    }
  }, [api]);

  const loadOwnedForums = useCallback(async () => {
    setForumsLoading(true);
    setForumsError(null);
    try {
      setOwnedForums(await api.listOwnedForums());
    } catch (err) {
      // WO-O4O-GLYCOPHARM-API-WRAPPER-FAILURE-CONTRACT-CLOSEOUT-BATCH-V1 계약:
      // 조회 실패를 "정상 0건" 으로 위장하지 않는다. 기존 서비스 구현은 silent catch 였다.
      setForumsError(ownerErrorMessage(err, '운영 중인 포럼을 불러오지 못했습니다.'));
    } finally {
      setForumsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadRequests();
    void loadOwnedForums();
  }, [loadRequests, loadOwnedForums]);

  const openEdit = (forum: OwnedForum) => {
    setEditingForum(forum);
    setEditForm({
      name: forum.name,
      description: forum.description || '',
      iconEmoji: forum.iconEmoji || '',
      iconUrl: forum.iconUrl || '',
    });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingForum) return;
    const trimmedName = editForm.name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setEditError('포럼 이름은 2~50자여야 합니다');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await api.updateForum(editingForum.id, {
        name: trimmedName,
        description: editForm.description.trim() || undefined,
        iconEmoji: editForm.iconEmoji.trim() || null,
        iconUrl: editForm.iconUrl.trim() || null,
      });
      setEditingForum(null);
      void loadOwnedForums();
    } catch (err) {
      setEditError(ownerErrorMessage(err, '저장에 실패했습니다.'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!deletingForum) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await api.requestForumDelete(deletingForum.id, { reason: deleteReason.trim() || undefined });
      setDeletingForum(null);
      setDeleteReason('');
      void loadOwnedForums();
    } catch (err) {
      setDeleteError(ownerErrorMessage(err, '삭제 요청에 실패했습니다.'));
    } finally {
      setDeleteSaving(false);
    }
  };

  const pendingCount = requests.filter(
    (r) => r.status === 'pending' || r.status === 'revision_requested',
  ).length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className={containerClassName}>
      {headerSlot}

      {/* Quick Actions */}
      <div className={`grid grid-cols-1 ${links.requestFormHref ? 'sm:grid-cols-2' : ''} gap-3 mb-6`}>
        {links.requestFormHref && (
          <Link
            to={links.requestFormHref}
            className={`flex items-center gap-3 p-4 border rounded-xl transition-colors ${t.accentSoft}`}
          >
            <div className={`w-10 h-10 rounded-lg ${t.accentBadge} flex items-center justify-center`}>
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <div className={`font-semibold ${t.accentStrongText}`}>포럼 개설 신청</div>
              <div className={`text-sm ${t.accentSoftText}`}>새로운 포럼을 요청합니다</div>
            </div>
          </Link>
        )}

        <Link
          to={links.forumHomeHref}
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

      {noticeSlot}

      {/* Summary Stats */}
      {showRequests && !requestsLoading && !requestsError && requests.length > 0 && (
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

      {/* 신청 내역 */}
      {showRequests && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">내 포럼 신청 내역</h2>

          {requestsLoading && (
            <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
              <Loader2 className={`w-6 h-6 ${t.accentText} animate-spin`} />
              <span className="ml-2 text-slate-500">불러오는 중...</span>
            </div>
          )}

          {!requestsLoading && requestsError && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="mt-3 text-red-600">{requestsError}</p>
              <button
                onClick={() => void loadRequests()}
                className={`mt-3 px-4 py-2 text-sm text-white rounded-lg transition-colors ${t.accentSolid}`}
              >
                다시 시도
              </button>
            </div>
          )}

          {!requestsLoading && !requestsError && requests.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="mt-3 text-lg font-medium text-slate-700">아직 신청한 포럼이 없습니다</h3>
              <p className="mt-1 text-sm text-slate-500">원하는 주제의 포럼을 신청해보세요</p>
              {links.requestFormHref && (
                <Link
                  to={links.requestFormHref}
                  className={`inline-flex items-center gap-2 mt-4 px-4 py-2 text-white rounded-lg transition-colors text-sm ${t.accentSolid}`}
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  새 포럼 신청
                </Link>
              )}
            </div>
          )}

          {!requestsLoading && !requestsError && requests.length > 0 && (
            <div className="space-y-3">
              {requests.map((request) => {
                const status = STATUS_CONFIG[request.status];
                const StatusIcon = status.icon;
                const isExpanded = expandedId === request.id;

                return (
                  <div key={request.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                          <p className="text-xs text-slate-500">{formatOwnerDate(request.createdAt)}</p>
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
                            <div
                              className={`p-3 rounded-lg ${
                                request.status === 'approved'
                                  ? 'bg-green-50'
                                  : request.status === 'revision_requested'
                                    ? 'bg-orange-50'
                                    : 'bg-red-50'
                              }`}
                            >
                              <div
                                className={`text-xs font-medium mb-1 ${
                                  request.status === 'approved'
                                    ? 'text-green-700'
                                    : request.status === 'revision_requested'
                                      ? 'text-orange-700'
                                      : 'text-red-700'
                                }`}
                              >
                                {request.status === 'revision_requested' ? '보완 요청 사항' : '관리자 의견'}
                              </div>
                              <p
                                className={`text-sm ${
                                  request.status === 'approved'
                                    ? 'text-green-600'
                                    : request.status === 'revision_requested'
                                      ? 'text-orange-600'
                                      : 'text-red-600'
                                }`}
                              >
                                {request.reviewComment}
                              </p>
                              {request.reviewedAt && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {formatOwnerDate(request.reviewedAt)} 검토
                                </p>
                              )}
                            </div>
                          )}
                          {request.status === 'approved' && request.createdCategorySlug && (
                            <Link
                              to={links.forumHref(request.createdCategorySlug)}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${t.accentIconBg} ${t.accentSoftText} hover:opacity-80`}
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
      )}

      {/* 내가 운영 중인 포럼 */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">내가 운영 중인 포럼</h2>

        {forumsLoading && (
          <div className="flex items-center justify-center py-8 bg-white rounded-xl border border-slate-200">
            <Loader2 className={`w-5 h-5 ${t.accentText} animate-spin`} />
            <span className="ml-2 text-sm text-slate-500">불러오는 중...</span>
          </div>
        )}

        {!forumsLoading && forumsError && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <p className="mt-3 text-red-600">{forumsError}</p>
            <button
              onClick={() => void loadOwnedForums()}
              className={`mt-3 px-4 py-2 text-sm text-white rounded-lg transition-colors ${t.accentSolid}`}
            >
              다시 시도
            </button>
          </div>
        )}

        {!forumsLoading && !forumsError && ownedForums.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 border-dashed p-6 text-center">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="mt-2 text-sm text-slate-500">아직 운영 중인 포럼이 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">포럼 개설 신청이 승인되면 여기에 표시됩니다</p>
          </div>
        )}

        {!forumsLoading && !forumsError && ownedForums.length > 0 && (
          <div className="space-y-3">
            {ownedForums.map((forum) => (
              <div
                key={forum.id}
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200"
              >
                <Link
                  to={links.forumHref(forum.slug)}
                  className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
                >
                  <div className={`w-9 h-9 rounded-lg ${t.accentIconBg} flex items-center justify-center shrink-0`}>
                    {forum.iconEmoji ? (
                      <span className="text-lg">{forum.iconEmoji}</span>
                    ) : (
                      <MessageSquare className={`w-4 h-4 ${t.accentText}`} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 truncate">{forum.name}</h3>
                      {!forum.isActive && (
                        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-500">
                          비활성
                        </span>
                      )}
                    </div>
                    {forum.description && <p className="text-xs text-slate-500 truncate">{forum.description}</p>}
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {forum.deleteRequestStatus === 'pending' && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-50 text-red-600">
                      삭제 요청 중
                    </span>
                  )}
                  {forum.deleteRequestStatus === 'rejected' && (
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500"
                      title={forum.deleteReviewComment || ''}
                    >
                      삭제 반려
                    </span>
                  )}
                  <div className="text-right mr-1">
                    <div className="text-sm font-medium text-slate-700">{forum.postCount}</div>
                    <div className="text-xs text-slate-400">게시글</div>
                  </div>

                  {/* 폐쇄형 회원 관리 — links.memberManageHref 를 준 서비스에서만 노출한다 */}
                  {forum.forumType === 'closed' && links.memberManageHref && (
                    <Link
                      to={links.memberManageHref(forum.id)}
                      className={`p-2 rounded-lg text-slate-400 transition-colors ${t.accentHover}`}
                      title="회원 관리"
                    >
                      <Users className="w-4 h-4" />
                    </Link>
                  )}

                  <button
                    onClick={() => openEdit(forum)}
                    className={`p-2 rounded-lg text-slate-400 transition-colors ${t.accentHover}`}
                    title="포럼 정보 수정"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {forum.deleteRequestStatus !== 'pending' && (
                    <button
                      onClick={() => {
                        setDeletingForum(forum);
                        setDeleteReason('');
                        setDeleteError(null);
                      }}
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

      {/* 삭제 요청 모달 */}
      {deletingForum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !deleteSaving && setDeletingForum(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">포럼 삭제 요청</h3>
              <button
                onClick={() => !deleteSaving && setDeletingForum(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
              <p className="font-medium">"{deletingForum.name}" 포럼의 삭제를 요청합니다.</p>
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
                onClick={() => setDeletingForum(null)}
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
                {deleteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleteSaving ? '요청 중...' : '삭제 요청'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정보 수정 모달 */}
      {editingForum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => !editSaving && setEditingForum(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">포럼 정보 수정</h3>
              <button
                onClick={() => !editSaving && setEditingForum(null)}
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                포럼 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                maxLength={50}
                className={`w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:border-transparent text-sm ${t.accentRing}`}
              />
              <p className="text-xs text-slate-400 mt-1">{editForm.name.length}/50</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">포럼 설명</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                className={`w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:border-transparent text-sm resize-none ${t.accentRing}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                아이콘 이모지 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                value={editForm.iconEmoji}
                onChange={(e) => setEditForm({ ...editForm, iconEmoji: e.target.value })}
                placeholder={emojiPlaceholder}
                maxLength={4}
                className={`w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:border-transparent text-sm ${t.accentRing}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                아이콘 URL <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <input
                type="url"
                value={editForm.iconUrl}
                onChange={(e) => setEditForm({ ...editForm, iconUrl: e.target.value })}
                placeholder="https://..."
                className={`w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:border-transparent text-sm ${t.accentRing}`}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingForum(null)}
                disabled={editSaving}
                className="flex-1 px-4 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSaving}
                className={`flex-1 px-4 py-2.5 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${t.accentSolid}`}
              >
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
