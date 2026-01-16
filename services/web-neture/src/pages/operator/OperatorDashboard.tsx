/**
 * Operator Dashboard - Neture 운영자 대시보드
 *
 * Neture 유통 정보 플랫폼 운영 현황 관제
 * - 공급자 현황
 * - 파트너 현황
 * - 콘텐츠 현황
 * - 신청 현황
 */

import { Link } from 'react-router-dom';
import {
  Activity,
  Users,
  Building2,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  Package,
  Megaphone,
} from 'lucide-react';
import { AiSummaryButton } from '../../components/ai';

// 통계 데이터 (Mock)
const stats = [
  { label: '활성 공급자', value: '12', change: '+2', trend: 'up', color: 'blue' },
  { label: '활성 파트너', value: '48', change: '+8', trend: 'up', color: 'green' },
  { label: '콘텐츠', value: '156', change: '+23', trend: 'up', color: 'purple' },
  { label: '대기 신청', value: '5', change: '-2', trend: 'down', color: 'amber' },
];

// 최근 신청 데이터 (Mock)
const recentApplications = [
  { name: '(주)헬스케어코리아', type: '공급자 신청', date: '2024-01-15', status: '검토중' },
  { name: '뷰티스타 강남점', type: '파트너 신청', date: '2024-01-14', status: '승인대기' },
  { name: '코스메틱랩', type: '공급자 신청', date: '2024-01-13', status: '서류심사' },
];

// 최근 활동 데이터 (Mock)
const recentActivities = [
  { icon: '📦', text: 'GlycoPharm 상품 50개 등록', time: '30분 전' },
  { icon: '🤝', text: '파트너십 계약 3건 체결', time: '2시간 전' },
  { icon: '📄', text: '콘텐츠 15개 승인 완료', time: '4시간 전' },
  { icon: '📊', text: '월간 리포트 생성 완료', time: '1일 전' },
];

const statusStyles: Record<string, string> = {
  '검토중': 'bg-gray-100 text-gray-700',
  '승인대기': 'bg-amber-100 text-amber-700',
  '서류심사': 'bg-purple-100 text-purple-700',
  '완료': 'bg-green-100 text-green-700',
};

// 서비스 현황 데이터 (Mock)
const serviceStatus = [
  { name: 'GlycoPharm', suppliers: 3, partners: 15, status: 'active' },
  { name: 'K-Cosmetics', suppliers: 5, partners: 23, status: 'active' },
  { name: 'GlucoseView', suppliers: 2, partners: 8, status: 'active' },
  { name: 'KPA Society', suppliers: 2, partners: 2, status: 'pending' },
];

export default function OperatorDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">Neture 유통 정보 플랫폼 운영 현황</p>
        </div>
        <AiSummaryButton
          contextLabel="운영자 대시보드 요약"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{stat.label}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-3xl font-bold text-slate-800 mt-2">{stat.value}</p>
          </div>
        ))}
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
        <div className="divide-y divide-slate-100">
          {serviceStatus.map((service) => (
            <div key={service.name} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-slate-800 w-28">{service.name}</span>
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
                <span className={`text-xs px-3 py-1 rounded-full ${service.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {service.status === 'active' ? '운영중' : '대기중'}
                </span>
              </div>
            </div>
          ))}
        </div>
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
              <Link to="/operator/applications" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                전체보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {recentApplications.map((app, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800">{app.name}</p>
                    <p className="text-sm text-slate-500">{app.type} · {app.date}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusStyles[app.status]}`}>
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
          <div className="divide-y divide-slate-100">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{activity.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{activity.text}</p>
                  </div>
                  <span className="text-xs text-slate-400">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
}
