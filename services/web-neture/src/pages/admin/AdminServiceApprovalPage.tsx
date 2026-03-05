/**
 * AdminServiceApprovalPage - 파트너/서비스 승인 관리
 *
 * WO-O4O-ADMIN-UI-COMPLETION-V1
 * Uses: /admin/service-approvals API
 * Pattern: OperatorsPage.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { adminServiceApprovalApi, type ServiceApproval } from '../../lib/api';

const statusLabels: Record<string, string> = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '거절',
  REVOKED: '철회',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  REVOKED: 'bg-slate-100 text-slate-500',
};

export default function AdminServiceApprovalPage() {
  const [approvals, setApprovals] = useState<ServiceApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<{ id: string; name: string; action: 'reject' | 'revoke' } | null>(null);
  const [reason, setReason] = useState('');

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    const data = await adminServiceApprovalApi.getServiceApprovals();
    setApprovals(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleApprove = async (id: string) => {
    if (!confirm('이 서비스 신청을 승인하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminServiceApprovalApi.approveServiceApproval(id);
    setActionLoading(null);
    if (ok) await loadApprovals();
  };

  const handleReasonAction = async () => {
    if (!reasonModal) return;
    setActionLoading(reasonModal.id);
    let ok = false;
    if (reasonModal.action === 'reject') {
      ok = await adminServiceApprovalApi.rejectServiceApproval(reasonModal.id, reason);
    } else {
      ok = await adminServiceApprovalApi.revokeServiceApproval(reasonModal.id, reason);
    }
    setActionLoading(null);
    setReasonModal(null);
    setReason('');
    if (ok) await loadApprovals();
  };

  const statuses = ['all', 'PENDING', 'APPROVED', 'REJECTED', 'REVOKED'];

  const filtered = approvals.filter((a) => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      a.productName.toLowerCase().includes(term) ||
      a.supplierName.toLowerCase().includes(term) ||
      (a.sellerOrg || '').toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  const countByStatus = (s: string) => approvals.filter((a) => a.status === s).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">파트너/서비스 승인 관리</h1>
        <p className="text-slate-500 mt-1">서비스 이용 신청을 검토하고 승인/거절/철회합니다</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">전체</p>
          <p className="text-2xl font-bold text-slate-800">{approvals.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">대기</p>
          <p className="text-2xl font-bold text-amber-600">{countByStatus('PENDING')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">승인</p>
          <p className="text-2xl font-bold text-green-600">{countByStatus('APPROVED')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">거절</p>
          <p className="text-2xl font-bold text-red-500">{countByStatus('REJECTED')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
          <p className="text-sm text-slate-500">철회</p>
          <p className="text-2xl font-bold text-slate-400">{countByStatus('REVOKED')}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="상품명, 공급자, 판매자 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
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
            {approvals.length === 0 ? '등록된 서비스 승인 요청이 없습니다' : '검색 결과가 없습니다'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상품명</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">공급자</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">판매자</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">서비스</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">신청일</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{a.productName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{a.supplierName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{a.sellerOrg || '-'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{a.serviceId || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[a.status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(a.requestedAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    {a.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(a.id)}
                          disabled={actionLoading === a.id}
                          className="text-emerald-600 hover:text-emerald-800 font-medium text-sm disabled:opacity-50"
                        >
                          {actionLoading === a.id ? '처리중...' : '승인'}
                        </button>
                        <button
                          onClick={() => setReasonModal({ id: a.id, name: a.productName, action: 'reject' })}
                          disabled={actionLoading === a.id}
                          className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                        >
                          거절
                        </button>
                      </>
                    )}
                    {a.status === 'APPROVED' && (
                      <button
                        onClick={() => setReasonModal({ id: a.id, name: a.productName, action: 'revoke' })}
                        disabled={actionLoading === a.id}
                        className="text-red-500 hover:text-red-700 font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === a.id ? '처리중...' : '철회'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {reasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              {reasonModal.action === 'reject' ? '서비스 거절' : '서비스 철회'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">{reasonModal.name}</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="사유를 입력하세요 (선택)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
              rows={3}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setReasonModal(null); setReason(''); }}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
              >
                취소
              </button>
              <button
                onClick={handleReasonAction}
                disabled={actionLoading === reasonModal.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === reasonModal.id ? '처리중...' : reasonModal.action === 'reject' ? '거절' : '철회'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
