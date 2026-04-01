/**
 * OperatorProductApprovalPage — Operator 상품 승인 관리
 *
 * WO-O4O-NETURE-PRODUCT-APPROVAL-UI-V1
 *
 * 기존 adminProductApi 재사용 + ProductDetailDrawer로 검토.
 * AdminProductApprovalPage 대비: Drawer 기반 상세, 이미지 포함.
 */

import { useState, useCallback, useEffect } from 'react';
import { adminProductApi, type AdminProduct, type DistributionType } from '../../lib/api';
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

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">상품명</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">공급자</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">카테고리</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">유통정책</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">상태</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">등록일</th>
              <th className="text-center px-4 py-3 font-medium text-slate-600">액션</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">로딩 중...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  {products.length === 0 ? '등록된 상품이 없습니다' : '검색 결과가 없습니다'}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const badge = STATUS_BADGE[p.approvalStatus] || { label: p.approvalStatus, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setDrawerProduct(p)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.marketingName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{p.id.slice(0, 8)}...</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.supplierName}</td>
                    <td className="px-4 py-3 text-slate-600">{p.category || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                        {DIST_LABELS[p.distributionType] || p.distributionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      {p.approvalStatus === 'PENDING' && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={actionLoading === p.id}
                            className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => {
                              setRejectTarget({ id: p.id, name: p.marketingName });
                              setRejectReason('');
                            }}
                            disabled={actionLoading === p.id}
                            className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            반려
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
