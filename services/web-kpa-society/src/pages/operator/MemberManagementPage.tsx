/**
 * MemberManagementPage - KPA-a 회원 관리 (thin wrapper) + 가입 신청 (외부)
 *
 * WO-O4O-KPA-OPERATOR-MEMBER-MANAGEMENT-WRAPPER-MIGRATION-V1:
 *   1427줄 자체 구현 → OperatorMembersConsolePage thin wrapper + 외부 ApplicationsTab.
 *   기존 회원 관리 동작(승인/반려/정지/복원/탈퇴 + 활동 유형/추가 권한 컬럼 + 약국 정보
 *   Drawer + KpaEditUserModal) 전부 보존. ApplicationsTab(가입 신청 검토)은
 *   wrapper 가 표현 불가하므로 외부 outer tab 으로 분리 렌더.
 *
 * Boundary:
 *   - 회원 list/stats: GET  /kpa/members          (KpaMember entity, 응답 shape 어댑터로 변환)
 *   - 상태 변경:        PATCH /kpa/members/:id/status
 *   - 회원 정보 수정:    KpaEditUserModal → PATCH /kpa/members/:id/info
 *   - 비밀번호 변경:     PUT   /operator/members/:userId  (member.id → user_id ref 조회)
 *   - 소프트 탈퇴:      PATCH /kpa/members/:id/status  status=withdrawn (bulk)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import {
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { ConfirmActionDialog } from '@o4o/ui';
import {
  KpaEditUserModal,
  type ApiRequestFn,
  type KpaMemberForEdit,
} from '@o4o/operator-core-ui';
import {
  OperatorMembersConsolePage,
  type MembersConsoleClient,
  type MembersConsoleListParams,
  type UserData,
} from '@o4o/operator-core-ui/modules/members';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { getBusinessEntityTypeLabel } from '@o4o/types';
import { ACTIVITY_TYPE_LABELS } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ─── Types ───────────────────────────────────────────────────

type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';
type ApplicationStatus = 'submitted' | 'approved' | 'rejected' | 'cancelled';

interface KpaMemberRaw {
  id: string;
  sm_id: string;
  has_kpa_member: boolean;
  user_id: string;
  status: MemberStatus;
  membership_type: string | null;
  license_number: string | null;
  pharmacy_name: string | null;
  pharmacy_address?: string | null;
  activity_type?: string | null;
  capabilities?: string[];
  business_info?: KpaMemberForEdit['business_info'];
  joined_at: string | null;
  created_at: string;
  updated_at: string;
  user?: { name?: string; email?: string; nickname?: string | null };
}

interface KpaUserData extends UserData {
  has_kpa_member: boolean;
  membership_type: string | null;
  license_number: string | null;
  pharmacy_name: string | null;
  pharmacy_address: string | null;
  activity_type: string | null;
  capabilities: string[];
  business_info: KpaMemberForEdit['business_info'];
  joined_at: string | null;
  kpa_user_id: string;
}

interface KpaApplication {
  id: string;
  user_id: string;
  type: string;
  status: ApplicationStatus;
  note: string | null;
  review_comment: string | null;
  created_at: string;
  user?: { name?: string; email?: string };
}

interface ApplicationStats {
  submitted: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

interface BatchResultShape {
  data: { results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> };
}

// ─── Helpers ─────────────────────────────────────────────────

const CAPABILITY_LABELS: Record<string, string> = {
  'kpa:store_owner': '매장 운영',
  'kpa:operator': '운영자',
  'kpa:admin': '관리자',
  'lms:instructor': '강사',
  'platform:super_admin': '플랫폼 관리자',
};

const CAPABILITY_PRIORITY: Record<string, number> = {
  'platform:super_admin': 0,
  'kpa:admin': 1,
  'kpa:operator': 2,
  'kpa:store_owner': 3,
  'lms:instructor': 4,
};

function sortCapabilities(caps: string[]): string[] {
  return [...caps].sort((a, b) => {
    const pa = CAPABILITY_PRIORITY[a] ?? 99;
    const pb = CAPABILITY_PRIORITY[b] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
}

function formatCapabilityLabel(role: string): string {
  return CAPABILITY_LABELS[role] ?? role;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

const appStatusConfig: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: '대기', color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: { label: '승인', color: 'text-green-700', bg: 'bg-green-50' },
  rejected: { label: '반려', color: 'text-red-700', bg: 'bg-red-50' },
  cancelled: { label: '취소', color: 'text-slate-500', bg: 'bg-slate-100' },
};

function kpaMemberToUserData(m: KpaMemberRaw): KpaUserData {
  return {
    id: m.id,
    email: m.user?.email ?? '',
    name: m.user?.name ?? '',
    nickname: m.user?.nickname ?? undefined,
    status: m.status,
    role: m.membership_type ?? '',
    roles: m.capabilities ?? [],
    createdAt: m.joined_at || m.created_at,
    updatedAt: m.updated_at,
    has_kpa_member: m.has_kpa_member,
    membership_type: m.membership_type,
    license_number: m.license_number,
    pharmacy_name: m.pharmacy_name,
    pharmacy_address: m.pharmacy_address ?? null,
    activity_type: m.activity_type ?? null,
    capabilities: m.capabilities ?? [],
    business_info: m.business_info ?? null,
    joined_at: m.joined_at,
    kpa_user_id: m.user_id,
  };
}

const kpaEditModalMakeRequest: ApiRequestFn = async (method, path, data) => {
  switch (method) {
    case 'GET': return apiClient.get(path);
    case 'PATCH': return apiClient.patch(path, data);
    case 'POST': return apiClient.post(path, data);
    case 'PUT': return apiClient.put(path, data);
    case 'DELETE': return apiClient.delete(path);
    default: throw new Error(`Unsupported method: ${method as string}`);
  }
};

async function fanOutStatusBatch(
  ids: string[],
  status: MemberStatus,
): Promise<BatchResultShape> {
  const settled = await Promise.allSettled(
    ids.map((id) => apiClient.patch(`/members/${id}/status`, { status })),
  );
  return {
    data: {
      results: settled.map((r, i) => {
        const id = ids[i];
        if (r.status === 'fulfilled') return { id, status: 'success' as const };
        const err = r.reason as { message?: string } | null;
        return { id, status: 'failed' as const, error: err?.message || 'Network error' };
      }),
    },
  };
}

// ─── Component ───────────────────────────────────────────────

export default function MemberManagementPage() {
  // outer tab — 회원 관리 vs 가입 신청서 (외부 렌더링)
  // WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1 deeplink 호환:
  //   /operator/members?tab=applications | status-pending(=wrapper inner 'pending') 만 의미 보존.
  const [searchParams] = useSearchParams();
  const initialOuter = searchParams.get('tab') === 'applications' ? 'applications' : 'members';
  const [outerView, setOuterView] = useState<'members' | 'applications'>(initialOuter);

  const [appStats, setAppStats] = useState<ApplicationStats | null>(null);
  const reloadAppStats = () => {
    apiClient.get<{ data: ApplicationStats }>('/applications/admin/stats')
      .then((r) => setAppStats(r.data))
      .catch(() => {});
  };
  useEffect(() => { reloadAppStats(); }, []);

  // member.id → user_id 매핑 — wrapper 의 password modal 이 user.id (=member.id) 만
  // 넘기는데, /operator/members/:userId 는 실제 users.id 가 필요하므로 list/listAll 시점에 적재.
  const memberIdToUserIdRef = useRef<Map<string, string>>(new Map());

  const client: MembersConsoleClient = useMemo(() => ({
    async list(params: MembersConsoleListParams) {
      const reqParams: Record<string, string | number | boolean | undefined> = {
        page: params.page,
        limit: params.limit,
      };
      if (params.status) reqParams.status = params.status;
      if (params.search) reqParams.search = params.search;
      const res = await apiClient.get<{ data: KpaMemberRaw[]; total: number; totalPages: number }>(
        '/members', reqParams,
      );
      const list = res.data || [];
      list.forEach((m) => memberIdToUserIdRef.current.set(m.id, m.user_id));
      return {
        users: list.map(kpaMemberToUserData),
        pagination: {
          page: params.page,
          limit: params.limit,
          total: res.total ?? list.length,
          totalPages: Math.max(1, res.totalPages ?? 1),
        },
      };
    },
    async listAll() {
      const res = await apiClient.get<{ data: KpaMemberRaw[]; total: number }>('/members', { limit: 1000 });
      const list = res.data || [];
      list.forEach((m) => memberIdToUserIdRef.current.set(m.id, m.user_id));
      return { users: list.map(kpaMemberToUserData) };
    },
    async stats() {
      // KPA 백엔드는 /members/stats 미제공 — listAll 로 파생.
      const res = await apiClient.get<{ data: KpaMemberRaw[]; total: number }>('/members', { limit: 1000 });
      const list = res.data || [];
      const statuses: MemberStatus[] = ['pending', 'active', 'rejected', 'suspended', 'withdrawn'];
      return {
        statistics: {
          total: res.total ?? list.length,
          byStatus: statuses.map((s) => ({ status: s, count: list.filter((m) => m.status === s).length })),
        },
      };
    },
    async updateStatus(memberId: string, status: string) {
      // wrapper Drawer footer 의 'approved' / 'suspended' → KPA canonical 'active' / 'suspended'
      const mapped: MemberStatus =
        status === 'approved' ? 'active'
        : (status as MemberStatus);
      const res = await apiClient.patch<{ data: any; warnings?: string[] }>(
        `/members/${memberId}/status`, { status: mapped },
      );
      if (Array.isArray(res?.warnings) && res.warnings.length > 0) {
        for (const w of res.warnings) toast.warning(w);
      }
    },
    async batchUpdateStatus(ids: string[], status: 'approved' | 'rejected' | 'suspended') {
      const mapped: MemberStatus = status === 'approved' ? 'active' : status;
      return fanOutStatusBatch(ids, mapped);
    },
    async updatePassword(memberId: string, password: string) {
      const userId = memberIdToUserIdRef.current.get(memberId);
      if (!userId) {
        throw new Error('사용자 정보를 찾을 수 없습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.');
      }
      await apiClient.put(`/operator/members/${userId}`, { password });
    },
  }), []);

  // ─── Extra columns ─────────────────────────────────────────

  const activityTypeColumn: ListColumnDef<UserData> = {
    key: 'activity_type',
    header: '활동 유형',
    width: '120px',
    render: (_v, u) => {
      const k = u as KpaUserData;
      return (
        <span className="text-sm text-slate-600">
          {k.activity_type ? (ACTIVITY_TYPE_LABELS[k.activity_type] ?? k.activity_type) : '-'}
        </span>
      );
    },
  };

  const capabilitiesColumn: ListColumnDef<UserData> = {
    key: 'capabilities',
    header: '추가 권한',
    width: '180px',
    render: (_v, u) => {
      const k = u as KpaUserData;
      const caps = sortCapabilities(k.capabilities ?? []);
      if (caps.length === 0) return <span className="text-xs text-slate-300">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {caps.map((cap) => (
            <span
              key={cap}
              title={cap}
              className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700"
            >
              {formatCapabilityLabel(cap)}
            </span>
          ))}
        </div>
      );
    },
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Outer view toggle: 회원 관리 (wrapper) vs 가입 신청서 (ApplicationsTab 외부) */}
      <div className="mb-6 flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setOuterView('members')}
          className={
            outerView === 'members'
              ? 'px-4 py-2 -mb-px text-sm font-medium border-b-2 border-primary-600 text-primary-700'
              : 'px-4 py-2 -mb-px text-sm font-medium text-slate-500 hover:text-slate-700'
          }
        >
          회원 관리
        </button>
        <button
          type="button"
          onClick={() => setOuterView('applications')}
          className={
            outerView === 'applications'
              ? 'px-4 py-2 -mb-px text-sm font-medium border-b-2 border-primary-600 text-primary-700'
              : 'px-4 py-2 -mb-px text-sm font-medium text-slate-500 hover:text-slate-700'
          }
        >
          가입 신청서 {appStats?.submitted ? `(${appStats.submitted})` : ''}
        </button>
      </div>

      {outerView === 'applications' ? (
        <ApplicationsTab onReviewComplete={reloadAppStats} />
      ) : (
        <OperatorMembersConsolePage
          serviceKey="kpa-society"
          client={client}
          title="회원 관리"
          description="회원 현황 조회 및 승인/반려/정지/복원/탈퇴 처리"
          roleTabs={[
            { key: 'pharmacist', label: '약사', roleFilter: ['pharmacist', 'pharmacist_member'] },
            { key: 'student', label: '약대생', roleFilter: ['student', 'pharmacy_student_member'] },
          ]}
          statusTabs={[
            { key: 'status-active',    label: '승인완료', status: 'active' },
            { key: 'status-rejected',  label: '반려',     status: 'rejected' },
            { key: 'status-suspended', label: '정지',     status: 'suspended' },
            { key: 'status-withdrawn', label: '탈퇴',     status: 'withdrawn' },
          ]}
          getPrimaryRole={(u) => (u as KpaUserData).membership_type ?? 'unknown'}
          roleDisplayMap={{
            pharmacist: '약사',
            pharmacist_member: '약사',
            student: '약대생',
            pharmacy_student_member: '약대생',
          }}
          extraColumns={[activityTypeColumn, capabilitiesColumn]}
          tableId="kpa-operator-members"
          drawerExtraSections={(u) => <KpaDrawerSections user={u as KpaUserData} />}
          renderEditModal={({ user, onClose, onSuccess }) => (
            <KpaEditModalSlot user={user as KpaUserData} onClose={onClose} onSuccess={onSuccess} />
          )}
          extraRowActions={[
            {
              key: 'kpa-suspend',
              label: '정지',
              variant: 'danger',
              icon: <ShieldAlert size={14} />,
              divider: true,
              visible: (u) => {
                const k = u as KpaUserData;
                return k.status === 'active' && k.has_kpa_member;
              },
              confirm: {
                title: '회원 정지',
                message: '이 회원을 정지 처리하시겠습니까?',
                confirmText: '정지',
                variant: 'danger',
              },
              onClick: async (u) => {
                try {
                  await client.updateStatus(u.id, 'suspended');
                  toast.success('정지 처리되었습니다.');
                } catch (e: any) {
                  toast.error(e?.message || '정지 처리 실패');
                }
              },
            },
            {
              key: 'kpa-restore',
              label: '복원',
              variant: 'default',
              icon: <CheckCircle size={14} />,
              visible: (u) => {
                const k = u as KpaUserData;
                return k.status === 'suspended' && k.has_kpa_member;
              },
              onClick: async (u) => {
                try {
                  await client.updateStatus(u.id, 'active');
                  toast.success('복원되었습니다.');
                } catch (e: any) {
                  toast.error(e?.message || '복원 실패');
                }
              },
            },
          ]}
          extraBulkActions={[
            {
              key: 'kpa-bulk-suspend',
              label: (n) => `정지 (${n})`,
              variant: 'danger',
              icon: <UserX size={14} />,
              getTargetIds: (users) => users
                .filter((u) => {
                  const k = u as KpaUserData;
                  return k.status === 'active' && k.has_kpa_member;
                })
                .map((u) => u.id),
              executeBatch: (ids) => fanOutStatusBatch(ids, 'suspended'),
              confirm: {
                title: '회원 일괄 정지',
                message: '선택한 회원을 정지 처리합니다.',
                confirmText: '정지',
                variant: 'danger',
              },
            },
            {
              key: 'kpa-bulk-restore',
              label: (n) => `복원 (${n})`,
              variant: 'primary',
              icon: <UserCheck size={14} />,
              getTargetIds: (users) => users
                .filter((u) => {
                  const k = u as KpaUserData;
                  return k.status === 'suspended' && k.has_kpa_member;
                })
                .map((u) => u.id),
              executeBatch: (ids) => fanOutStatusBatch(ids, 'active'),
              confirm: {
                title: '회원 일괄 복원',
                message: '선택한 회원을 복원하시겠습니까?',
                confirmText: '복원',
                variant: 'warning',
              },
            },
            {
              key: 'kpa-bulk-withdraw',
              label: (n) => `탈퇴 처리 (${n})`,
              variant: 'danger',
              icon: <UserX size={14} />,
              getTargetIds: (users) => users
                .filter((u) => {
                  const k = u as KpaUserData;
                  return k.status !== 'withdrawn' && k.has_kpa_member;
                })
                .map((u) => u.id),
              executeBatch: (ids) => fanOutStatusBatch(ids, 'withdrawn'),
              confirm: {
                title: '회원 일괄 탈퇴 처리',
                message: '선택한 회원을 탈퇴(비활성) 처리합니다.',
                confirmText: '탈퇴 처리',
                variant: 'danger',
              },
            },
          ]}
        />
      )}
    </div>
  );
}

