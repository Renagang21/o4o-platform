/**
 * Partner Settlements Page
 * Phase 4-1: 파트너 정산 목록 페이지
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '@/components/common/Breadcrumb';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus, Eye, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import type { SettlementSummary, SettlementStatus } from '@/types/settlement';
import { partnerSettlementAPI } from '@/services/partnerSettlementApi';
import { handleApiError } from '@/utils/apiErrorHandler';
import { CreateSettlementModal } from '@/components/dashboard/partner/CreateSettlementModal';

export const PartnerSettlementsPage: React.FC = () => {
  const navigate = useNavigate();

  const [settlements, setSettlements] = useState<SettlementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState<'30' | '90' | 'year' | 'all'>('all');

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // 정산 생성 모달
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 정산 목록 조회
  const fetchSettlements = async () => {
    setLoading(true);
    setError(null);

    try {
      // 날짜 필터 계산
      let date_from: string | undefined;
      const today = new Date();
      if (dateFilter === '30') {
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

      const response = await partnerSettlementAPI.fetchPartnerSettlements({
        page: currentPage,
        limit,
        status: statusFilter,
        date_from,
      });

      if (response.success) {
        setSettlements(response.data?.settlements ?? []);
        setTotal(response.data?.pagination?.total ?? 0);
        setTotalPages(response.data?.pagination?.total_pages ?? 1);
      }
    } catch (err) {
      const errorMessage = handleApiError(err, '정산 내역');
      setError(errorMessage);
      setSettlements([]);
    } finally {
      setLoading(false);
    }
  };

  // Retry handler
  const handleRetry = () => {
    fetchSettlements();
  };

  useEffect(() => {
    fetchSettlements();
  }, [currentPage, statusFilter, dateFilter]);

  // 상태 배지
  const getStatusBadge = (status: SettlementStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            정산 준비중
          </span>
        );
      case 'PENDING_PAYOUT':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
            지급 대기
          </span>
        );
      case 'PAID':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            지급 완료
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            취소됨
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
            임시
          </span>
        );
      default:
        return null;
    }
  };

  // 금액 포맷
  const formatCurrency = (amount: number | undefined | null, currency: string = 'KRW') => {
    const value = amount ?? 0;
    if (currency === 'KRW') {
      return `₩ ${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()} ${currency}`;
  };

  // 날짜 포맷
  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-';
    return dateString.split('T')[0];
  };

  // 정산 생성 완료 핸들러
  const handleSettlementCreated = (settlementId: string) => {
    setIsCreateModalOpen(false);
    // 상세 페이지로 이동
    navigate(`/dashboard/partner/settlements/${settlementId}`);
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: '파트너 대시보드', href: '/dashboard/partner' },
          { label: '정산', isCurrent: true },
        ]}
      />

      <PageHeader
        title="정산 내역"
        subtitle="발생한 커미션을 기간별로 묶어 정산하고, 지급 상태를 확인합니다."
      >
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 정산 생성
        </button>
      </PageHeader>

      {/* 필터 영역 */}
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
              <option value="30">최근 30일</option>
              <option value="90">최근 90일</option>
              <option value="year">올해</option>
              <option value="all">전체</option>
            </select>
          </div>

          {/* 상태 필터 */}
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
              <option value="OPEN">정산 준비중</option>
              <option value="PENDING_PAYOUT">지급 대기</option>
              <option value="PAID">지급 완료</option>
              <option value="CANCELLED">취소됨</option>
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
              title="아직 생성된 파트너 정산 내역이 없습니다"
              description="정산을 생성하면 발생한 커미션을 기간별로 관리할 수 있습니다."
              action={
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  첫 정산 생성하기
                </button>
              }
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
                      커미션 금액
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
                        {formatDate(settlement.period_start)} ~ {formatDate(settlement.period_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {settlement.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {formatCurrency(settlement.net_payout_amount, settlement.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(settlement.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(settlement.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => navigate(`/dashboard/partner/settlements/${settlement.id}`)}
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

      {/* 정산 생성 모달 */}
      {isCreateModalOpen && (
        <CreateSettlementModal
          onClose={() => setIsCreateModalOpen(false)}
          onSettlementCreated={handleSettlementCreated}
        />
      )}
    </>
  );
};

export default PartnerSettlementsPage;
