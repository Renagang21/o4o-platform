import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface FeeStatus {
  memberId: string;
  memberName: string;
  year: number;
  invoice?: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: 'pending' | 'paid' | 'overdue' | 'exempted';
    dueDate: string;
    paidAt?: string;
    amountBreakdown: {
      baseAmount: number;
      divisionFee: number;
      branchFee: number;
    };
  };
  payment?: {
    id: string;
    receiptNumber: string;
    amount: number;
    paymentMethod: string;
    paidAt: string;
  };
  exemption?: {
    id: string;
    category: string;
    exemptionType: string;
    exemptionRate?: number;
    status: string;
  };
}

interface FeeHistory {
  year: number;
  status: 'paid' | 'unpaid' | 'exempted';
  amount?: number;
  paidAt?: string;
}

/**
 * FeeStatusPage
 *
 * 회원 회비 현황 조회 페이지
 */
export default function FeeStatusPage() {
  const [currentStatus, setCurrentStatus] = useState<FeeStatus | null>(null);
  const [history, setHistory] = useState<FeeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadFeeStatus();
  }, [selectedYear]);

  const loadFeeStatus = async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        authClient.api.get(`/api/annualfee/members/me/status?year=${selectedYear}`),
        authClient.api.get('/api/annualfee/members/me/history'),
      ]);

      if (statusRes.data?.success) {
        setCurrentStatus(statusRes.data.data);
      }
      if (historyRes.data?.success) {
        setHistory(historyRes.data.data);
      }
    } catch (error) {
      console.error('Failed to load fee status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const response = await authClient.api.get(
        `/api/annualfee/members/me/receipts/${paymentId}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt_${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to download receipt:', error);
      alert('영수증 다운로드에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '납부 대기',
      paid: '납부 완료',
      overdue: '연체',
      exempted: '면제',
      unpaid: '미납',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600 bg-yellow-50',
      paid: 'text-green-600 bg-green-50',
      overdue: 'text-red-600 bg-red-50',
      exempted: 'text-blue-600 bg-blue-50',
      unpaid: 'text-gray-600 bg-gray-50',
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: '현금',
      bank_transfer: '계좌이체',
      card: '카드',
      virtual_account: '가상계좌',
      auto_debit: '자동이체',
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-48 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">회비 납부 현황</h1>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="border rounded px-3 py-2"
        >
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
      </div>

      {/* 현재 연도 회비 현황 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{selectedYear}년 회비 현황</h2>

        {currentStatus?.invoice ? (
          <div>
            {/* 상태 배지 */}
            <div className="flex items-center justify-between mb-4">
              <span
                className={`px-4 py-2 rounded-full font-medium ${getStatusColor(
                  currentStatus.invoice.status
                )}`}
              >
                {getStatusLabel(currentStatus.invoice.status)}
              </span>
              {currentStatus.invoice.status === 'pending' && (
                <span className="text-sm text-gray-500">
                  납부기한: {formatDate(currentStatus.invoice.dueDate)}
                </span>
              )}
            </div>

            {/* 청구 내역 */}
            <div className="border rounded-lg p-4 mb-4">
              <h3 className="font-medium mb-3">청구 내역</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">청구번호</span>
                  <span className="font-mono">{currentStatus.invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">본회비</span>
                  <span>{formatCurrency(currentStatus.invoice.amountBreakdown.baseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">지부비</span>
                  <span>{formatCurrency(currentStatus.invoice.amountBreakdown.divisionFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">분회비</span>
                  <span>{formatCurrency(currentStatus.invoice.amountBreakdown.branchFee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-medium">
                  <span>총 청구금액</span>
                  <span className="text-lg">{formatCurrency(currentStatus.invoice.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* 납부 정보 (납부 완료 시) */}
            {currentStatus.payment && (
              <div className="border rounded-lg p-4 bg-green-50">
                <h3 className="font-medium mb-3 text-green-800">납부 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">영수번호</span>
                    <span className="font-mono">{currentStatus.payment.receiptNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">납부금액</span>
                    <span>{formatCurrency(currentStatus.payment.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">납부방법</span>
                    <span>{getPaymentMethodLabel(currentStatus.payment.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">납부일</span>
                    <span>{formatDate(currentStatus.payment.paidAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadReceipt(currentStatus.payment!.id)}
                  className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                >
                  영수증 다운로드
                </button>
              </div>
            )}

            {/* 감면 정보 */}
            {currentStatus.exemption && (
              <div className="border rounded-lg p-4 bg-blue-50 mt-4">
                <h3 className="font-medium mb-3 text-blue-800">감면 정보</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">감면 유형</span>
                    <span>{currentStatus.exemption.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">감면율</span>
                    <span>
                      {currentStatus.exemption.exemptionType === 'full'
                        ? '전액 면제'
                        : `${currentStatus.exemption.exemptionRate}% 감면`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">승인 상태</span>
                    <span>{currentStatus.exemption.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 납부 안내 (미납 시) */}
            {(currentStatus.invoice.status === 'pending' ||
              currentStatus.invoice.status === 'overdue') && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">납부 안내</h3>
                <p className="text-sm text-yellow-700 mb-3">
                  아래 계좌로 회비를 납부해 주시기 바랍니다.
                </p>
                <div className="bg-white rounded p-3 text-sm space-y-1">
                  <p>
                    <span className="text-gray-600">은행:</span> 국민은행
                  </p>
                  <p>
                    <span className="text-gray-600">계좌번호:</span> 123-456-789012
                  </p>
                  <p>
                    <span className="text-gray-600">예금주:</span> (사)대한약사회
                  </p>
                  <p>
                    <span className="text-gray-600">입금자명:</span>{' '}
                    {currentStatus.memberName || '회원명'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {selectedYear}년도 회비 청구 내역이 없습니다.
          </div>
        )}
      </div>

      {/* 납부 이력 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">납부 이력</h2>
        {history.length > 0 ? (
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left text-sm font-medium text-gray-500">연도</th>
                <th className="py-2 text-center text-sm font-medium text-gray-500">상태</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">납부금액</th>
                <th className="py-2 text-right text-sm font-medium text-gray-500">납부일</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.year} className="border-b">
                  <td className="py-3">{item.year}년</td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(item.status)}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {item.amount ? formatCurrency(item.amount) : '-'}
                  </td>
                  <td className="py-3 text-right text-sm text-gray-500">
                    {item.paidAt ? formatDate(item.paidAt) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-8 text-gray-500">납부 이력이 없습니다.</div>
        )}
      </div>

      {/* 문의 안내 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
        <p className="font-medium mb-2">문의 안내</p>
        <p>회비 관련 문의사항은 소속 지부/분회 또는 본회 회원관리팀으로 연락해 주세요.</p>
        <p className="mt-1">
          본회 연락처: 02-XXX-XXXX | 이메일: member@yaksa.or.kr
        </p>
      </div>
    </div>
  );
}

export { FeeStatusPage };
