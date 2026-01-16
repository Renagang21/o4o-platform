/**
 * Operator Dashboard - KPA Society 운영자 대시보드
 *
 * 약사회 SaaS 플랫폼 운영 현황 관제
 * - 회원 현황
 * - 교육(LMS) 현황
 * - 공동구매 현황
 * - 포럼 현황
 */

import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  ShoppingCart,
  Clock,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  Building2,
  Calendar,
} from 'lucide-react';
import { AiSummaryButton } from '../../components/ai';

// 통계 데이터 (Mock)
const stats = [
  { label: '전체 회원', value: '1,247', change: '+23', trend: 'up', color: 'blue' },
  { label: '활성 강좌', value: '45', change: '+5', trend: 'up', color: 'green' },
  { label: '진행 공구', value: '8', change: '+2', trend: 'up', color: 'purple' },
  { label: '이번 주 게시글', value: '156', change: '+34', trend: 'up', color: 'amber' },
];

// 분회 현황 데이터 (Mock)
const branchStatus = [
  { name: '강남분회', members: 156, courses: 12, status: 'active' },
  { name: '서초분회', members: 134, courses: 10, status: 'active' },
  { name: '송파분회', members: 112, courses: 8, status: 'active' },
  { name: '강동분회', members: 98, courses: 7, status: 'pending' },
  { name: '마포분회', members: 87, courses: 6, status: 'active' },
];

// 최근 활동 데이터 (Mock)
const recentActivities = [
  { icon: '👤', text: '신규 회원 가입: 홍길동 약사', time: '10분 전' },
  { icon: '📚', text: '강좌 수료: "약물 상호작용 심화"', time: '30분 전' },
  { icon: '🛒', text: '공동구매 참여: 혈압계 B모델', time: '1시간 전' },
  { icon: '📝', text: '새 공지사항 등록됨', time: '2시간 전' },
];

// 공동구매 현황 (Mock)
const groupbuyStatus = [
  { name: '혈압계 B모델', participants: 45, target: 50, endDate: '01/20', progress: 90 },
  { name: '당뇨 측정기 세트', participants: 32, target: 40, endDate: '01/25', progress: 80 },
  { name: '약국 소모품 패키지', participants: 78, target: 100, endDate: '01/30', progress: 78 },
];

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  inactive: 'bg-gray-100 text-gray-700',
};

export default function OperatorDashboard() {
  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">운영자 대시보드</h1>
          <p className="text-slate-500 mt-1">KPA Society 약사회 SaaS 플랫폼 운영 현황</p>
        </div>
        <AiSummaryButton contextLabel="운영자 대시보드 요약" />
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

      {/* Branch Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">분회별 현황</h2>
            </div>
            <Link to="/operator/branches" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              전체보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {branchStatus.map((branch) => (
            <div key={branch.name} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-slate-800 w-24">{branch.name}</span>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {branch.members}명
                    </span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4" />
                      {branch.courses} 강좌
                    </span>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${statusStyles[branch.status]}`}>
                  {branch.status === 'active' ? '활성' : '대기'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Group Buy Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">공동구매 현황</h2>
              </div>
              <Link to="/operator/groupbuy" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                전체보기 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {groupbuyStatus.map((item, idx) => (
              <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {item.endDate} 마감
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-600 whitespace-nowrap">
                    {item.participants}/{item.target}명
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
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
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
            { label: '회원 관리', href: '/operator/members', icon: Users, color: 'blue' },
            { label: '강좌 관리', href: '/operator/courses', icon: GraduationCap, color: 'green' },
            { label: '공동구매 관리', href: '/operator/groupbuy', icon: ShoppingCart, color: 'purple' },
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
