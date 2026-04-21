/**
 * Neture Product Approval Queue Page
 *
 * WO-O4O-ADMIN-PRODUCT-APPROVAL-UI-V1
 * WO-O4O-TABLE-STANDARD-ALIGNMENT-V1 — BaseTable + O4OColumn + RowActionMenu + FilterBar (레퍼런스)
 *
 * Supplier가 등록한 상품(SupplierProductOffer)의 PENDING 상태를
 * Admin이 승인/거절할 수 있는 전용 승인 큐 UI.
 */

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Edit2 } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import { BaseTable, RowActionMenu, FilterBar } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import PageHeader from '../../components/common/PageHeader';

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

const STATUS_MAP: Record<string, { icon: React.ReactNode; label: string; badge: string }> = {
  APPROVED: {
    icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    label: '승인됨',
    badge: 'bg-green-100 text-green-800',
  },
  REJECTED: {
    icon: <XCircle className="w-4 h-4 text-red-500" />,
    label: '거절됨',
    badge: 'bg-red-100 text-red-800',
  },
  PENDING: {
    icon: <Clock className="w-4 h-4 text-yellow-500" />,
    label: '대기 중',
    badge: 'bg-yellow-100 text-yellow-800',
  },
};

const DIST_BADGE: Record<string, string> = {
  PUBLIC: 'bg-blue-100 text-blue-800',
  SERVICE: 'bg-purple-100 text-purple-800',
  PRIVATE: 'bg-gray-100 text-gray-800',
};

export default function ProductApprovalQueuePage() {
  const [products, setProducts] = useState<ProductOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/api/v1/neture/admin/products');
      if (response.data?.success) setProducts(response.data.data || []);
    } catch {
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
    } catch {
      toast.error('승인 처리에 실패했습니다');
    }
  };

  const handleReject = async (id: string, reason?: string) => {
    const r = reason || prompt('거절 사유를 입력해주세요:');
    if (!r) return;
    try {
      await authClient.api.post(`/api/v1/neture/admin/products/${id}/reject`, { reason: r });
      toast.success('상품이 거절되었습니다');
      fetchProducts();
    } catch {
      toast.error('거절 처리에 실패했습니다');
    }
  };

  const filteredProducts = useMemo(() => products.filter((p) => {
    if (filterStatus && p.approvalStatus !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.masterName?.toLowerCase().includes(q) && !p.supplierName?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [products, filterStatus, search]);

  // ── O4O 표준 컬럼 정의 ─────────────────────────────
  const columns: O4OColumn<ProductOffer>[] = [
    {
      key: 'approvalStatus',
      header: '상태',
      width: 110,
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.approvalStatus,
      render: (_, row) => {
        const s = STATUS_MAP[row.approvalStatus] ?? STATUS_MAP.PENDING;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
            {s.icon}
            {s.label}
          </span>
        );
      },
    },
    {
      key: 'masterName',
      header: '상품명',
      sortable: true,
      sortAccessor: (row) => row.masterName,
      render: (_, row) => (
        <span className="text-sm font-medium text-gray-900">{row.masterName || '-'}</span>
      ),
    },
    {
      key: 'supplierName',
      header: '공급사',
      sortable: true,
      sortAccessor: (row) => row.supplierName,
      render: (_, row) => (
        <span className="text-sm text-gray-600">{row.supplierName || '-'}</span>
      ),
    },
    {
      key: 'distributionType',
      header: '유통',
      width: 100,
      align: 'center',
      sortable: true,
      sortAccessor: (row) => row.distributionType,
      render: (_, row) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${DIST_BADGE[row.distributionType] ?? 'bg-gray-100 text-gray-800'}`}>
          {row.distributionType}
        </span>
      ),
    },
    {
      key: 'priceGeneral',
      header: '가격',
      width: 110,
      align: 'right',
      sortable: true,
      sortAccessor: (row) => row.priceGeneral ?? -Infinity,
      render: (_, row) => (
        <span className="text-sm tabular-nums">
          {row.priceGeneral != null ? `₩${row.priceGeneral.toLocaleString()}` : '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: 110,
      sortable: true,
      sortAccessor: (row) => row.createdAt,
      render: (_, row) => (
        <span className="text-sm text-gray-500">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString('ko-KR') : '-'}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => (
        <RowActionMenu
          actions={[
            {
              key: 'approve',
              label: '승인',
              icon: <CheckCircle size={14} />,
              variant: 'primary',
              hidden: row.approvalStatus !== 'PENDING',
              onClick: () => handleApprove(row.id),
            },
            {
              key: 'reject',
              label: '거절',
              icon: <XCircle size={14} />,
              variant: 'danger',
              hidden: row.approvalStatus !== 'PENDING',
              confirm: { title: '거절 확인', message: '이 상품을 거절하시겠습니까?', variant: 'danger', showReason: true, reasonPlaceholder: '거절 사유를 입력해주세요' },
              onClick: (reason) => handleReject(row.id, reason),
            },
            {
              key: 'view',
              label: '상세 보기',
              icon: <Edit2 size={14} />,
              onClick: () => {},
              hidden: row.approvalStatus === 'PENDING',
            },
          ]}
        />
      ),
    },
  ];

  const pending = products.filter((p) => p.approvalStatus === 'PENDING').length;
  const approved = products.filter((p) => p.approvalStatus === 'APPROVED').length;
  const rejected = products.filter((p) => p.approvalStatus === 'REJECTED').length;

  return (
    <div className="p-6">
      <PageHeader
        title="상품 승인 관리"
        subtitle="Supplier가 등록한 상품의 승인/거절을 관리합니다"
        actions={[
          { id: 'refresh', label: '새로고침', icon: <RefreshCw className="w-4 h-4" />, onClick: fetchProducts, variant: 'secondary' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: '대기 중', count: pending, color: 'text-yellow-600', Icon: Clock },
          { label: '승인됨', count: approved, color: 'text-green-600', Icon: CheckCircle },
          { label: '거절됨', count: rejected, color: 'text-red-600', Icon: XCircle },
          { label: '전체', count: products.length, color: 'text-gray-700', Icon: AlertCircle },
        ].map(({ label, count, color, Icon }) => (
          <div key={label} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
            </div>
            <Icon className={`w-8 h-8 opacity-40 ${color}`} />
          </div>
        ))}
      </div>

      {/* FilterBar (표준 컴포넌트) */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <FilterBar
          searchPlaceholder="상품명, 공급사 검색..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              key: 'status',
              placeholder: '모든 상태',
              options: [
                { value: 'PENDING', label: '대기 중' },
                { value: 'APPROVED', label: '승인됨' },
                { value: 'REJECTED', label: '거절됨' },
              ],
            },
          ]}
          filterValues={{ status: filterStatus }}
          onFilterChange={(_, value) => setFilterStatus(value)}
        />
      </div>

      {/* BaseTable (표준 컴포넌트) */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <BaseTable<ProductOffer>
          columns={columns}
          data={filteredProducts}
          rowKey={(row) => row.id}
          emptyMessage="조건에 맞는 상품이 없습니다."
          columnVisibility
          tableId="neture-product-approval"
          reorderable
          persistState
        />
      </div>
    </div>
  );
}
