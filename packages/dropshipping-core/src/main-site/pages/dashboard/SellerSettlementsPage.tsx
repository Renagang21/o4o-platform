/**
 * Seller Settlements Page
 * Phase 4-1 Step 2: 판매자 정산 목록 페이지
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Eye, AlertCircle, RefreshCw, FileText, Info } from 'lucide-react';
import type { SettlementSummary, SettlementStatus } from '@/types/settlement';
import { sellerSettlementAPI } from '@/services/sellerSettlementApi';
import { handleApiError } from '@/utils/apiErrorHandler';
import { SettlementSummaryCards } from '@/components/SettlementSummaryCards';

export const SellerSettlementsPage: React.FC = () => {
  const navigate = useNavigate();

  const [settlements, setSettlements] = useState<SettlementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'thisMonth' | 'lastMonth' | '30' | '90' | 'year' | 'all'>('all');

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
      let date_from: string | undefined;
      const today = new Date();

      if (dateFilter === 'thisMonth') {
        // 이번 달 1일부터
        date_from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (dateFilter === 'lastMonth') {
        // 지난 달 1일부터
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        date_from = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (dateFilter === '30') {
        const date = new Date(today);
        date.setDate(date.getDate() - 30);
        date_from = date.toISOString().split('T')[0];
      } else if (dateFilter === '90') {
        const date = new Date(today);
        date.setDate(date.getDate() - 90);
        date_from = date.toISOString().split('T')[0];
      } else if (dateFilter === 'year') {
        date_from = `${today.getFullYear()}-01-01`;
      }

      const response = await sellerSettlementAPI.fetchSellerSettlements({
        page: currentPage,
        limit,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        date_from,
      });

      if (response.success) {
        setSettlements(response.data.settlements ?? []);
        setTotal(response.data.pagination.total ?? 0);
        setTotalPages(response.data.pagination.total_pages ?? 1);
      }
    } catch (err) {
      const errorMessage = handleApiError(err, '정산 내역');
      setError(errorMessage);
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
  }, [currentPage, statusFilter, dateFilter]);

  // 상태 배지 (PD-5 + legacy status support)
  const getStatusBadge = (status: SettlementStatus | string) => {
    // Normalize status to lowercase
    const normalizedStatus = status.toLowerCase();

    switch (normalizedStatus) {
      case 'pending':
      case 'open':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            정산 준비중
          </span>
        );
      case 'processing':
      case 'pending_payout':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
            지급 대기
          </span>
        );
      case 'paid':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            지급 완료
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            취소됨
          </span>
        );
      case 'draft':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            임시
          </span>
        );
      default:
        return null;
    }
  };

  // 금액 포맷 (PD-5 string amounts + legacy number support)
  const formatCurrency = (amount: number | string | undefined | null, currency: string = 'KRW') => {
    const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    if (currency === 'KRW' || !currency) {
      return `₩ ${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  // 날짜 포맷
  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return '-';
    const dateStr = typeof dateString === 'string' ? dateString : dateString.toISOString();
    return dateStr.split('T')[0];
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '정산', isCurrent: true },
        ]}
      />

      <PageHeader
        title="정산 내역"
        subtitle="판매 주문을 기준으로 정산 금액과 지급 상태를 확인합니다."
      />

      {/* R-8-9: Auto-settlement system info */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 mb-1">
            자동 정산 시스템
          </h3>
          <p className="text-sm text-blue-700">
            주문이 <strong>배송 완료</strong> 상태가 되면 정산이 자동으로 생성됩니다.
            매일 자동으로 전날 배송 완료된 주문에 대한 정산이 확정됩니다.
          </p>
        </div>
      </div>

      {/* Phase SETTLE-UI: Summary Cards */}
      <SettlementSummaryCards settlements={settlements} loading={loading} />

      {/* 필터 영역 (Phase SETTLE-UI: Enhanced with 이번 달/지난 달) */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {/* 기간 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              기간
            </label>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="thisMonth">이번 달</option>
              <option value="lastMonth">지난 달</option>
              <option value="30">최근 30일</option>
              <option value="90">최근 90일</option>
              <option value="year">올해 전체</option>
              <option value="all">전체</option>
            </select>
          </div>

          {/* 상태 필터 (PD-5 lowercase values) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ALL">전체</option>
              <option value="pending">정산 준비중</option>
              <option value="processing">지급 대기</option>
              <option value="paid">지급 완료</option>
              <option value="cancelled">취소됨</option>
            </select>
          </div>
        </div>
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            정산 내역을 불러오는 중입니다...
          </div>
        ) : error ? (
          <div className="p-12">
            <EmptyState
              icon={<AlertCircle className="w-16 h-16 text-red-400" />}
              title="정산 내역을 불러올 수 없습니다"
              description={error}
              action={
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  다시 시도
                </button>
              }
            />
          </div>
        ) : settlements.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<FileText className="w-16 h-16 text-gray-400" />}
              title="아직 생성된 정산 내역이 없습니다"
              description="배송 완료된 주문이 있으면 자동으로 정산이 생성됩니다. 주문이 배송 완료되면 다음날 정산 내역이 확정됩니다."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      정산 기간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      정산 ID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      마진 금액
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {settlements.map((settlement) => (
                    <tr key={settlement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(settlement.periodStart || settlement.period_start)} ~{' '}
                        {formatDate(settlement.periodEnd || settlement.period_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {settlement.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(settlement.payableAmount || settlement.net_payout_amount, settlement.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(settlement.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(settlement.createdAt || settlement.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => navigate(`/dashboard/seller/settlements/${settlement.id}`)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  전체 {total}개 중 {(currentPage - 1) * limit + 1} -{' '}
                  {Math.min(currentPage * limit, total)}개 표시
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
    </>
  );
};

export default SellerSettlementsPage;
