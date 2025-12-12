/**
 * MemberInvoiceDetail
 *
 * 회원 포털 - 청구서 상세 페이지
 * - 청구 상세 내역
 * - 납부 안내
 * - 납부 버튼
 */

import React, { useState, useEffect } from 'react';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  year: number;
  status: 'pending' | 'paid' | 'overdue' | 'exempted' | 'cancelled';
  totalAmount: number;
  amountBreakdown: {
    baseAmount: number;
    divisionFee: number;
    branchFee: number;
    adjustments?: Array<{ type: string; amount: number; reason: string }>;
  };
  dueDate: string;
  createdAt: string;
  paidAt?: string;
  member: {
    name: string;
    licenseNumber?: string;
    organizationName?: string;
  };
  payment?: {
    id: string;
    amount: number;
    paymentMethod: string;
    paidAt: string;
    receiptNumber?: string;
  };
}

interface PaymentInfo {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  virtualAccount?: string;
}

interface MemberInvoiceDetailProps {
  invoiceId: string;
  apiEndpoint?: string;
  onPaymentClick?: (invoiceId: string, paymentMethod: string) => void;
  onReceiptDownload?: (paymentId: string) => void;
}

export function MemberInvoiceDetail({
  invoiceId,
  apiEndpoint = '/api/annualfee/member/invoices',
  onPaymentClick,
  onReceiptDownload,
}: MemberInvoiceDetailProps) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('bank_transfer');

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceDetail();
    }
  }, [invoiceId]);

  const loadInvoiceDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoiceRes, paymentInfoRes] = await Promise.all([
        fetch(`${apiEndpoint}/${invoiceId}`, { credentials: 'include' }),
        fetch(`${apiEndpoint}/${invoiceId}/payment-info`, { credentials: 'include' }),
      ]);

      const invoiceResult = await invoiceRes.json();
      const paymentInfoResult = await paymentInfoRes.json();

      if (invoiceResult.success) {
        setInvoice(invoiceResult.data);
      } else {
        setError(invoiceResult.error || '청구서를 불러올 수 없습니다.');
      }

      if (paymentInfoResult.success) {
        setPaymentInfo(paymentInfoResult.data);
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
      cancelled: { label: '취소', color: 'text-gray-800', bgColor: 'bg-gray-100' },
    };
    return info[status] || { label: status, color: 'text-gray-800', bgColor: 'bg-gray-100' };
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

  const handlePayment = () => {
    if (invoice && onPaymentClick) {
      onPaymentClick(invoice.id, selectedMethod);
    }
  };

  const handleReceiptDownload = () => {
    if (invoice?.payment && onReceiptDownload) {
      onReceiptDownload(invoice.payment.id);
    } else if (invoice?.payment) {
      window.open(`/api/annualfee/receipts/${invoice.payment.id}/pdf`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-60 bg-gray-200 rounded mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || '청구서를 찾을 수 없습니다.'}</p>
          <button
            onClick={loadInvoiceDetail}
            className="mt-2 text-red-600 hover:underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);
  const canPay = invoice.status === 'pending' || invoice.status === 'overdue';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">청구서 상세</h1>
          <p className="text-gray-600 mt-1">청구번호: {invoice.invoiceNumber}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 청구 정보 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">청구 정보</h2>

          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">청구 연도</span>
              <span className="font-medium">{invoice.year}년</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">납부 기한</span>
              <span className="font-medium">{formatDate(invoice.dueDate)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">발행일</span>
              <span className="font-medium">{formatDate(invoice.createdAt)}</span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-medium mb-3">금액 내역</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
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
              {invoice.amountBreakdown.adjustments?.map((adj, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-gray-600">{adj.reason}</span>
                  <span className={adj.amount > 0 ? 'text-red-600' : 'text-green-600'}>
                    {adj.amount > 0 ? '+' : ''}{formatCurrency(adj.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2 border-t font-bold text-lg">
                <span>합계</span>
                <span>{formatCurrency(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 납부 정보 또는 납부 안내 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {invoice.payment ? (
            <>
              <h2 className="text-lg font-semibold mb-4">납부 정보</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">납부일</span>
                  <span className="font-medium">{formatDate(invoice.payment.paidAt)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">납부 금액</span>
                  <span className="font-medium">{formatCurrency(invoice.payment.amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">납부 방법</span>
                  <span className="font-medium">{getPaymentMethodLabel(invoice.payment.paymentMethod)}</span>
                </div>
                {invoice.payment.receiptNumber && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">영수증 번호</span>
                    <span className="font-mono">{invoice.payment.receiptNumber}</span>
                  </div>
                )}
              </div>
              <button
                onClick={handleReceiptDownload}
                className="w-full mt-6 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                영수증 다운로드
              </button>
            </>
          ) : canPay ? (
            <>
              <h2 className="text-lg font-semibold mb-4">납부 안내</h2>

              {paymentInfo && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-blue-800 mb-2">계좌이체 안내</h3>
                  <div className="text-sm space-y-1">
                    <p><span className="text-gray-600">은행:</span> {paymentInfo.bankName}</p>
                    <p><span className="text-gray-600">계좌번호:</span> <span className="font-mono">{paymentInfo.accountNumber}</span></p>
                    <p><span className="text-gray-600">예금주:</span> {paymentInfo.accountHolder}</p>
                    {paymentInfo.virtualAccount && (
                      <p><span className="text-gray-600">가상계좌:</span> <span className="font-mono">{paymentInfo.virtualAccount}</span></p>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  납부 방법 선택
                </label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="bank_transfer">계좌이체</option>
                  <option value="card">신용카드</option>
                  <option value="virtual_account">가상계좌</option>
                </select>
              </div>

              <button
                onClick={handlePayment}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                {formatCurrency(invoice.totalAmount)} 납부하기
              </button>

              {invoice.status === 'overdue' && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">
                    납부 기한이 지났습니다. 빠른 납부를 부탁드립니다.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {invoice.status === 'exempted' && '회비가 면제되었습니다.'}
                {invoice.status === 'cancelled' && '청구가 취소되었습니다.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 회원 정보 */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">청구 대상</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">성명</p>
            <p className="font-medium">{invoice.member.name}</p>
          </div>
          {invoice.member.licenseNumber && (
            <div>
              <p className="text-sm text-gray-600">면허번호</p>
              <p className="font-medium">{invoice.member.licenseNumber}</p>
            </div>
          )}
          {invoice.member.organizationName && (
            <div>
              <p className="text-sm text-gray-600">소속</p>
              <p className="font-medium">{invoice.member.organizationName}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MemberInvoiceDetail;
