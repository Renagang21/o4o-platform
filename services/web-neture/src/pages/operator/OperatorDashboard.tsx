/**
 * Operator Dashboard - Neture 운영자 대시보드
 *
 * Neture 유통 정보 플랫폼 운영 현황 관제
 * - 공급자 현황
 * - 파트너 현황
 * - 콘텐츠 현황
 * - 신청 현황
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Users,
  Building2,
  FileText,
  TrendingUp,
  Clock,
  ChevronRight,
  ArrowUpRight,
  UserPlus,
  Bell,
  Settings,
  AlertCircle,
  RefreshCw,
  Shield,
  MessageSquarePlus,
  Package,
} from 'lucide-react';
import { AiSummaryButton } from '../../components/ai';
import { dashboardApi, type AdminDashboardSummary } from '../../lib/api';

// 빈 데이터 상태 컴포넌트
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10">
      <AlertCircle size={40} className="mx-auto mb-4 text-slate-400" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}

// 상대적 시간 포맷팅
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  return `${days}일 전`;
}

export default function OperatorDashboard() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardApi.getAdminDashboardSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch operator dashboard data:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const stats = summary?.stats || {
    activeSuppliers: 0,
    totalRequests: 0,
    pendingRequests: 0,
    publishedContents: 0,
  };

  const hasServiceStatus = summary?.serviceStatus && summary.serviceStatus.length > 0;
  const hasRecentApplications = summary?.recentApplications && summary.recentApplications.length > 0;
  const hasRecentActivities = summary?.recentActivities && summary.recentActivities.length > 0;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">Neture 유통 정보 플랫폼 운영 현황</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            새로고침
          </button>
          <AiSummaryButton contextLabel="운영자 대시보드 요약" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 opacity-50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">로딩 중...</span>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">-</p>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">활성 공급자</span>
                {stats.activeSuppliers > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">활성</span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.activeSuppliers}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">총 요청 수</span>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalRequests}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">콘텐츠</span>
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.publishedContents}</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">대기 신청</span>
                {stats.pendingRequests > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    {stats.pendingRequests}건
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-slate-800 mt-2">{stats.pendingRequests}</p>
            </div>
          </>
        )}
      </div>

      {/* Service Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">서비스별 현황</h2>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="p-6 text-center text-slate-500">로딩 중...</div>
        ) : !hasServiceStatus ? (
          <EmptyState message="자료가 없습니다. 아직 서비스 데이터가 없습니다." />
        ) : (
          <div className="divide-y divide-slate-100">
            {summary!.serviceStatus.map((service) => (
              <div key={service.serviceId} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-slate-800 w-28">{service.serviceName}</span>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {service.suppliers} 공급자
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {service.partners} 파트너
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${
                      service.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {service.status === 'active' ? '운영중' : '대기중'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">최근 신청</h2>
              </div>
              <Link
                to="/operator/registrations"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                전체보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-center text-slate-500">로딩 중...</div>
          ) : !hasRecentApplications ? (
            <EmptyState message="자료가 없습니다. 최근 신청 내역이 없습니다." />
          ) : (
            <div className="divide-y divide-slate-100">
              {summary!.recentApplications.map((app) => (
                <div key={app.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{app.name}</p>
                      <p className="text-sm text-slate-500">
                        {app.type} · {new Date(app.date).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">최근 활동</h2>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="p-6 text-center text-slate-500">로딩 중...</div>
          ) : !hasRecentActivities ? (
            <EmptyState message="자료가 없습니다. 최근 활동 내역이 없습니다." />
          ) : (
            <div className="divide-y divide-slate-100">
              {summary!.recentActivities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {activity.type === 'approved' ? '✅' : activity.type === 'rejected' ? '❌' : '📦'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700">{activity.text}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatRelativeTime(activity.time)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-slate-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">빠른 작업</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: '공급자 관리', href: '/operator/suppliers', icon: Building2, color: 'blue' },
            { label: '파트너 관리', href: '/operator/partners', icon: Users, color: 'green' },
            { label: '콘텐츠 관리', href: '/operator/contents', icon: FileText, color: 'purple' },
            { label: 'AI 리포트', href: '/operator/ai-report', icon: TrendingUp, color: 'amber' },
            { label: '공급 요청', href: '/workspace/operator/supply', icon: Package, color: 'violet' },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <action.icon className={`w-5 h-5 text-${action.color}-600`} />
              <span className="font-medium text-slate-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Registration & Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">가입 관리 및 설정</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link
            to="/operator/registrations"
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 hover:border-amber-400 transition-colors"
          >
            <UserPlus className="w-5 h-5 text-amber-600" />
            <div>
              <span className="font-medium text-slate-700">가입 신청 관리</span>
              <p className="text-xs text-slate-500">승인/거부 처리</p>
            </div>
          </Link>
          <Link
            to="/operator/settings/notifications"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <Bell className="w-5 h-5 text-blue-600" />
            <div>
              <span className="font-medium text-slate-700">알림 설정</span>
              <p className="text-xs text-slate-500">이메일 알림 관리</p>
            </div>
          </Link>
          <Link
            to="/operator/forum-management"
            className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <MessageSquarePlus className="w-5 h-5 text-green-600" />
            <div>
              <span className="font-medium text-slate-700">포럼 관리</span>
              <p className="text-xs text-slate-500">포럼 개설 요청 관리</p>
            </div>
          </Link>
          <Link
            to="/admin-vault"
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-amber-500 bg-amber-50 hover:border-amber-600 transition-colors"
          >
            <Shield className="w-5 h-5 text-amber-600" />
            <div>
              <span className="font-medium text-slate-700">Vault</span>
              <p className="text-xs text-slate-500">기술 문서 보호 구역</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
