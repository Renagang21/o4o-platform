import { FC, useState, useEffect, useMemo } from 'react';
import { authClient } from '@o4o/auth-client';
import { CheckCircle, XCircle, User, Building, Hash, Calendar } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';

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
  const [actionLoading, setActionLoading] = useState<string | null>(null);


  const fetchApplications = async (status: TabStatus) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authClient.api.get('/admin/roles/applications', {
        params: { status }
      });

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
    if (!confirm('이 역할 신청을 승인하시겠습니까?')) {
      return;
    }

    try {
      setActionLoading(applicationId);

      await authClient.api.post(`/admin/roles/applications/${applicationId}/approve`);

      // Show success message
      alert('역할 신청이 승인되었습니다.');

      // Refresh the list
      await fetchApplications(activeTab);
    } catch (err: any) {
      console.error('Failed to approve application:', err);
      alert(err.response?.data?.message || '역할 신청 승인에 실패했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    // Phase 2-3: Rejection reason is now mandatory
    let reason = prompt('거부 사유를 입력하세요 (필수, 최소 10자):');

    if (reason === null) {
      // User cancelled
      return;
    }

    // Validate reason
    reason = reason.trim();
    if (!reason || reason.length < 10) {
      alert('거부 사유는 최소 10자 이상 입력해야 합니다.');
      return;
    }

    if (reason.length > 500) {
      alert('거부 사유는 최대 500자까지 입력 가능합니다.');
      return;
    }

    try {
      setActionLoading(applicationId);

      await authClient.api.post(`/admin/roles/applications/${applicationId}/reject`, {
        reason
      });

      // Show success message
      alert('역할 신청이 거부되었습니다.');

      // Refresh the list
      await fetchApplications(activeTab);
    } catch (err: any) {
      console.error('Failed to reject application:', err);
      const errorMessage = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || '역할 신청 거부에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      'supplier': '공급자',
      'seller': '판매자',
      'partner': '파트너'
    };
    return roleNames[role] || role;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      'pending': { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
      'approved': { label: '승인됨', className: 'bg-green-100 text-green-800' },
      'rejected': { label: '거부됨', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const columns = useMemo(() => [
    {
      key: 'user',
      title: '사용자',
      render: (_: any, application: RoleApplication) => (
        <div className="flex items-center">
          <User className="w-4 h-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {application.user?.name || 'Unknown'}
            </div>
            <div className="text-sm text-gray-500">
              {application.user?.email || 'No email'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: '역할',
      dataIndex: 'role' as keyof RoleApplication,
      render: (role: string) => <span className="text-sm text-gray-900">{getRoleName(role)}</span>
    },
    {
      key: 'business',
      title: '사업자 정보',
      render: (_: any, application: RoleApplication) => (
        <div className="text-sm text-gray-900">
          {application.businessName && (
            <div className="flex items-center mb-1">
              <Building className="w-4 h-4 text-gray-400 mr-2" />
              {application.businessName}
            </div>
          )}
          {application.businessNumber && (
            <div className="flex items-center text-gray-500">
              <Hash className="w-4 h-4 text-gray-400 mr-2" />
              {application.businessNumber}
            </div>
          )}
          {!application.businessName && !application.businessNumber && (
            <span className="text-gray-400">정보 없음</span>
          )}
        </div>
      )
    },
    {
      key: 'appliedAt',
      title: '신청일',
      dataIndex: 'appliedAt' as keyof RoleApplication,
      render: (date: string) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
          {formatDate(date)}
        </div>
      )
    },
    {
      key: 'status',
      title: '상태',
      render: (_: any, application: RoleApplication) => (
        <div>
          {getStatusBadge(application.status)}
          {application.status === 'rejected' && application.rejectionReason && (
            <div className="text-xs text-gray-500 mt-1">
              사유: {application.rejectionReason}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      title: '작업',
      render: (_: any, application: RoleApplication) => (
        activeTab === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(application.id)}
              disabled={actionLoading === application.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === application.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              승인
            </button>
            <button
              onClick={() => handleReject(application.id)}
              disabled={actionLoading === application.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === application.id ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              거부
            </button>
          </div>
        ) : null
      )
    }
  ], [activeTab, actionLoading]);

  return (
    <div className="wordpress-admin-page">
      <PageHeader
        title="역할 신청 관리"
        subtitle="사용자의 역할 신청을 검토하고 승인/거부할 수 있습니다."
      />

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            대기중
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'approved'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            승인됨
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'rejected'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            거부됨
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
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
        ) : (
          <DataTable
            columns={columns}
            dataSource={applications}
            rowKey="id"
            loading={loading}
            emptyText={
              activeTab === 'pending' ? '대기 중인 역할 신청이 없습니다.' :
                activeTab === 'approved' ? '승인된 역할 신청이 없습니다.' :
                  '거부된 역할 신청이 없습니다.'
            }
          />
        )}
      </div>
    </div>
  );
};

export default RoleApplicationsAdminPage;
