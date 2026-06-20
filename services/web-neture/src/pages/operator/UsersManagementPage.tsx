/**
 * UsersManagementPage — Neture 회원 관리 (thin wrapper)
 *
 * WO-O4O-OPERATOR-MEMBERS-LIST-COMMONIZATION-V1:
 *   917-line 구현을 @o4o/operator-core-ui/modules/members 의 OperatorMembersConsolePage
 *   thin wrapper 로 정합. Neture-specific 분기는 client adapter + slots 으로 흡수:
 *     - registration approve/reject endpoint → client.updateStatus / batchUpdateStatus
 *     - getPrimaryRole + NETURE_ROLE_DISPLAY → getPrimaryRole + roleDisplayMap props
 *     - dashboardAccess column → extraColumn prop
 *     - soft + hard delete 흐름 → renderDeleteFlow slot
 *     - EditUserModal → renderEditModal slot
 *
 * 선행:
 *   - WO-O4O-NETURE-OPERATOR-DASHBOARD-IMPLEMENTATION-V1
 *   - WO-O4O-NETURE-USERS-CANONICAL-APPLY-V1
 *   - WO-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-CANONICALIZATION-V1 (Hybrid Canonical)
 */

import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserCheck, UserMinus, UserX, Info, ArrowRight } from 'lucide-react';
import {
  OperatorMembersConsolePage,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
} from '@o4o/operator-core-ui/modules/members';
import { toast } from '@o4o/error-handling';
import { api } from '@/lib/apiClient';
import { operatorSupplierApi } from '@/lib/api/admin';
import EditUserModal from './EditUserModal';

// ─── Helpers — Neture-specific role/dashboard logic ──────────

// WO-O4O-NETURE-MEMBER-LIST-MODAL-PERMISSION-DISPLAY-CORRECTION-V1:
//   회원 유형(참여 유형)과 운영 권한을 분리 표시한다. 두 축 모두 동일한 token 집합
//   (role_assignments roles[] ∪ user.role ∪ neture membership.role)에서 도출하여
//   "대시보드 접근" 컬럼 기준과 일치시킨다. 데이터(membership.role / role_assignments)는
//   수정하지 않고 표시만 정렬한다.
function netureTokens(u: UserData): Set<string> {
  return new Set<string>([
    ...(u.roles ?? []),
    ...(u.role ? [u.role] : []),
    ...(u.memberships ?? []).filter((m) => m.serviceKey === 'neture').map((m) => m.role),
  ]);
}

// "회원 유형" 컬럼 + roleTabs 필터용. 참여 유형(공급자/파트너/셀러)만 도출, 없으면 general(일반 회원).
// operator/admin 등 운영 권한은 여기서 제외 — 별도 "운영 권한" 컬럼이 담당한다.
const NETURE_PARTICIPANT_ROLES: ReadonlyArray<string> = ['supplier', 'partner', 'seller'];
function getPrimaryRole(u: UserData): string {
  const t = netureTokens(u);
  return NETURE_PARTICIPANT_ROLES.find((r) => t.has(r) || t.has(`neture:${r}`)) ?? 'general';
}

// "운영 권한" 컬럼용. 관리자 > 운영자 우선순위. bare/namespaced 모두 인정(대시보드 로직과 동일).
function getOperatorRole(u: UserData): '관리자' | '운영자' | null {
  const t = netureTokens(u);
  if (t.has('platform:super_admin') || t.has('neture:admin') || t.has('admin')) return '관리자';
  if (t.has('neture:operator') || t.has('operator')) return '운영자';
  return null;
}

// WO-O4O-NETURE-SUPPLIER-DASHBOARD-ENTRY-AND-MEMBER-LIST-CLEANUP-V1
function getDashboardAccessLabels(u: UserData): string[] {
  const tokens = netureTokens(u);
  const labels: string[] = [];
  if (tokens.has('platform:super_admin') || tokens.has('neture:admin') || tokens.has('admin')) {
    labels.push('관리자 대시보드');
  }
  // WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1: "운영 대시보드" → "운영자 대시보드"
  if (tokens.has('neture:operator') || tokens.has('operator')) labels.push('운영자 대시보드');
  if (tokens.has('neture:supplier') || tokens.has('supplier')) labels.push('공급자 대시보드');
  if (tokens.has('neture:partner') || tokens.has('partner')) labels.push('파트너 대시보드');
  return labels;
}

