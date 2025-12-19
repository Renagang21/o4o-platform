/**
 * FeeOverviewPage
 *
 * Phase 1: 회비 납부 현황 조회 페이지 (READ ONLY)
 *
 * 기능:
 * - 소속 회원 회비 납부 현황 통계 조회
 * - 납부 상태 확인
 *
 * 제한:
 * - 납부 금액 수정 ❌
 * - 지출/예산 관리 ❌
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  DollarSign,
  Percent,
} from 'lucide-react';
import {
  getFeeStats,
  type FeePaymentStats,
} from '@/lib/api/yaksaAdmin';

export function FeeOverviewPage() {
  const [stats, setStats] = useState<FeePaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 임시: 로그인한 관리자의 조직 ID (실제로는 auth context에서 가져와야 함)
  const organizationId = 'org-sample-id';

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getFeeStats({
        year: selectedYear,
        organizationId,
      });
      setStats(response.data);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.');
      console.error('Failed to load fee stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedYear]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/yaksa"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          관리자 센터로 돌아가기
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">회비 납부 현황</h1>
            <p className="text-gray-500 mt-1">
              소속 회원의 회비 납부 현황을 조회합니다.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
              READ ONLY
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
            <button
              onClick={loadStats}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>조회 전용:</strong> 이 페이지에서는 회비 납부 현황만 확인할 수 있습니다.
          납부 금액 수정이나 지출/예산 관리는 지원하지 않습니다.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">데이터를 불러오는 중...</p>
        </div>
      ) : !stats ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">{selectedYear}년 회비 납부 데이터가 없습니다.</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Members */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">총 회원</span>
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalMembers.toLocaleString()} 명
              </div>
            </div>

            {/* Paid Count */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">납부 완료</span>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.paidCount.toLocaleString()} 명
              </div>
            </div>

            {/* Unpaid Count */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">미납</span>
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {stats.unpaidCount.toLocaleString()} 명
              </div>
            </div>

            {/* Payment Rate */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500">납부율</span>
                <Percent className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {(stats.paymentRate * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Amount Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Total Amount */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">총 예상 금액</h3>
                <DollarSign className="h-5 w-5 text-gray-400" />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                ₩{stats.totalAmount.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats.totalMembers}명 × 연회비
              </p>
            </div>

            {/* Paid Amount */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">납부 완료 금액</h3>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-green-600">
                ₩{stats.paidAmount.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats.paidCount}명 납부 완료
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedYear}년 납부 현황
            </h3>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-gray-600">납부 진행률</span>
              <span className="font-medium text-gray-900">
                {stats.paidCount} / {stats.totalMembers} 명
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-300"
                style={{ width: `${stats.paymentRate * 100}%` }}
              />
            </div>
            <div className="mt-4 flex justify-between text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                <span className="text-gray-600">납부 완료</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-200 rounded-full mr-2" />
                <span className="text-gray-600">미납</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FeeOverviewPage;
