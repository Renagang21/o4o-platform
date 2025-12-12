/**
 * Cosmetics Supplier Dashboard
 *
 * 공급사 대시보드
 * - KPI 요약: 승인된 셀러/파트너 수, 총 매출, 샘플 전환율
 * - 캠페인 현황
 * - 가격 정책 알림
 *
 * Phase 6-G: Cosmetics Supplier Extension
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  Users,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Megaphone,
  FileText,
  Beaker,
} from 'lucide-react';

interface DashboardSummary {
  approvedSellers: number;
  pendingSellers: number;
  approvedPartners: number;
  pendingPartners: number;
  totalSales: number;
  monthlySales: number;
  activeCampaigns: number;
  draftCampaigns: number;
  totalSamplesShipped: number;
  sampleConversionRate: number;
  activePolicies: number;
  policyViolations: number;
}

const CosmeticsSupplierDashboard: React.FC = () => {
  const api = authClient.api;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      // Demo data - replace with actual API calls
      setSummary({
        approvedSellers: 45,
        pendingSellers: 8,
        approvedPartners: 23,
        pendingPartners: 5,
        totalSales: 125000000,
        monthlySales: 18500000,
        activeCampaigns: 4,
        draftCampaigns: 2,
        totalSamplesShipped: 520,
        sampleConversionRate: 23.5,
        activePolicies: 12,
        policyViolations: 3,
      });
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공급사 대시보드</h1>
          <p className="text-gray-500 text-sm mt-1">판매 네트워크 및 캠페인 현황</p>
        </div>
        <button
          onClick={fetchSummary}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          title="새로고침"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Pending Approvals Alert */}
      {(summary?.pendingSellers || summary?.pendingPartners) ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-yellow-800">승인 대기 중인 요청이 있습니다</p>
            <p className="text-yellow-700 text-sm mt-1">
              셀러 {summary?.pendingSellers}건, 파트너 {summary?.pendingPartners}건의 승인 요청이 대기 중입니다.
            </p>
          </div>
          <Link
            to="/cosmetics-supplier/approvals"
            className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
          >
            검토하기
          </Link>
        </div>
      ) : null}

      {/* Price Violation Alert */}
      {summary?.policyViolations ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800">가격 정책 위반 감지</p>
            <p className="text-red-700 text-sm mt-1">
              {summary?.policyViolations}건의 가격 정책 위반이 발견되었습니다.
            </p>
          </div>
          <Link
            to="/cosmetics-supplier/price-policies"
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            확인하기
          </Link>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Approved Network */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">승인된 판매자</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summary?.approvedSellers}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                파트너: {summary?.approvedPartners}명
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">월 매출</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {(summary?.monthlySales || 0).toLocaleString()}원
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                총 매출: {((summary?.totalSales || 0) / 100000000).toFixed(1)}억
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">활성 캠페인</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {summary?.activeCampaigns}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                초안: {summary?.draftCampaigns}개
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Sample Conversion */}
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">샘플 전환율</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {summary?.sampleConversionRate}%
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                총 출고: {summary?.totalSamplesShipped}개
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
              <Beaker className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Approvals */}
        <Link
          to="/cosmetics-supplier/approvals"
          className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-blue-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
              <CheckCircle className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">승인 관리</h3>
              <p className="text-sm text-gray-500">셀러/파트너 승인 요청 처리</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
          </div>
        </Link>

        {/* Price Policies */}
        <Link
          to="/cosmetics-supplier/price-policies"
          className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-green-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100">
              <FileText className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">가격 정책</h3>
              <p className="text-sm text-gray-500">최저가 정책 및 위반 모니터링</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500" />
          </div>
        </Link>

        {/* Samples */}
        <Link
          to="/cosmetics-supplier/samples"
          className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-orange-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100">
              <Package className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">샘플 관리</h3>
              <p className="text-sm text-gray-500">샘플 출고 및 전환 추적</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
          </div>
        </Link>

        {/* Campaigns */}
        <Link
          to="/cosmetics-supplier/campaigns"
          className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-purple-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100">
              <Megaphone className="w-6 h-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">캠페인</h3>
              <p className="text-sm text-gray-500">마케팅 캠페인 생성 및 관리</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500" />
          </div>
        </Link>

        {/* Profile */}
        <Link
          to="/cosmetics-supplier/profile"
          className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 hover:border-pink-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-50 rounded-lg flex items-center justify-center group-hover:bg-pink-100">
              <ShoppingBag className="w-6 h-6 text-pink-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">브랜드 프로필</h3>
              <p className="text-sm text-gray-500">공급사 정보 및 설정</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-pink-500" />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default CosmeticsSupplierDashboard;
