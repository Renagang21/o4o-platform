/**
 * AdminAccountsSettings — 관리자 계정 표준 목록 + 안전 유지관리
 *
 * WO-O4O-ADMIN-PLATFORM-SETTINGS-SUPER-ADMIN-ACCOUNT-MANAGEMENT-V1 (원본)
 * WO-O4O-ADMIN-ADMIN-ACCOUNTS-STANDARD-TABLE-AND-CRUD-V1:
 *   수동 <table> → O4O 표준 목록(BaseTable + FilterBar + RowActionMenu). 검색·상태·역할 필터,
 *   단건/일괄 활성화·비활성화, 비밀번호 재설정(기존 계약 재사용).
 *
 *   ⚠️ 중지 조건 #4 발동(부트스트랩 migration 이 특정 계정에 super_admin 재부여:
 *      ActivateAdminUser→sohae2100 / BootstrapCanonicalSeedAccounts→super-admin@o4o.com):
 *      WO 규정에 따라 "표준 목록 전환 + 안전한 기존 액션(list/비밀번호/활성토글/일괄토글)"까지만 구현.
 *      계정 생성(POST /admin/users)·이름·이메일 수정(PUT /admin/users/:id)·역할 할당 CRUD 는
 *      코드 미구현, CHECK 설계 보고로 남긴다.
 *
 * SSOT = role_assignments (RBAC F9). 역할 변경은 좌측 RBAC Role Assignment 화면. 본 탭은 역할 표시만.
 * 서버측 보호(backend enforce): 본인 비활성(SELF_LOCK) / 마지막 super_admin 비활성(LAST_SUPER_ADMIN) /
 *   super_admin 대상 변경은 super_admin 만(SUPER_ADMIN_ONLY). 목록 응답에 비밀번호·해시 없음.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Loader2, KeyRound, ShieldCheck, RefreshCw, Pencil } from 'lucide-react';
import { BaseTable, RowActionMenu, FilterBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

const MAX_ROLE_BADGES = 2;

// WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1:
//   역할 필터 canonical 화. backend(admin/platform-accounts.routes.ts)가 목록을 구성하는
//   기준과 동일한 4개 역할만 필터 옵션으로 노출한다. 계정의 roles 배열에는 legacy 무접두
//   역할(예: 'super_admin')이 섞여 들어오는데, 이는 role_assignments 잔재일 뿐 본 화면의
//   포함 기준이 아니므로 필터에서 제외한다(표시·검색·정렬에는 그대로 남는다).
const CANONICAL_ADMIN_ROLES = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
] as const;

interface AdminAccount {
  id: string;
  email: string;
  name: string;
  roles: string[];
  isActive: boolean;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
}

const MIN_PW = 8;
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const isSuper = (a: AdminAccount) => a.roles.includes('platform:super_admin');

const STATUS_OPTIONS = [
  { value: 'active', label: '활성' },
  { value: 'inactive', label: '비활성' },
];

export default function AdminAccountsSettings() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 필터·선택
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  // 비밀번호 재설정 모달
  const [pwTarget, setPwTarget] = useState<AdminAccount | null>(null);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  // WO-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1:
  //   재설정이 **적용되지 않은** 서비스 목록. toast 는 사라지므로 별도 결과 패널로 남긴다.
  const [pwResult, setPwResult] = useState<{ email: string; unaffected: string[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.api.get('/admin/platform-accounts');
      if (res.data?.success) setAccounts(res.data.data ?? []);
      else setError(res.data?.error || '목록을 불러오지 못했습니다.');
    } catch (e: any) {
      setError(e?.response?.data?.error || '최고/플랫폼 관리자만 접근할 수 있습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 목록에 등장하는 역할 → 필터 옵션
  // canonical 역할만, 각 옵션에 해당 계정 수를 함께 표기(필터 결과 건수와 일치).
  const roleOptions = useMemo(
    () =>
      CANONICAL_ADMIN_ROLES.map((r) => ({
        role: r,
        count: accounts.filter((a) => a.roles.includes(r)).length,
      }))
        .filter((o) => o.count > 0)
        .map((o) => ({ value: o.role, label: `${o.role} (${o.count})` })),
    [accounts],
  );

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (kw && !(a.name.toLowerCase().includes(kw) || a.email.toLowerCase().includes(kw) || a.roles.some((r) => r.toLowerCase().includes(kw)))) return false;
      if (statusFilter === 'active' && !a.isActive) return false;
      if (statusFilter === 'inactive' && a.isActive) return false;
      if (roleFilter && !a.roles.includes(roleFilter)) return false;
      return true;
    });
  }, [accounts, search, statusFilter, roleFilter]);

  const setStatus = async (acct: AdminAccount, next: boolean): Promise<boolean> => {
    const res = await authClient.api.patch(`/admin/platform-accounts/${acct.id}/status`, { isActive: next });
    if (res.data?.success) return true;
    toast.error(res.data?.error || `${acct.email}: 상태 변경 실패`);
    return false;
  };

  const toggleStatus = async (acct: AdminAccount) => {
    const next = !acct.isActive;
    if (!window.confirm(`${acct.email} 계정을 ${next ? '활성화' : '비활성화'} 하시겠습니까?`)) return;
    setBusyId(acct.id);
    try {
      if (await setStatus(acct, next)) { toast.success('상태가 변경되었습니다.'); await load(); }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || '상태 변경에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  // 일괄 활성/비활성 — 기존 status API 반복. 본인/마지막 super_admin 은 backend 가 개별 차단(집계).
  const handleBulk = async () => {
    if (!bulkAction || selectedKeys.size === 0) { toast.error('작업과 대상을 선택해 주세요.'); return; }
    const next = bulkAction === 'activate';
    const targets = accounts.filter((a) => selectedKeys.has(a.id) && a.isActive !== next);
    if (targets.length === 0) { toast('변경할 대상이 없습니다.'); return; }
    if (!window.confirm(`${targets.length}개 계정을 ${next ? '활성화' : '비활성화'} 하시겠습니까?`)) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(targets.map((a) => setStatus(a, next)));
      const ok = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
      const fail = targets.length - ok;
      if (fail === 0) toast.success(`${ok}개 계정 상태 변경 완료`);
      else toast.error(`${fail}개 실패 (성공 ${ok}개) — 본인/마지막 super_admin 등은 보호됩니다.`);
      setSelectedKeys(new Set());
      setBulkAction('');
      await load();
    } finally {
      setBulkBusy(false);
    }
  };

  const openPwModal = (acct: AdminAccount) => { setPwTarget(acct); setPw1(''); setPw2(''); };
  const closePwModal = () => { if (!pwSaving) { setPwTarget(null); setPw1(''); setPw2(''); } };

  const submitPw = async () => {
    if (!pwTarget) return;
    if (pw1.length < MIN_PW) { toast.error(`비밀번호는 최소 ${MIN_PW}자 이상이어야 합니다.`); return; }
    if (pw1 !== pw2) { toast.error('새 비밀번호 확인이 일치하지 않습니다.'); return; }
    setPwSaving(true);
    try {
      const res = await authClient.api.patch(`/admin/platform-accounts/${pwTarget.id}/password`, { newPassword: pw1 });
      if (res.data?.success) {
        // WO-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1:
        //   재설정은 플랫폼 자격(users.password)에만 적용된다. 서비스별 credential 이 있는 계정은
        //   그 서비스 로그인 비밀번호가 **바뀌지 않는다** — 성공 toast 만 띄우면 관리자가
        //   "전부 바뀌었다"고 오인한다. 서버가 내려준 미적용 범위를 그대로 노출한다.
        const unaffected: string[] = res.data?.data?.unaffectedServiceKeys ?? [];
        if (unaffected.length > 0) {
          setPwResult({ email: pwTarget.email, unaffected });
          toast.success('플랫폼 로그인 비밀번호가 재설정되었습니다.');
        } else {
          toast.success('비밀번호가 재설정되었습니다.');
        }
        setPwTarget(null); setPw1(''); setPw2('');
      }
      else toast.error(res.data?.error || '비밀번호 재설정에 실패했습니다.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setPwSaving(false);
    }
  };

  // 행 선택 토글 (BaseTable 은 header select-all 만 자동 렌더 — row 체크박스는 _select 컬럼 render 로 제공)
  const toggleRow = useCallback((id: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // 행별 '전체 역할 보기' 펼침 상태
  const toggleRoles = useCallback((id: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const columns: O4OColumn<AdminAccount>[] = useMemo(() => [
    {
      // WO-O4O-ADMIN-ADMIN-ACCOUNTS-TABLE-USABILITY-FIX-V1:
      //   행 체크박스 — BaseTable selectable 은 header select-all 만 자동. row 는 _select 컬럼 render 필요.
      key: '_select',
      header: '',
      system: true,
      width: 44,
      align: 'center',
      render: (_: unknown, a: AdminAccount) => (
        <input
          type="checkbox"
          checked={selectedKeys.has(a.id)}
          onChange={() => toggleRow(a.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 accent-blue-600 cursor-pointer"
          aria-label={`${a.email} 선택`}
        />
      ),
    },
    {
      key: 'name',
      header: '이름 / 이메일',
      sortable: true,
      sortAccessor: (a: AdminAccount) => a.name,
      render: (_: unknown, a: AdminAccount) => (
        <div>
          <div className="flex items-center gap-1.5 font-medium text-o4o-text-primary">
            {isSuper(a) && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
            {a.name}
          </div>
          <div className="text-xs text-slate-500">{a.email}</div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: '역할',
      width: 220,
      // WO-O4O-ADMIN-ADMIN-ACCOUNTS-TABLE-USABILITY-FIX-V1:
      //   과밀 방지 — 대표 2개만 배지, 나머지는 +N. title 로 전체 역할 확인.
      // WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1:
      //   '전체 역할 보기' — +N 을 클릭하면 해당 행의 역할을 모두 펼친다(title hover 로만
      //   확인 가능하던 것을 명시적 토글로 승격). 축약은 표시 계층에만 적용되므로
      //   필터·정렬·검색은 계속 원본 roles 배열 기준이다.
      render: (_: unknown, a: AdminAccount) => {
        const expanded = expandedRoles.has(a.id);
        const shown = expanded ? a.roles : a.roles.slice(0, MAX_ROLE_BADGES);
        const rest = a.roles.length - shown.length;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {shown.map((r) => (
              <span key={r} className={`inline-block px-2 py-0.5 text-xs rounded ${r === 'platform:super_admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{r}</span>
            ))}
            {(rest > 0 || expanded) && (
              <button
                type="button"
                onClick={() => toggleRoles(a.id)}
                title={expanded ? '역할 접기' : `전체 역할 보기 — ${a.roles.join(', ')}`}
                className="inline-block px-2 py-0.5 text-xs rounded bg-slate-200 text-slate-600 font-medium hover:bg-slate-300"
              >
                {expanded ? '접기' : `+${rest}`}
              </button>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: '상태',
      width: 90,
      align: 'center',
      sortable: true,
      sortAccessor: (a) => (a.isActive ? 'active' : 'inactive'),
      render: (_, a) => (
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${a.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {a.isActive ? '활성' : '비활성'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '생성일',
      width: 110,
      sortable: true,
      sortAccessor: (a) => a.createdAt,
      render: (_, a) => <span className="text-slate-500">{fmt(a.createdAt)}</span>,
    },
    {
      key: 'lastLoginAt',
      header: '마지막 로그인',
      width: 120,
      sortable: true,
      sortAccessor: (a) => a.lastLoginAt || '',
      render: (_, a) => <span className="text-slate-500">{fmt(a.lastLoginAt)}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: 'last',
      align: 'center',
      render: (_: unknown, a: AdminAccount) => (
        <RowActionMenu
          actions={[
            {
              // 역할 변경은 RBAC Role Assignment 화면(계정 편집)으로 연결 — 본 탭은 역할 표시만.
              key: 'edit',
              label: '수정 (역할 관리)',
              icon: <Pencil size={14} />,
              variant: 'primary',
              onClick: () => navigate(`/users/${a.id}/edit`),
            },
            {
              key: 'password',
              label: '비밀번호 재설정',
              icon: <KeyRound size={14} />,
              onClick: () => openPwModal(a),
            },
            {
              key: 'toggle',
              label: a.isActive ? '비활성화' : '활성화',
              variant: a.isActive ? 'danger' : 'primary',
              disabled: busyId === a.id,
              onClick: () => toggleStatus(a),
            },
          ]}
        />
      ),
    },
  ], [selectedKeys, expandedRoles, busyId, toggleRow, toggleRoles, navigate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-o4o-text-primary">관리자 계정</h2>
          <p className="mt-1 text-sm text-o4o-text-secondary">
            최고/플랫폼 관리자 계정의 로그인 ID·역할·활성 상태를 확인하고, 비밀번호 재설정과 활성 여부를 관리합니다.
            기존 비밀번호는 조회·표시되지 않습니다. <span className="font-medium">역할 변경은 좌측 메뉴의 RBAC Role Assignment에서 관리합니다.</span>
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 새로고침
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <FilterBar
              searchPlaceholder="이름 · 이메일 · 역할 검색"
              searchValue={search}
              onSearchChange={setSearch}
              filters={[
                { key: 'status', placeholder: '전체 상태', options: STATUS_OPTIONS },
                { key: 'role', placeholder: '전체 역할', options: roleOptions },
              ]}
              filterValues={{ status: statusFilter, role: roleFilter }}
              onFilterChange={(k, v) => { if (k === 'status') setStatusFilter(v); else if (k === 'role') setRoleFilter(v); }}
            >
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                <option value="">일괄 작업</option>
                <option value="activate">활성화</option>
                <option value="deactivate">비활성화</option>
              </select>
              <button
                type="button"
                onClick={handleBulk}
                disabled={selectedKeys.size === 0 || !bulkAction || bulkBusy}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-40"
              >
                {bulkBusy ? '처리 중…' : `적용 (${selectedKeys.size})`}
              </button>
            </FilterBar>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <BaseTable<AdminAccount>
              columns={columns}
              data={filtered}
              rowKey={(a) => a.id}
              tableId="admin-accounts-list"
              persistState
              columnVisibility
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              emptyMessage="표시할 관리자 계정이 없습니다."
            />
          </div>
        </>
      )}

      {/* 비밀번호 재설정 모달 */}
      {pwTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closePwModal}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-o4o-text-primary">비밀번호 재설정</h3>
            <p className="mt-1 text-sm text-slate-500">{pwTarget.email} 계정의 새 비밀번호를 설정합니다. 기존 비밀번호는 표시되지 않습니다.</p>
            {/* WO-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1:
                적용 범위를 **설정 전에** 알린다. 서비스별 비밀번호를 따로 쓰는 계정은
                이 재설정으로 해당 서비스 로그인이 바뀌지 않는다(설계된 자격 분리). */}
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              이 재설정은 <span className="font-semibold">플랫폼 로그인 비밀번호</span>에 적용됩니다.
              서비스별 로그인 비밀번호를 따로 사용하는 계정은 해당 서비스의 비밀번호가 변경되지 않으며,
              사용자가 각 서비스의 &ldquo;비밀번호 찾기&rdquo;로 직접 재설정해야 합니다.
              설정 후 적용되지 않은 서비스를 안내합니다.
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">새 비밀번호</label>
                <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`최소 ${MIN_PW}자`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">새 비밀번호 확인</label>
                <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="다시 입력" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closePwModal} disabled={pwSaving}
                className="px-3 py-2 text-sm font-medium text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">취소</button>
              <button type="button" onClick={submitPw} disabled={pwSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {pwSaving && <Loader2 className="w-4 h-4 animate-spin" />} 새 비밀번호 설정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WO-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1:
          재설정이 적용되지 않은 서비스 결과. toast 는 사라지므로 닫을 때까지 남는 패널로 알린다. */}
      {pwResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setPwResult(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-o4o-text-primary">일부 서비스에는 적용되지 않았습니다</h3>
            <p className="mt-1 text-sm text-slate-600">
              {pwResult.email} 계정의 <span className="font-semibold">플랫폼 로그인 비밀번호</span>는 재설정됐습니다.
            </p>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">아래 서비스의 로그인 비밀번호는 변경되지 않았습니다.</p>
              <ul className="mt-2 list-disc pl-5">
                {pwResult.unaffected.map((k) => (<li key={k}>{k}</li>))}
              </ul>
              <p className="mt-2 text-xs">
                이 서비스들은 서비스 전용 비밀번호를 사용합니다. 사용자가 각 서비스의
                &ldquo;비밀번호 찾기&rdquo;로 직접 재설정해야 로그인할 수 있습니다.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setPwResult(null)}
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
