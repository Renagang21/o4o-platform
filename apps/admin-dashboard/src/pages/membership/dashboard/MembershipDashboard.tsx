/**
 * Membership-Yaksa: Extended Dashboard Page
 *
 * Phase 2: 운영 고도화 대시보드
 * - 약사 유형별 통계
 * - 직책별 통계
 * - 성별 분포
 * - 임원 현황
 * - 연회비 현황
 * - 최근 활동 통계
 *
 * Guarded by AppGuard to prevent API calls when app is not installed.
 */

import React, { useState, useEffect } from 'react';
import { AppGuard } from '@/components/common/AppGuard';
import {
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  PieChart,
  CreditCard,
  Briefcase,
  UserCog,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  UserX,
  AlertCircle,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

// Phase 2: Extended Dashboard Stats Interface
interface ExtendedDashboardStats {
  // 기본 통계
  totalMembers: number;
  verifiedMembers: number;
  pendingVerifications: number;
  unpaidFees: number;
  newMembersThisMonth: number;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
  recentTrends: {
    membersLastWeek: number;
    membersLastMonth: number;
    verificationsLastWeek: number;
  };
  // Phase 2 확장 통계
  pharmacistTypeBreakdown: Record<string, number>;
  officialRoleBreakdown: Record<string, number>;
  genderBreakdown: Record<string, number>;
  executiveStats: {
    totalExecutives: number;
    byRole: Record<string, number>;
  };
  feeStats: {
    currentYear: number;
    paidCount: number;
    unpaidCount: number;
    exemptCount: number;
    totalCollected: number;
    collectionRate: number;
  };
  recentActivity: {
    newMembers: number;
    transfersIn: number;
    transfersOut: number;
    positionChanges: number;
    verificationsPending: number;
    verificationsApproved: number;
    verificationsRejected: number;
  };
}

// Label mappings
const PHARMACIST_TYPE_LABELS: Record<string, string> = {
  working: '근무약사',
  owner: '개설약사',
  hospital: '병원약사',
  public: '공직약사',
  industry: '산업약사',
  retired: '은퇴약사',
  other: '기타',
  unset: '미설정',
};

const OFFICIAL_ROLE_LABELS: Record<string, string> = {
  president: '회장',
  vice_president: '부회장',
  general_manager: '총무',
  auditor: '감사',
  director: '이사',
  branch_head: '지부장',
  district_head: '분회장',
  none: '일반',
  unset: '미설정',
};

const GENDER_LABELS: Record<string, string> = {
  male: '남성',
  female: '여성',
  other: '기타',
  unset: '미설정',
};

const PHARMACIST_TYPE_COLORS: Record<string, string> = {
  working: 'bg-blue-500',
  owner: 'bg-green-500',
  hospital: 'bg-purple-500',
  public: 'bg-yellow-500',
  industry: 'bg-orange-500',
  retired: 'bg-gray-500',
  other: 'bg-pink-500',
  unset: 'bg-slate-300',
};

const MembershipDashboardContent = () => {
  const [stats, setStats] = useState<ExtendedDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'activity'>('overview');

  useKeyboardShortcuts();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/membership/stats/extended');

      if (response.data.success) {
        setStats(response.data.data);
      } else {
        toast.error('통계를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      const errorCode = error.response?.data?.code;
      if (errorCode === 'FORBIDDEN') {
        toast.error('권한이 필요합니다.');
      } else {
        // Fallback to basic stats if extended is not available
        try {
          const fallbackResponse = await authClient.api.get('/membership/stats');
          if (fallbackResponse.data.success) {
            setStats({
              ...fallbackResponse.data.data,
              pharmacistTypeBreakdown: {},
              officialRoleBreakdown: {},
              genderBreakdown: {},
              executiveStats: { totalExecutives: 0, byRole: {} },
              feeStats: { currentYear: new Date().getFullYear(), paidCount: 0, unpaidCount: 0, exemptCount: 0, totalCollected: 0, collectionRate: 0 },
              recentActivity: { newMembers: 0, transfersIn: 0, transfersOut: 0, positionChanges: 0, verificationsPending: 0, verificationsApproved: 0, verificationsRejected: 0 },
            });
          }
        } catch {
          toast.error('통계를 불러올 수 없습니다.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
    toast.success('새로고침 완료');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminBreadcrumb
          items={[
            { label: '홈', href: '/admin' },
            { label: '약사회 회원 관리', href: '/admin/membership/members' },
            { label: '대시보드' },
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminBreadcrumb
          items={[
            { label: '홈', href: '/admin' },
            { label: '약사회 회원 관리', href: '/admin/membership/members' },
            { label: '대시보드' },
          ]}
        />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-gray-500 py-12">
            통계 데이터를 불러올 수 없습니다.
          </div>
        </div>
      </div>
    );
  }

  const totalPharmacistTypes = Object.values(stats.pharmacistTypeBreakdown).reduce((a, b) => a + b, 0);
  const totalGender = Object.values(stats.genderBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '약사회 회원 관리', href: '/admin/membership/members' },
          { label: '대시보드' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">회원 관리 대시보드</h1>
            <p className="mt-1 text-sm text-gray-600">
              약사회 회원 통계 및 운영 현황을 한눈에 확인하세요.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              개요
            </button>
            <button
              onClick={() => setActiveTab('breakdown')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'breakdown'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              상세 분포
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              최근 활동
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Members Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">총 회원 수</p>
                    <p className="mt-2 text-3xl font-semibold text-gray-900">
                      {stats.totalMembers.toLocaleString()}
                    </p>
                    <div className="mt-2 flex items-center text-xs text-green-600">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      이번 달 +{stats.newMembersThisMonth}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Verification Status Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">검증 현황</p>
                    <p className="mt-2 text-3xl font-semibold text-green-600">
                      {stats.verifiedMembers.toLocaleString()}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs">
                      <span className="text-orange-600">
                        심사 중 {stats.pendingVerifications}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Executives Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">임원 현황</p>
                    <p className="mt-2 text-3xl font-semibold text-purple-600">
                      {stats.executiveStats.totalExecutives.toLocaleString()}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      직책 보유 회원
                    </div>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <UserCog className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Fee Collection Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">연회비 수금률</p>
                    <p className="mt-2 text-3xl font-semibold text-orange-600">
                      {stats.feeStats.collectionRate.toFixed(1)}%
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      납부 {stats.feeStats.paidCount} / 미납 {stats.feeStats.unpaidCount}
                    </div>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <CreditCard className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Pharmacist Type Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">약사 유형별 분포</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.pharmacistTypeBreakdown)
                    .filter(([_, count]) => count > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => {
                      const percentage = totalPharmacistTypes > 0 ? (count / totalPharmacistTypes) * 100 : 0;
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-gray-700">
                              {PHARMACIST_TYPE_LABELS[type] || type}
                            </span>
                            <span className="text-gray-600">
                              {count}명 ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${PHARMACIST_TYPE_COLORS[type] || 'bg-blue-500'}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(stats.pharmacistTypeBreakdown).length === 0 && (
                    <p className="text-gray-500 text-center py-8">데이터가 없습니다.</p>
                  )}
                </div>
              </div>

              {/* Official Role Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserCog className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg font-semibold text-gray-900">직책별 분포</h2>
                </div>
                <div className="space-y-3">
                  {Object.entries(stats.officialRoleBreakdown)
                    .filter(([key, count]) => count > 0 && key !== 'none' && key !== 'unset')
                    .sort(([, a], [, b]) => b - a)
                    .map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {OFFICIAL_ROLE_LABELS[role] || role}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{count}명</span>
                      </div>
                    ))}
                  {Object.entries(stats.officialRoleBreakdown).filter(([key, count]) => count > 0 && key !== 'none' && key !== 'unset').length === 0 && (
                    <p className="text-gray-500 text-center py-8">임원 데이터가 없습니다.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Fee Stats Card */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">{stats.feeStats.currentYear}년 연회비 현황</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{stats.feeStats.paidCount}</p>
                  <p className="text-sm text-gray-600">납부 완료</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{stats.feeStats.unpaidCount}</p>
                  <p className="text-sm text-gray-600">미납</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">{stats.feeStats.exemptCount}</p>
                  <p className="text-sm text-gray-600">면제</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.feeStats.totalCollected.toLocaleString()}원
                  </p>
                  <p className="text-sm text-gray-600">총 수금액</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <a
                  href="/admin/membership/members"
                  className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Users className="w-5 h-5 mr-2" />
                  회원 관리
                </a>
                <a
                  href="/admin/membership/verifications"
                  className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  검증 관리
                </a>
                <a
                  href="/admin/membership/categories"
                  className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <PieChart className="w-5 h-5 mr-2" />
                  분류 관리
                </a>
                <a
                  href="/admin/membership/audit-logs"
                  className="flex items-center justify-center px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <Clock className="w-5 h-5 mr-2" />
                  변경 이력
                </a>
              </div>
            </div>
          </>
        )}

        {/* Breakdown Tab */}
        {activeTab === 'breakdown' && (
          <div className="space-y-6">
            {/* Gender Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">성별 분포</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(stats.genderBreakdown)
                  .filter(([_, count]) => count > 0)
                  .map(([gender, count]) => {
                    const percentage = totalGender > 0 ? (count / totalGender) * 100 : 0;
                    const colorClass = gender === 'male' ? 'bg-blue-500' : gender === 'female' ? 'bg-pink-500' : 'bg-gray-400';
                    return (
                      <div key={gender} className="text-center">
                        <div className="relative pt-1">
                          <div className="flex mb-2 items-center justify-center">
                            <span className="text-xl font-semibold text-gray-700">
                              {GENDER_LABELS[gender] || gender}
                            </span>
                          </div>
                          <div className="flex items-center justify-center mb-2">
                            <span className="text-3xl font-bold text-gray-900">{count}</span>
                            <span className="ml-2 text-sm text-gray-500">({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full ${colorClass}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Category Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">분류별 회원 분포</h2>
              </div>
              <div className="space-y-3">
                {stats.categoryBreakdown.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">분류 데이터가 없습니다.</p>
                ) : (
                  stats.categoryBreakdown.map((cat) => {
                    const percentage = stats.totalMembers > 0
                      ? (cat.count / stats.totalMembers) * 100
                      : 0;

                    return (
                      <div key={cat.categoryId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">
                            {cat.categoryName || '미분류'}
                          </span>
                          <span className="text-gray-600">
                            {cat.count}명 ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Executive Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <UserCog className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">임원 상세 현황</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {['president', 'vice_president', 'general_manager', 'auditor', 'director', 'branch_head', 'district_head'].map((role) => (
                  <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-800">
                      {stats.executiveStats.byRole[role] || 0}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{OFFICIAL_ROLE_LABELS[role]}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            {/* Recent Activity Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">최근 30일 활동 현황</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-full mr-4">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{stats.recentActivity.newMembers}</p>
                    <p className="text-sm text-gray-600">신규 가입</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-green-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full mr-4">
                    <ArrowUpRight className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.recentActivity.transfersIn}</p>
                    <p className="text-sm text-gray-600">전입</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-red-50 rounded-lg">
                  <div className="p-2 bg-red-100 rounded-full mr-4">
                    <ArrowDownRight className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.recentActivity.transfersOut}</p>
                    <p className="text-sm text-gray-600">전출</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-purple-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-full mr-4">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{stats.recentActivity.positionChanges}</p>
                    <p className="text-sm text-gray-600">직책 변경</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">검증 처리 현황</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
                  <div className="p-2 bg-yellow-100 rounded-full mr-4">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{stats.recentActivity.verificationsPending}</p>
                    <p className="text-sm text-gray-600">대기 중</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-green-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-full mr-4">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.recentActivity.verificationsApproved}</p>
                    <p className="text-sm text-gray-600">승인됨</p>
                  </div>
                </div>

                <div className="flex items-center p-4 bg-red-50 rounded-lg">
                  <div className="p-2 bg-red-100 rounded-full mr-4">
                    <UserX className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{stats.recentActivity.verificationsRejected}</p>
                    <p className="text-sm text-gray-600">거부됨</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trends */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">기간별 트렌드</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900">{stats.recentTrends.membersLastWeek}</p>
                  <p className="text-sm text-gray-600 mt-1">최근 7일 가입</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900">{stats.recentTrends.membersLastMonth}</p>
                  <p className="text-sm text-gray-600 mt-1">최근 30일 가입</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <p className="text-3xl font-bold text-gray-900">{stats.recentTrends.verificationsLastWeek}</p>
                  <p className="text-sm text-gray-600 mt-1">최근 7일 검증 요청</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Wrapped export with AppGuard
 * Only renders dashboard content if membership-yaksa app is installed
 */
const MembershipDashboard = () => (
  <AppGuard appId="membership-yaksa" appName="회원 관리">
    <MembershipDashboardContent />
  </AppGuard>
);

export default MembershipDashboard;
