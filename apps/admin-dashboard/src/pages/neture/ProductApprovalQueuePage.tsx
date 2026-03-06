/**
 * Neture Product Approval Queue Page
 *
 * WO-O4O-ADMIN-PRODUCT-APPROVAL-UI-V1
 * Supplier가 등록한 상품(SupplierProductOffer)의 PENDING 상태를
 * Admin이 승인/거절할 수 있는 전용 승인 큐 UI.
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader';
import { DataTable, Column } from '../../components/common/DataTable';

interface ProductOffer {
  id: string;
  masterId: string;
  masterName: string;
  supplierName: string;
  supplierId: string;
  distributionType: 'PUBLIC' | 'SERVICE' | 'PRIVATE';
  isActive: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  priceGeneral: number | null;
  consumerReferencePrice: number | null;
  createdAt: string;
}

const ProductApprovalQueuePage: React.FC = () => {
  const [products, setProducts] = useState<ProductOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/api/v1/neture/admin/products');
      if (response.data?.success) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('상품 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('이 상품을 승인하시겠습니까?')) return;

    try {
      await authClient.api.post(`/api/v1/neture/admin/products/${id}/approve`);
      toast.success('상품이 승인되었습니다');
      fetchProducts();
    } catch (error) {
      console.error('Error approving product:', error);
      toast.error('승인 처리에 실패했습니다');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('거절 사유를 입력해주세요:');
    if (!reason) return;

    try {
      await authClient.api.post(`/api/v1/neture/admin/products/${id}/reject`, { reason });
      toast.success('상품이 거절되었습니다');
      fetchProducts();
    } catch (error) {
      console.error('Error rejecting product:', error);
      toast.error('거절 처리에 실패했습니다');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '대기 중';
      case 'APPROVED': return '승인됨';
      case 'REJECTED': return '거절됨';
      default: return status;
    }
  };

  const getDistributionBadge = (type: string) => {
    const styles: Record<string, string> = {
      PUBLIC: 'bg-blue-100 text-blue-800',
      SERVICE: 'bg-purple-100 text-purple-800',
      PRIVATE: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesStatus = filterStatus === 'all' || product.approvalStatus === filterStatus;
    const matchesSearch = !searchTerm ||
      product.masterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const headerActions = [
    { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchProducts, variant: 'secondary' as const },
  ];

  const columns: Column<ProductOffer>[] = [
    {
      key: 'approvalStatus',
      title: '상태',
      dataIndex: 'approvalStatus',
      render: (value: string) => (
        <div className="flex items-center">
          {getStatusIcon(value)}
          <span className="ml-2 text-sm">{getStatusLabel(value)}</span>
        </div>
      ),
    },
    {
      key: 'masterName',
      title: '상품명',
      dataIndex: 'masterName',
      render: (value: string) => (
        <div className="text-sm font-medium text-gray-900">{value || '-'}</div>
      ),
    },
    {
      key: 'supplierName',
      title: '공급사',
      dataIndex: 'supplierName',
      render: (value: string) => (
        <div className="text-sm text-gray-600">{value || '-'}</div>
      ),
    },
    {
      key: 'distributionType',
      title: '유통 타입',
      dataIndex: 'distributionType',
      align: 'center' as const,
      render: (value: string) => getDistributionBadge(value),
    },
    {
      key: 'priceGeneral',
      title: '가격',
      dataIndex: 'priceGeneral',
      align: 'right' as const,
      render: (value: number | null) => (
        <span className="text-sm">
          {value != null ? `₩${value.toLocaleString()}` : '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: '등록일',
      dataIndex: 'createdAt',
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString('ko-KR') : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '작업',
      align: 'center' as const,
      render: (_: unknown, record: ProductOffer) => (
        record.approvalStatus === 'PENDING' ? (
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => handleApprove(record.id)}
              className="text-green-600 hover:text-green-900 font-medium text-sm"
            >
              승인
            </button>
            <button
              onClick={() => handleReject(record.id)}
              className="text-red-600 hover:text-red-900 font-medium text-sm"
            >
              거절
            </button>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="상품 승인 관리"
        subtitle="Supplier가 등록한 상품의 승인/거절을 관리합니다"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">대기 중</p>
              <p className="text-2xl font-bold text-yellow-600">
                {products.filter(p => p.approvalStatus === 'PENDING').length}
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
                {products.filter(p => p.approvalStatus === 'APPROVED').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">거절됨</p>
              <p className="text-2xl font-bold text-red-600">
                {products.filter(p => p.approvalStatus === 'REJECTED').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체</p>
              <p className="text-2xl font-bold">{products.length}</p>
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
                placeholder="상품명, 공급사 검색..."
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
            <option value="PENDING">대기 중</option>
            <option value="APPROVED">승인됨</option>
            <option value="REJECTED">거절됨</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <DataTable<ProductOffer>
        rowKey="id"
        columns={columns}
        dataSource={filteredProducts}
        loading={loading}
      />
    </div>
  );
};

export default ProductApprovalQueuePage;
