/**
 * Cosmetics Partner Dashboard
 *
 * 화장품 파트너/인플루언서 대시보드
 * - KPI 요약: 총 클릭수, 전환수, 수익
 * - 최근 생성 링크
 * - 최근 전환 이벤트
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  TrendingUp,
  DollarSign,
  Link2,
  MousePointer,
  Eye,
  RefreshCw,
  ArrowRight,
  Plus,
  ExternalLink,
} from 'lucide-react';

interface DashboardSummary {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalEarnings: number;
  pendingEarnings: number;
  withdrawableEarnings: number;
  activeLinks: number;
  publishedRoutines: number;
  recentLinks: {
    id: string;
    urlSlug: string;
    linkType: string;
    clicks: number;
    conversions: number;
  }[];
  recentConversions: {
    id: string;
    orderId: string;
    amount: number;
    createdAt: string;
  }[];
}

const CosmeticsPartnerDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.api.get('/api/v1/partner/dashboard/summary');
      if (response.data?.data) {
        setSummary(response.data.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch dashboard summary:', err);
      // Demo data when API is not available
      setSummary({
        totalClicks: 12580,
        totalConversions: 284,
        conversionRate: 2.26,
        totalEarnings: 1420000,
        pendingEarnings: 180000,
        withdrawableEarnings: 1240000,
        activeLinks: 18,
        publishedRoutines: 7,
        recentLinks: [
          { id: '1', urlSlug: 'summer-skincare-2024', linkType: 'product', clicks: 245, conversions: 12 },
          { id: '2', urlSlug: 'anti-aging-routine', linkType: 'routine', clicks: 189, conversions: 8 },
          { id: '3', urlSlug: 'best-sunscreen-picks', linkType: 'product', clicks: 156, conversions: 5 },
        ],
        recentConversions: [
          { id: '1', orderId: 'ORD-2024-001', amount: 45000, createdAt: '2024-12-10T14:30:00Z' },
          { id: '2', orderId: 'ORD-2024-002', amount: 32000, createdAt: '2024-12-09T11:20:00Z' },
          { id: '3', orderId: 'ORD-2024-003', amount: 58000, createdAt: '2024-12-08T16:45:00Z' },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Cosmetics Partner Dashboard</h1>
          <p className="text-gray-600">화장품 파트너 성과 및 수익 현황</p>
        </div>
        <button
          onClick={fetchSummary}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
        >
          <RefreshCw className="w-4 h-4" />
          새로고침
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 클릭수</p>
              <p className="text-2xl font-bold">
                {summary?.totalClicks.toLocaleString()}
              </p>
            </div>
            <MousePointer className="w-8 h-8 text-pink-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 전환</p>
              <p className="text-2xl font-bold">
                {summary?.totalConversions.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                전환율: {summary?.conversionRate.toFixed(2)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 수익</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary?.totalEarnings.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">인출 가능</p>
              <p className="text-2xl font-bold text-orange-600">
                {summary?.withdrawableEarnings.toLocaleString()}원
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Active Links */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              활성 링크
            </h2>
            <Link
              to="/cosmetics-partner/links"
              className="text-pink-600 hover:text-pink-700 flex items-center gap-1 text-sm"
            >
              전체보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="text-center py-2 mb-4">
            <p className="text-4xl font-bold text-pink-600">
              {summary?.activeLinks}
            </p>
            <p className="text-gray-600">개의 추적 링크</p>
          </div>
          <Link
            to="/cosmetics-partner/links?action=new"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-pink-100 text-pink-700 rounded-lg hover:bg-pink-200"
          >
            <Plus className="w-4 h-4" />
            새 링크 생성
          </Link>
        </div>

        {/* Published Routines */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5" />
              공개 루틴
            </h2>
            <Link
              to="/cosmetics-partner/routines"
              className="text-pink-600 hover:text-pink-700 flex items-center gap-1 text-sm"
            >
              전체보기 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="text-center py-2 mb-4">
            <p className="text-4xl font-bold text-purple-600">
              {summary?.publishedRoutines}
            </p>
            <p className="text-gray-600">개 공개됨</p>
          </div>
          <Link
            to="/cosmetics-partner/routines?action=new"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
          >
            <Plus className="w-4 h-4" />
            새 루틴 생성
          </Link>
        </div>
      </div>

      {/* Recent Links & Conversions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Links */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">최근 생성 링크</h2>
          <div className="space-y-3">
            {summary?.recentLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {link.urlSlug}
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </p>
                  <p className="text-xs text-gray-500">{link.linkType}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    <span className="text-blue-600">{link.clicks}</span> 클릭
                  </p>
                  <p className="text-sm">
                    <span className="text-green-600">{link.conversions}</span> 전환
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Conversions */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-4">최근 전환</h2>
          <div className="space-y-3">
            {summary?.recentConversions.map((conversion) => (
              <div
                key={conversion.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{conversion.orderId}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(conversion.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    +{conversion.amount.toLocaleString()}원
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CosmeticsPartnerDashboard;
