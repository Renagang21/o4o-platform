import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Filter, Search, Settings, RefreshCw } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';
import PageHeader from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

interface ApprovalLog {
  id: string;
  title: string;
  type: 'price_change' | 'product_add' | 'partner_application' | 'ad_material';
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  details: {
    before?: any;
    after?: any;
    reason?: string;
    notes?: string;
  };
}

const Approvals: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      // Fetch from actual API endpoint using authClient
      const response = await authClient.api.get('/admin/dropshipping/approvals');
      if (response.data) {
        setApprovals(response.data.approvals || []);
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast.error('승인 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('승인하시겠습니까?')) return;

    try {
      await authClient.api.post(`/admin/dropshipping/approvals/${id}/approve`);
      toast.success('승인 처리되었습니다');
      fetchApprovals();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('승인 처리에 실패했습니다');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('반려 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await authClient.api.post(`/admin/dropshipping/approvals/${id}/reject`, { reason });
      toast.success('반려 처리되었습니다');
      fetchApprovals();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('반려 처리에 실패했습니다');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'price_change':
        return '가격 변경';
      case 'product_add':
        return '상품 추가';
      case 'partner_application':
        return '파트너 신청';
      case 'ad_material':
        return '광고 소재';
      default:
        return type;
    }
  };

  const filteredApprovals = approvals.filter(approval => {
    const matchesStatus = filterStatus === 'all' || approval.status === filterStatus;
    const matchesType = filterType === 'all' || approval.type === filterType;
    const matchesSearch = approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          approval.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const headerActions = [
    { id: 'screen-options', label: 'Screen Options', icon: <Settings className="w-4 h-4" />, onClick: () => {}, variant: 'secondary' as const },
    { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchApprovals, variant: 'secondary' as const },
  ];

  const columns: Column<ApprovalLog>[] = [
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      render: (value: string) => (
        <div className="flex items-center">
          {getStatusIcon(value)}
          <span className="ml-2 text-sm">
            {value === 'pending' ? '대기 중' : value === 'approved' ? '승인됨' : '반려됨'}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      title: '유형',
      dataIndex: 'type',
      align: 'center' as const,
      render: (value: string) => (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          {getTypeLabel(value)}
        </span>
      ),
    },
    {
      key: 'title',
      title: '제목',
      dataIndex: 'title',
      render: (value: string, record: ApprovalLog) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{value}</div>
          {record.details.reason && (
            <div className="text-xs text-gray-500">사유: {record.details.reason}</div>
          )}
        </div>
      ),
    },
    {
      key: 'requestedBy',
      title: '요청자',
      dataIndex: 'requestedBy',
    },
    {
      key: 'requestedAt',
      title: '요청 일시',
      dataIndex: 'requestedAt',
    },
    {
      key: 'actions',
      title: '작업',
      align: 'center' as const,
      render: (_: unknown, record: ApprovalLog) => (
        record.status === 'pending' ? (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleApprove(record.id)}
              className="text-green-600 hover:text-green-900"
            >
              승인
            </button>
            <button
              onClick={() => handleReject(record.id)}
              className="text-red-600 hover:text-red-900"
            >
              반려
            </button>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">
            {record.reviewedBy} ({record.reviewedAt})
          </span>
        )
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="승인 관리"
        subtitle="가격 변경, 파트너 신청 등 승인이 필요한 항목을 관리합니다"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">대기 중</p>
              <p className="text-2xl font-bold text-yellow-600">
                {approvals.filter(a => a.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">승인됨</p>
              <p className="text-2xl font-bold text-green-600">
                {approvals.filter(a => a.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">반려됨</p>
              <p className="text-2xl font-bold text-red-600">
                {approvals.filter(a => a.status === 'rejected').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체</p>
              <p className="text-2xl font-bold">{approvals.length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-600 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="검색..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="px-4 py-2 border rounded-lg"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">모든 상태</option>
            <option value="pending">대기 중</option>
            <option value="approved">승인됨</option>
            <option value="rejected">반려됨</option>
          </select>
          <select
            className="px-4 py-2 border rounded-lg"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">모든 유형</option>
            <option value="price_change">가격 변경</option>
            <option value="product_add">상품 추가</option>
            <option value="partner_application">파트너 신청</option>
            <option value="ad_material">광고 소재</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable<ApprovalLog>
        rowKey="id"
        columns={columns}
        dataSource={filteredApprovals}
        loading={loading}
      />
    </div>
  );
};

export default Approvals;