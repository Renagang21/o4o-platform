/**
 * ForumMemberManagementPage - 포럼 회원 관리
 *
 * WO-KPA-A-FORUM-OWNER-MEMBER-MANAGEMENT-UI-V1
 *
 * 폐쇄형 포럼 개설자(owner)가 가입 신청 승인/거절, 회원 목록 조회, 회원 삭제를 수행하는 페이지.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MyPageNavigation } from '@o4o/account-ui';
import { KPA_MYPAGE_NAV_ITEMS } from './navItems';
import { forumApi, forumMembershipApi } from '../../api/forum';
import type { ForumJoinRequest, ForumMember } from '../../api/forum';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Users,
  Check,
  X,
  UserMinus,
  Crown,
  Shield,
} from 'lucide-react';

// ============================================================================
// Component
// ============================================================================

export default function ForumMemberManagementPage() {
  const { forumId } = useParams<{ forumId: string }>();

  const [forumName, setForumName] = useState('');
  const [forumType, setForumType] = useState<string | undefined>();
  const [joinRequests, setJoinRequests] = useState<ForumJoinRequest[]>([]);
  const [members, setMembers] = useState<ForumMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  useEffect(() => {
    if (forumId) loadAll();
  }, [forumId]);

  const loadAll = async () => {
    if (!forumId) return;
    setLoading(true);
    setError(null);
    try {
      const [catRes, reqRes, memRes] = await Promise.all([
        forumApi.getMyCategories(),
        forumMembershipApi.getJoinRequests(forumId),
        forumMembershipApi.getMembers(forumId),
      ]);

      // Extract forum info from my categories
      const cats = (catRes as any).data || [];
      const forum = cats.find((c: any) => c.id === forumId);
      if (forum) {
        setForumName(forum.name);
        setForumType(forum.forumType);
      }

      setJoinRequests((reqRes as any).data || []);
      setMembers((memRes as any).data || []);
    } catch (err: any) {
      const status = err?.response?.status || err?.status;
      if (status === 403) {
        setError('접근 권한이 없습니다. 포럼 개설자만 회원을 관리할 수 있습니다.');
      } else {
        setError(err?.message || '데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const reloadLists = async () => {
    if (!forumId) return;
    try {
      const [reqRes, memRes] = await Promise.all([
        forumMembershipApi.getJoinRequests(forumId),
        forumMembershipApi.getMembers(forumId),
      ]);
      setJoinRequests((reqRes as any).data || []);
      setMembers((memRes as any).data || []);
    } catch {
      // silent
    }
  };

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleApprove = async (requestId: string) => {
    if (!forumId || actionLoading) return;
    setActionLoading(requestId);
    setActionError(null);
    try {
      await forumMembershipApi.approveJoin(forumId, requestId);
      await reloadLists();
    } catch (err: any) {
      setActionError(err?.message || '승인에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!forumId || actionLoading) return;
    setActionLoading(requestId);
    setActionError(null);
    try {
      await forumMembershipApi.rejectJoin(forumId, requestId, rejectComment.trim() || undefined);
      setRejectingId(null);
      setRejectComment('');
      await reloadLists();
    } catch (err: any) {
      setActionError(err?.message || '거절에 실패했습니다.');
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
      await forumMembershipApi.removeMember(forumId, userId);
      await reloadLists();
    } catch (err: any) {
      setActionError(err?.message || '회원 삭제에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <MyPageNavigation items={KPA_MYPAGE_NAV_ITEMS} />

      {/* Back link */}
      <Link to="/mypage/my-forums" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        내 포럼으로 돌아가기
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-600" />
          {forumName ? `"${forumName}" 회원 관리` : '회원 관리'}
          {forumType === 'closed' && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">비공개</span>
          )}
        </h1>
        <p className="text-slate-500 mt-1">가입 신청을 처리하고 회원을 관리합니다</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-500">불러오는 중...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <Link to="/mypage/my-forums" className="text-sm text-red-600 font-medium hover:text-red-700 mt-1 inline-block">
              ← 내 포럼으로 돌아가기
            </Link>
          </div>
        </div>
      )}

      {/* Action error toast */}
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
          {/* ================================================================ */}
          {/* Section A: 가입 신청 */}
          {/* ================================================================ */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
              가입 신청
              {joinRequests.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
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
                        <div className="font-medium text-slate-800">
                          {req.user_display_name || req.requester_name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          {req.requester_email && <span>{req.requester_email}</span>}
                          <span>{formatDate(req.created_at)}</span>
                        </div>
                      </div>

                      {rejectingId === req.id ? (
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={() => { setRejectingId(null); setRejectComment(''); }}
                            className="px-3 py-1.5 text-sm text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoading === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            거절 확인
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading === req.id}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionLoading === req.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
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

                    {/* Reject comment input */}
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

          {/* ================================================================ */}
          {/* Section B: 회원 목록 */}
          {/* ================================================================ */}
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
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: member.role === 'owner' ? '#fef3c7' : '#f1f5f9' }}>
                        {member.role === 'owner'
                          ? <Crown className="w-4 h-4 text-amber-600" />
                          : <Users className="w-4 h-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800 truncate">
                            {member.user_name || '(이름 없음)'}
                          </span>
                          <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                            member.role === 'owner'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {member.role === 'owner' ? '운영자' : '회원'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          {member.user_email && <span>{member.user_email}</span>}
                          <span>가입 {formatDate(member.joined_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-3">
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id, member.user_name)}
                          disabled={actionLoading === member.user_id}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="회원 삭제"
                        >
                          {actionLoading === member.user_id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <UserMinus className="w-4 h-4" />}
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
