/**
 * BranchServiceMembersPage — kpa-branch 서비스 가입 신청 승인/반려 (플랫폼 관리자)
 *
 * WO-O4O-KPA-BRANCH-SERVICE-MEMBER-APPROVAL-UI-V1
 *
 * 기존 canonical API 를 그대로 소비하는 얇은 Admin UI 다. 승인 로직·Identity·MembershipApprovalService 는
 * 건드리지 않는다.
 *   GET   /api/v1/kpa-branch/admin/service-members?status=pending|active|rejected
 *   PATCH /api/v1/kpa-branch/admin/service-members/:id/approve   → membership active + kpa-branch:member role
 *   PATCH /api/v1/kpa-branch/admin/service-members/:id/reject    { reason } (필수)
 *
 * 축 분리: 여기서 다루는 것은 service_memberships(서비스 접근) 뿐이다. 분회 소속(branch_memberships)은
 * 별도 축이며 승인과 자동 결합하지 않는다 — 승인 후 "분회 소속 지정 필요" 안내만 한다.
 *
 * 권한: 백엔드 adminGuards(kpa-branch:admin · platformBypass) 가 인가 경계다. 이 화면은 플랫폼 관리자
 * 사이트 진입 floor(platform:super_admin) + route guard 안에만 있고, UI 숨김을 보안으로 쓰지 않는다.
 *
 * 화면 패턴은 RoleApplicationsAdminPage(탭 · BaseTable · RowActionMenu confirm/showReason)를 따른다.
 * 다른 API·다른 상태 어휘(approved ≠ active)라 그 화면을 직접 재사용하지 않고 kpa-branch 전용으로 둔다.
 */
import { FC, useState, useEffect, useCallback } from 'react';
import { authClient } from '@o4o/auth-client';
import { CheckCircle, XCircle, User, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

const SERVICE_KEY = 'kpa-branch';

interface ServiceMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  phone?: string | null;
  status: 'pending' | 'active' | 'rejected' | 'suspended' | 'withdrawn';
  role?: string | null;
  hasServiceCredential: boolean;
  rejectionReason?: string | null;
  appliedAt: string;
  approvedAt?: string | null;
  updatedAt?: string | null;
}

/** 탭 어휘는 사용자 관점(승인됨)이고, 백엔드 상태값은 active 다 — 여기서만 매핑한다. */
type TabStatus = 'pending' | 'approved' | 'rejected';
const TAB_TO_API_STATUS: Record<TabStatus, ServiceMember['status']> = {
  pending: 'pending',
  approved: 'active',
  rejected: 'rejected',
};

const TABS: { id: TabStatus; label: string }[] = [
  { id: 'pending', label: '대기중' },
  { id: 'approved', label: '승인됨' },
  { id: 'rejected', label: '반려됨' },
];

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatusBadge = (status: ServiceMember['status']) => {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
    active: { label: '승인됨', className: 'bg-green-100 text-green-800' },
    rejected: { label: '반려됨', className: 'bg-red-100 text-red-800' },
    suspended: { label: '정지', className: 'bg-gray-100 text-gray-800' },
    withdrawn: { label: '탈퇴', className: 'bg-gray-100 text-gray-800' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${c.className}`}>{c.label}</span>;
};

const BranchServiceMembersPage: FC = () => {
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [members, setMembers] = useState<ServiceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async (tab: TabStatus) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authClient.api.get(`/${SERVICE_KEY}/admin/service-members`, {
        params: { status: TAB_TO_API_STATUS[tab], limit: 100 },
      });
      setMembers(response.data?.data?.items || []);
    } catch (err: any) {
      console.error('Failed to fetch kpa-branch service members:', err);
      setError(err.response?.data?.error || '가입 신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers(activeTab);
  }, [activeTab, fetchMembers]);

  const handleApprove = async (id: string) => {
    try {
      await authClient.api.patch(`/${SERVICE_KEY}/admin/service-members/${id}/approve`);
      // 승인은 서비스 가입 축만 바꾼다. 분회 소속은 분회 운영자 경로에서 별도로 지정한다.
      toast.success('서비스 가입 승인 완료 — 분회 소속은 별도로 지정해야 합니다.', { duration: 6000 });
      await fetchMembers(activeTab);
    } catch (err: any) {
      toast.error(err.response?.data?.error || '가입 승인에 실패했습니다.');
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    const trimmed = reason?.trim() || '';
    if (!trimmed) {
      toast.error('반려 사유를 입력해 주세요.');
      return;
    }
    try {
      await authClient.api.patch(`/${SERVICE_KEY}/admin/service-members/${id}/reject`, { reason: trimmed });
      toast.success('가입 신청을 반려했습니다.');
      await fetchMembers(activeTab);
    } catch (err: any) {
      toast.error(err.response?.data?.error || '가입 반려에 실패했습니다.');
    }
  };

  const columns: O4OColumn<ServiceMember>[] = [
    {
      key: 'user',
      header: '신청자',
      render: (_, row) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{row.name || '(이름 없음)'}</div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'service',
      header: '서비스',
      render: () => <span className="text-sm text-gray-900">{SERVICE_KEY}</span>,
    },
    {
      key: 'appliedAt',
      header: '신청일',
      sortable: true,
      sortAccessor: (row) => row.appliedAt,
      render: (_, row) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
          {formatDate(row.appliedAt)}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (_, row) => (
        <div>
          {getStatusBadge(row.status)}
          {row.status === 'active' && row.approvedAt && (
            <div className="text-xs text-gray-500 mt-1">승인 {formatDate(row.approvedAt)}</div>
          )}
          {row.status === 'rejected' && row.rejectionReason && (
            <div className="text-xs text-gray-500 mt-1">사유: {row.rejectionReason}</div>
          )}
        </div>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => {
        if (row.status !== 'pending') return null;
        return (
          <RowActionMenu
            actions={[
              {
                key: 'approve',
                label: '승인',
                icon: <CheckCircle size={14} />,
                variant: 'primary',
                confirm: {
                  title: '서비스 가입 승인',
                  message: `${row.name || row.email} 의 kpa-branch 서비스 가입을 승인합니다. 분회 소속은 이 화면에서 지정되지 않습니다.`,
                },
                onClick: () => handleApprove(row.id),
              },
              {
                key: 'reject',
                label: '반려',
                icon: <XCircle size={14} />,
                variant: 'danger',
                confirm: {
                  title: '가입 신청 반려',
                  message: '반려 사유를 입력해 주세요. 신청자 상태가 반려됨으로 바뀝니다.',
                  variant: 'danger',
                  showReason: true,
                  reasonPlaceholder: '반려 사유 (필수)',
                },
                onClick: (reason) => handleReject(row.id, reason),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="o4o-admin-page">
      <PageHeader
        title="분회 서비스 가입 승인"
        subtitle="kpa-branch 서비스 가입 신청을 승인·반려합니다. 승인은 서비스 가입만 처리하며 분회 소속은 분회 운영자가 별도로 지정합니다."
      />

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8" aria-label="상태 필터">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-6 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={() => fetchMembers(activeTab)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              다시 시도
            </button>
          </div>
        ) : loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<ServiceMember>
            columns={columns}
            data={members}
            rowKey={(row) => row.id}
            emptyMessage={
              activeTab === 'pending' ? '대기 중인 가입 신청이 없습니다.' :
              activeTab === 'approved' ? '승인된 회원이 없습니다.' :
              '반려된 가입 신청이 없습니다.'
            }
            tableId="kpa-branch-service-members"
            columnVisibility
            persistState
          />
        )}
      </div>
    </div>
  );
};

export default BranchServiceMembersPage;