// WO-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-AND-MEMBER-TYPE-FIX-V1:
// customer → consumer 매핑 제거 — Neture 는 "소비자" 회원 유형을 사용하지 않는다.
// WO-O4O-NETURE-MEMBER-LIST-TYPE-PERMISSION-DISPLAY-ALIGNMENT-V1:
// 참여 유형이 아닌 membership.role 은 getPrimaryRole 에서 'general' 로 collapse → "일반 회원" 표시.
const NETURE_ROLE_DISPLAY: Record<string, string> = { general: '일반 회원' };

// ─── 공급자 프로필 상태 (WO-O4O-NETURE-OPERATOR-MEMBER-SUPPLIER-STATUS-VISIBILITY-V1) ──────────
// "회원 상태"(service_memberships, 좌측 상태 컬럼)와 "공급자 프로필 상태"(neture_suppliers.status)는
// 별개 단계다. 회원=active 인데 공급자 프로필=PENDING 인 조합은 정상이며, 공급사 승인 화면에서 처리한다.
// 본 컬럼은 표시만 한다 — 승인/거절 mutation 없음. 출처: GET /neture/operator/suppliers (userId→status).
const SUPPLIER_STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '승인대기', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  ACTIVE: { label: '승인완료', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  REJECTED: { label: '거절', cls: 'bg-rose-50 border-rose-200 text-rose-700' },
  INACTIVE: { label: '비활성', cls: 'bg-slate-50 border-slate-200 text-slate-600' },
};

// ─── Client adapter ──────────────────────────────────────────

/**
 * WO-NETURE-MEMBERSHIP-APPROVAL-FLOW-STABILIZATION-V1:
 *   승인/거부 → /neture/operator/registrations/{id}/approve|reject
 *     (service_memberships + role_assignments + neture_suppliers 동시 처리)
 *   정지/활성화 → /operator/members/{membershipId}/approve|reject (Membership Console API)
 */
const netureMembersClient: MembersConsoleClient = {
  async list(params: MembersConsoleListParams) {
    const usp = new URLSearchParams();
    usp.set('page', String(params.page));
    usp.set('limit', String(params.limit));
    // WO-O4O-NETURE-ADMIN-USERS-SCOPE-FIX-V1: serviceKey 강제 전달
    usp.set('serviceKey', 'neture');
    if (params.status) usp.set('status', params.status);
    if (params.search) usp.set('search', params.search);
    // WO-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1: 서버 정렬 forward
    if (params.sortBy) usp.set('sortBy', params.sortBy);
    if (params.sortOrder) usp.set('sortOrder', params.sortOrder);
    const { data } = await api.get(`/operator/members?${usp}`);
    return { users: data.users || [], pagination: data.pagination };
  },
  async listAll() {
    const { data } = await api.get('/operator/members?limit=1000&serviceKey=neture');
    return { users: data.users || [] };
  },
  async stats() {
    const { data } = await api.get('/operator/members/stats?serviceKey=neture');
    return data;
  },
  async updateStatus(userId, status, currentStatus, user) {
    if (status === 'approved' && (currentStatus === 'pending' || currentStatus === 'rejected')) {
      // WO-O4O-NETURE-OPERATOR-MEMBERS-SUPPLIER-PENDING-UX-CLARIFY-V1:
      //   이 액션은 1단계(회원 가입 승인)다. 이미 가입 승인된(active) 회원은 백엔드가
      //   REGISTRATION_NOT_FOUND(404)로 응답하는데("already processed"), 운영자에게 원문 대신
      //   2단계(공급자 프로필 승인) 안내 문구를 보여준다. handleStatusChange 가 err.message 를 toast 한다.
      try {
        await api.post(`/neture/operator/registrations/${userId}/approve`);
      } catch (err: any) {
        const code = err?.response?.status ?? err?.status;
        const msg = String(err?.response?.data?.error || err?.response?.data?.message || err?.message || '');
        if (code === 404 || /REGISTRATION_NOT_FOUND|already processed/i.test(msg)) {
          throw new Error(
            '이미 가입 승인된 회원입니다. 공급자 프로필 승인이 필요하면 "공급자 승인 관리(공급자 활성화)" 화면에서 처리해 주세요.',
          );
        }
        throw err;
      }
      return;
    }
    if (status === 'rejected') {
      await api.post(`/neture/operator/registrations/${userId}/reject`, { reason: '운영자 거부' });
      return;
    }
    // 정지 / 활성화 → membership console (membership.id 필요)
    const netureMembership = user?.memberships?.find((m) => m.serviceKey === 'neture');
    if (!netureMembership) return;
    const endpoint =
      status === 'suspended'
        ? `/operator/members/${netureMembership.id}/reject`
        : `/operator/members/${netureMembership.id}/approve`;
    await api.patch(endpoint);
  },
  async batchUpdateStatus(ids, status) {
    const r = await api.post('/neture/operator/registrations/batch', {
      ids,
      action: status === 'approved' ? 'approve' : 'reject',
      ...(status === 'rejected' ? { reason: '운영자 일괄 거부' } : {}),
    });
    // WO-O4O-NETURE-SUPPLIER-APPROVAL-BATCH-RESULT-SHAPE-FIX-V1:
    //   /registrations/batch 응답은 { succeeded: string[], failed: {id,error}[], total } shape 다.
    //   useBatchAction.executeBatch 는 { data: { results: [{id,status,error}] } } 를 기대하므로
    //   (res.data.results || res.data.data.results) 매칭이 실패해 항상 0건으로 오표시되던 문제를
    //   adapter 에서 정규화한다. (정지/복원/탈퇴 extraBulkActions 와 동일 shape)
    const payload = r.data?.data ?? r.data ?? {};
    const succeeded: string[] = Array.isArray(payload.succeeded) ? payload.succeeded : [];
    const failed: Array<{ id: string; error?: string }> = Array.isArray(payload.failed)
      ? payload.failed
      : [];
    const results = [
      ...succeeded.map((id) => ({ id, status: 'success' as const })),
      ...failed.map((f) => ({ id: f.id, status: 'failed' as const, error: f.error })),
    ];
    return { data: { results } };
  },
  async updatePassword(userId, password) {
    await api.put(`/operator/members/${userId}`, { password });
  },
};

