/**
 * OperatorProductApprovalPage — Operator 상품 승인 관리
 *
 * WO-O4O-NETURE-PRODUCT-APPROVAL-UI-V1
 * WO-O4O-TABLE-STANDARD-V1 — Raw HTML → DataTable + Selection + Bulk Action
 *
 * 기존 adminProductApi 재사용 + ProductDetailDrawer로 검토.
 * AdminProductApprovalPage 대비: Drawer 기반 상세, 이미지 포함.
 */

import { useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { adminProductApi, type AdminProduct, type DistributionType } from '../../lib/api';
import { productCleanupApi } from '../../lib/api/operatorProductCleanup';
import type { SupplierProduct } from '../../lib/api';
import ProductDetailDrawer from '../supplier/ProductDetailDrawer';

// ─── Constants ───

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'PENDING', label: '승인대기' },
  { key: 'APPROVED', label: '승인됨' },
  { key: 'REJECTED', label: '반려됨' },
] as const;

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '승인대기', cls: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: '승인됨', cls: 'bg-green-50 text-green-700' },
  REJECTED: { label: '반려됨', cls: 'bg-red-50 text-red-700' },
};

const DIST_LABELS: Record<string, string> = {
  PUBLIC: '공개',
  SERVICE: '서비스',
  PRIVATE: '비공개',
};

// ─── V4: Action Policy ───

const productApprovalPolicy = defineActionPolicy<AdminProduct>('neture:product-approval', {
  inlineMax: 2,
  rules: [
    {
      key: 'approve',
      label: '승인',
      variant: 'primary',
      visible: (row) => row.approvalStatus === 'PENDING',
      confirm: { title: '승인 확인', message: '이 상품을 승인하시겠습니까?', confirmText: '승인' },
    },
    {
      key: 'reject',
      label: '반려',
      variant: 'danger',
      visible: (row) => row.approvalStatus === 'PENDING',
      confirm: (row) => ({
        title: '상품 반려',
        message: row.marketingName,
        variant: 'danger',
        confirmText: '반려 확인',
        showReason: true,
        reasonPlaceholder: '반려 사유를 입력하세요 (선택)',
      }),
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      visible: (row) => row.approvalStatus === 'APPROVED',
      confirm: (row) => ({
        title: '삭제 확인',
        message: `"${row.marketingName}"을 삭제(휴지통 이동)하시겠습니까?`,
        variant: 'danger',
        confirmText: '삭제',
      }),
    },
  ],
});

