/**
 * PartnerAccountDashboardPage - 파트너 개인 대시보드
 *
 * Work Order: WO-O4O-PARTNER-DASHBOARD-PAGE-V1
 *
 * 구조:
 * 1. KPI Summary (4 cards)
 * 2. Recent Campaigns
 * 3. Connected Stores
 * 4. Partner Forum Preview
 */

import { Link } from 'react-router-dom';
import { FileText, Link2, Store, TrendingUp, Plus, ArrowRight, MessageSquare } from 'lucide-react';

// ── Mock Data ──

const kpiData = [
  { label: 'Contents', value: 12, desc: '등록 콘텐츠 수', icon: FileText, color: 'blue' },
  { label: 'Active Links', value: 8, desc: '활성 홍보 링크', icon: Link2, color: 'emerald' },
  { label: 'Connected Stores', value: 5, desc: '협력 매장 수', icon: Store, color: 'violet' },
  { label: 'Campaigns', value: 3, desc: '진행 캠페인', icon: TrendingUp, color: 'amber' },
];

const recentCampaigns = [
  { product: '비타민C', type: '콘텐츠 홍보', status: '진행중' },
  { product: '혈당측정기', type: 'SNS 홍보', status: '완료' },
  { product: '프로바이오틱스', type: '매장 홍보', status: '진행중' },
];

const connectedStores = [
  { name: '서울약국' },
  { name: '강남약국' },
  { name: '부산약국' },
];

const forumTopics = [
  { title: '마케팅 아이디어 공유', desc: '효과적인 마케팅 전략과 아이디어 논의' },
  { title: '콘텐츠 제작 협업', desc: '제품 홍보 콘텐츠 공동 제작 논의' },
  { title: '매장 홍보 사례', desc: '성공적인 매장 홍보 사례와 성과 공유' },
];

const colorMap: Record<string, { bg: string; icon: string; badge: string }> = {
  blue: { bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100' },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-100' },
  violet: { bg: 'bg-violet-50', icon: 'text-violet-600', badge: 'bg-violet-100' },
  amber: { bg: 'bg-amber-50', icon: 'text-amber-600', badge: 'bg-amber-100' },
};

const statusStyle: Record<string, string> = {
  '진행중': 'bg-emerald-100 text-emerald-700',
  '완료': 'bg-gray-100 text-gray-600',
  '대기': 'bg-amber-100 text-amber-700',
};

export function PartnerAccountDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">콘텐츠 활동과 매장 협업 현황</p>
        </div>
        <Link
          to="/account/partner/contents/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          콘텐츠 등록
        </Link>
      </div>

      {/* ── 1. KPI Summary ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi) => {
          const colors = colorMap[kpi.color];
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${colors.badge} rounded-lg flex items-center justify-center`}>
                  <Icon size={20} className={colors.icon} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1">{kpi.desc}</p>
            </div>
          );
        })}
      </div>

      {/* ── 2. Recent Campaigns ── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Campaigns</h2>
          <Link
            to="/account/partner/contents"
            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            전체 보기 <ArrowRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentCampaigns.map((c, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900">{c.product}</span>
                <span className="text-xs text-gray-500">{c.type}</span>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[c.status] || 'bg-gray-100 text-gray-600'}`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Connected Stores + 4. Partner Forum ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected Stores */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Connected Stores</h2>
            <Link
              to="/account/partner/stores"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              매장 목록 <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {connectedStores.map((store) => (
              <div key={store.name} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Store size={16} className="text-gray-500" />
                </div>
                <span className="text-sm font-medium text-gray-900">{store.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Forum */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-600" />
              <h2 className="text-base font-semibold text-gray-900">Partner Forum</h2>
            </div>
            <Link
              to="/partner/forum"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Forum 이동 <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {forumTopics.map((topic) => (
              <div key={topic.title} className="px-5 py-3.5">
                <p className="text-sm font-medium text-gray-900">{topic.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{topic.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
