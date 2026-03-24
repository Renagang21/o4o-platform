/**
 * ProductServiceApprovalPage — 서비스별 상품 승인
 *
 * WO-NETURE-PRODUCT-APPROVAL-FLOW-V1
 *
 * Operator: 서비스 레벨 상품 승인 관리.
 * - 상단: Stats 카드 (pending/approved/rejected)
 * - 필터: 상태 탭 + 서비스 드롭다운
 * - 테이블: 상품명, 공급사, 서비스, 상태, 등록일, 액션
 * - 거절 시 사유 입력 모달
 */

import { useState, useCallback, useEffect } from 'react';
import {
  operatorServiceApprovalApi,
  type ServiceApprovalItem,
  type ServiceApprovalStats,
} from '../../lib/api/serviceApproval';

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '승인대기' },
  { key: 'approved', label: '승인됨' },
  { key: 'rejected', label: '거절됨' },
] as const;

const SERVICE_OPTIONS = [
  { key: '', label: '전체 서비스' },
  { key: 'neture', label: 'Neture' },
  { key: 'glycopharm', label: 'GlycoPharm' },
  { key: 'glucoseview', label: 'GlucoseView' },
  { key: 'k-cosmetics', label: 'K-Cosmetics' },
  { key: 'kpa-society', label: 'KPA Society' },
];

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: '승인대기', bg: 'bg-amber-50', text: 'text-amber-700' },
  approved: { label: '승인됨', bg: 'bg-green-50', text: 'text-green-700' },
  rejected: { label: '거절됨', bg: 'bg-red-50', text: 'text-red-700' },
};

export default function ProductServiceApprovalPage() {
  const [items, setItems] = useState<ServiceApprovalItem[]>([]);
  const [stats, setStats] = useState<ServiceApprovalStats>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    const [listResult, statsResult] = await Promise.all([
      operatorServiceApprovalApi.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        serviceKey: serviceFilter || undefined,
        page,
        limit: 50,
      }),
      operatorServiceApprovalApi.stats(),
    ]);
    setItems(listResult.data);
    setPagination(listResult.pagination);
    setStats(statsResult);
    setLoading(false);
  }, [statusFilter, serviceFilter]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const result = await operatorServiceApprovalApi.approve(id);
    if (result.success) {
      await fetchData(pagination.page);
    }
    setActionLoading(null);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setActionLoading(rejectTarget);
    const result = await operatorServiceApprovalApi.reject(rejectTarget, rejectReason || undefined);
    if (result.success) {
      setRejectTarget(null);
      setRejectReason('');
      await fetchData(pagination.page);
    }
    setActionLoading(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">서비스별 상품 승인</h1>
        <p className="text-sm text-slate-500 mt-1">
          공급자가 선택한 서비스별 상품 승인을 관리합니다.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: '전체', value: stats.total, color: 'bg-slate-50 text-slate-700' },
          { label: '승인대기', value: stats.pending, color: 'bg-amber-50 text-amber-700' },
          { label: '승인됨', value: stats.approved, color: 'bg-green-50 text-green-700' },
          { label: '거절됨', value: stats.rejected, color: 'bg-red-50 text-red-700' },
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
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
        >
          {SERVICE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">상품명</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">바코드</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">공급사</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">서비스</th>
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
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">데이터가 없습니다</td>
              </tr>
            ) : (
              items.map((item) => {
                const badge = STATUS_BADGE[item.approvalStatus] || { label: item.approvalStatus, bg: 'bg-slate-50', text: 'text-slate-600' };
                return (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{item.productName || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{item.barcode || '-'}</td>
                    <td className="px-4 py-3">{item.supplierName || '-'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                        {item.serviceKey}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.approvalStatus === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={actionLoading === item.id}
                            className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => { setRejectTarget(item.id); setRejectReason(''); }}
                            disabled={actionLoading === item.id}
                            className="px-2.5 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                          >
                            거절
                          </button>
                        </div>
                      ) : item.approvalStatus === 'rejected' && item.reason ? (
                        <span className="text-xs text-slate-500" title={item.reason}>사유: {item.reason.slice(0, 20)}{item.reason.length > 20 ? '...' : ''}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">
            총 {pagination.total}건 (페이지 {pagination.page}/{pagination.totalPages})
          </div>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => fetchData(p)}
                className={`px-3 py-1 rounded text-sm ${
                  p === pagination.page ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-slate-900 mb-4">승인 거절</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
              className="w-full border border-slate-300 rounded-lg p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                disabled={actionLoading === rejectTarget}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                거절 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
