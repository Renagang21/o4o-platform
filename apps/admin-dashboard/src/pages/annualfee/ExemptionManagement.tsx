import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface FeeExemption {
  id: string;
  memberId: string;
  memberName?: string;
  year: number;
  category: 'senior' | 'honorary' | 'inactive' | 'hardship' | 'new_member' | 'official' | 'other';
  exemptionType: 'full' | 'partial';
  exemptionRate?: number;
  exemptedAmount: number;
  originalAmount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

/**
 * ExemptionManagement
 *
 * 회비 감면 관리 페이지
 */
export default function ExemptionManagement() {
  const [exemptions, setExemptions] = useState<FeeExemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    status: '',
    category: '',
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExemption, setSelectedExemption] = useState<FeeExemption | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadExemptions();
  }, [filters]);

  const loadExemptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: filters.year.toString(),
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);

      const response = await authClient.api.get(`/api/annualfee/exemptions?${params}`);
      if (response.data?.success) {
        setExemptions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load exemptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (exemptionId: string) => {
    if (!confirm('이 감면 신청을 승인하시겠습니까?')) return;

    setProcessing(true);
    try {
      await authClient.api.put(`/api/annualfee/exemptions/${exemptionId}/approve`);
      alert('승인되었습니다.');
      loadExemptions();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('승인 처리에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExemption || !rejectionReason) {
      alert('거부 사유를 입력해주세요.');
      return;
    }

    setProcessing(true);
    try {
      await authClient.api.put(`/api/annualfee/exemptions/${selectedExemption.id}/reject`, {
        reason: rejectionReason,
      });
      alert('거부되었습니다.');
      setShowDetailModal(false);
      setSelectedExemption(null);
      setRejectionReason('');
      loadExemptions();
    } catch (error) {
      console.error('Failed to reject:', error);
      alert('거부 처리에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      senior: '경로 우대',
      honorary: '명예회원',
      inactive: '휴직',
      hardship: '경제적 어려움',
      new_member: '신규 가입',
      official: '임원 감면',
      other: '기타',
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: '심사중',
      approved: '승인',
      rejected: '거부',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getExemptionTypeLabel = (type: string, rate?: number) => {
    if (type === 'full') return '전액 면제';
    if (type === 'partial' && rate) return `${rate}% 감면`;
    return type;
  };

  // 통계 계산
  const stats = {
    total: exemptions.length,
    pending: exemptions.filter((e) => e.status === 'pending').length,
    approved: exemptions.filter((e) => e.status === 'approved').length,
    rejected: exemptions.filter((e) => e.status === 'rejected').length,
    totalExempted: exemptions
      .filter((e) => e.status === 'approved')
      .reduce((sum, e) => sum + e.exemptedAmount, 0),
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">회비 감면 관리</h1>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">전체 신청</h3>
          <p className="text-2xl font-bold">{stats.total}건</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">심사 대기</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}건</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">승인</h3>
          <p className="text-2xl font-bold text-green-600">{stats.approved}건</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">거부</h3>
          <p className="text-2xl font-bold text-red-600">{stats.rejected}건</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">총 감면액</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalExempted)}</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
            <select
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              className="w-full border rounded px-3 py-2"
            >
              {[2023, 2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="pending">심사중</option>
              <option value="approved">승인</option>
              <option value="rejected">거부</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">감면 유형</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="senior">경로 우대</option>
              <option value="honorary">명예회원</option>
              <option value="inactive">휴직</option>
              <option value="hardship">경제적 어려움</option>
              <option value="new_member">신규 가입</option>
              <option value="official">임원 감면</option>
              <option value="other">기타</option>
            </select>
          </div>
        </div>
      </div>

      {/* 감면 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">회원</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">연도</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">감면 유형</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">감면율</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">원 금액</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">감면액</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">신청일</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">상태</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {exemptions.map((exemption) => (
              <tr key={exemption.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{exemption.memberName || exemption.memberId}</td>
                <td className="px-4 py-3 text-center">{exemption.year}년</td>
                <td className="px-4 py-3 text-center">{getCategoryLabel(exemption.category)}</td>
                <td className="px-4 py-3 text-center">
                  {getExemptionTypeLabel(exemption.exemptionType, exemption.exemptionRate)}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(exemption.originalAmount)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-red-600">
                  -{formatCurrency(exemption.exemptedAmount)}
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {formatDate(exemption.requestedAt)}
                </td>
                <td className="px-4 py-3 text-center">{getStatusBadge(exemption.status)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    {exemption.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(exemption.id)}
                          disabled={processing}
                          className="text-green-600 hover:underline text-sm"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => {
                            setSelectedExemption(exemption);
                            setShowDetailModal(true);
                          }}
                          className="text-red-600 hover:underline text-sm"
                        >
                          거부
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedExemption(exemption);
                        setShowDetailModal(true);
                      }}
                      className="text-gray-600 hover:underline text-sm"
                    >
                      상세
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {exemptions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  감면 신청 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 상세/거부 모달 */}
      {showDetailModal && selectedExemption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">감면 신청 상세</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">회원</span>
                  <span className="font-medium">
                    {selectedExemption.memberName || selectedExemption.memberId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">연도</span>
                  <span>{selectedExemption.year}년</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">감면 유형</span>
                  <span>{getCategoryLabel(selectedExemption.category)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">감면율</span>
                  <span>
                    {getExemptionTypeLabel(
                      selectedExemption.exemptionType,
                      selectedExemption.exemptionRate
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">원 금액</span>
                  <span>{formatCurrency(selectedExemption.originalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">감면액</span>
                  <span className="text-red-600 font-medium">
                    -{formatCurrency(selectedExemption.exemptedAmount)}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <span className="text-gray-600 block mb-1">신청 사유</span>
                  <p className="text-sm bg-gray-50 p-3 rounded">{selectedExemption.reason}</p>
                </div>
                {selectedExemption.status === 'rejected' && selectedExemption.rejectionReason && (
                  <div className="pt-3 border-t">
                    <span className="text-gray-600 block mb-1">거부 사유</span>
                    <p className="text-sm bg-red-50 p-3 rounded text-red-800">
                      {selectedExemption.rejectionReason}
                    </p>
                  </div>
                )}
              </div>

              {selectedExemption.status === 'pending' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    거부 사유 (거부 시 필수)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="거부 사유를 입력하세요"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedExemption(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  닫기
                </button>
                {selectedExemption.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(selectedExemption.id)}
                      disabled={processing}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={processing || !rejectionReason}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      거부
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
