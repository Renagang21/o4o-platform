/**
 * MemberPaymentHistory
 *
 * 회원 포털 - 납부 이력 상세 페이지
 * - 전체 납부 이력
 * - 영수증 다운로드
 * - 년도별 필터링
 */

import React, { useState, useEffect } from 'react';

interface PaymentRecord {
  id: string;
  year: number;
  invoiceNumber: string;
  amount: number;
  paymentMethod: string;
  paidAt: string;
  receiptNumber?: string;
  status: 'completed' | 'refunded';
  refundedAt?: string;
}

interface MemberPaymentHistoryProps {
  apiEndpoint?: string;
  onReceiptDownload?: (paymentId: string) => void;
}

export function MemberPaymentHistory({
  apiEndpoint = '/api/annualfee/member/payments',
  onReceiptDownload,
}: MemberPaymentHistoryProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterYear, setFilterYear] = useState<number | 'all'>('all');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    loadPayments();
  }, [filterYear]);

  const loadPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterYear === 'all'
        ? apiEndpoint
        : `${apiEndpoint}?year=${filterYear}`;
      const response = await fetch(url, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setPayments(result.data);
      } else {
        setError(result.error || '데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: '현금',
      bank_transfer: '계좌이체',
      card: '신용카드',
      virtual_account: '가상계좌',
      auto_debit: '자동이체',
    };
    return labels[method] || method;
  };

  const handleReceiptDownload = (paymentId: string) => {
    if (onReceiptDownload) {
      onReceiptDownload(paymentId);
    } else {
      window.open(`/api/annualfee/receipts/${paymentId}/pdf`, '_blank');
    }
  };

  const totalAmount = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadPayments}
            className="mt-2 text-red-600 hover:underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">납부 이력</h1>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">전체 연도</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}년
            </option>
          ))}
        </select>
      </div>

      {/* 요약 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-blue-600">총 납부 금액</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-600">납부 건수</p>
            <p className="text-2xl font-bold text-blue-800">{payments.filter(p => p.status === 'completed').length}건</p>
          </div>
        </div>
      </div>

      {/* 납부 목록 */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {payments.length > 0 ? (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">연도</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">납부일</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">금액</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">납부방법</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">상태</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">영수증</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium">{payment.year}년</td>
                  <td className="px-4 py-4 text-gray-600">{formatDate(payment.paidAt)}</td>
                  <td className="px-4 py-4 text-right font-medium">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-600">
                    {getPaymentMethodLabel(payment.paymentMethod)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {payment.status === 'completed' ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        완료
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        환불
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {payment.status === 'completed' && (
                      <button
                        onClick={() => handleReceiptDownload(payment.id)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        다운로드
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>납부 이력이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemberPaymentHistory;
