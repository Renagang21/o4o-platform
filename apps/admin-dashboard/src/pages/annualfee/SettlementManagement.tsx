import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface FeeSettlement {
  id: string;
  organizationId: string;
  organizationName?: string;
  organizationType: 'national' | 'division' | 'branch';
  year: number;
  month: number;
  totalCollected: number;
  branchShare: number;
  divisionShare: number;
  nationalShare: number;
  status: 'pending' | 'confirmed' | 'remitted';
  confirmedAt?: string;
  remittedAt?: string;
  invoiceCount: number;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

/**
 * SettlementManagement
 *
 * 회비 정산 관리 페이지
 */
export default function SettlementManagement() {
  const [settlements, setSettlements] = useState<FeeSettlement[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    month: 0, // 0 = all months
    status: '',
    organizationType: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    organizationType: 'branch' as 'national' | 'division' | 'branch',
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    loadSettlements();
  }, [filters]);

  const loadOrganizations = async () => {
    try {
      const response = await authClient.api.get('/api/organizations');
      if (response.data?.success) {
        setOrganizations(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadSettlements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        year: filters.year.toString(),
      });
      if (filters.month > 0) params.append('month', filters.month.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.organizationType) params.append('organizationType', filters.organizationType);

      const response = await authClient.api.get(`/api/annualfee/settlements?${params}`);
      if (response.data?.success) {
        setSettlements(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load settlements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSettlement = async () => {
    setProcessing(true);
    try {
      const response = await authClient.api.post('/api/annualfee/settlements/generate', createForm);
      if (response.data?.success) {
        alert(`${response.data.data.created}건의 정산이 생성되었습니다.`);
        setShowCreateModal(false);
        loadSettlements();
      }
    } catch (error) {
      console.error('Failed to create settlement:', error);
      alert('정산 생성에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async (settlementId: string) => {
    if (!confirm('이 정산을 확정하시겠습니까?')) return;

    try {
      await authClient.api.put(`/api/annualfee/settlements/${settlementId}/confirm`);
      loadSettlements();
    } catch (error) {
      console.error('Failed to confirm:', error);
      alert('정산 확정에 실패했습니다.');
    }
  };

  const handleRemit = async (settlementId: string) => {
    if (!confirm('송금 완료 처리하시겠습니까?')) return;

    try {
      await authClient.api.put(`/api/annualfee/settlements/${settlementId}/remit`);
      loadSettlements();
    } catch (error) {
      console.error('Failed to remit:', error);
      alert('송금 처리에 실패했습니다.');
    }
  };

  const handleExportReport = async (settlementId: string) => {
    try {
      const response = await authClient.api.get(
        `/api/annualfee/settlements/${settlementId}/report`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `settlement_${settlementId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
      alert('보고서 다운로드에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      remitted: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      pending: '대기',
      confirmed: '확정',
      remitted: '송금완료',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getOrgTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      national: '본회',
      division: '지부',
      branch: '분회',
    };
    return labels[type] || type;
  };

  // 통계 계산
  const stats = {
    totalCollected: settlements.reduce((sum, s) => sum + s.totalCollected, 0),
    totalBranchShare: settlements.reduce((sum, s) => sum + s.branchShare, 0),
    totalDivisionShare: settlements.reduce((sum, s) => sum + s.divisionShare, 0),
    totalNationalShare: settlements.reduce((sum, s) => sum + s.nationalShare, 0),
    pendingCount: settlements.filter((s) => s.status === 'pending').length,
    confirmedCount: settlements.filter((s) => s.status === 'confirmed').length,
    remittedCount: settlements.filter((s) => s.status === 'remitted').length,
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
        <h1 className="text-2xl font-bold">회비 정산 관리</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          정산 생성
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">총 수금액</h3>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalCollected)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">분회 배분</h3>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats.totalBranchShare)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">지부 배분</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.totalDivisionShare)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-500">본회 배분</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalNationalShare)}
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">월</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
              className="w-full border rounded px-3 py-2"
            >
              <option value={0}>전체</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>
                  {m}월
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
              <option value="pending">대기</option>
              <option value="confirmed">확정</option>
              <option value="remitted">송금완료</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">조직 유형</label>
            <select
              value={filters.organizationType}
              onChange={(e) => setFilters({ ...filters, organizationType: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="branch">분회</option>
              <option value="division">지부</option>
              <option value="national">본회</option>
            </select>
          </div>
        </div>
      </div>

      {/* 정산 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">조직</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">기간</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">총 수금액</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">분회</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">지부</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">본회</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">건수</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">상태</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((settlement) => (
              <tr key={settlement.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">
                      {settlement.organizationName || settlement.organizationId}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({getOrgTypeLabel(settlement.organizationType)})
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {settlement.year}년 {settlement.month}월
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(settlement.totalCollected)}
                </td>
                <td className="px-4 py-3 text-right text-purple-600">
                  {formatCurrency(settlement.branchShare)}
                </td>
                <td className="px-4 py-3 text-right text-blue-600">
                  {formatCurrency(settlement.divisionShare)}
                </td>
                <td className="px-4 py-3 text-right text-green-600">
                  {formatCurrency(settlement.nationalShare)}
                </td>
                <td className="px-4 py-3 text-center">{settlement.invoiceCount}건</td>
                <td className="px-4 py-3 text-center">{getStatusBadge(settlement.status)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    {settlement.status === 'pending' && (
                      <button
                        onClick={() => handleConfirm(settlement.id)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        확정
                      </button>
                    )}
                    {settlement.status === 'confirmed' && (
                      <button
                        onClick={() => handleRemit(settlement.id)}
                        className="text-green-600 hover:underline text-sm"
                      >
                        송금완료
                      </button>
                    )}
                    <button
                      onClick={() => handleExportReport(settlement.id)}
                      className="text-gray-600 hover:underline text-sm"
                    >
                      보고서
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {settlements.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  정산 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 정산 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">정산 생성</h2>
              <p className="text-sm text-gray-600 mb-4">
                해당 기간의 납부 내역을 기반으로 정산을 생성합니다.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연도</label>
                  <select
                    value={createForm.year}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, year: parseInt(e.target.value) })
                    }
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">월</label>
                  <select
                    value={createForm.month}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, month: parseInt(e.target.value) })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        {m}월
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">조직 유형</label>
                  <select
                    value={createForm.organizationType}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        organizationType: e.target.value as 'national' | 'division' | 'branch',
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="branch">분회</option>
                    <option value="division">지부</option>
                    <option value="national">본회</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  disabled={processing}
                >
                  취소
                </button>
                <button
                  onClick={handleCreateSettlement}
                  disabled={processing}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? '생성 중...' : '정산 생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
