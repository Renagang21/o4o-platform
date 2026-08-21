/**
 * OperatorMembersConsolePage — Operator Members 공통 wrapper
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1
 *
 * Neture / GlycoPharm / K-Cosmetics 3 service 의 Operator Members list-side UI 를
 * 단일 wrapper 로 정렬. KPA 는 KpaMember entity 기반 별도 페이지 (MemberManagementPage) 유지.
 *
 * IR: docs/investigations/IR-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-DESIGN-V1.md (Option C)
 * 선행: WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1 (Hybrid Canonical — Drawer + 전체 상세 link)
 *
 * Canonical UX = Neture 패턴:
 *   - Selectable DataTable + row click → Drawer
 *   - Drawer footer = status-aware action (approve/reject/suspend/activate)
 *   - ActionBar = bulk approve/reject
 *   - RowActionMenu = utility (edit / password / delete) — status 는 drawer 로 통일
 *   - Drawer body footer = "전체 상세 페이지 →" (CommonUserDetailPage 진입)
 *
 * WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1:
 *   `consoleMode='approval'` (가입 승인 전용) 추가. 회원 일반 관리 endpoint 가 없는
 *   서비스(Pharmacy-Hub)를 위해 통계 카드 · 행 선택/일괄 처리 · 정지/활성화 · 수정/
 *   비밀번호/삭제 액션을 제거하고 승인/반려만 남긴다. 각 affordance 는 client 메서드
 *   또는 render slot 의 **존재 여부**로도 개별 판단하므로 기존 서비스는 무변경이다.
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
// WO-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1: URL query sync(opt-in)
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  UserCheck,
  UserX,
  KeyRound,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu, BaseDetailDrawer } from '@o4o/ui';
import {
  DataTable,
  MemberListLayout,
  StatusBadge,
  RoleBadge,
  defineActionPolicy,
  buildRowActions,
  useBatchAction,
} from '@o4o/operator-ux-core';
import type { ListColumnDef, MemberTab, BuiltAction } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
// WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2:
//   서비스 표시명은 @o4o/types 의 SSOT 를 사용한다(하드코딩 금지).
import { getServiceDisplayName } from '@o4o/types';

/**
 * 비밀번호 정책 — WO-O4O-PASSWORD-COMPLEXITY-POLICY-UNIFY-V1
 *
 * 8자 이상 + 영문 1자 + 숫자 1자 (특수문자는 허용하되 필수 아님).
 * 이 패키지는 `@o4o/auth-utils` 에 의존하지 않으므로(새 의존 구조를 만들지 않는다는 조건)
 * 동일 규칙을 로컬로 둔다. 최종 강제는 백엔드가 하며 계약은 양쪽 테스트로 고정한다.
 */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_POLICY_MESSAGE = '비밀번호는 8자 이상이며 영문과 숫자를 각각 1자 이상 포함해야 합니다.';