// ─── Delete Flow (Neture: soft only for operator) ────────────
// WO-O4O-OPERATOR-MEMBERS-DELETE-ACTION-POLICY-FIX-V1:
// 완전삭제(hard delete)는 admin 전용. operator 화면에서 제거.

function NetureDeleteFlow({
  user,
  onClose,
  onDeleted,
}: {
  user: UserData;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const displayName = useMemo(() => {
    const full = `${user.lastName || ''}${user.firstName || ''}`.trim();
    if (full) return full;
    if (user.name && user.name !== user.email) return user.name;
    return user.email?.split('@')[0] || '사용자';
  }, [user]);

  const handle = async () => {
    setBusy(true);
    try {
      await api.delete(`/operator/members/${user.id}?mode=soft`);
      toast.success('사용자가 비활성화되었습니다.');
      onDeleted();
    } catch (err: any) {
      toast.error(err?.message || '비활성화에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-amber-600 mb-2">회원 비활성화 확인</h3>
        <div className="space-y-3 mb-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-sm text-slate-500">대상 사용자</p>
            <p className="font-medium text-slate-900">
              {displayName} ({user.email})
            </p>
            <p className="text-xs text-slate-400 mt-0.5">상태: {user.status}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              비활성화하면 로그인이 차단되고 목록에서 제외됩니다. 필요 시 관리자를 통해 재활성화할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handle}
            disabled={busy}
            className="flex-1 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? '처리 중...' : '비활성화'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 2단계 승인 안내 + 공급 승인 대기 CTA ────────────────────
// WO-O4O-NETURE-OPERATOR-MEMBERS-SUPPLIER-PENDING-UX-CLARIFY-V1:
//   IR-O4O-NETURE-OPERATOR-MEMBERS-SUPPLIER-PENDING-STATE-AUDIT-V1 결론 반영.
//   회원 가입 승인(1단계, 이 화면)과 공급자 프로필 승인(2단계, /operator/suppliers)은 별개 축이다.
//   상단 "대기" 통계는 1단계(service_memberships.status) 기준이므로, 2단계(neture_suppliers PENDING)
//   대기 작업이 "대기 0" 으로 가려 보이는 혼동을 안내 문구 + 이동 동선으로 해소한다.
//   (집계/승인 API/로그인 정책은 변경하지 않음 — 표시·동선만 보강)
function SupplierTwoStepGuide({ pendingSupplierCount }: { pendingSupplierCount: number }) {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start gap-2">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <p className="flex-1 text-xs leading-relaxed text-slate-600">
          Neture 공급자는 <b>2단계</b>로 활성화됩니다. <b>1단계 회원 가입 승인</b>은 이 화면에서,{' '}
          <b>2단계 공급자 프로필 승인</b>은 <b>공급자 승인 관리</b>에서 처리합니다. 상단 “대기” 통계는
          1단계(회원 가입) 기준이며, 공급자 프로필 승인대기는 아래 별도 안내로 표시됩니다.
        </p>
      </div>
      {pendingSupplierCount > 0 && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-xs font-medium text-amber-800">
            공급 승인 대기 {pendingSupplierCount}건 — 회원 가입은 완료되었고 공급자 프로필 승인(2단계)이 필요합니다.
          </span>
          <Link
            to="/operator/suppliers"
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-amber-700"
          >
            공급자 승인 관리로 이동 <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function UsersManagementPage() {
  // WO-O4O-NETURE-OPERATOR-MEMBER-SUPPLIER-STATUS-VISIBILITY-V1:
  // 회원 목록에 "공급자 프로필 상태"를 함께 보여주기 위해 neture_suppliers 상태를 userId→status 로 1회 로드.
  // 표시 보강용 — 실패해도 회원 목록 자체에는 영향 없음(컬럼만 '—' 로 표시).
  const [supplierStatusMap, setSupplierStatusMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let cancelled = false;
    operatorSupplierApi
      .getSuppliers()
      .then((suppliers) => {
        if (cancelled) return;
        const m = new Map<string, string>();
        for (const s of suppliers) {
          if (s.userId) m.set(s.userId, s.status);
        }
        setSupplierStatusMap(m);
      })
      .catch(() => {
        /* 표시 보강용 — 조회 실패 시 컬럼은 '—' 로 노출 */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // WO-O4O-NETURE-OPERATOR-MEMBERS-SUPPLIER-PENDING-UX-CLARIFY-V1:
  //   공급 승인 대기(neture_suppliers.status === 'PENDING') 건수 — 안내 배너 CTA 표시용.
  //   supplierStatusMap 은 전체 공급자 기준 1회 로드(페이지네이션 무관)이라 총 대기 건수를 반영한다.
  const pendingSupplierCount = useMemo(
    () => Array.from(supplierStatusMap.values()).filter((s) => s === 'PENDING').length,
    [supplierStatusMap],
  );

  return (
    <>
    <SupplierTwoStepGuide pendingSupplierCount={pendingSupplierCount} />
    <OperatorMembersConsolePage
      serviceKey="neture"
      client={netureMembersClient}
      serverSort
      syncUrl
      roleTabs={[
        { key: 'supplier', label: '공급자', roleFilter: ['supplier', 'neture:supplier'] },
        { key: 'partner', label: '파트너', roleFilter: ['partner', 'neture:partner'] },
        { key: 'seller', label: '셀러', roleFilter: ['seller', 'neture:seller'] },
      ]}
      statusTabs={[
        { key: 'status-active', label: '활성', status: 'active' },
        { key: 'status-suspended', label: '정지', status: 'suspended' },
        { key: 'status-rejected', label: '거절', status: 'rejected' },
        { key: 'status-withdrawn', label: '탈퇴', status: 'withdrawn' },
      ]}
      getPrimaryRole={getPrimaryRole}
      roleDisplayMap={NETURE_ROLE_DISPLAY}
      roleColumnHeader="회원 유형"
      extraColumns={[
        {
          key: 'operatorRole',
          header: '운영 권한',
          width: '120px',
          render: (_v, user) => {
            const op = getOperatorRole(user);
            if (!op) return <span className="text-xs text-slate-400">일반 회원</span>;
            const cls =
              op === '관리자'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-violet-50 border-violet-200 text-violet-700';
            return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${cls}`}>
                {op}
              </span>
            );
          },
        },
        {
          // WO-O4O-NETURE-OPERATOR-MEMBER-SUPPLIER-STATUS-VISIBILITY-V1:
          // "회원 상태"(좌측)와 별개인 "공급자 프로필 승인 상태". active 회원 + 승인대기 조합은 정상이며
          // 승인대기 배지는 /operator/suppliers(공급사 승인) 로 안내한다. (이 화면에서 승인 처리는 하지 않음)
          key: 'supplierProfile',
          header: '공급자 프로필',
          width: '120px',
          render: (_v, user) => {
            const st = supplierStatusMap.get(user.id);
            if (!st) return <span className="text-xs text-slate-300">—</span>;
            const meta = SUPPLIER_STATUS_META[st] ?? {
              label: st,
              cls: 'bg-slate-50 border-slate-200 text-slate-600',
            };
            const badge = (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${meta.cls}`}
              >
                {meta.label}
              </span>
            );
            if (st === 'PENDING') {
              // WO-O4O-NETURE-OPERATOR-MEMBERS-SUPPLIER-PENDING-UX-CLARIFY-V1:
              //   PENDING 행에 "공급 승인 →" 명시 액션을 노출한다. 승인 처리는 이 화면이 아니라
              //   /operator/suppliers(2단계 공급 승인)에서 수행 — 링크로 이동만 제공한다.
              return (
                <Link
                  to="/operator/suppliers"
                  title="회원 가입은 승인됨 · 공급자 프로필 승인(2단계)이 필요합니다. 공급자 승인 관리 화면에서 처리하세요."
                  className="group inline-flex items-center gap-1 no-underline"
                >
                  {badge}
                  <span className="whitespace-nowrap text-[11px] font-medium text-amber-700 group-hover:underline">
                    공급 승인 →
                  </span>
                </Link>
              );
            }
            return badge;
          },
        },
        {
          key: 'dashboardAccess',
          header: '대시보드 접근',
          width: '200px',
          render: (_v, user) => {
            const labels = getDashboardAccessLabels(user);
            if (labels.length === 0) {
              return <span className="text-xs text-slate-400">접근 불가</span>;
            }
            return (
              <div className="flex flex-wrap gap-1">
                {labels.map((label) => (
                  <span key={label} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700">
                    {label}
                  </span>
                ))}
              </div>
            );
          },
        },
      ]}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <NetureDeleteFlow user={user} onClose={onClose} onDeleted={onDeleted} />
      )}
      /* WO-O4O-NETURE-MEMBER-MANAGEMENT-BULK-AND-ROUTE-ALIGNMENT-V1:
         정지/복원/탈퇴 처리 bulk 작업. 승인/거절은 별도 RegistrationRequestsPage 트랙이므로 제외.
         bulk hard delete 는 추가하지 않음 (admin 단건 정책 유지). */
      extraBulkActions={[
        {
          key: 'bulk-suspend',
          label: (n) => `정지 (${n})`,
          variant: 'danger',
          icon: <UserX size={14} />,
          getTargetIds: (users) => users.filter((u) => u.status === 'active').map((u) => u.id),
          executeBatch: async (ids) => {
            const { data } = await api.post('/operator/members/batch-status', { ids, status: 'suspended' });
            return { data };
          },
          confirm: { title: '일괄 정지 확인', message: '선택한 회원을 정지 처리합니다.', confirmText: '정지', variant: 'danger' },
        },
        {
          // WO-O4O-NETURE-SUPPLIER-WITHDRAWN-RESTORE-ACTION-V1:
          //   정지(suspended) + 탈퇴(withdrawn) 양쪽을 canonical /reactivate 로 복구.
          //   PATCH /status {active} 는 user 만 활성화하고 membership/role 을 되살리지 못하므로 사용하지 않는다.
          key: 'bulk-restore',
          label: (n) => `복구 (${n})`,
          variant: 'primary',
          icon: <UserCheck size={14} />,
          getTargetIds: (users) =>
            users.filter((u) => ['suspended', 'withdrawn'].includes(u.status)).map((u) => u.id),
          executeBatch: async (ids) => {
            const settled = await Promise.allSettled(
              ids.map((id) => api.post(`/operator/members/${id}/reactivate`)),
            );
            return {
              data: {
                results: settled.map((r, i) => ({
                  id: ids[i],
                  status: r.status === 'fulfilled' ? ('success' as const) : ('failed' as const),
                  error: r.status === 'rejected' ? (r.reason as any)?.message || '오류' : undefined,
                })),
              },
            };
          },
          confirm: { title: '일괄 복구 확인', message: '선택한 정지·탈퇴 회원을 활성으로 복구합니다.', confirmText: '복구', variant: 'default' },
        },
        {
          key: 'bulk-withdraw',
          label: (n) => `탈퇴 처리 (${n})`,
          variant: 'danger',
          icon: <UserMinus size={14} />,
          getTargetIds: (users) =>
            users.filter((u) => ['active', 'suspended', 'pending'].includes(u.status)).map((u) => u.id),
          executeBatch: async (ids) => {
            const settled = await Promise.allSettled(
              ids.map((id) => api.delete(`/operator/members/${id}?mode=soft`)),
            );
            return {
              data: {
                results: settled.map((r, i) => ({
                  id: ids[i],
                  status: r.status === 'fulfilled' ? ('success' as const) : ('failed' as const),
                  error: r.status === 'rejected' ? (r.reason as any)?.message || '오류' : undefined,
                })),
              },
            };
          },
          confirm: { title: '일괄 탈퇴 처리', message: '선택한 회원을 탈퇴(비활성) 처리합니다.', confirmText: '탈퇴 처리', variant: 'danger' },
        },
      ]}
    />
    </>
  );
}
