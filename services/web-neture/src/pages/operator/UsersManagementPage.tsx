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
  OperatorMemberSoftDeleteFlow,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
} from '@o4o/operator-core-ui/modules/members';
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

// WO-O4O-NETURE-OPERATOR-MEMBERS-TABLE-COLUMN-SIMPLIFY-V1:
// "운영 권한"·"대시보드 접근" 컬럼 제거(getOperatorRole/getDashboardAccessLabels 삭제).
// 공급자는 개인 이름보다 회사명이 중요하므로 "회사명" 컬럼을 추가(neture_suppliers.name).

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
  async updatePassword(userId, password, serviceKey) {
    // WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2:
    //   서비스별 credential 이므로 대상 serviceKey 를 함께 보낸다(미전달 시 서버가 400).
    await api.put(`/operator/members/${userId}`, { password, serviceKey });
  },
};

// ─── Delete Flow (Neture: soft only for operator) ────────────
// WO-O4O-OPERATOR-MEMBERS-DELETE-ACTION-POLICY-FIX-V1:
// 완전삭제(hard delete)는 admin 전용. operator 화면에서 제거.
// WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
// 직접 마크업한 확인 모달(69L) 제거 → 공통 OperatorMemberSoftDeleteFlow(ConfirmActionDialog).
// K-Cosmetics 와 동일 업무·동일 endpoint 이며 문구만 서비스별로 주입한다.

// ─── 공급자 승인 안내 + 공급 승인 대기 CTA ────────────────────
// WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
//   회원 가입 승인 = 공급자 승인(하나의 인지된 승인). 이 화면에서 승인하면 공급자도 함께 활성화된다.
//   프로필 정보(대표자명/담당자)는 승인 조건이 아니라 승인 후 공급자가 보완하는 정보.
//   이전 구조에서 남은 공급 승인 대기 건은 공급자 승인 관리에서 처리한다.
function SupplierTwoStepGuide({ pendingSupplierCount }: { pendingSupplierCount: number }) {
  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start gap-2">
        <Info size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <p className="flex-1 text-xs leading-relaxed text-slate-600">
          Neture 공급자는 이 화면의 <b>회원 가입 승인 한 번</b>으로 활성화됩니다. 대표자·담당자 등{' '}
          <b>공급자 프로필 정보는 승인 후 공급자가 보완</b>하며 승인을 막지 않습니다. 아직 공급 승인
          대기(이전 구조 잔여) 상태인 공급자는 아래 안내로 표시됩니다.
        </p>
      </div>
      {pendingSupplierCount > 0 && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-xs font-medium text-amber-800">
            공급 승인 대기 {pendingSupplierCount}건 — 공급자 승인 관리에서 승인하면 바로 활성화됩니다.
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
  // WO-O4O-NETURE-OPERATOR-MEMBERS-TABLE-COLUMN-SIMPLIFY-V1: 회사명 컬럼 표시를 위해 name 도 함께 매핑.
  const [supplierStatusMap, setSupplierStatusMap] = useState<
    Map<string, { status: string; companyName?: string }>
  >(new Map());
  useEffect(() => {
    let cancelled = false;
    operatorSupplierApi
      .getSuppliers()
      .then((suppliers) => {
        if (cancelled) return;
        const m = new Map<string, { status: string; companyName?: string }>();
        for (const s of suppliers) {
          if (s.userId) m.set(s.userId, { status: s.status, companyName: s.name });
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
    () => Array.from(supplierStatusMap.values()).filter((s) => s.status === 'PENDING').length,
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
          // WO-O4O-NETURE-OPERATOR-MEMBERS-TABLE-COLUMN-SIMPLIFY-V1:
          // 공급자는 개인 이름보다 회사명이 중요 — neture_suppliers.name 표시.
          key: 'companyName',
          header: '회사명',
          width: '160px',
          render: (_v, user) => {
            const companyName = supplierStatusMap.get(user.id)?.companyName;
            if (!companyName) return <span className="text-xs text-slate-300">—</span>;
            return <span className="text-sm font-medium text-slate-900">{companyName}</span>;
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
            const st = supplierStatusMap.get(user.id)?.status;
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
              // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
              //   이전 구조 잔여 PENDING 행 — 공급자 승인 관리에서 승인 한 번으로 활성화된다.
              return (
                <Link
                  to="/operator/suppliers"
                  title="공급 승인 대기 상태입니다. 공급자 승인 관리에서 승인하면 바로 활성화됩니다 (프로필 정보는 승인 후 보완)."
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
      ]}
      renderEditModal={({ user, onClose, onSuccess }) => (
        <EditUserModal userId={user.id} onClose={onClose} onSuccess={onSuccess} />
      )}
      renderDeleteFlow={({ user, onClose, onDeleted }) => (
        <OperatorMemberSoftDeleteFlow
          user={user}
          onClose={onClose}
          onDeleted={onDeleted}
          execute={(userId) => api.delete(`/operator/members/${userId}?mode=soft`).then(() => undefined)}
          title="회원 비활성화 확인"
          confirmText="비활성화"
          buildMessage={(displayName, u) =>
            `${displayName} (${u.email})\n상태: ${u.status}\n\n비활성화하면 로그인이 차단되고 목록에서 제외됩니다.\n필요 시 관리자를 통해 재활성화할 수 있습니다.`
          }
          successMessage="사용자가 비활성화되었습니다."
          errorMessage="비활성화에 실패했습니다."
        />
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
