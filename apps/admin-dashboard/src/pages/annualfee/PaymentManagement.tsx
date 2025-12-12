import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface FeePayment {
  id: string;
  invoiceId: string;
  invoiceNumber?: string;
  memberId: string;
  memberName?: string;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'virtual_account' | 'auto_debit';
  receiptNumber?: string;
  paidAt: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  refundedAt?: string;
  refundReason?: string;
  createdAt: string;
}

/**
 * PaymentManagement
 *
 * 납부 내역 관리 페이지
 */
export default function PaymentManagement() {
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    status: '',
    paymentMethod: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    loadPayments();
  }, [filters, pagination.page]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        year: filters.year.toString(),
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await authClient.api.get(`/api/annualfee/payments?${params}`);
      if (response.data?.success) {
        setPayments(response.data.data.items || response.data.data);
        if (response.data.data.total) {
          setPagination((prev) => ({ ...prev, total: response.data.data.total }));
        }
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedPayment || !refundReason) {
      alert('환불 사유를 입력해주세요.');
      return;
    }

    try {
      await authClient.api.post(`/api/annualfee/payments/${selectedPayment.id}/refund`, {
        reason: refundReason,
      });
      alert('환불 처리되었습니다.');
      setShowRefundModal(false);
      setSelectedPayment(null);
      setRefundReason('');
      loadPayments();
    } catch (error) {
      console.error('Failed to refund:', error);
      alert('환불 처리에 실패했습니다.');
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        year: filters.year.toString(),
        format: 'excel',
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await authClient.api.get(`/api/annualfee/payments/export?${params}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payments_${filters.year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
      alert('엑셀 다운로드에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      completed: '완료',
      pending: '대기',
      failed: '실패',
      refunded: '환불',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
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

  if (loading && payments.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
        <h1 className="text-2xl font-bold">납부 내역 관리</h1>
        <button
          onClick={handleExportExcel}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          엑셀 다운로드
        </button>
      </div>

      {/* 필터 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
              <option value="completed">완료</option>
              <option value="pending">대기</option>
              <option value="failed">실패</option>
              <option value="refunded">환불</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">납부방법</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">전체</option>
              <option value="cash">현금</option>
              <option value="bank_transfer">계좌이체</option>
              <option value="card">카드</option>
              <option value="virtual_account">가상계좌</option>
              <option value="auto_debit">자동이체</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setPagination({ ...pagination, page: 1 });
                loadPayments();
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 w-full"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 납부 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">영수번호</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">회원</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">납부금액</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">납부방법</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">납부일시</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">상태</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">
                  {payment.receiptNumber || '-'}
                </td>
                <td className="px-4 py-3">{payment.memberName || payment.memberId}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  {getPaymentMethodLabel(payment.paymentMethod)}
                </td>
                <td className="px-4 py-3 text-center text-sm">
                  {formatDateTime(payment.paidAt)}
                </td>
                <td className="px-4 py-3 text-center">{getStatusBadge(payment.status)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    {payment.status === 'completed' && (
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowRefundModal(true);
                        }}
                        className="text-red-600 hover:underline text-sm"
                      >
                        환불
                      </button>
                    )}
                    <button className="text-blue-600 hover:underline text-sm">영수증</button>
                    <button className="text-gray-600 hover:underline text-sm">상세</button>
                  </div>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  납부 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination.total > pagination.limit && (
        <div className="flex justify-center mt-4 gap-2">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            이전
          </button>
          <span className="px-3 py-1">
            {pagination.page} / {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}

      {/* 환불 모달 */}
      {showRefundModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">환불 처리</h2>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">영수번호: {selectedPayment.receiptNumber}</p>
                <p className="text-sm text-gray-600">
                  납부금액: {formatCurrency(selectedPayment.amount)}
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  환불 사유 *
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="환불 사유를 입력하세요"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowRefundModal(false);
                    setSelectedPayment(null);
                    setRefundReason('');
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  취소
                </button>
                <button
                  onClick={handleRefund}
                  disabled={!refundReason}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  환불 처리
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