const PRODUCT_ACTION_ICONS: Record<string, React.ReactNode> = {
  approve: <CheckCircle className="w-4 h-4" />,
  reject: <XCircle className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

// ─── Helpers ───

/** AdminProduct → SupplierProduct 변환 (Drawer용) */
function toDrawerProduct(p: AdminProduct): SupplierProduct {
  return {
    id: p.id,
    masterId: p.masterId,
    name: p.marketingName,
    masterName: p.marketingName,
    barcode: '',
    category: p.category || '',
    categoryName: p.category || null,
    description: '',
    purpose: 'CATALOG',
    isActive: p.isActive,
    acceptsApplications: false,
    distributionType: (p.distributionType || 'PRIVATE') as DistributionType,
    allowedSellerIds: null,
    pendingRequestCount: 0,
    activeServiceCount: 0,
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
    brandName: null,
    specification: null,
    primaryImageUrl: null,
    approvalStatus: p.approvalStatus?.toLowerCase() || 'pending',
    priceGeneral: 0,
    priceGold: null,
    consumerReferencePrice: null,
    consumerShortDescription: p.consumerShortDescription,
    consumerDetailDescription: p.consumerDetailDescription,
  } as SupplierProduct;
}

// ─── Component ───

export default function OperatorProductApprovalPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // V3: Batch action hook
  const batch = useBatchAction();

  // Drawer
  const [drawerProduct, setDrawerProduct] = useState<AdminProduct | null>(null);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    const data = await adminProductApi.getProducts();
    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Reset selection on filter/tab change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, searchTerm]);

  // ─── Actions ───

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const ok = await adminProductApi.approveProduct(id);
    setActionLoading(null);
    if (ok) {
      setDrawerProduct(null);
      await loadProducts();
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget.id);
    const ok = await adminProductApi.rejectProduct(rejectTarget.id, rejectReason || undefined);
    setActionLoading(null);
    if (ok) {
      setRejectTarget(null);
      setRejectReason('');
      setDrawerProduct(null);
      await loadProducts();
    }
  };

  /** V4: RowActionMenu용 반려 핸들러 (ConfirmActionDialog에서 사유 전달) */
  const handleRejectDirect = async (id: string, reason?: string) => {
    setActionLoading(id);
    const ok = await adminProductApi.rejectProduct(id, reason);
    setActionLoading(null);
    if (ok) {
      setDrawerProduct(null);
      await loadProducts();
    }
  };

  /** V4: RowActionMenu용 삭제 핸들러 */
  const handleSoftDelete = async (id: string) => {
    setActionLoading(id);
    const res = await productCleanupApi.softDelete(id);
    setActionLoading(null);
    if (res.success) loadProducts();
  };

  // ─── V3: Batch Actions (single API call) ───

  const handleBulkApprove = async () => {
    const pendingIds = [...selectedIds].filter((id) => {
      const p = products.find((prod) => prod.id === id);
      return p?.approvalStatus === 'PENDING';
    });
    if (pendingIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => adminProductApi.batchApprove(batchIds),
      pendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadProducts();
    }
  };

  const handleBulkReject = async () => {
    const pendingIds = [...selectedIds].filter((id) => {
      const p = products.find((prod) => prod.id === id);
      return p?.approvalStatus === 'PENDING';
    });
    if (pendingIds.length === 0) return;
    const result = await batch.executeBatch(
      (batchIds) => adminProductApi.batchReject(batchIds, '일괄 반려'),
      pendingIds,
    );
    if (result.successCount > 0) {
      setSelectedIds(new Set());
      loadProducts();
    }
  };

  // ─── Filtering ───

  const filtered = products.filter((p) => {
    const matchStatus = statusFilter === 'all' || p.approvalStatus === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      p.marketingName.toLowerCase().includes(term) ||
      p.supplierName.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const pendingCount = products.filter((p) => p.approvalStatus === 'PENDING').length;
  const approvedCount = products.filter((p) => p.approvalStatus === 'APPROVED').length;
  const rejectedCount = products.filter((p) => p.approvalStatus === 'REJECTED').length;

  // ─── Bulk action counts ───

  const selectedPendingCount = [...selectedIds].filter((id) => {
    const p = products.find((prod) => prod.id === id);
    return p?.approvalStatus === 'PENDING';
  }).length;

  // ─── Column Definitions ───

  const columns: ListColumnDef<AdminProduct>[] = [
    {
      key: 'marketingName',
      header: '상품명',
      sortable: true,
      render: (_v, row) => (
        <div>
          <p className="font-medium text-slate-800">{row.marketingName}</p>
          <p className="text-xs text-slate-400 mt-0.5">{row.id.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      key: 'supplierName',
      header: '공급자',
      sortable: true,
    },
    {
      key: 'category',
      header: '카테고리',
      render: (v) => v || '-',
    },
    {
      key: 'distributionType',
      header: '유통정책',
      align: 'center',
      width: '100px',
      render: (v) => (
        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          {DIST_LABELS[v] || v}
        </span>
      ),
    },
    {
      key: 'approvalStatus',
      header: '상태',
      align: 'center',
      width: '100px',
      sortable: true,
      render: (v) => {
        const badge = STATUS_BADGE[v] || { label: v, cls: 'bg-slate-100 text-slate-600' };
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '110px',
      sortable: true,
      sortAccessor: (row) => new Date(row.createdAt).getTime(),
      render: (v) => (
        <span className="text-xs text-slate-500">
          {new Date(v).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '액션',
      align: 'center',
      width: '80px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        actionLoading === row.id ? (
          <div className="flex justify-center">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <RowActionMenu
            inlineMax={productApprovalPolicy.inlineMax}
            actions={buildRowActions(productApprovalPolicy, row, {
              approve: () => handleApprove(row.id),
              reject: (reason) => handleRejectDirect(row.id, reason),
              delete: () => handleSoftDelete(row.id),
            }, { icons: PRODUCT_ACTION_ICONS })}
          />
        )
      ),
    },
  ];

  // ─── Drawer approval actions ───

  const drawerApprovalActions = drawerProduct && drawerProduct.approvalStatus === 'PENDING'
    ? {
        onApprove: () => handleApprove(drawerProduct.id),
        onReject: () => {
          setRejectTarget({ id: drawerProduct.id, name: drawerProduct.marketingName });
        },
        loading: actionLoading === drawerProduct.id,
      }
    : undefined;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">상품 승인 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          공급자가 등록한 상품을 검토하고 승인 / 반려합니다.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체', value: products.length, color: 'bg-slate-50 text-slate-700' },
          { label: '승인대기', value: pendingCount, color: 'bg-amber-50 text-amber-700' },
          { label: '승인됨', value: approvedCount, color: 'bg-green-50 text-green-700' },
          { label: '반려됨', value: rejectedCount, color: 'bg-red-50 text-red-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
            <div className="text-sm font-medium">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="상품명, 공급자 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* V3: ActionBar with grouping + tooltip */}
      <div className="mb-3">
        <ActionBar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          actions={[
            {
              key: 'approve',
              label: `승인 (${selectedPendingCount})`,
              onClick: handleBulkApprove,
              variant: 'primary' as const,
              icon: <CheckCircle size={14} />,
              loading: batch.loading,
              group: 'actions',
              tooltip: '선택된 대기 상품을 일괄 승인합니다',
              visible: selectedPendingCount > 0,
            },
            {
              key: 'reject',
              label: `반려 (${selectedPendingCount})`,
              onClick: handleBulkReject,
              variant: 'danger' as const,
              icon: <XCircle size={14} />,
              loading: batch.loading,
              group: 'actions',
              tooltip: '선택된 대기 상품을 일괄 반려합니다',
              visible: selectedPendingCount > 0,
            },
          ]}
        />
      </div>

      {/* DataTable */}
      <DataTable<AdminProduct>
        columns={columns}
        data={filtered}
        rowKey="id"
        loading={loading}
        emptyMessage={products.length === 0 ? '등록된 상품이 없습니다' : '검색 결과가 없습니다'}
        onRowClick={(row) => setDrawerProduct(row)}
        tableId="neture-product-approval"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">상품 반려</h3>
            <p className="text-sm text-slate-500 mb-4">{rejectTarget.name}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요 (선택)"
              className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading === rejectTarget.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectTarget.id ? '처리 중...' : '반려 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Drawer */}
      <ProductDetailDrawer
        product={drawerProduct ? toDrawerProduct(drawerProduct) : null}
        open={!!drawerProduct}
        onClose={() => setDrawerProduct(null)}
        onSaved={loadProducts}
        approvalActions={drawerApprovalActions}
      />

      {/* V3: BulkResultModal */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); loadProducts(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />
    </div>
  );
}
