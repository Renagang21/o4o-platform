/**
 * ForumDeletedManagementPage — Neture admin 전용 삭제된 포럼 관리
 *
 * WO-O4O-NETURE-FORUM-DELETE-OPERATOR-AND-ADMIN-SEPARATION-V1
 *
 * - 삭제된 포럼(archived) 목록 조회 + 복구(restore) + 완전 삭제(hard delete)
 * - 완전 삭제는 admin 전용 API(/api/v1/forum/admin/*) 만 호출 (서버 측 권한 검사)
 *   → 일반 operator 는 API 직접 호출로도 완전 삭제 불가.
 * - 삭제 이력(action_logs) 탭 제공.
 *
 * 진입: AdminRoute (neture:admin 또는 platform:super_admin)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Trash2, RefreshCw, RotateCcw, AlertOctagon, ShieldAlert, Search, History, Loader2,
} from 'lucide-react';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import { forumAdminApi } from '../../services/forumApi';

// ─── Types ──────────────────────────────────────────────────────────────────

type DeleteType = 'delete_request_approved' | 'operator_direct' | 'unknown';

interface DeletedForum {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  status: string;
  forumType: string;
  createdBy: string;
  creatorName?: string;
  createdAt: string;
  deleteType: DeleteType;
  deleteTypeLabel: string;
  deleteReason?: string | null;
  deletedBy?: string | null;
  deletedByName?: string | null;
  deletedAt?: string | null;
  postCount: number;
  commentCount: number;
  memberCount: number;
}

interface HardDeleteCheck {
  postCount: number;
  normalPostCount: number;
  orphanPostCount: number;
  memberCount: number;
  generalMemberCount: number;
  ownerCount: number;
  hardDeleteAllowed: boolean;
  blockedReasons: string[];
  warnings: string[];
}

interface AuditLog {
  id: string;
  actionKey: string;
  actorUserId: string | null;
  createdAt: string;
  meta: Record<string, any>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ACTION_LABEL: Record<string, string> = {
  'forum.delete_request.approve': '삭제 요청 승인',
  'forum.operator.soft_delete': 'Operator 직접 삭제',
  'forum.operator.hard_delete': 'Operator 완전 삭제',
  'forum.admin.restore': 'Admin 복구',
  'forum.admin.hard_delete': 'Admin 완전 삭제',
};

const TYPE_FILTERS: Array<{ key: 'all' | DeleteType; label: string }> = [
  { key: 'all', label: '전체' },
  { key: 'delete_request_approved', label: '소유자 삭제 요청 승인' },
  { key: 'operator_direct', label: 'Operator 직접 삭제' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = 'deleted' | 'history';

export default function ForumDeletedManagementPage() {
  const [tab, setTab] = useState<TabKey>('deleted');

  const [forums, setForums] = useState<DeletedForum[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DeleteType>('all');

  const [restoringId, setRestoringId] = useState<string | null>(null);

  // hard delete modal
  const [hdTarget, setHdTarget] = useState<DeletedForum | null>(null);
  const [hdCheck, setHdCheck] = useState<HardDeleteCheck | null>(null);
  const [hdCheckLoading, setHdCheckLoading] = useState(false);
  const [hdReason, setHdReason] = useState('');
  const [hdNameConfirm, setHdNameConfirm] = useState('');
  const [hdAck, setHdAck] = useState(false);
  const [hdSubmitting, setHdSubmitting] = useState(false);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const res = await forumAdminApi.getDeletedForums();
      setForums(res?.data || []);
    } catch {
      setForums([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await forumAdminApi.getAuditLogs(100);
      setLogs(res?.data || []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);
  useEffect(() => { if (tab === 'history') fetchLogs(); }, [tab, fetchLogs]);

  const filtered = useMemo(() => forums.filter((f) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || f.name.toLowerCase().includes(q) || (f.creatorName || '').toLowerCase().includes(q);
    const matchesType = typeFilter === 'all' || f.deleteType === typeFilter;
    return matchesSearch && matchesType;
  }), [forums, search, typeFilter]);

  // ── Restore ──────────────────────────────────────────────────────────────────
  const handleRestore = async (forum: DeletedForum) => {
    if (!confirm(`'${forum.name}' 포럼을 복구하시겠습니까?\n복구하면 일반 포럼 목록에 다시 노출됩니다.`)) return;
    setRestoringId(forum.id);
    try {
      const res = await forumAdminApi.restore(forum.id);
      if (res?.success) {
        const warnings: string[] = res?.data?.warnings || [];
        toast.success(`'${forum.name}' 포럼이 복구되었습니다${warnings.length ? ` (경고: ${warnings.join(', ')})` : ''}`);
        fetchDeleted();
      } else {
        toast.error(res?.error || '복구에 실패했습니다');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'RESTORE_CONFLICT') {
        const conflicts: string[] = data?.data?.conflicts || [];
        toast.error(`복구 불가: ${conflicts.join(', ') || '충돌'}`);
      } else {
        toast.error(data?.error || '복구 중 오류가 발생했습니다');
      }
    } finally {
      setRestoringId(null);
    }
  };

  // ── Hard delete ────────────────────────────────────────────────────────────
  const openHardDelete = async (forum: DeletedForum) => {
    setHdTarget(forum);
    setHdCheck(null);
    setHdReason('');
    setHdNameConfirm('');
    setHdAck(false);
    setHdCheckLoading(true);
    try {
      const res = await forumAdminApi.getHardDeleteCheck(forum.id);
      setHdCheck(res?.data || null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '완전 삭제 가능 여부를 확인할 수 없습니다');
      setHdTarget(null);
    } finally {
      setHdCheckLoading(false);
    }
  };

  const nameOk = !!hdTarget && hdNameConfirm.trim() === hdTarget.name;
  const canHardDelete = !!hdTarget && !!hdCheck?.hardDeleteAllowed && nameOk && hdReason.trim().length > 0 && hdAck;

  const confirmHardDelete = async () => {
    if (!hdTarget || !canHardDelete) return;
    setHdSubmitting(true);
    try {
      const res = await forumAdminApi.hardDelete(hdTarget.id, { reason: hdReason.trim() });
      if (res?.success) {
        toast.success(`'${hdTarget.name}' 포럼이 완전 삭제되었습니다`);
        setHdTarget(null);
        setHdCheck(null);
        fetchDeleted();
      } else {
        toast.error(res?.error || '완전 삭제에 실패했습니다');
      }
    } catch (err: any) {
      const data = err?.response?.data;
      const reasons = data?.data?.blockedReasons;
      toast.error(reasons ? `삭제 불가: ${reasons.join(', ')}` : (data?.error || '완전 삭제 중 오류가 발생했습니다'));
    } finally {
      setHdSubmitting(false);
    }
  };

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ListColumnDef<DeletedForum>[] = useMemo(() => [
    {
      key: 'name',
      header: '포럼명',
      render: (_v, f) => (
        <div>
          <div className="font-medium text-slate-800">{f.name}</div>
          <div className="text-xs text-slate-400">{f.creatorName || f.createdBy?.slice(0, 8)}</div>
        </div>
      ),
    },
    {
      key: 'deleteTypeLabel',
      header: '삭제 유형',
      width: '150px',
      render: (_v, f) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
          f.deleteType === 'delete_request_approved' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
        }`}>{f.deleteTypeLabel}</span>
      ),
    },
    {
      key: 'deleteReason',
      header: '삭제 사유',
      render: (_v, f) => <span className="text-sm text-slate-600 line-clamp-1">{f.deleteReason || '-'}</span>,
    },
    {
      key: 'deletedByName',
      header: '처리자',
      width: '110px',
      render: (_v, f) => <span className="text-sm text-slate-600">{f.deletedByName || (f.deletedBy ? f.deletedBy.slice(0, 8) : '-')}</span>,
    },
    {
      key: 'deletedAt',
      header: '삭제일',
      width: '150px',
      sortable: true,
      sortAccessor: (f) => (f.deletedAt ? new Date(f.deletedAt).getTime() : 0),
      render: (_v, f) => <span className="text-sm text-slate-500">{formatDate(f.deletedAt)}</span>,
    },
    {
      key: 'counts',
      header: '게시글/댓글/회원',
      width: '130px',
      render: (_v, f) => <span className="text-sm text-slate-500">{f.postCount} / {f.commentCount} / {f.memberCount}</span>,
    },
    {
      key: '_actions',
      header: '작업',
      align: 'center' as const,
      width: '170px',
      system: true,
      onCellClick: () => {},
      render: (_v, f) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => handleRestore(f)}
            disabled={restoringId === f.id}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-40"
            title="복구 (일반 목록에 다시 노출)"
          >
            {restoringId === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            복구
          </button>
          <button
            type="button"
            onClick={() => openHardDelete(f)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
            title="완전 삭제 (복구 불가)"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            완전 삭제
          </button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [restoringId]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 헤더 경고 배너 */}
      <div className="flex items-start gap-3 mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
        <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
        <div className="text-sm text-rose-700 space-y-1">
          <p className="font-semibold">admin 전용 — 삭제된 포럼 관리 (복구 / 완전 삭제)</p>
          <p>
            운영에서 내려진(비활성화된) 포럼을 복구하거나 영구 삭제합니다.
            영구 삭제는 포럼과 연결된 게시글·댓글·회원 관계가 함께 제거되며 <strong>복구할 수 없습니다.</strong>
            운영 삭제(비활성화)는 <a href="/operator/forum-delete" className="underline">포럼 삭제(운영자)</a>에서 수행하세요.
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab('deleted')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'deleted' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trash2 className="w-4 h-4" /> 삭제된 포럼
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            tab === 'history' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" /> 삭제 이력
        </button>
      </div>

      {tab === 'deleted' ? (
        <>
          {/* 검색 + 유형 필터 + 새로고침 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="포럼명 또는 생성자 검색"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | DeleteType)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              {TYPE_FILTERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <button
              type="button"
              onClick={fetchDeleted}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" /> 새로고침
            </button>
          </div>

          <DataTable<DeletedForum>
            columns={columns}
            data={filtered}
            rowKey="id"
            loading={loading}
            emptyMessage="삭제된 포럼이 없습니다."
            tableId="neture-admin-deleted-forums"
          />

          <div className="mt-3 text-sm text-slate-500">총 {filtered.length}개</div>
        </>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {logsLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" /> 이력 불러오는 중...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">삭제 이력이 없습니다.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                <div className="mt-0.5">
                  <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">
                    {ACTION_LABEL[log.actionKey] || log.actionKey}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 truncate">
                    {log.meta?.forumName || log.meta?.forumId || '-'}
                    {log.meta?.reason ? <span className="text-slate-500"> — {log.meta.reason}</span> : null}
                  </p>
                  <p className="text-xs text-slate-400">
                    처리자 {log.actorUserId ? log.actorUserId.slice(0, 8) : '-'}
                    {log.meta?.affectedCounts ? ` · 영향 ${JSON.stringify(log.meta.affectedCounts)}` : ''}
                    {' · '}{formatDate(log.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── 완전 삭제 모달 ── */}
      {hdTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => { setHdTarget(null); setHdCheck(null); }} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-200 bg-rose-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-rose-900">포럼 완전 삭제</h2>
                <p className="text-xs text-rose-600">이 작업은 복구할 수 없습니다</p>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800">{hdTarget.name}</p>
                {hdTarget.creatorName && <p className="text-sm text-slate-500 mt-0.5">개설자: {hdTarget.creatorName}</p>}
              </div>

              {hdCheckLoading && (
                <div className="flex items-center justify-center py-4 gap-2 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">삭제 가능 여부 확인 중...</span>
                </div>
              )}

              {hdCheck && (
                <>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-slate-50 text-center">
                      <p className="text-2xl font-bold text-slate-800">{hdCheck.postCount}</p>
                      <p className="text-slate-500 mt-0.5">게시글</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 text-center">
                      <p className="text-2xl font-bold text-slate-800">{hdCheck.generalMemberCount}</p>
                      <p className="text-slate-500 mt-0.5">일반 멤버</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 text-center">
                      <p className="text-2xl font-bold text-slate-800">{hdCheck.ownerCount}</p>
                      <p className="text-slate-500 mt-0.5">개설자</p>
                    </div>
                  </div>

                  {!hdCheck.hardDeleteAllowed ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
                      <p className="text-sm font-medium text-rose-700">완전 삭제 불가</p>
                      {hdCheck.blockedReasons.map((r, i) => <p key={i} className="text-sm text-rose-600">• {r}</p>)}
                    </div>
                  ) : (
                    <>
                      {hdCheck.warnings?.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                          {hdCheck.warnings.map((w, i) => <p key={i} className="text-sm text-amber-700">⚠ {w}</p>)}
                        </div>
                      )}
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                        완전 삭제하면 포럼과 연결된 게시글, 댓글, 회원 관계 및 관련 데이터가 영구 삭제됩니다. 이 작업은 복구할 수 없습니다.
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">삭제 사유 <span className="text-red-500">*</span></label>
                        <textarea
                          value={hdReason}
                          onChange={(e) => setHdReason(e.target.value)}
                          rows={2}
                          placeholder="예: 테스트 포럼 영구 정리"
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          확인을 위해 포럼명 <span className="font-semibold text-slate-900">{hdTarget.name}</span> 을(를) 입력하세요 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={hdNameConfirm}
                          onChange={(e) => setHdNameConfirm(e.target.value)}
                          placeholder="포럼명 입력"
                          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 text-sm"
                        />
                      </div>

                      <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={hdAck} onChange={(e) => setHdAck(e.target.checked)} className="mt-0.5" />
                        <span>이 작업은 복구할 수 없음을 이해했습니다.</span>
                      </label>
                    </>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => { setHdTarget(null); setHdCheck(null); }}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              {hdCheck?.hardDeleteAllowed && (
                <button
                  onClick={confirmHardDelete}
                  disabled={!canHardDelete || hdSubmitting}
                  className="px-6 py-2 text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {hdSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertOctagon className="w-4 h-4" />}
                  완전 삭제
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
