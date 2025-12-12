import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface FeeInvoice {
  id: string;
  invoiceNumber: string;
  memberId: string;
  memberName?: string;
  year: number;
  totalAmount: number;
  amountBreakdown: {
    baseAmount: number;
    divisionFee: number;
    branchFee: number;
    adjustments: Array<{ type: string; amount: number; reason: string }>;
  };
  status: 'pending' | 'paid' | 'overdue' | 'cancelled' | 'exempted';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

interface FeePolicy {
  id: string;
  name: string;
  year: number;
}

/**
 * InvoiceManagement
 *
 * 회비 청구 관리 페이지
 */
export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState<FeeInvoice[]>([]);
  const [policies, setPolicies] = useState<FeePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear(),
    status: '',
    search: '',
  });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [filters, pagination.page]);

  const loadPolicies = async () => {
    try {
      const response = await authClient.api.get('/api/annualfee/policies');
      if (response.data?.success) {
        setPolicies(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load policies:', error);
    }
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        year: filters.year.toString(),
      });
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await authClient.api.get(`/api/annualfee/invoices?${params}`);
      if (response.data?.success) {
        setInvoices(response.data.data.items || response.data.data);
        if (response.data.data.total) {
          setPagination((prev) => ({ ...prev, total: response.data.data.total }));
        }
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!selectedPolicy) {
      alert('정책을 선택해주세요.');
      return;
    }

    setBulkGenerating(true);
    try {
      const response = await authClient.api.post('/api/annualfee/invoices/bulk-generate', {
        policyId: selectedPolicy,
      });
      if (response.data?.success) {
        alert(`${response.data.data.generated}건의 청구서가 생성되었습니다.`);
        setShowBulkModal(false);
        loadInvoices();
      }
    } catch (error) {
      console.error('Failed to generate invoices:', error);
      alert('청구서 일괄 생성에 실패했습니다.');
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('이 청구서를 취소하시겠습니까?')) return;

    try {
      await authClient.api.put(`/api/annualfee/invoices/${invoiceId}/cancel`);
      loadInvoices();
    } catch (error) {
      console.error('Failed to cancel invoice:', error);
      alert('청구서 취소에 실패했습니다.');
    }
  };

  const handleSendReminder = async (invoiceId: string) => {
    try {
      await authClient.api.post(`/api/annualfee/invoices/${invoiceId}/remind`);
      alert('납부 안내가 발송되었습니다.');
    } catch (error) {
      console.error('Failed to send reminder:', error);
      alert('납부 안내 발송에 실패했습니다.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      exempted: 'bg-blue-100 text-blue-800',
    };
    const labels: Record<string, string> = {
      pending: '납부대기',
      paid: '납부완료',
      overdue: '연체',
      cancelled: '취소',
      exempted: '면제',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading && invoices.length === 0) {
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
        <h1 className="text-2xl font-bold">회비 청구 관리</h1>
        <button
          onClick={() => setShowBulkModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          일괄 청구 생성
        </button>
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
              <option value="pending">납부대기</option>
              <option value="paid">납부완료</option>
              <option value="overdue">연체</option>
              <option value="cancelled">취소</option>
              <option value="exempted">면제</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="청구번호, 회원명..."
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setPagination({ ...pagination, page: 1 });
                loadInvoices();
              }}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {/* 청구 목록 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">청구번호</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">회원</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">연도</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">청구금액</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">납부기한</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">상태</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">관리</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm">{invoice.invoiceNumber}</td>
                <td className="px-4 py-3">{invoice.memberName || invoice.memberId}</td>
                <td className="px-4 py-3 text-center">{invoice.year}년</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(invoice.totalAmount)}
                </td>
                <td className="px-4 py-3 text-center">{formatDate(invoice.dueDate)}</td>
                <td className="px-4 py-3 text-center">{getStatusBadge(invoice.status)}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    {invoice.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleSendReminder(invoice.id)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          안내발송
                        </button>
                        <button
                          onClick={() => handleCancelInvoice(invoice.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          취소
                        </button>
                      </>
                    )}
                    {invoice.status === 'overdue' && (
                      <button
                        onClick={() => handleSendReminder(invoice.id)}
                        className="text-orange-600 hover:underline text-sm"
                      >
                        독촉발송
                      </button>
                    )}
                    <button className="text-gray-600 hover:underline text-sm">상세</button>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  청구 내역이 없습니다.
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

      {/* 일괄 청구 생성 모달 */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">일괄 청구 생성</h2>
              <p className="text-sm text-gray-600 mb-4">
                선택한 정책에 따라 모든 회원에게 청구서를 생성합니다.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  적용 정책 선택 *
                </label>
                <select
                  value={selectedPolicy}
                  onChange={(e) => setSelectedPolicy(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">정책 선택...</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.year}년 - {policy.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  disabled={bulkGenerating}
                >
                  취소
                </button>
                <button
                  onClick={handleBulkGenerate}
                  disabled={bulkGenerating || !selectedPolicy}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkGenerating ? '생성 중...' : '청구 생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