// ─── KpaEditModalSlot — super_admin / withdrawn guard 적용 ───

function KpaEditModalSlot({
  user,
  onClose,
  onSuccess,
}: {
  user: KpaUserData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isSuperAdmin = (user.capabilities ?? []).includes('platform:super_admin');
  const isWithdrawn = user.status === 'withdrawn';

  useEffect(() => {
    if (isSuperAdmin) {
      toast.error('super_admin 권한을 보유한 회원은 수정할 수 없습니다.');
      onClose();
    } else if (isWithdrawn) {
      toast.error('탈퇴 처리된 회원은 수정할 수 없습니다.');
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isSuperAdmin || isWithdrawn) return null;

  const member: KpaMemberForEdit = {
    id: user.id,
    user_id: user.kpa_user_id,
    user: {
      name: user.name,
      email: user.email,
      nickname: user.nickname ?? null,
    },
    status: user.status as KpaMemberForEdit['status'],
    membership_type: user.membership_type,
    license_number: user.license_number,
    pharmacy_name: user.pharmacy_name,
    pharmacy_address: user.pharmacy_address,
    activity_type: user.activity_type,
    capabilities: user.capabilities,
    business_info: user.business_info,
  };

  return (
    <KpaEditUserModal
      member={member}
      makeRequest={kpaEditModalMakeRequest}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

// ─── KpaDrawerSections — KPA-specific drawer body sections ───

function KpaDrawerSections({ user }: { user: KpaUserData }) {
  const isSuperAdmin = (user.capabilities ?? []).includes('platform:super_admin');
  const hasStoreOwnerCap = (user.capabilities ?? []).includes('kpa:store_owner');
  const fieldRowStyle = { display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-start' as const, flexWrap: 'wrap' as const };
  const labelStyle = { fontWeight: 600, color: '#64748b', minWidth: 100, flexShrink: 0, paddingTop: 2 };
  const valueStyle = { color: '#1e293b', flex: 1, minWidth: 0, wordBreak: 'break-word' as const, overflowWrap: 'break-word' as const };

  const bi = user.business_info;
  const sAddr = bi?.storeAddress;
  let addrZip = '', addrBase = '', addrDetail = '';
  if (sAddr && (sAddr.zipCode || sAddr.baseAddress || sAddr.detailAddress)) {
    addrZip = sAddr.zipCode || '';
    addrBase = sAddr.baseAddress || '';
    addrDetail = sAddr.detailAddress || '';
  } else if (bi?.zipCode || bi?.address || bi?.address2) {
    addrZip = bi.zipCode || '';
    addrBase = bi.address || '';
    addrDetail = bi.address2 || '';
  } else {
    const addrRaw = (user.pharmacy_address || '').trim();
    const zipMatch = addrRaw.match(/^(\d{5})\s+(.+)$/);
    addrZip = zipMatch ? zipMatch[1] : '';
    addrBase = zipMatch ? zipMatch[2] : addrRaw;
  }

  return (
    <div style={{ fontSize: 14, color: '#374151' }}>
      {/* 유형 */}
      <div style={fieldRowStyle}>
        <span style={labelStyle}>유형</span>
        <span style={valueStyle}>
          {user.membership_type === 'pharmacist' || user.membership_type === 'pharmacist_member'
            ? '약사'
            : user.membership_type === 'student' || user.membership_type === 'pharmacy_student_member'
              ? '약대생'
              : '-'}
        </span>
      </div>

      {/* 면허번호 */}
      {user.license_number && (
        <div style={fieldRowStyle}>
          <span style={labelStyle}>면허번호</span>
          <span style={valueStyle}>{user.license_number}</span>
        </div>
      )}

      {/* 직역 */}
      <div style={fieldRowStyle}>
        <span style={labelStyle}>직역</span>
        <span style={valueStyle}>
          {user.activity_type
            ? (ACTIVITY_TYPE_LABELS[user.activity_type] ?? user.activity_type)
            : '-'}
          {user.activity_type === 'pharmacy_owner' && (
            <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 9999, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              개설약사
            </span>
          )}
        </span>
      </div>

      {/* 매장 권한 */}
      <div style={fieldRowStyle}>
        <span style={labelStyle}>매장 권한</span>
        <span style={valueStyle}>
          {hasStoreOwnerCap ? (
            <span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 9999, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
              store_owner 보유
            </span>
          ) : (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>store_owner 미보유</span>
          )}
        </span>
      </div>

      {/* 약국 / 근무처 정보 */}
      {user.activity_type === 'pharmacy_owner' ? (
        <>
          <div style={fieldRowStyle}><span style={labelStyle}>약국명</span><span style={valueStyle}>{user.pharmacy_name || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>약국 전화번호</span><span style={valueStyle}>{bi?.pharmacy_phone || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>개설자 연락처</span><span style={valueStyle}>{bi?.ownerPhone || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>대표자명</span><span style={valueStyle}>{bi?.ceoName || bi?.representativeName || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>담당자명</span><span style={valueStyle}>{bi?.contactName || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>사업자등록번호</span><span style={valueStyle}>{bi?.businessNumber || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>사업자유형</span><span style={valueStyle}>{getBusinessEntityTypeLabel(bi?.businessEntityType) || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>업태</span><span style={valueStyle}>{bi?.businessType || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>업종</span><span style={valueStyle}>{bi?.businessItem || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>개업일</span><span style={valueStyle}>{bi?.businessStartDate || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>세금계산서 이메일</span><span style={valueStyle}>{bi?.taxInvoiceEmail || bi?.taxEmail || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>우편번호</span><span style={valueStyle}>{addrZip || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>기본주소</span><span style={valueStyle}>{addrBase || '-'}</span></div>
          <div style={fieldRowStyle}><span style={labelStyle}>상세주소</span><span style={valueStyle}>{addrDetail || '-'}</span></div>
        </>
      ) : (
        <>
          {user.pharmacy_name && (
            <div style={fieldRowStyle}><span style={labelStyle}>근무처명</span><span style={valueStyle}>{user.pharmacy_name}</span></div>
          )}
          {user.pharmacy_address && (
            <div style={fieldRowStyle}><span style={labelStyle}>근무처 주소</span><span style={valueStyle}>{user.pharmacy_address}</span></div>
          )}
        </>
      )}

      {/* 가입일 */}
      <div style={fieldRowStyle}>
        <span style={labelStyle}>가입일</span>
        <span style={valueStyle}>{formatDate(user.joined_at || user.createdAt)}</span>
      </div>

      {/* 추가 권한 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
        <span style={labelStyle}>추가 권한</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(() => {
            const caps = sortCapabilities(user.capabilities ?? []);
            if (caps.length === 0) return <span style={{ color: '#cbd5e1', fontSize: 13 }}>—</span>;
            return caps.map((cap) => (
              <span
                key={cap}
                title={cap}
                style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: 11, fontWeight: 500, borderRadius: 9999, backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca' }}
              >
                {formatCapabilityLabel(cap)}
              </span>
            ));
          })()}
        </div>
      </div>

      {/* super_admin / withdrawn 안내 */}
      {isSuperAdmin && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ShieldAlert size={14} />
          super_admin 권한을 보유한 회원은 본 화면에서 수정할 수 없습니다.
        </div>
      )}
    </div>
  );
}

// ─── ApplicationsTab (외부 유지 — wrapper 가 표현 불가한 영역) ──

function ApplicationsTab({ onReviewComplete }: { onReviewComplete: () => void }) {
  const [apps, setApps] = useState<KpaApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('submitted');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [pendingReview, setPendingReview] = useState<{ id: string; status: 'approved' | 'rejected' } | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    setError(null);
    try {
      const reqParams: Record<string, string | number | boolean | undefined> = { page, limit: 20 };
      if (statusFilter) reqParams.status = statusFilter;
      const res = await apiClient.get<{ data: KpaApplication[]; total: number; totalPages: number }>(
        '/applications/admin/all', reqParams,
      );
      setApps(res.data);
      setTotalPages(res.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  function requestReview(appId: string, status: 'approved' | 'rejected') {
    setPendingReview({ id: appId, status });
  }

  async function executeReview() {
    if (!pendingReview) return;
    setActionLoading(pendingReview.id);
    try {
      await apiClient.patch(`/applications/${pendingReview.id}/review`, {
        status: pendingReview.status, review_comment: reviewComment || undefined,
      });
      setReviewTarget(null);
      setReviewComment('');
      setPendingReview(null);
      await fetchApps();
      onReviewComplete();
    } catch (e: any) {
      toast.error(e.message || '처리에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />신청 목록을 불러오는 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <AlertCircle className="w-6 h-6 mb-2" />
        <p className="text-sm">{error}</p>
        <button onClick={fetchApps} className="mt-3 text-sm text-blue-600 hover:underline">다시 시도</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-300 rounded-md px-3 py-1.5 bg-white"
        >
          <option value="">전체</option>
          <option value="submitted">대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="cancelled">취소</option>
        </select>
        <button onClick={fetchApps} className="text-sm text-slate-500 hover:text-slate-700">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[680px]">
        <thead>
          <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
            <th className="px-4 py-3 font-medium">신청자</th>
            <th className="px-4 py-3 font-medium">이메일</th>
            <th className="px-4 py-3 font-medium">유형</th>
            <th className="px-4 py-3 font-medium">신청일</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">메모</th>
            <th className="px-4 py-3 font-medium">액션</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {apps.length === 0 ? (
            <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
              {statusFilter === 'submitted' ? '대기 중인 신청이 없습니다.' : '신청 내역이 없습니다.'}
            </td></tr>
          ) : apps.map((app) => {
            const sc = appStatusConfig[app.status];
            return (
              <tr key={app.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{app.user?.name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{app.user?.email || '-'}</td>
                <td className="px-4 py-3 text-slate-600">
                  {app.type === 'membership' ? '회원가입' : app.type === 'service' ? '서비스' : app.type}
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(app.created_at)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>{sc.label}</span>
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate" title={app.note || ''}>{app.note || '-'}</td>
                <td className="px-4 py-3">
                  {app.status === 'submitted' ? (
                    actionLoading === app.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : reviewTarget === app.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="코멘트 (선택)"
                          className="text-xs border border-slate-300 rounded px-2 py-1 w-36"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => requestReview(app.id, 'approved')} className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700">승인</button>
                          <button onClick={() => requestReview(app.id, 'rejected')} className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600">반려</button>
                          <button onClick={() => { setReviewTarget(null); setReviewComment(''); }} className="px-2 py-0.5 text-xs text-slate-500 hover:underline">취소</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => requestReview(app.id, 'approved')} className="p-1 text-green-600 hover:bg-green-50 rounded" title="승인"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => setReviewTarget(app.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="반려"><XCircle className="w-4 h-4" /></button>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-slate-400">{app.review_comment ? `"${app.review_comment}"` : '-'}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 border-t border-slate-100">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40">이전</button>
          <span className="text-sm text-slate-600">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 text-sm border border-slate-300 rounded-md disabled:opacity-40">다음</button>
        </div>
      )}

      <ConfirmActionDialog
        open={!!pendingReview}
        onClose={() => setPendingReview(null)}
        onConfirm={executeReview}
        title={pendingReview?.status === 'approved' ? '가입 승인 확인' : '가입 반려 확인'}
        message={pendingReview?.status === 'approved'
          ? '이 가입 신청을 승인하시겠습니까?'
          : '이 가입 신청을 반려하시겠습니까?'}
        confirmText={pendingReview?.status === 'approved' ? '승인' : '반려'}
        variant={pendingReview?.status === 'rejected' ? 'danger' : 'default'}
        loading={!!actionLoading}
      />
    </div>
  );
}

