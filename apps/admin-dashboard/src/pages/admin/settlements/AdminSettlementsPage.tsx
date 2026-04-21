/**
 * Admin Settlements Page
 * Phase SETTLE-ADMIN: Admin 정산 관리 대시보드 - 목록 페이지
 *
 * WO-O4O-TABLE-DATATABLE-DEPRECATION-V1B — BaseTable 직접 사용으로 마이그레이션
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, AlertCircle, RefreshCw, FileText, DollarSign, Clock, CheckCircle } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { BaseTable, RowActionMenu } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import type {
  AdminSettlementView,
  SettlementPartyType,
  SettlementStatus,
  GetAdminSettlementsQuery,
} from '../../../types/settlement';
import { adminSettlementApi } from '../../../services/api/settlementApi';

export const AdminSettlementsPage: React.FC = () => {
  const navigate = useNavigate();

  const [settlements, setSettlements] = useState<AdminSettlementView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [partyTypeFilter, setPartyTypeFilter] = useState<SettlementPartyType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'thisMonth' | 'lastMonth' | '30' | '90' | 'year' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchSettlements = async () => {
    setLoading(true);
    setError(null);
    try {
      let dateFrom: string | undefined;
      const today = new Date();

      if (dateFilter === 'thisMonth') {
        dateFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (dateFilter === 'lastMonth') {
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        dateFrom = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (dateFilter === '30') {
        const date = new Date(today);
        date.setDate(date.getDate() - 30);
        dateFrom = date.toISOString().split('T')[0];
      } else if (dateFilter === '90') {
        const date = new Date(today);
        date.setDate(date.getDate() - 90);
        dateFrom = date.toISOString().split('T')[0];
      } else if (dateFilter === 'year') {
        dateFrom = `${today.getFullYear()}-01-01`;
      }

      const query: GetAdminSettlementsQuery = {
        page: currentPage,
        limit,
        partyType: partyTypeFilter,
        status: statusFilter,
        dateFrom,
        searchQuery: searchQuery || undefined,
      };

      const response = await adminSettlementApi.fetchSettlements(query);

      if (response.success) {
        setSettlements(response.data.settlements ?? []);
        setTotal(response.data.pagination.total ?? 0);
        setTotalPages(response.data.pagination.total_pages ?? 1);
      }
    } catch (err: any) {
      console.error('정산 내역 조회 실패:', err);
      setError(err.message || '정산 내역을 불러올 수 없습니다.');
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [currentPage, partyTypeFilter, statusFilter, dateFilter, searchQuery]);

  const formatCurrency = (amount: number | string | undefined | null, currency: string = 'KRW') => {
    const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    if (currency === 'KRW' || !currency) return `₩ ${value.toLocaleString()}`;
    return `${value.toLocaleString()} ${currency}`;
  };

  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '-';
    const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();
    return dateStr.split('T')[0];
  };

  const getStatusBadge = (status: SettlementStatus) => {
    const normalizedStatus = status.toLowerCase();
    const badges: Record<string, React.JSX.Element> = {
      pending: <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">정산 준비중</span>,
      open: <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">정산 준비중</span>,
      processing: <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">지급 진행중</span>,
      pending_payout: <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">지급 대기</span>,
      paid: <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">지급 완료</span>,
      cancelled: <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">취소됨</span>,
      draft: <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">임시</span>,
    };
    return badges[normalizedStatus] || <span className="px-2 py-1 text-xs rounded-full bg-gray-100">{status}</span>;
  };

  const getPartyTypeBadge = (partyType: SettlementPartyType) => {
    const badges: Record<SettlementPartyType, React.JSX.Element> = {
      seller: <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">판매자</span>,
      supplier: <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">공급사</span>,
      platform: <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">플랫폼</span>,
    };
    return badges[partyType] || null;
  };

  const summaryStats = React.useMemo(() => {
    const totalPayableAmount = settlements.reduce((sum, s) => {
      const amount = (s as any).payableAmount || (s as any).net_payout_amount || 0;
      return sum + (typeof amount === 'string' ? parseFloat(amount) : amount);
    }, 0);
    const pendingAmount = settlements
      .filter((s) => ['pending', 'open', 'processing', 'pending_payout'].includes(s.status.toLowerCase()))
      .reduce((sum, s) => {
        const amount = (s as any).payableAmount || (s as any).net_payout_amount || 0;
        return sum + (typeof amount === 'string' ? parseFloat(amount) : amount);
      }, 0);
    const paidAmount = settlements
      .filter((s) => s.status.toLowerCase() === 'paid')
      .reduce((sum, s) => {
        const amount = (s as any).payableAmount || (s as any).net_payout_amount || 0;
        return sum + (typeof amount === 'string' ? parseFloat(amount) : amount);
      }, 0);
    const pendingCount = settlements.filter((s) =>
      ['pending', 'open', 'processing', 'pending_payout'].includes(s.status.toLowerCase()),
    ).length;
    const paidCount = settlements.filter((s) => s.status.toLowerCase() === 'paid').length;
    return { totalPayableAmount, pendingAmount, paidAmount, pendingCount, paidCount };
  }, [settlements]);

  const columns: O4OColumn<AdminSettlementView>[] = [
    {
      key: 'id',
      header: '정산 ID',
      render: (_, row) => <span className="font-medium text-blue-600">{row.id}</span>,
    },
    {
      key: 'partyType',
      header: '대상 유형',
      align: 'center',
      render: (_, row) => getPartyTypeBadge(row.partyType),
    },
    {
      key: 'party',
      header: '대상 이름/ID',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.partyName || row.partyId}</div>
          {row.partyName && <div className="text-xs text-gray-500 font-mono">{row.partyId}</div>}
        </div>
      ),
    },
    {
      key: 'period',
      header: '정산 기간',
      render: (_, row) => {
        const periodStart = (row as any).periodStart || (row as any).period_start;
        const periodEnd = (row as any).periodEnd || (row as any).period_end;
        return (
          <span className="text-sm">
            {formatDate(periodStart)} ~ {formatDate(periodEnd)}
          </span>
        );
      },
    },
    {
      key: 'amount',
      header: '정산 금액',
      align: 'right',
      render: (_, row) => {
        const payableAmount = (row as any).payableAmount || (row as any).net_payout_amount;
        return <span className="font-medium">{formatCurrency(payableAmount, row.currency)}</span>;
      },
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (_, row) => getStatusBadge(row.status),
    },
    {
      key: 'paidAt',
      header: '지급일',
      render: (_, row) => {
        const paidAt = (row as any).paidAt || (row as any).paid_at;
        return <span className="text-sm">{formatDate(paidAt)}</span>;
      },
    },
    {
      key: 'createdAt',
      header: '생성일',
      render: (_, row) => {
        const createdAt = (row as any).createdAt || (row as any).created_at;
        return <span className="text-sm">{formatDate(createdAt)}</span>;
      },
    },
    {
      key: '_actions',
      header: '',
      width: 56,
      system: true,
      align: 'center',
      render: (_, row) => (
        <RowActionMenu
          actions={[
            {
              key: 'view',
              label: '상세 보기',
              icon: <Eye size={14} />,
              onClick: () => navigate(`/admin/settlements/${row.id}`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="정산 관리"
        subtitle="Seller/Supplier 정산 통합 관리 대시보드"
        actions={[
          {
            id: 'refresh',
            label: '새로고침',
            icon: <RefreshCw className="w-4 h-4" />,
            onClick: fetchSettlements,
            variant: 'secondary' as const,
          },
        ]}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 정산액</p>
              <p className="text-xl font-bold">{formatCurrency(summaryStats.totalPayableAmount)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">미지급 금액</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(summaryStats.pendingAmount)}</p>
              <p className="text-xs text-gray-500">{summaryStats.pendingCount}건</p>
            </div>
            <Clock className="h-8 w-8 text-orange-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">지급 완료</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summaryStats.paidAmount)}</p>
              <p className="text-xs text-gray-500">{summaryStats.paidCount}건</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 건수</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-300 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">대상 유형</label>
            <select
              value={partyTypeFilter}
              onChange={(e) => { setPartyTypeFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-o4o-blue focus:border-transparent"
            >
              <option value="ALL">전체</option>
              <option value="seller">판매자</option>
              <option value="supplier">공급사</option>
              <option value="platform">플랫폼</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-o4o-blue focus:border-transparent"
            >
              <option value="ALL">전체</option>
              <option value="pending">정산 준비중</option>
              <option value="processing">지급 진행중</option>
              <option value="paid">지급 완료</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-o4o-blue focus:border-transparent"
            >
              <option value="thisMonth">이번 달</option>
              <option value="lastMonth">지난 달</option>
              <option value="30">최근 30일</option>
              <option value="90">최근 90일</option>
              <option value="year">올해 전체</option>
              <option value="all">전체</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">검색</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="대상 이름/ID 검색"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-o4o-blue focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-white border border-gray-300 rounded-lg p-12 text-center mb-6">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">정산 내역을 불러올 수 없습니다</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchSettlements}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            다시 시도
          </button>
        </div>
      )}

      {/* Settlements Table */}
      {!error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="animate-pulse p-4 space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
            </div>
          ) : (
            <BaseTable<AdminSettlementView>
              columns={columns}
              data={settlements}
              rowKey={(row) => row.id}
              emptyMessage="필터 조건에 맞는 정산 내역이 없습니다"
              onRowClick={(row) => navigate(`/admin/settlements/${row.id}`)}
              tableId="admin-settlements"
              columnVisibility
              persistState
              reorderable
            />
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
              <div className="text-sm text-gray-700">
                전체 <span className="font-medium">{total}</span>개 중{' '}
                <span className="font-medium">{(currentPage - 1) * limit + 1}</span>–
                <span className="font-medium">{Math.min(currentPage * limit, total)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm">{currentPage} / {totalPages}</span>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSettlementsPage;
