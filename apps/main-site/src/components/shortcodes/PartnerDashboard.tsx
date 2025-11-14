/**
 * Partner Dashboard Component for Main Site
 * Displays partner metrics, commissions, link management, and settlements
 */

import React, { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import { AnalyticsTab } from '../analytics/AnalyticsTab';
import { SettlementSummaryCards } from '../dashboard/SettlementSummaryCards';
import { SettlementTable } from '../dashboard/SettlementTable';
import { SettlementDetailsModal } from '../dashboard/SettlementDetailsModal';
import type { Settlement } from '../../services/settlementApi';

interface PartnerDashboardProps {
  defaultTab?: string;
}

interface DashboardSummary {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingCommissions: number;
  conversionRate: number;
  totalClicks: number;
  totalConversions: number;
  activeLinks: number;
  tierLevel: string;
  tierProgress: number;
  referralCode: string;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ defaultTab = 'overview' }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Use authClient which automatically handles baseURL and authentication
      const response = await authClient.api.get('/dropshipping/partner/dashboard/summary');
      const data = response.data;

      if (data.success) {
        setSummary(data.summary);
      } else {
        setError(data.message || 'Failed to load dashboard');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your partner dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-4">
        <div className="flex items-center gap-2 text-red-800">
          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Error loading dashboard</span>
        </div>
        <p className="text-sm text-red-700 mt-2">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 my-6">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Track your performance and manage your partnerships.
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-semibold">{summary?.tierLevel || 'Bronze'} Partner</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Code: <span className="font-mono font-medium">{summary?.referralCode || 'N/A'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Total Earnings</p>
              <p className="text-2xl font-bold text-green-900">${summary?.totalEarnings?.toLocaleString() || '0'}</p>
            </div>
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">This Month</p>
              <p className="text-2xl font-bold text-blue-900">${summary?.monthlyEarnings?.toLocaleString() || '0'}</p>
            </div>
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Conversion Rate</p>
              <p className="text-2xl font-bold text-purple-900">{summary?.conversionRate?.toFixed(2) || '0'}%</p>
            </div>
            <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700">Active Links</p>
              <p className="text-2xl font-bold text-orange-900">{summary?.activeLinks || 0}</p>
            </div>
            <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <svg className="h-8 w-8 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <p className="text-2xl font-bold">{summary?.totalClicks?.toLocaleString() || '0'}</p>
            <p className="text-sm text-gray-600">Total Clicks</p>
          </div>
          <div className="text-center">
            <svg className="h-8 w-8 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-2xl font-bold">{summary?.totalConversions?.toLocaleString() || '0'}</p>
            <p className="text-sm text-gray-600">Conversions</p>
          </div>
          <div className="text-center">
            <svg className="h-8 w-8 mx-auto mb-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-2xl font-bold">{summary?.conversionRate?.toFixed(1) || '0'}%</p>
            <p className="text-sm text-gray-600">Conversion Rate</p>
          </div>
          <div className="text-center">
            <svg className="h-8 w-8 mx-auto mb-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-2xl font-bold">${summary?.pendingCommissions?.toLocaleString() || '0'}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
        </div>
      </div>

      {/* Tier Progress */}
      <div className="mt-6 bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Progress</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Current: {summary?.tierLevel || 'Bronze'}</span>
            <span className="text-sm text-gray-500">Next: Silver</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${summary?.tierProgress || 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-600">
            ${summary?.totalEarnings?.toLocaleString() || '0'} / $5,000 to reach Silver tier
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            개요
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            📊 분석
          </button>
          <button
            onClick={() => setActiveTab('settlements')}
            className={`${
              activeTab === 'settlements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            💰 정산
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">빠른 실행</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionButton
                  icon="🔗"
                  label="링크 생성"
                  href="/partner/links/generate"
                />
                <QuickActionButton
                  icon="📊"
                  label="성과 분석"
                  onClick={() => setActiveTab('analytics')}
                />
                <QuickActionButton
                  icon="💰"
                  label="정산 내역"
                  onClick={() => setActiveTab('settlements')}
                />
                <QuickActionButton
                  icon="📢"
                  label="마케팅 자료"
                  href="/partner/marketing-materials"
                />
              </div>
            </div>

            {/* Info Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <p className="font-semibold text-blue-900 mb-2">
                    파트너 프로그램 팁
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 추천 링크를 SNS와 블로그에 공유하여 더 많은 수익을 창출하세요</li>
                    <li>• {summary?.tierLevel === 'Bronze' ? 'Silver 등급으로 승급하면 커미션율이 15%로 증가합니다' : '꾸준한 활동으로 더 높은 등급을 달성하세요'}</li>
                    <li>• 정산은 매월 1일 자동으로 처리됩니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}
        {activeTab === 'settlements' && (
          <div>
            {/* Settlement Summary Cards */}
            <SettlementSummaryCards />

            {/* Settlement Table */}
            <SettlementTable
              onSelectSettlement={(settlement) => setSelectedSettlement(settlement)}
            />
          </div>
        )}
      </div>

      {/* Settlement Details Modal */}
      {selectedSettlement && (
        <SettlementDetailsModal
          settlementId={selectedSettlement.id}
          onClose={() => setSelectedSettlement(null)}
        />
      )}
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
}> = ({ icon, label, href, onClick }) => {
  const className = "flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer";

  if (href) {
    return (
      <a href={href} className={className}>
        <span className="text-3xl mb-2">{icon}</span>
        <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-700 text-center">{label}</span>
    </button>
  );
};
