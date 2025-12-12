/**
 * MemberFeeStatus
 *
 * 회원 포털 - 회비 현황 페이지
 * - 현재 청구 상태 표시
 * - 납부 버튼 / 영수증 다운로드
 * - 납부 내역 요약
 */

import React, { useState, useEffect } from 'react';

interface FeeStatusData {
  currentYear: number;
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: 'pending' | 'paid' | 'overdue' | 'exempted';
    dueDate: string;
    amountBreakdown: {
      baseAmount: number;
      divisionFee: number;
      branchFee: number;
    };
  } | null;
  payments: Array<{
    id: string;
    year: number;
    amount: number;
    paidAt: string;
    receiptNumber?: string;
  }>;
  member: {
    name: string;
    organizationName?: string;
    membershipType?: string;
  };
}

interface MemberFeeStatusProps {
  apiEndpoint?: string;
  onPaymentClick?: (invoiceId: string) => void;
  onReceiptDownload?: (paymentId: string) => void;
}

export function MemberFeeStatus({
  apiEndpoint = '/api/annualfee/member/status',
  onPaymentClick,
  onReceiptDownload,
}: MemberFeeStatusProps) {
  const [data, setData] = useState<FeeStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeeStatus();
  }, []);

  const loadFeeStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result.success) {
        setData(result.data);
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
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusInfo = (status: string) => {
    const info: Record<string, { label: string; color: string; bgColor: string }> = {
      pending: { label: '납부 대기', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
      paid: { label: '납부 완료', color: 'text-green-800', bgColor: 'bg-green-100' },
      overdue: { label: '연체', color: 'text-red-800', bgColor: 'bg-red-100' },
      exempted: { label: '면제', color: 'text-blue-800', bgColor: 'bg-blue-100' },
    };
    return info[status] || { label: status, color: 'text-gray-800', bgColor: 'bg-gray-100' };
  };

  const handlePayment = () => {
    if (data?.invoice && onPaymentClick) {
      onPaymentClick(data.invoice.id);
    }
  };

  const handleReceiptDownload = (paymentId: string) => {
    if (onReceiptDownload) {
      onReceiptDownload(paymentId);
    } else {
      // Default: Open receipt in new window
      window.open(`/api/annualfee/receipts/${paymentId}/pdf`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-40 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
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
            onClick={loadFeeStatus}
            className="mt-2 text-red-600 hover:underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { invoice, payments, member } = data;
  const statusInfo = invoice ? getStatusInfo(invoice.status) : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">회비 납부 현황</h1>
        <p className="text-gray-600 mt-1">
          {member.name}님 ({member.organizationName || '소속 미지정'})
        </p>
      </div>

      {/* 현재 청구 상태 */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">{data.currentYear}년 연회비</h2>
          {statusInfo && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          )}
        </div>

        {invoice ? (
          <>
            {/* 금액 정보 */}
            <div className="border rounded-lg p-4 mb-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">청구 금액</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(invoice.totalAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">납부 기한</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              </div>

              {/* 금액 내역 */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">금액 내역</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">본회비</span>
                    <span>{formatCurrency(invoice.amountBreakdown.baseAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">지부비</span>
                    <span>{formatCurrency(invoice.amountBreakdown.divisionFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">분회비</span>
                    <span>{formatCurrency(invoice.amountBreakdown.branchFee)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3">
              {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                <button
                  onClick={handlePayment}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  납부하기
                </button>
              )}
              {invoice.status === 'paid' && (
                <button
                  onClick={() => handleReceiptDownload(invoice.id)}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  영수증 다운로드
                </button>
              )}
            </div>

            {invoice.status === 'overdue' && (
              <p className="mt-3 text-sm text-red-600">
                납부 기한이 지났습니다. 빠른 납부를 부탁드립니다.
              </p>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>{data.currentYear}년 청구 내역이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 납부 이력 */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">납부 이력</h2>
        {payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{payment.year}년 연회비</p>
                  <p className="text-sm text-gray-500">{formatDate(payment.paidAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(payment.amount)}</p>
                  <button
                    onClick={() => handleReceiptDownload(payment.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    영수증
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>납부 이력이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemberFeeStatus;
