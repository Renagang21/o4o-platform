/**
 * Dropshipping Approvals Page
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';
import { authClient } from '@o4o/auth-client';
import PageHeader from '../../components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

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

  useEffect(() => { fetchApprovals(); }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/admin/dropshipping/approvals');
      if (response.data) setApprovals(response.data.approvals || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast.error('승인 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await authClient.api.post(`/admin/dropshipping/approvals/${id}/approve`);
      toast.success('승인 처리되었습니다');
      fetchApprovals();
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('승인 처리에 실패했습니다');
    }
  };

  const handleReject = async (id: string, reason?: string) => {
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
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'price_change': return '가격 변경';
      case 'product_add': return '상품 추가';
      case 'partner_application': return '파트너 신청';
      case 'ad_material': return '광고 소재';
      default: return type;
    }
  };

  const filteredApprovals = approvals.filter((approval) => {
    const matchesStatus = filterStatus === 'all' || approval.status === filterStatus;
    const matchesType = filterType === 'all' || approval.type === filterType;
    const matchesSearch = approval.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.requestedBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const columns: O4OColumn<ApprovalLog>[] = [
    {
      key: 'status',
      header: '상태',
      render: (_, row) => (
        <div className="flex items-center">
          {getStatusIcon(row.status)}
          <span className="ml-2 text-sm">
            {row.status === 'pending' ? '대기 중' : row.status === 'approved' ? '승인됨' : '반려됨'}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      header: '유형',
      align: 'center',
      render: (_, row) => (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          {getTypeLabel(row.type)}
        </span>
      ),
    },
    {
      key: 'title',
      header: '제목',
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.title}</div>
          {row.details.reason && <div className="text-xs text-gray-500">사유: {row.details.reason}</div>}
        </div>
      ),
    },
    {
      key: 'requestedBy',
      header: '요청자',
      render: (_, row) => <span>{row.requestedBy}</span>,
    },
    {
      key: 'requestedAt',
      header: '요청 일시',
      sortable: true,
      sortAccessor: (row) => row.requestedAt,
      render: (_, row) => <span>{row.requestedAt}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => {
        if (row.status !== 'pending') {
          return (
            <span className="text-gray-400 text-sm">
              {row.reviewedBy} ({row.reviewedAt})
            </span>
          );
        }
        return (
          <RowActionMenu
            actions={[
              {
                key: 'approve',
                label: '승인',
                icon: <CheckCircle size={14} />,
                variant: 'primary',
                confirm: '승인하시겠습니까?',
                onClick: () => handleApprove(row.id),
              },
              {
                key: 'reject',
                label: '반려',
                icon: <XCircle size={14} />,
                variant: 'danger',
                confirm: { title: '반려 확인', message: '반려 사유를 입력해주세요', variant: 'danger', showReason: true, reasonPlaceholder: '반려 사유를 입력하세요' },
                onClick: (reason) => handleReject(row.id, reason),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="승인 관리"
        subtitle="가격 변경, 파트너 신청 등 승인이 필요한 항목을 관리합니다"
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchApprovals, variant: 'secondary' as const },
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">대기 중</p><p className="text-2xl font-bold text-yellow-600">{approvals.filter((a) => a.status === 'pending').length}</p></div>
            <Clock className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">승인됨</p><p className="text-2xl font-bold text-green-600">{approvals.filter((a) => a.status === 'approved').length}</p></div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">반려됨</p><p className="text-2xl font-bold text-red-600">{approvals.filter((a) => a.status === 'rejected').length}</p></div>
            <XCircle className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-gray-600">전체</p><p className="text-2xl font-bold">{approvals.length}</p></div>
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
          <select className="px-4 py-2 border rounded-lg" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">모든 상태</option>
            <option value="pending">대기 중</option>
            <option value="approved">승인됨</option>
            <option value="rejected">반려됨</option>
          </select>
          <select className="px-4 py-2 border rounded-lg" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">모든 유형</option>
            <option value="price_change">가격 변경</option>
            <option value="product_add">상품 추가</option>
            <option value="partner_application">파트너 신청</option>
            <option value="ad_material">광고 소재</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="animate-pulse p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
          </div>
        ) : (
          <BaseTable<ApprovalLog>
            columns={columns}
            data={filteredApprovals}
            rowKey={(row) => row.id}
            emptyMessage="승인 내역이 없습니다"
            tableId="dropshipping-approvals"
            columnVisibility
            persistState
          />
        )}
      </div>
    </div>
  );
};

export default Approvals;
