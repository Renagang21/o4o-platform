/**
 * ForumOwnerMemberManagement — 폐쇄형 포럼 회원 관리 (전 서비스 공통)
 *
 * WO-O4O-COMMUNITY-FORUM-OWNER-AREA-COMMONIZATION-V1
 * 선행: WO-O4O-FORUM-MEMBER-MANAGEMENT-EXPANSION-FRONTEND-V1
 *
 * census(IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1 F34) 기준 KPA 381 /
 * GlycoPharm 354 / K-Cosmetics 354 줄로 복제돼 있었고, GP ↔ KCos 실질 차이는
 * accent 색 4곳뿐이었다.
 *
 * 소유자(owner)가 가입 신청을 승인/거절하고 회원 목록을 관리한다.
 * 권한 판정은 백엔드(ForumMembershipService owner 검증)가 하고, 이 화면은 403 을 안내한다.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle, Users, Check, X, UserMinus, Crown, Shield } from 'lucide-react';
import type {
  ForumOwnerJoinRequest,
  ForumOwnerMember,
  ForumOwnerMembershipApi,
  ForumOwnerTheme,
} from './types.js';
import { formatOwnerDateShort, ownerErrorMessage, resolveForumOwnerTheme } from './theme.js';

export interface ForumOwnerMemberManagementProps {
  /** route param. 없으면 안내만 표시한다. */
  forumId?: string;
  api: ForumOwnerMembershipApi;
  /** 내 포럼 대시보드로 돌아가는 링크 */
  backHref: string;
  backLabel?: string;
  theme?: Partial<ForumOwnerTheme>;
  /** 최상위 컨테이너 클래스 (서비스 레이아웃 폭에 맞춘다) */
  containerClassName?: string;
  /** 본문 위 서비스 고유 네비게이션 (KPA MyPageNavigation 등) */
  navSlot?: ReactNode;
}

