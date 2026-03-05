/**
 * AdminSupplierApprovalPage - 공급자 승인 관리
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1
 * Pattern: OperatorsPage.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { adminSupplierApi, type AdminSupplier } from '../../lib/api';

const statusLabels: Record<string, string> = {
  PENDING: '승인대기',
  ACTIVE: '활성',
  REJECTED: '거절됨',
  INACTIVE: '비활성',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
};

export default function AdminSupplierApprovalPage() {
  const [suppliers, setSuppliers] = useState<AdminSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    const data = await adminSupplierApi.getSuppliers();
    setSuppliers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleApprove = async (id: string) => {
    if (!confirm('이 공급자를 승인하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminSupplierApi.approveSupplier(id);
    setActionLoading(null);
    if (ok) await loadSuppliers();
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    const ok = await adminSupplierApi.rejectSupplier(rejectModal.id, rejectReason);
    setActionLoading(null);
    setRejectModal(null);
    setRejectReason('');
    if (ok) await loadSuppliers();
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('이 공급자를 비활성화하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminSupplierApi.deactivateSupplier(id);
    setActionLoading(null);
    if (ok) await loadSuppliers();
  };

  const statuses = ['all', 'PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE'];

  const filtered = suppliers.filter((s) => {
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch = !term || s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const pendingCount = suppliers.filter((s) => s.status === 'PENDING').length;
  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = suppliers.filter((s) => s.status === 'INACTIVE' || s.status === 'REJECTED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">공급자 승인 관리</h1>
        <p className="text-slate-500 mt-1">공급자 등록 신청을 검토하고 승인/거절합니다</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">전체</p>
          <p className="text-2xl font-bold text-slate-800">{suppliers.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">승인대기</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">활성</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">비활성/거절</p>
          <p className="text-2xl font-bold text-slate-400">{inactiveCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="공급자명, 이메일 검색..."
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
            {suppliers.length === 0 ? '등록된 공급자가 없습니다' : '검색 결과가 없습니다'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">공급자명</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">대표자</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">이메일</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">등록일</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{s.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.representativeName || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{s.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[s.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    {s.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(s.id)}
                          disabled={actionLoading === s.id}
                          className="text-emerald-600 hover:text-emerald-800 font-medium text-sm disabled:opacity-50"
                        >
                          {actionLoading === s.id ? '처리중...' : '승인'}
                        </button>
                        <button
                          onClick={() => setRejectModal({ id: s.id, name: s.name })}
                          disabled={actionLoading === s.id}
                          className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                        >
                          거절
                        </button>
                      </>
                    )}
                    {s.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleDeactivate(s.id)}
                        disabled={actionLoading === s.id}
                        className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === s.id ? '처리중...' : '비활성화'}
                      </button>
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
            <h3 className="text-lg font-bold text-slate-800 mb-2">공급자 거절</h3>
            <p className="text-sm text-slate-500 mb-4">{rejectModal.name}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
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
                {actionLoading === rejectModal.id ? '처리중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
