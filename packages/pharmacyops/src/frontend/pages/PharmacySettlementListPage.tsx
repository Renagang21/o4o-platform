/**
 * PharmacySettlementListPage v2
 *
 * 약국 구매 정산(비용) 목록 - Settlement UI 고도화 (Task 6)
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  LoadingSpinner,
  EmptyState,
  StatusBadge,
  PriceDisplay,
  StatCard,
} from '../components/index.js';
import type { PharmacySettlementListItemDto } from '../../dto/index.js';

// Mock data
const mockSettlements: PharmacySettlementListItemDto[] = [
  {
    id: 'settlement-001',
    settlementNumber: 'ST-2024-001234',
    periodStart: new Date(2024, 10, 1),
    periodEnd: new Date(2024, 10, 30),
    supplierName: '대한도매',
    orderCount: 15,
    totalAmount: 4500000,
    paidAmount: 3200000,
    pendingAmount: 1300000,
    status: 'open',
    dueDate: new Date(2024, 11, 15),
  },
  {
    id: 'settlement-002',
    settlementNumber: 'ST-2024-001233',
    periodStart: new Date(2024, 9, 1),
    periodEnd: new Date(2024, 9, 31),
    supplierName: '대한도매',
    orderCount: 12,
    totalAmount: 3800000,
    paidAmount: 3800000,
    pendingAmount: 0,
    status: 'closed',
    dueDate: new Date(2024, 10, 15),
    paidAt: new Date(2024, 10, 10),
  },
  {
    id: 'settlement-003',
    settlementNumber: 'ST-2024-001232',
    periodStart: new Date(2024, 10, 1),
    periodEnd: new Date(2024, 10, 30),
    supplierName: '종근당',
    orderCount: 8,
    totalAmount: 2100000,
    paidAmount: 0,
    pendingAmount: 2100000,
    status: 'pending_payment',
    dueDate: new Date(2024, 11, 10),
  },
  {
    id: 'settlement-004',
    settlementNumber: 'ST-2024-001231',
    periodStart: new Date(2024, 10, 1),
    periodEnd: new Date(2024, 10, 30),
    supplierName: '노보노디스크',
    orderCount: 3,
    totalAmount: 1350000,
    paidAmount: 1350000,
    pendingAmount: 0,
    status: 'closed',
    dueDate: new Date(2024, 11, 5),
    paidAt: new Date(2024, 11, 3),
  },
  {
    id: 'settlement-005',
    settlementNumber: 'ST-2024-001230',
    periodStart: new Date(2024, 9, 1),
    periodEnd: new Date(2024, 9, 31),
    supplierName: '한국화이자',
    orderCount: 5,
    totalAmount: 980000,
    paidAmount: 500000,
    pendingAmount: 480000,
    status: 'disputed',
    dueDate: new Date(2024, 10, 20),
    disputeReason: '배송 누락 확인 요청',
  },
];

// Mock monthly summary
const mockMonthlySummary = {
  thisMonth: {
    totalPurchase: 8930000,
    paidAmount: 5350000,
    pendingAmount: 3580000,
    supplierCount: 4,
    orderCount: 31,
  },
  lastMonth: {
    totalPurchase: 7200000,
    paidAmount: 7200000,
    pendingAmount: 0,
    supplierCount: 3,
    orderCount: 24,
  },
};

// Mock supplier breakdown
const mockSupplierBreakdown = [
  { name: '대한도매', totalAmount: 4500000, percentage: 50.4 },
  { name: '종근당', totalAmount: 2100000, percentage: 23.5 },
  { name: '노보노디스크', totalAmount: 1350000, percentage: 15.1 },
  { name: '한국화이자', totalAmount: 980000, percentage: 11.0 },
];

interface SettlementFilters {
  status: string;
  supplierName: string;
  dateRange: 'all' | 'thisMonth' | 'lastMonth' | 'last3Months';
}

export const PharmacySettlementListPage: React.FC = () => {
  const [settlements, setSettlements] = useState<PharmacySettlementListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SettlementFilters>({
    status: '',
    supplierName: '',
    dateRange: 'all',
  });

  // Summary view toggle
  const [showSummary, setShowSummary] = useState(true);

  const loadSettlements = useCallback(async () => {
    setLoading(true);
    // TODO: Replace with actual API call
    setTimeout(() => {
      let filtered = [...mockSettlements];

      // Apply status filter
      if (filters.status) {
        filtered = filtered.filter((s) => s.status === filters.status);
      }

      // Apply supplier filter
      if (filters.supplierName) {
        filtered = filtered.filter((s) =>
          s.supplierName.toLowerCase().includes(filters.supplierName.toLowerCase())
        );
      }

      // Sort by due date (soonest first for open, most recent for closed)
      filtered.sort((a, b) => {
        if (a.status === 'closed' && b.status !== 'closed') return 1;
        if (a.status !== 'closed' && b.status === 'closed') return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setSettlements(filtered);
      setLoading(false);
    }, 300);
  }, [filters]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(amount);

  const handleExportExcel = () => {
    // TODO: Implement Excel export
    alert('Excel 다운로드 기능은 추후 구현 예정입니다.');
  };

  const handlePayment = (settlementId: string) => {
    // TODO: Implement payment flow
    alert(`정산 ${settlementId} 결제 페이지로 이동합니다.`);
  };

  // Calculate summary
  const summary = {
    totalPending: mockSettlements
      .filter((s) => s.status !== 'closed')
      .reduce((sum, s) => sum + s.pendingAmount, 0),
    upcomingDue: mockSettlements.filter((s) => {
      if (s.status === 'closed') return false;
      const dueDate = new Date(s.dueDate);
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return dueDate <= weekLater;
    }).length,
    disputed: mockSettlements.filter((s) => s.status === 'disputed').length,
  };

  return (
    <div className="pharmacy-settlement-list-page p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">구매 정산</h1>
            <p className="text-sm text-gray-500 mt-1">
              공급자별 구매 내역과 결제 현황을 확인하세요
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className={`px-4 py-2 rounded-lg font-medium ${
                showSummary
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📊 요약 보기
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📥 Excel 다운로드
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {showSummary && (
        <div className="mb-6">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="이번 달 총 구매"
              value={formatCurrency(mockMonthlySummary.thisMonth.totalPurchase)}
              subValue={`${mockMonthlySummary.thisMonth.orderCount}건`}
              icon="📦"
              color="blue"
            />
            <StatCard
              title="미결제 금액"
              value={formatCurrency(summary.totalPending)}
              subValue={`${summary.upcomingDue}건 결제 예정`}
              icon="💳"
              color="red"
            />
            <StatCard
              title="이번 달 결제 완료"
              value={formatCurrency(mockMonthlySummary.thisMonth.paidAmount)}
              icon="✅"
              color="green"
            />
            <StatCard
              title="분쟁 중"
              value={summary.disputed}
              subValue="확인 필요"
              icon="⚠️"
              color="yellow"
            />
          </div>

          {/* Supplier Breakdown */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h3 className="font-semibold mb-4">공급자별 구매 현황</h3>
            <div className="space-y-3">
              {mockSupplierBreakdown.map((supplier) => (
                <div key={supplier.name} className="flex items-center gap-4">
                  <div className="w-32 font-medium text-sm">{supplier.name}</div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${supplier.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-28 text-right text-sm font-medium">
                    {formatCurrency(supplier.totalAmount)}
                  </div>
                  <div className="w-16 text-right text-sm text-gray-500">
                    {supplier.percentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              정산 상태
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">전체</option>
              <option value="open">진행중</option>
              <option value="pending_payment">결제대기</option>
              <option value="closed">마감</option>
              <option value="disputed">분쟁</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              공급자
            </label>
            <input
              type="text"
              value={filters.supplierName}
              onChange={(e) =>
                setFilters((f) => ({ ...f, supplierName: e.target.value }))
              }
              placeholder="공급자명 검색"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              기간
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  dateRange: e.target.value as SettlementFilters['dateRange'],
                }))
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">전체 기간</option>
              <option value="thisMonth">이번 달</option>
              <option value="lastMonth">지난 달</option>
              <option value="last3Months">최근 3개월</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() =>
                setFilters({
                  status: '',
                  supplierName: '',
                  dateRange: 'all',
                })
              }
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner />
      ) : settlements.length === 0 ? (
        <EmptyState message="정산 내역이 없습니다." icon="📑" />
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <span className="text-sm text-gray-600">
              총 <strong>{settlements.length}</strong>건
            </span>
          </div>
          <div className="divide-y">
            {settlements.map((settlement) => (
              <div key={settlement.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-gray-500">
                        {settlement.settlementNumber}
                      </span>
                      <StatusBadge status={settlement.status} type="settlement" />
                    </div>
                    <h3 className="font-medium text-gray-900">
                      {settlement.supplierName}
                    </h3>
                    <div className="text-sm text-gray-500 mt-1">
                      <span>
                        기간: {formatDate(settlement.periodStart)} ~{' '}
                        {formatDate(settlement.periodEnd)}
                      </span>
                      <span className="mx-2">·</span>
                      <span>주문 {settlement.orderCount}건</span>
                    </div>
                    {settlement.disputeReason && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ 분쟁 사유: {settlement.disputeReason}
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="mb-2">
                      <p className="text-xs text-gray-500">총 금액</p>
                      <PriceDisplay amount={settlement.totalAmount} />
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">결제 완료</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(settlement.paidAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">미결제</p>
                        <p className="font-medium text-red-600">
                          {formatCurrency(settlement.pendingAmount)}
                        </p>
                      </div>
                    </div>
                    {settlement.status !== 'closed' && settlement.pendingAmount > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">
                          결제 기한: {formatDate(settlement.dueDate)}
                        </p>
                        <button
                          onClick={() => handlePayment(settlement.id)}
                          className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          결제하기
                        </button>
                      </div>
                    )}
                    {settlement.paidAt && (
                      <p className="text-xs text-gray-400 mt-2">
                        결제일: {formatDate(settlement.paidAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacySettlementListPage;
