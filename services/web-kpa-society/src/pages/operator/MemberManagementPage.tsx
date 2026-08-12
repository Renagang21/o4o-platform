/**
 * MemberManagementPage - KPA-a 회원 관리 (thin wrapper)
 *
 * WO-O4O-KPA-OPERATOR-MEMBER-MANAGEMENT-WRAPPER-MIGRATION-V1:
 *   1427줄 자체 구현 → OperatorMembersConsolePage thin wrapper.
 *   기존 회원 관리 동작(승인/반려/정지/복원/탈퇴 + 활동 유형/추가 권한 컬럼 + 약국 정보
 *   Drawer + KpaEditUserModal) 전부 보존.
 * WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1:
 *   가입 신청서(KpaApplication) outer tab·ApplicationsTab 제거 — dead flow(데이터 0·소비처 0).
 *   회원 승인 canonical 경로만 유지.
 *
 * Boundary:
 *   - 회원 list/stats: GET  /kpa/members          (KpaMember entity, 응답 shape 어댑터로 변환)
 *   - 상태 변경:        PATCH /kpa/members/:id/status
 *   - 회원 정보 수정:    KpaEditUserModal → PATCH /kpa/members/:id/info
 *   - 비밀번호 변경:     PUT   /operator/members/:userId  (member.id → user_id ref 조회)
 *   - 소프트 탈퇴:      PATCH /kpa/members/:id/status  status=withdrawn (bulk)
 */

import { useEffect, useMemo, useRef } from 'react';
import { toast } from '@o4o/error-handling';
import {
  CheckCircle,
  UserCheck,
  UserX,
  ShieldAlert,
} from 'lucide-react';
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
import { apiClient, coreApiClient } from '../../api/client';

// ─── Types ───────────────────────────────────────────────────

type MemberStatus = 'pending' | 'active' | 'suspended' | 'rejected' | 'withdrawn';

interface KpaMemberRaw {
  id: string;
  sm_id: string;
  has_kpa_member: boolean;
  user_id: string;
  status: MemberStatus;
  // IR-O4O-SERVICE-MEMBER-PASSWORD-AND-ROLE-CONSUMER-INTEGRITY-AUDIT-V1 (FIX-3):
  //   목록 row 는 service_memberships row 그 자체다 (GET /kpa/members 는 sm 을 FROM 으로 한다).
  //   service_key / role 은 이미 응답에 있으나 매핑에서 누락돼 있었다.
  service_key?: string;
  role?: string | null;
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

function kpaMemberToUserData(m: KpaMemberRaw): KpaUserData {
  return {
    id: m.id,
    email: m.user?.email ?? '',
    name: m.user?.name ?? '',
    nickname: m.user?.nickname ?? undefined,
    status: m.status,
    role: m.membership_type ?? '',
    roles: m.capabilities ?? [],
    // IR-O4O-SERVICE-MEMBER-PASSWORD-AND-ROLE-CONSUMER-INTEGRITY-AUDIT-V1 (FIX-3):
    //   공통 PasswordModal 은 후보 서비스를 user.memberships 에서만 도출한다.
    //   KPA 는 이 필드를 채우지 않아 후보 0 → "변경 가능한 서비스가 없습니다" 로
    //   비밀번호 변경이 항상 도달 불가였다. row 가 곧 service_memberships 이므로
    //   같은 row 값으로 정확히 채운다 (임의 주입 아님).
    memberships: [
      {
        id: m.sm_id,
        serviceKey: m.service_key ?? 'kpa-society',
        status: m.status,
        role: m.role ?? m.membership_type ?? 'member',
        createdAt: m.created_at,
      },
    ],
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
  // WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1:
  //   가입 신청서(KpaApplication) outer tab·deeplink(?tab=applications)·stats 제거 — dead flow.
  //   회원 승인 canonical 화면만 유지. (?tab=applications 딥링크는 아래 wrapper 가 무시하고 회원 목록 렌더.)

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
    async updatePassword(memberId: string, password: string, serviceKey: string) {
      const userId = memberIdToUserIdRef.current.get(memberId);
      if (!userId) {
        throw new Error('사용자 정보를 찾을 수 없습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.');
      }
      // WO-O4O-KPA-SERVICE-OPERATOR-MANAGEMENT-INFORMATION-AUDIT-V1:
      //   비밀번호 변경은 플랫폼 공통 operator 콘솔 API(`/api/v1/operator/members/:userId`) 다.
      //   kpa 전용 apiClient(base `/api/v1/kpa`) 로 호출하면 `/api/v1/kpa/operator/members/:userId`
      //   → 404 (해당 라우트 미존재, 프로덕션 probe 확인). base 없는 coreApiClient 사용.
      // WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2:
      //   서비스별 credential 이므로 대상 serviceKey 를 함께 보낸다(미전달 시 서버가 400).
      await coreApiClient.put(`/operator/members/${userId}`, { password, serviceKey });
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
      {/* WO-O4O-KPA-APPLICATION-DEAD-FLOW-RETIREMENT-V1: 가입 신청서(ApplicationsTab) outer tab 제거 —
          회원 승인 canonical 화면(OperatorMembersConsolePage)만 렌더. */}
      {/* WO-O4O-KPA-OPERATOR-MEMBER-DEEPLINK-STATUS-TAB-SYNC-V1:
          Action Queue 상태 딥링크(?members_tab=status-suspended 등)를 읽어 해당 탭 자동 선택.
          공용 콘솔의 syncUrl opt-in(URL key=members_tab, 기본 false) 활성화만 — 공용 컴포넌트 무수정. */}
      <OperatorMembersConsolePage
          serviceKey="kpa-society"
          client={client}
          syncUrl
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
