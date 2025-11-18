/**
 * Admin Settlements Page
 * Phase SETTLE-ADMIN: Admin 정산 관리 대시보드 - 목록 페이지
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, AlertCircle, RefreshCw, FileText, DollarSign, Clock, CheckCircle } from 'lucide-react';
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

  // 필터 상태
  const [partyTypeFilter, setPartyTypeFilter] = useState<SettlementPartyType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'thisMonth' | 'lastMonth' | '30' | '90' | 'year' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // 정산 목록 조회
  const fetchSettlements = async () => {
    setLoading(true);
    setError(null);

    try {
      // 날짜 필터 계산
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

  const handleRetry = () => {
    fetchSettlements();
  };

  useEffect(() => {
    fetchSettlements();
  }, [currentPage, partyTypeFilter, statusFilter, dateFilter, searchQuery]);

  // Phase SETTLE-ADMIN: PD-5 compatible formatting
  const formatCurrency = (amount: number | string | undefined | null, currency: string = 'KRW') => {
    const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    if (currency === 'KRW' || !currency) {
      return `₩ ${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '-';
    const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();
    return dateStr.split('T')[0];
  };

  // Status badge (PD-5 + legacy 호환)
  const getStatusBadge = (status: SettlementStatus) => {
    const normalizedStatus = status.toLowerCase();

    const badges: Record<string, JSX.Element> = {
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

  // PartyType badge
  const getPartyTypeBadge = (partyType: SettlementPartyType) => {
    const badges: Record<SettlementPartyType, JSX.Element> = {
      seller: <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">판매자</span>,
      supplier: <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">공급사</span>,
      platform: <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">플랫폼</span>,
    };

    return badges[partyType] || null;
  };

  // Summary calculations
  const summaryStats = React.useMemo(() => {
    const totalPayableAmount = settlements.reduce((sum, s) => {
      const amount = (s as any).payableAmount || (s as any).net_payout_amount || 0;
      const value = typeof amount === 'string' ? parseFloat(amount) : amount;
      return sum + value;
    }, 0);

    const pendingAmount = settlements
      .filter((s) => {
        const status = s.status.toLowerCase();
        return status === 'pending' || status === 'open' || status === 'processing' || status === 'pending_payout';
      })
      .reduce((sum, s) => {
        const amount = (s as any).payableAmount || (s as any).net_payout_amount || 0;
        const value = typeof amount === 'string' ? parseFloat(amount) : amount;
        return sum + value;
      }, 0);

    const paidAmount = settlements
      .filter((s) => s.status.toLowerCase() === 'paid')
      .reduce((sum, s) => {
        const amount = (s as any).payableAmount || (s as any).net_payout_amount || 0;
        const value = typeof amount === 'string' ? parseFloat(amount) : amount;
        return sum + value;
      }, 0);

    const pendingCount = settlements.filter((s) => {
      const status = s.status.toLowerCase();
      return status === 'pending' || status === 'open' || status === 'processing' || status === 'pending_payout';
    }).length;

    const paidCount = settlements.filter((s) => s.status.toLowerCase() === 'paid').length;

    return {
      totalPayableAmount,
      pendingAmount,
      paidAmount,
      pendingCount,
      paidCount,
    };
  }, [settlements]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-normal text-gray-900">정산 관리</h1>
          <p className="text-sm text-gray-600 mt-1">Seller/Supplier 정산 통합 관리 대시보드</p>
        </div>
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 px-4 py-2 bg-wordpress-blue text-white rounded hover:bg-wordpress-blue-hover transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

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
              onChange={(e) => {
                setPartyTypeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-wordpress-blue focus:border-transparent"
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
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-wordpress-blue focus:border-transparent"
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
              onChange={(e) => {
                setDateFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-wordpress-blue focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-wordpress-blue focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">정산 내역을 불러오는 중입니다...</div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">정산 내역을 불러올 수 없습니다</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              다시 시도
            </button>
          </div>
        ) : settlements.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">정산 내역이 없습니다</h3>
            <p className="text-gray-600">필터 조건에 맞는 정산 내역이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full wp-list-table widefat fixed striped">
                <thead>
                  <tr>
                    <th className="manage-column column-primary">정산 ID</th>
                    <th className="manage-column">대상 유형</th>
                    <th className="manage-column">대상 이름/ID</th>
                    <th className="manage-column">정산 기간</th>
                    <th className="manage-column">정산 금액</th>
                    <th className="manage-column">상태</th>
                    <th className="manage-column">지급일</th>
                    <th className="manage-column">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {settlements.map((settlement) => {
                    const periodStart = (settlement as any).periodStart || (settlement as any).period_start;
                    const periodEnd = (settlement as any).periodEnd || (settlement as any).period_end;
                    const payableAmount = (settlement as any).payableAmount || (settlement as any).net_payout_amount;
                    const createdAt = (settlement as any).createdAt || (settlement as any).created_at;
                    const paidAt = (settlement as any).paidAt || (settlement as any).paid_at;

                    return (
                      <tr key={settlement.id}>
                        <td className="title column-title column-primary">
                          <strong>
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/admin/settlements/${settlement.id}`);
                              }}
                              className="row-title"
                            >
                              {settlement.id}
                            </a>
                          </strong>
                          <div className="row-actions">
                            <span className="view">
                              <a
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(`/admin/settlements/${settlement.id}`);
                                }}
                              >
                                상세보기
                              </a>
                            </span>
                          </div>
                        </td>
                        <td>{getPartyTypeBadge(settlement.partyType)}</td>
                        <td>
                          <div className="font-medium">{settlement.partyName || settlement.partyId}</div>
                          {settlement.partyName && (
                            <div className="text-xs text-gray-500 font-mono">{settlement.partyId}</div>
                          )}
                        </td>
                        <td className="text-sm">
                          {formatDate(periodStart)} ~ {formatDate(periodEnd)}
                        </td>
                        <td className="font-medium">{formatCurrency(payableAmount, settlement.currency)}</td>
                        <td>{getStatusBadge(settlement.status)}</td>
                        <td className="text-sm">{formatDate(paidAt)}</td>
                        <td className="date column-date">
                          <abbr title={formatDate(createdAt)}>{formatDate(createdAt)}</abbr>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  전체 {total}개 중 {(currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)}개 표시
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminSettlementsPage;
