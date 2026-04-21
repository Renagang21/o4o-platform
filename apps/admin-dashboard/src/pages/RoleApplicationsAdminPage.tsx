import { FC, useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { CheckCircle, XCircle, User, Building, Hash, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '@/components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

interface RoleApplication {
  id: string;
  userId: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  businessName?: string;
  businessNumber?: string;
  appliedAt: string;
  processedAt?: string;
  rejectionReason?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

type TabStatus = 'pending' | 'approved' | 'rejected';

const RoleApplicationsAdminPage: FC = () => {
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = async (status: TabStatus) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authClient.api.get('/admin/roles/applications', { params: { status } });
      setApplications(response.data?.data || []);
    } catch (err: any) {
      console.error('Failed to fetch role applications:', err);
      setError(err.response?.data?.message || '역할 신청 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(activeTab);
  }, [activeTab]);

  const handleApprove = async (applicationId: string) => {
    try {
      await authClient.api.post(`/admin/roles/applications/${applicationId}/approve`);
      toast.success('역할 신청이 승인되었습니다.');
      await fetchApplications(activeTab);
    } catch (err: any) {
      toast.error(err.response?.data?.message || '역할 신청 승인에 실패했습니다.');
    }
  };

  const handleReject = async (applicationId: string, reason?: string) => {
    const trimmed = reason?.trim() || '';
    if (trimmed.length < 10) {
      toast.error('거부 사유는 최소 10자 이상 입력해야 합니다.');
      return;
    }
    if (trimmed.length > 500) {
      toast.error('거부 사유는 최대 500자까지 입력 가능합니다.');
      return;
    }
    try {
      await authClient.api.post(`/admin/roles/applications/${applicationId}/reject`, { reason: trimmed });
      toast.success('역할 신청이 거부되었습니다.');
      await fetchApplications(activeTab);
    } catch (err: any) {
      const errorMessage = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || '역할 신청 거부에 실패했습니다.';
      toast.error(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      supplier: '공급자',
      seller: '판매자',
      partner: '파트너',
    };
    return roleNames[role] || role;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '승인됨', className: 'bg-green-100 text-green-800' },
      rejected: { label: '거부됨', className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const columns: O4OColumn<RoleApplication>[] = [
    {
      key: 'user',
      header: '사용자',
      render: (_, row) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{row.user?.name || 'Unknown'}</div>
            <div className="text-sm text-gray-500">{row.user?.email || 'No email'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: '역할',
      render: (_, row) => <span className="text-sm text-gray-900">{getRoleName(row.role)}</span>,
    },
    {
      key: 'business',
      header: '사업자 정보',
      render: (_, row) => (
        <div className="text-sm text-gray-900">
          {row.businessName && (
            <div className="flex items-center mb-1">
              <Building className="w-4 h-4 text-gray-400 mr-2" />
              {row.businessName}
            </div>
          )}
          {row.businessNumber && (
            <div className="flex items-center text-gray-500">
              <Hash className="w-4 h-4 text-gray-400 mr-2" />
              {row.businessNumber}
            </div>
          )}
          {!row.businessName && !row.businessNumber && (
            <span className="text-gray-400">정보 없음</span>
          )}
        </div>
      ),
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
        if (activeTab !== 'pending') return null;
        return (
          <RowActionMenu
            actions={[
              {
                key: 'approve',
                label: '승인',
                icon: <CheckCircle size={14} />,
                variant: 'primary',
                confirm: '이 역할 신청을 승인하시겠습니까?',
                onClick: () => handleApprove(row.id),
              },
              {
                key: 'reject',
                label: '거부',
                icon: <XCircle size={14} />,
                variant: 'danger',
                confirm: {
                  title: '거부 확인',
                  message: '거부 사유를 입력해주세요 (최소 10자)',
                  variant: 'danger',
                  showReason: true,
                  reasonPlaceholder: '거부 사유를 입력하세요 (최소 10자, 최대 500자)',
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
        title="역할 신청 관리"
        subtitle="사용자의 역할 신청을 검토하고 승인/거부할 수 있습니다."
      />

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          {([
            { id: 'pending', label: '대기중' },
            { id: 'approved', label: '승인됨' },
            { id: 'rejected', label: '거부됨' },
          ] as { id: TabStatus; label: string }[]).map((tab) => (
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

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-6 text-center text-red-600">
            <p>{error}</p>
            <button
              onClick={() => fetchApplications(activeTab)}
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
          <BaseTable<RoleApplication>
            columns={columns}
            data={applications}
            rowKey={(row) => row.id}
            emptyMessage={
              activeTab === 'pending' ? '대기 중인 역할 신청이 없습니다.' :
              activeTab === 'approved' ? '승인된 역할 신청이 없습니다.' :
              '거부된 역할 신청이 없습니다.'
            }
            tableId="role-applications"
            columnVisibility
            persistState
          />
        )}
      </div>
    </div>
  );
};

export default RoleApplicationsAdminPage;
