/**
 * AdminProductApprovalPage - 상품/오퍼 승인 관리
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1
 * Pattern: OperatorsPage.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { adminProductApi, type AdminProduct } from '../../lib/api';

const statusLabels: Record<string, string> = {
  PENDING: '승인대기',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const distLabels: Record<string, string> = {
  PUBLIC: '공개',
  SERVICE: '서비스',
  PRIVATE: '비공개',
};

export default function AdminProductApprovalPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
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

  const handleApprove = async (id: string) => {
    if (!confirm('이 상품을 승인하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminProductApi.approveProduct(id);
    setActionLoading(null);
    if (ok) await loadProducts();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    const ok = await adminProductApi.rejectProduct(rejectModal.id, rejectReason);
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
    if (ok) await loadProducts();
  };

  const statuses = ['all', 'PENDING', 'APPROVED', 'REJECTED'];

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">상품 승인 관리</h1>
        <p className="text-slate-500 mt-1">상품 오퍼를 검토하고 승인/반려합니다</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">전체</p>
          <p className="text-2xl font-bold text-slate-800">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">승인대기</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">승인됨</p>
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">반려됨</p>
          <p className="text-2xl font-bold text-red-500">{rejectedCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="상품명, 공급자 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? '전체' : statusLabels[s] || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            {products.length === 0 ? '등록된 상품이 없습니다' : '검색 결과가 없습니다'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상품명</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">공급자</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">카테고리</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">유통정책</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">등록일</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{p.marketingName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.supplierName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{p.category || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {distLabels[p.distributionType] || p.distributionType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[p.approvalStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[p.approvalStatus] || p.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    {p.approvalStatus === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(p.id)}
                          disabled={actionLoading === p.id}
                          className="text-emerald-600 hover:text-emerald-800 font-medium text-sm disabled:opacity-50"
                        >
                          {actionLoading === p.id ? '처리중...' : '승인'}
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: p.id, name: p.marketingName })}
                          disabled={actionLoading === p.id}
                          className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                        >
                          반려
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">상품 반려</h3>
            <p className="text-sm text-slate-500 mb-4">{rejectModal.name}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="반려 사유를 입력하세요 (선택)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectModal.id ? '처리중...' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