export function ForumOwnerMemberManagement({
  forumId,
  api,
  backHref,
  backLabel = '내 포럼으로 돌아가기',
  theme,
  containerClassName = 'max-w-3xl mx-auto py-8 px-4',
  navSlot,
}: ForumOwnerMemberManagementProps) {
  const t = resolveForumOwnerTheme(theme);

  const [forumName, setForumName] = useState('');
  const [forumType, setForumType] = useState<string | undefined>();
  const [joinRequests, setJoinRequests] = useState<ForumOwnerJoinRequest[]>([]);
  const [members, setMembers] = useState<ForumOwnerMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  const reloadLists = useCallback(async () => {
    if (!forumId) return;
    try {
      const [reqs, mems] = await Promise.all([api.listJoinRequests(forumId), api.listMembers(forumId)]);
      setJoinRequests(reqs);
      setMembers(mems);
    } catch {
      // 목록 갱신 실패는 직전 액션 결과를 덮지 않는다 (액션 오류가 이미 표시된다).
    }
  }, [api, forumId]);

  const loadAll = useCallback(async () => {
    if (!forumId) return;
    setLoading(true);
    setError(null);
    try {
      const [forums, reqs, mems] = await Promise.all([
        api.listOwnedForums(),
        api.listJoinRequests(forumId),
        api.listMembers(forumId),
      ]);
      const forum = forums.find((f) => f.id === forumId);
      if (forum) {
        setForumName(forum.name);
        setForumType(forum.forumType);
      }
      setJoinRequests(reqs);
      setMembers(mems);
    } catch (err) {
      const status = (err as { status?: number; response?: { status?: number } })?.response?.status
        ?? (err as { status?: number })?.status;
      if (status === 403) {
        setError('접근 권한이 없습니다. 포럼 개설자만 회원을 관리할 수 있습니다.');
      } else {
        setError(ownerErrorMessage(err, '데이터를 불러오는데 실패했습니다.'));
      }
    } finally {
      setLoading(false);
    }
  }, [api, forumId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleApprove = async (requestId: string) => {
    if (!forumId || actionLoading) return;
    setActionLoading(requestId);
    setActionError(null);
    try {
      await api.approveJoin(forumId, requestId);
      await reloadLists();
    } catch (err) {
      setActionError(ownerErrorMessage(err, '승인에 실패했습니다.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!forumId || actionLoading) return;
    setActionLoading(requestId);
    setActionError(null);
    try {
      await api.rejectJoin(forumId, requestId, rejectComment.trim() || undefined);
      setRejectingId(null);
      setRejectComment('');
      await reloadLists();
    } catch (err) {
      setActionError(ownerErrorMessage(err, '거절에 실패했습니다.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string | null) => {
    if (!forumId || actionLoading) return;
    if (!confirm(`정말 "${userName || '이 회원'}"을(를) 삭제하시겠습니까?`)) return;
    setActionLoading(userId);
    setActionError(null);
    try {
      await api.removeMember(forumId, userId);
      await reloadLists();
    } catch (err) {
      setActionError(ownerErrorMessage(err, '회원 삭제에 실패했습니다.'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={containerClassName}>
      {navSlot}

      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className={`w-6 h-6 ${t.accentText}`} />
          {forumName ? `"${forumName}" 회원 관리` : '회원 관리'}
          {forumType === 'closed' && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">비공개</span>
          )}
        </h1>
        <p className="text-slate-500 mt-1">가입 신청을 처리하고 회원을 관리합니다</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <Loader2 className={`w-5 h-5 ${t.accentText} animate-spin`} />
          <span className="ml-2 text-sm text-slate-500">불러오는 중...</span>
        </div>
      )}

      {!loading && error && (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <Link to={backHref} className="text-sm text-red-600 font-medium hover:text-red-700 mt-1 inline-block">
              ← {backLabel}
            </Link>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 가입 신청 */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              가입 신청
              {joinRequests.length > 0 && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${t.accentBadge}`}>
                  {joinRequests.length}건
                </span>
              )}
            </h2>

            {joinRequests.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 border-dashed p-6 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="mt-2 text-sm text-slate-500">대기 중인 가입 신청이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                {joinRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800">{req.displayName || '(이름 없음)'}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          {req.email && <span>{req.email}</span>}
                          <span>{formatOwnerDateShort(req.createdAt)}</span>
                        </div>
                      </div>

                      {rejectingId === req.id ? (
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={() => {
                              setRejectingId(null);
                              setRejectComment('');
                            }}
                            className="px-3 py-1.5 text-sm text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoading === req.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            거절 확인
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading === req.id}
                            className={`px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 ${t.accentSolid}`}
                          >
                            {actionLoading === req.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            승인
                          </button>
                          <button
                            onClick={() => setRejectingId(req.id)}
                            disabled={!!actionLoading}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            거절
                          </button>
                        </div>
                      )}
                    </div>

                    {rejectingId === req.id && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <label className="block text-xs font-medium text-slate-500 mb-1">거절 사유 (선택)</label>
                        <textarea
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          placeholder="거절 사유를 입력해주세요"
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm resize-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 회원 목록 */}
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              회원 목록
              {members.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  {members.length}명
                </span>
              )}
            </h2>

            {members.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 border-dashed p-6 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="mt-2 text-sm text-slate-500">등록된 회원이 없습니다</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: member.role === 'owner' ? '#fef3c7' : '#f1f5f9' }}
                      >
                        {member.role === 'owner' ? (
                          <Crown className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Users className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 truncate">{member.name || '(이름 없음)'}</span>
                          <span
                            className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                              member.role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {member.role === 'owner' ? '운영자' : '회원'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          {member.email && <span>{member.email}</span>}
                          <span>가입 {formatOwnerDateShort(member.joinedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3">
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, member.name)}
                          disabled={actionLoading === member.userId}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="회원 삭제"
                        >
                          {actionLoading === member.userId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserMinus className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