function isPasswordPolicyCompliant(pw: string): boolean {
  return pw.length >= PASSWORD_MIN_LENGTH && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

import type {
  MembersConsoleClient,
  MembersConsoleListParams,
  OperatorMembersConsolePageProps,
  PaginationData,
  UserData,
  MembersStatusTab,
  MembersRowActionConfig,
  MembersBulkActionConfig,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────

function getUserName(u: UserData): string {
  if (u.lastName || u.firstName) {
    const full = `${u.lastName || ''}${u.firstName || ''}`.trim();
    if (full) return full;
  }
  if (u.name && u.name !== u.email) return u.name;
  return u.email?.split('@')[0] || '사용자';
}

function defaultGetPrimaryRole(serviceKey: string) {
  return (u: UserData): string => {
    const membership = u.memberships?.find((m) => m.serviceKey === serviceKey);
    if (membership?.role) return membership.role;
    const roles = u.roles || (u.role ? [u.role] : []);
    return roles[0] || 'user';
  };
}

// ─── Password Modal (built-in) ───────────────────────────────

interface PasswordModalProps {
  user: UserData;
  client: MembersConsoleClient;
  onClose: () => void;
  onSuccess: () => void;
}

function PasswordModal({ user, client, onClose, onSuccess }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2:
  //   비밀번호는 서비스별로 독립하므로 **어느 서비스의 비밀번호인지** 반드시 정해야 한다.
  //   후보 = 호출자 관리 범위 ∩ 대상자 Membership.
  //   목록 API 가 이미 운영자 scope 로 memberships 를 필터해 내려주므로(platform admin 은 전체),
  //   여기서는 그 값을 그대로 후보로 쓴다 — 별도 API 를 추가하지 않는다.
  const candidates = useMemo(() => {
    const keys = (user.memberships ?? []).map((m) => m.serviceKey).filter(Boolean);
    return Array.from(new Set(keys));
  }, [user.memberships]);

  // 후보가 하나면 자동 확정한다(그래도 화면에는 서비스명을 표시한다).
  const [serviceKey, setServiceKey] = useState(candidates.length === 1 ? candidates[0] : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceKey) {
      setError('비밀번호를 변경할 서비스를 선택해주세요.');
      return;
    }
    if (!isPasswordPolicyCompliant(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (!client.updatePassword) {
      setError('이 서비스는 비밀번호 변경을 지원하지 않습니다.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await client.updatePassword(user.id, password, serviceKey);
      toast.success(`${getServiceDisplayName(serviceKey)} 비밀번호가 변경되었습니다.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">비밀번호 변경</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          {getUserName(user)} ({user.email})
        </p>

        {/* WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2:
            비밀번호는 서비스별로 독립하므로 대상 서비스를 항상 화면에 드러낸다.
            후보 0 → 변경 불가 안내 / 1 → 표시 후 자동 확정 / 복수 → 명시적 선택 필수 */}
        {candidates.length === 0 ? (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              이 회원의 비밀번호를 변경할 수 있는 서비스가 없습니다.
              <br />
              내가 관리하는 서비스 중 이 회원이 가입한 서비스가 없습니다.
            </span>
          </div>
        ) : candidates.length === 1 ? (
          <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm mb-4">
            <span className="text-slate-500">대상 서비스</span>
            <span className="ml-2 font-semibold text-slate-800">{getServiceDisplayName(candidates[0])}</span>
            <p className="mt-1 text-xs text-slate-500">이 서비스의 로그인 비밀번호만 변경됩니다.</p>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              대상 서비스 <span className="text-red-500">*</span>
            </label>
            <select
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">서비스를 선택하세요</option>
              {candidates.map((key) => (
                <option key={key} value={key}>
                  {getServiceDisplayName(key)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              선택한 서비스의 로그인 비밀번호만 변경됩니다. 다른 서비스는 영향받지 않습니다.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="새 비밀번호 (영문·숫자 포함 8자 이상)"
              className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || !serviceKey}
              className="flex-1 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? '처리 중...' : '변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Action Policy (utility only — canonical) ────────────────

interface BuildActionPolicyOptions {
  serviceKey: string;
  hasDelete: boolean;
  hasEdit: boolean;
  hasPassword: boolean;
}

function buildUserActionPolicy({
  serviceKey,
  hasDelete,
  hasEdit,
  hasPassword,
}: BuildActionPolicyOptions) {
  const rules: Array<any> = [];
  if (hasEdit) rules.push({ key: 'edit', label: '정보 수정' });
  if (hasPassword) rules.push({ key: 'password', label: '비밀번호 변경' });
  if (hasDelete) {
    rules.push({
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      divider: true,
    });
  }
  return defineActionPolicy<UserData>(`${serviceKey}:users`, {
    inlineMax: 0, // 상태 변경은 drawer 로 통일, utility 만 overflow menu
    rules,
  });
}

const USER_ACTION_ICONS: Record<string, ReactNode> = {
  edit: <Pencil className="w-4 h-4" />,
  password: <KeyRound className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

// ─── Main Component ──────────────────────────────────────────

export function OperatorMembersConsolePage({
  serviceKey,
  client,
  title = '회원 관리',
  description = '회원 승인, 상태 변경, 서비스 멤버십 관리',
  roleTabs,
  statusTabs,
  getPrimaryRole: getPrimaryRoleProp,
  roleDisplayMap,
  roleColumnHeader = '유형',
  extraColumn,
  extraColumns,
  extraRowActions,
  extraBulkActions,
  drawerExtraSections,
  renderEditModal,
  renderDeleteFlow,
  searchPlaceholder,
  tableId,
  // WO-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1 (opt-in)
  serverSort = false,
  syncUrl = false,
  // WO-O4O-PHARMACY-HUB-OPERATOR-MEMBERSHIP-CONSOLE-COMMON-CORE-ADOPTION-V1
  consoleMode = 'members',
  rejectReason,
  fullDetailHref,
}: OperatorMembersConsolePageProps) {
  /** 가입 승인 전용 콘솔 — 회원 일반 관리 affordance 를 노출하지 않는다. */
  const isApprovalOnly = consoleMode === 'approval';

  /** 각 affordance 는 승인 전용 모드 + client/slot 존재 여부로 함께 결정한다. */
  const canEdit = !isApprovalOnly && !!renderEditModal;
  const canChangePassword = !isApprovalOnly && !!client.updatePassword;
  const canDelete = !isApprovalOnly && !!renderDeleteFlow;
  const canBulk = !isApprovalOnly && !!client.batchUpdateStatus;
  const showStats = !isApprovalOnly && !!client.stats;
  const getPrimaryRole = useMemo(
    () => getPrimaryRoleProp ?? defaultGetPrimaryRole(serviceKey),
    [getPrimaryRoleProp, serviceKey],
  );

  // ─── URL query sync (opt-in) ─────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const uk = (key: string) => `members_${key}`;
  const initParam = (key: string) => (syncUrl ? searchParams.get(uk(key)) : null);
  const initPage = (() => {
    const p = parseInt(initParam('page') || '', 10);
    return Number.isFinite(p) && p > 0 ? p : 1;
  })();
  const initOrder = initParam('sortOrder');

  const [activeTab, setActiveTab] = useState(() => initParam('tab') || 'all');
  const [page, setPage] = useState<number>(initPage);
  const [sortBy, setSortBy] = useState<string>(() => initParam('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    initOrder === 'asc' || initOrder === 'desc' ? initOrder : 'desc',
  );
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(() => initParam('search') || '');
  const [searchQuery, setSearchQuery] = useState(() => initParam('search') || '');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserData | null>(null);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const batch = useBatchAction();

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    rejected: 0,
    roleCounts: {} as Record<string, number>,
    statusCounts: {} as Record<string, number>,
  });

  // ─── Fetch ──────────────────────────────────────────────────

  // page 는 state 기반(URL sync/복원 대응). 별도 인자 없이 현재 page 를 조회.
  const fetchUsers = useCallback(
    async () => {
      setLoading(true);
      setError('');
      try {
        const activeStatusTab = (statusTabs ?? []).find((t) => t.key === activeTab);
        const params: MembersConsoleListParams = {
          page,
          limit: 20,
          ...(activeTab === 'pending' ? { status: 'pending' } : {}),
          ...(activeStatusTab ? { status: activeStatusTab.status } : {}),
          ...(searchQuery ? { search: searchQuery } : {}),
          ...(serverSort ? { sortBy, sortOrder: sortOrder.toUpperCase() as 'ASC' | 'DESC' } : {}),
        };
        const data = await client.list(params);
        setUsers(data.users || []);
        setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 0 });
      } catch (err: any) {
        setError(err?.message || '회원 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [client, page, activeTab, searchQuery, statusTabs, serverSort, sortBy, sortOrder],
  );

  const fetchStats = useCallback(async () => {
    // client.stats / listAll 은 선택 계약이다. 미제공 서비스(가입 승인 전용 콘솔)는
    // 통계·탭 count 없이 동작한다 — 없는 endpoint 를 호출하지 않는다.
    if (!client.stats) return;
    try {
      const statsRes = await client.stats();
      const byStatus = statsRes.statistics?.byStatus || [];
      const getCount = (s: string) => byStatus.find((b) => b.status === s)?.count || 0;

      const allData = client.listAll ? await client.listAll() : { users: [] as UserData[] };
      const allUsers: UserData[] = allData.users || [];
      const roleCounts: Record<string, number> = {};
      roleTabs.forEach((tab) => {
        roleCounts[tab.key] = allUsers.filter((u) => tab.roleFilter.includes(getPrimaryRole(u))).length;
      });

      const statusCounts: Record<string, number> = {};
      (statusTabs ?? []).forEach((st) => {
        statusCounts[st.key] = getCount(st.status);
      });

      setStats({
        total: statsRes.statistics?.total || 0,
        active: getCount('active') + getCount('approved'),
        pending: getCount('pending'),
        rejected: getCount('rejected'),
        roleCounts,
        statusCounts,
      });
    } catch {
      // stats failure is non-critical
    }
  }, [client, roleTabs, statusTabs, getPrimaryRole]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // WO-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1: URL query sync (opt-in)
  useEffect(() => {
    if (!syncUrl) return;
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        const put = (key: string, v: string | undefined) => {
          if (!v) sp.delete(uk(key));
          else sp.set(uk(key), v);
        };
        put('tab', activeTab !== 'all' ? activeTab : undefined);
        put('search', searchQuery || undefined);
        put('page', page > 1 ? String(page) : undefined);
        put('sortBy', serverSort && sortBy !== 'createdAt' ? sortBy : undefined);
        put('sortOrder', serverSort && sortOrder !== 'desc' ? sortOrder : undefined);
        return sp;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncUrl, serverSort, activeTab, searchQuery, page, sortBy, sortOrder]);

  // Reset selection on tab/search/page/sort change
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedUser(null);
  }, [activeTab, searchQuery, page, sortBy, sortOrder]);

  // 다른 건을 열면 이전 반려 사유가 남지 않도록 초기화한다.
  useEffect(() => {
    setRejectReasonText('');
  }, [selectedUser?.id]);

  // 서버 정렬 변경 — page=1 reset
  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
    setPage(1);
  }, []);

  // ─── Status & Password Handlers ─────────────────────────────

  const handleStatusChange = async (
    userId: string,
    status: string,
    currentStatus?: string,
    user?: UserData,
    options?: { reason?: string },
  ) => {
    setActionLoading(userId);
    try {
      await client.updateStatus(userId, status, currentStatus, user, options);
      setSelectedUser(null);
      setRejectReasonText('');
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || '오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Batch Actions ──────────────────────────────────────────

  const selectedPendingIds = useMemo(
    () => [...selectedIds].filter((id) => users.find((u) => u.id === id)?.status === 'pending'),
    [selectedIds, users],
  );

  const selectedApprovableIds = useMemo(
    () =>
      [...selectedIds].filter((id) => {
        const s = users.find((u) => u.id === id)?.status;
        return s === 'pending' || s === 'rejected';
      }),
    [selectedIds, users],
  );

  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.has(u.id)),
    [users, selectedIds],
  );

  const handleBulkApprove = async () => {
    if (selectedApprovableIds.length === 0 || !client.batchUpdateStatus) return;
    const result = await batch.executeBatch(
      (batchIds: string[]) => client.batchUpdateStatus!(batchIds, 'approved'),
      selectedApprovableIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      fetchUsers();
      fetchStats();
    }
  };

  const handleBulkReject = async () => {
    if (selectedPendingIds.length === 0 || !client.batchUpdateStatus) return;
    const result = await batch.executeBatch(
      (batchIds: string[]) => client.batchUpdateStatus!(batchIds, 'rejected'),
      selectedPendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      fetchUsers();
      fetchStats();
    }
  };

  // ─── Role tab filtering (client-side) ───────────────────────

  const filteredUsers = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'pending') return users;
    if ((statusTabs ?? []).some((t) => t.key === activeTab)) return users; // server-filtered
    const tab = roleTabs.find((t) => t.key === activeTab);
    if (!tab || tab.roleFilter.length === 0) return users;
    return users.filter((u) => tab.roleFilter.includes(getPrimaryRole(u)));
  }, [users, activeTab, roleTabs, statusTabs, getPrimaryRole]);

  // ─── Tabs ───────────────────────────────────────────────────

  const tabs: MemberTab[] = useMemo(() => {
    // stats 를 제공하지 않는 서비스(client.stats 미구현)는 집계를 알 수 없다.
    // 이때 0 을 그리면 "전체 0" 처럼 실제 목록과 모순되는 표시가 되므로 count 를 생략한다.
    const c = (v: number | undefined) => (showStats ? v : undefined);
    return [
      { key: 'all', label: '전체', count: c(stats.total) },
      ...roleTabs.map((rt) => ({
        key: rt.key,
        label: rt.label,
        count: c(stats.roleCounts[rt.key] ?? 0),
      })),
      ...(statusTabs ?? []).map((st: MembersStatusTab) => ({
        key: st.key,
        label: st.label,
        count: c(stats.statusCounts[st.key]),
      })),
      { key: 'pending', label: '가입 신청', count: c(stats.pending) },
    ];
  }, [roleTabs, statusTabs, stats, showStats]);

  // ─── Bulk Action Bar ────────────────────────────────────────

  const extraBulkActionItems = (extraBulkActions ?? []).map((action: MembersBulkActionConfig) => {
    const targetIds = action.getTargetIds(selectedUsers);
    const count = targetIds.length;
    const label = typeof action.label === 'function' ? action.label(count) : action.label;
    return {
      key: action.key,
      label,
      onClick: async () => {
        if (count === 0) return;
        const result = await batch.executeBatch(action.executeBatch, targetIds);
        if (result.successCount > 0) {
          setSelectedIds(new Set());
          fetchUsers();
          fetchStats();
        }
      },
      variant: (action.variant ?? 'default') as 'primary' | 'danger' | 'default',
      icon: action.icon,
      loading: batch.loading,
      group: 'actions' as const,
      visible: (!action.visible || action.visible(selectedUsers)) && count > 0,
      disabled: count === 0 || batch.loading,
      confirm: action.confirm,
    };
  });

  const bulkActions = [
    {
      key: 'approve',
      label: `승인 (${selectedApprovableIds.length})`,
      onClick: handleBulkApprove,
      variant: 'primary' as const,
      icon: <UserCheck size={14} />,
      loading: batch.loading,
      group: 'actions',
      tooltip: '선택된 신청자를 일괄 승인합니다 (pending/rejected)',
      visible: selectedApprovableIds.length > 0,
    },
    {
      key: 'reject',
      label: `거부 (${selectedPendingIds.length})`,
      onClick: handleBulkReject,
      variant: 'danger' as const,
      icon: <UserX size={14} />,
      loading: batch.loading,
      group: 'actions',
      tooltip: '선택된 대기 신청자를 일괄 거부합니다',
      visible: selectedPendingIds.length > 0,
      confirm: {
        title: '일괄 거부 확인',
        message: `${selectedPendingIds.length}명의 대기 신청자를 일괄 거부합니다.`,
        variant: 'danger' as const,
        confirmText: '거부',
      },
    },
    ...extraBulkActionItems,
  ];

  // ─── DataTable Columns ──────────────────────────────────────

  const roleColumn: ListColumnDef<UserData> = {
    key: 'role',
    header: roleColumnHeader,
    width: '120px',
    render: (_v, user) => {
      const role = getPrimaryRole(user);
      const display = roleDisplayMap?.[role] ?? role;
      return <RoleBadge role={display} />;
    },
  };

  const baseColumns: ListColumnDef<UserData>[] = [
    {
      key: 'name',
      header: '이름',
      // 서버 정렬(serverSort)에는 'name' 단일 키가 없음(firstName/lastName 분리) → client 정렬 모드에서만 sortable
      sortable: !serverSort,
      width: '180px',
      // WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1:
      //   모바일에서 상태·권한 컬럼을 보려 가로 스크롤할 때 행 신원이 사라지지 않도록 고정.
      //   desktop 렌더는 변화 없음.
      stickyOnMobile: true,
      sortAccessor: (u) => getUserName(u),
      render: (_v, user) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
            {getUserName(user).charAt(0)}
          </div>
          <span className="font-medium text-slate-800 text-sm truncate">{getUserName(user)}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: '이메일',
      sortable: true,
      width: '220px',
    },
    roleColumn,
    ...(extraColumns ?? (extraColumn ? [extraColumn] : [])),
    {
      key: 'createdAt',
      header: '가입일',
      sortable: true,
      sortAccessor: (u) => new Date(u.createdAt).getTime(),
      width: '100px',
      render: (v: any) => (
        <span className="text-sm text-slate-600">{new Date(v).toLocaleDateString('ko-KR')}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (v: any) => <StatusBadge status={v} />,
    },
  ];

  const userActionPolicy = useMemo(
    () =>
      buildUserActionPolicy({
        serviceKey,
        hasDelete: canDelete,
        hasEdit: canEdit,
        hasPassword: canChangePassword,
      }),
    [serviceKey, canDelete, canEdit, canChangePassword],
  );

  const actionsColumn: ListColumnDef<UserData> = {
    key: '_actions',
    header: '액션',
    system: true,
    width: '60px',
    align: 'center',
    onCellClick: () => {}, // prevent row click from triggering drawer
    render: (_v, user) => {
      if (actionLoading === user.id) {
        return <Loader2 className="w-4 h-4 animate-spin text-slate-400" />;
      }
      const coreActions = buildRowActions(
        userActionPolicy,
        user,
        {
          edit: () => setEditUser(user),
          password: () => setPasswordUser(user),
          delete: () => setDeleteTarget(user),
        },
        { icons: USER_ACTION_ICONS },
      );
      const additionalActions: BuiltAction[] = (extraRowActions ?? [])
        .filter((a: MembersRowActionConfig) => !a.visible || a.visible(user))
        .map((a: MembersRowActionConfig) => ({
          key: a.key,
          label: a.label,
          variant: a.variant,
          icon: a.icon,
          divider: a.divider,
          hidden: false,
          disabled: false,
          loading: false,
          confirm: a.confirm,
          onClick: async () => {
            await a.onClick(user);
            fetchUsers();
            fetchStats();
          },
        }));
      return (
        <RowActionMenu
          actions={[...coreActions, ...additionalActions]}
          inlineMax={userActionPolicy.inlineMax}
        />
      );
    },
  };

  /** 액션이 하나도 없으면 빈 overflow 메뉴 컬럼을 만들지 않는다. */
  const hasRowActions =
    canEdit || canChangePassword || canDelete || (extraRowActions ?? []).length > 0;
  const columns: ListColumnDef<UserData>[] = hasRowActions
    ? [...baseColumns, actionsColumn]
    : baseColumns;

  // ─── Drawer: status-aware footer actions ────────────────────

  const drawerActions = useMemo(() => {
    if (!selectedUser) return [];
    const u = selectedUser;
    const isLoading = actionLoading === u.id;
    const actions: Array<{
      label: string;
      onClick: () => void;
      variant: 'primary' | 'danger';
      loading: boolean;
      disabled: boolean;
    }> = [];

    // 반려 사유 정책이 설정된 경우 사유 없이는 반려를 실행하지 않는다(백엔드 필수값).
    const reasonBlocked = !!rejectReason?.required && !rejectReasonText.trim();
    const reasonOptions = rejectReason ? { reason: rejectReasonText.trim() } : undefined;

    // 가입 승인 전용 콘솔: 승인 대기 건의 승인/반려만 제공한다.
    // 재승인 · 정지 · 활성화는 해당 서비스에 endpoint 가 없으므로 노출하지 않는다.
    if (isApprovalOnly) {
      if (u.status === 'pending') {
        actions.push({
          label: '승인',
          onClick: () => handleStatusChange(u.id, 'approved', u.status, u),
          variant: 'primary',
          loading: isLoading,
          disabled: isLoading,
        });
        actions.push({
          label: '반려',
          onClick: () => handleStatusChange(u.id, 'rejected', u.status, u, reasonOptions),
          variant: 'danger',
          loading: isLoading,
          disabled: isLoading || reasonBlocked,
        });
      }
      return actions;
    }

    if (u.status === 'pending' || u.status === 'rejected') {
      actions.push({
        label: '승인',
        onClick: () => handleStatusChange(u.id, 'approved', u.status, u),
        variant: 'primary',
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'pending') {
      actions.push({
        label: '반려',
        onClick: () => handleStatusChange(u.id, 'rejected', u.status, u, reasonOptions),
        variant: 'danger',
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'active' || u.status === 'approved') {
      actions.push({
        label: '비활성화',
        onClick: () => handleStatusChange(u.id, 'suspended', u.status, u),
        variant: 'danger',
        loading: isLoading,
        disabled: isLoading,
      });
    }
    if (u.status === 'suspended') {
      actions.push({
        label: '활성화',
        onClick: () => handleStatusChange(u.id, 'approved', u.status, u),
        variant: 'primary',
        loading: isLoading,
        disabled: isLoading,
      });
    }
    return actions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, actionLoading, isApprovalOnly, rejectReason, rejectReasonText]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Stats — client.stats() 를 제공하는 서비스에서만 표시 */}
      {showStats && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체', value: stats.total, icon: Users, color: 'slate' },
          { label: '활성', value: stats.active, icon: CheckCircle, color: 'green' },
          { label: '대기', value: stats.pending, icon: Clock, color: 'amber' },
          { label: '거부', value: stats.rejected, icon: XCircle, color: 'red' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 bg-${s.color}-100 rounded-lg flex items-center justify-center`}
              >
                <s.icon className={`w-5 h-5 text-${s.color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Member List Layout: Search + Tabs + Table */}
      <MemberListLayout
        title={title}
        description={description}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => {
          setActiveTab(key);
          setPage(1);
        }}
        search={search}
        onSearchChange={setSearch}
        onSearch={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        {...(searchPlaceholder !== undefined && { searchPlaceholder })}
        headerActions={
          <button
            onClick={() => {
              fetchUsers();
              fetchStats();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />새로고침
          </button>
        }
      >
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ActionBar — 선택 시 표시. 일괄 처리 endpoint 가 있는 서비스에서만 노출 */}
        {canBulk && (
        <div className="mb-3">
          <ActionBar
            selectedCount={selectedIds.size}
            onClearSelection={() => setSelectedIds(new Set())}
            actions={bulkActions}
          />
        </div>
        )}

        {/* BulkResultModal */}
        {canBulk && (
        <BulkResultModal
          open={batch.showResult}
          onClose={() => {
            batch.clearResult();
            fetchUsers();
            fetchStats();
          }}
          result={batch.result}
          onRetry={() => {
            batch.retryFailed();
          }}
        />
        )}

        {/* DataTable */}
        <DataTable<UserData>
          columns={columns}
          data={filteredUsers}
          rowKey="id"
          loading={loading}
          emptyMessage={
            activeTab === 'pending'
              ? '가입 신청이 없습니다.'
              : isApprovalOnly
                ? '해당 상태의 가입 신청이 없습니다.'
                : '등록된 사용자가 없습니다.'
          }
          onRowClick={(user) => setSelectedUser(user)}
          tableId={tableId ?? `${serviceKey}-operator-members`}
          {...(canBulk
            ? { selectable: true, selectedKeys: selectedIds, onSelectionChange: setSelectedIds }
            : {})}
          {...(serverSort
            ? { manualSort: true, sortBy, sortOrder, onSort: handleSort }
            : {})}
        />

        {/* Pagination */}
        {/* 서버에서 필터된 탭(all / pending / statusTabs)만 페이지네이션이 유효하다.
            role 탭은 현재 페이지 안에서 client-side 필터이므로 제외한다. */}
        {(activeTab === 'all' ||
          activeTab === 'pending' ||
          (statusTabs ?? []).some((t) => t.key === activeTab)) &&
          pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
            <span className="text-sm text-slate-600">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page >= pagination.totalPages}
              className="flex items-center gap-1 px-3 py-2 border rounded-lg disabled:opacity-50 hover:bg-slate-50"
            >
              다음
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </MemberListLayout>

      {/* ─── BaseDetailDrawer ─────────────────────────────────── */}
      <BaseDetailDrawer
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? getUserName(selectedUser) : ''}
        width={520}
        actions={drawerActions}
      >
        {selectedUser && (
          <div style={{ fontSize: 14, color: '#374151' }}>
            {/* 기본 정보 */}
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 16,
                    color: '#475569',
                    flexShrink: 0,
                  }}
                >
                  {getUserName(selectedUser).charAt(0)}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', marginBottom: 2 }}>
                    {getUserName(selectedUser)}
                  </p>
                  <p style={{ fontSize: 13, color: '#64748b' }}>{selectedUser.email}</p>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusBadge status={selectedUser.status} />
                </div>
              </div>
            </div>

            {/* 상세 필드 */}
            {[
              { label: '역할', value: roleDisplayMap?.[getPrimaryRole(selectedUser)] ?? getPrimaryRole(selectedUser) },
              { label: '가입일', value: new Date(selectedUser.createdAt).toLocaleDateString('ko-KR') },
              selectedUser.phone ? { label: '연락처', value: selectedUser.phone } : null,
              selectedUser.company ? { label: '소속', value: selectedUser.company } : null,
            ]
              .filter(Boolean)
              .map((item: any) => (
                <div key={item.label} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, color: '#64748b', minWidth: 60 }}>{item.label}</span>
                  <span style={{ color: '#1e293b' }}>{item.value}</span>
                </div>
              ))}

            {/* 서비스 멤버십 */}
            {selectedUser.memberships && selectedUser.memberships.length > 0 && (
              <div style={{ marginTop: 12, marginBottom: 12 }}>
                <p style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>서비스 멤버십</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedUser.memberships.map((m) => (
                    <span
                      key={m.id}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 500,
                        background:
                          m.status === 'active' ? '#eff6ff' : m.status === 'pending' ? '#fffbeb' : '#f1f5f9',
                        color:
                          m.status === 'active' ? '#1d4ed8' : m.status === 'pending' ? '#92400e' : '#64748b',
                      }}
                    >
                      {m.serviceKey} · {m.status}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 상태별 안내 */}
            {selectedUser.status === 'pending' && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  backgroundColor: '#fffbeb',
                  borderRadius: 8,
                  border: '1px solid #fde68a',
                }}
              >
                <p style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>
                  가입 신청 대기 중입니다. 아래 버튼으로 승인 또는 반려를 처리하세요.
                </p>
              </div>
            )}
            {selectedUser.status === 'rejected' && (
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  borderRadius: 8,
                  border: '1px solid #fecaca',
                }}
              >
                <p style={{ fontSize: 12, color: '#991b1b', fontWeight: 500 }}>
                  {isApprovalOnly ? '반려 처리된 신청입니다.' : '거부 처리된 신청입니다. 재승인이 가능합니다.'}
                </p>
              </div>
            )}

            {/* 반려 사유 입력 — rejectReason 정책이 설정된 서비스의 대기 건에만 노출 */}
            {rejectReason && selectedUser.status === 'pending' && (
              <div style={{ marginTop: 12 }}>
                <label
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 6 }}
                >
                  {rejectReason.label ?? '반려 사유'}
                  {rejectReason.required && <span style={{ color: '#dc2626' }}> *</span>}
                </label>
                <textarea
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  rows={3}
                  placeholder={rejectReason.placeholder ?? '반려 시 신청자에게 전달됩니다.'}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 13,
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    resize: 'vertical',
                  }}
                />
              </div>
            )}

            {/* Service-specific 확장 영역 */}
            {drawerExtraSections && drawerExtraSections(selectedUser)}

            {/* 전체 상세 링크 — fullDetailHref 가 null 이면 노출하지 않는다(데드링크 방지) */}
            {(() => {
              const href = fullDetailHref
                ? fullDetailHref(selectedUser)
                : `/operator/users/${selectedUser.id}`;
              if (!href) return null;
              return (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                  <a href={href} style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none' }}>
                    전체 상세 페이지 →
                  </a>
                </div>
              );
            })()}
          </div>
        )}
      </BaseDetailDrawer>

      {/* Password Modal */}
      {passwordUser && (
        <PasswordModal
          user={passwordUser}
          client={client}
          onClose={() => setPasswordUser(null)}
          onSuccess={() => {
            fetchUsers();
          }}
        />
      )}

      {/* Edit User Modal — service-provided slot */}
      {editUser &&
        renderEditModal &&
        renderEditModal({
          user: editUser,
          onClose: () => setEditUser(null),
          onSuccess: () => {
            fetchUsers();
          },
        })}

      {/* Delete Flow — service-provided slot */}
      {deleteTarget &&
        renderDeleteFlow &&
        renderDeleteFlow({
          user: deleteTarget,
          onClose: () => setDeleteTarget(null),
          onDeleted: () => {
            fetchUsers();
            fetchStats();
            setDeleteTarget(null);
          },
        })}
    </div>
  );
}
