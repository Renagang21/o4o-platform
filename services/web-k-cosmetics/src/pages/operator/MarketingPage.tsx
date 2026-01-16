/**
 * MarketingPage - K-Cosmetics 마케팅 관리
 */

import { useState } from 'react';

const campaigns = [
  { id: 1, name: '신년 할인 이벤트', type: '할인', discount: '20%', target: '전체 상품', startDate: '2024-01-01', endDate: '2024-01-31', status: '진행중', usage: 234 },
  { id: 2, name: '신규 입점 쿠폰', type: '쿠폰', discount: '₩10,000', target: '신규 매장', startDate: '2024-01-01', endDate: '2024-03-31', status: '진행중', usage: 45 },
  { id: 3, name: '봄맞이 스킨케어', type: '할인', discount: '15%', target: '스킨케어', startDate: '2024-02-01', endDate: '2024-02-28', status: '예정', usage: 0 },
  { id: 4, name: '연말 감사 이벤트', type: '포인트', discount: '2배 적립', target: '전체 상품', startDate: '2023-12-15', endDate: '2023-12-31', status: '종료', usage: 567 },
  { id: 5, name: 'VIP 매장 특별 할인', type: '할인', discount: '25%', target: 'VIP 매장', startDate: '2024-01-15', endDate: '2024-01-31', status: '진행중', usage: 89 },
];

const statusColors: Record<string, string> = {
  '진행중': 'bg-green-100 text-green-700',
  '예정': 'bg-blue-100 text-blue-700',
  '종료': 'bg-gray-100 text-gray-700',
  '중지': 'bg-red-100 text-red-700',
};

const typeColors: Record<string, string> = {
  '할인': 'bg-pink-100 text-pink-700',
  '쿠폰': 'bg-purple-100 text-purple-700',
  '포인트': 'bg-indigo-100 text-indigo-700',
};

export default function MarketingPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const statuses = ['all', '진행중', '예정', '종료'];

  const filteredCampaigns = campaigns.filter(campaign =>
    statusFilter === 'all' || campaign.status === statusFilter
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">마케팅</h1>
          <p className="text-slate-500 mt-1">프로모션 및 캠페인 관리</p>
        </div>
        <button className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium">
          + 캠페인 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">진행중 캠페인</p>
          <p className="text-2xl font-bold text-green-600">{campaigns.filter(c => c.status === '진행중').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">총 사용 횟수</p>
          <p className="text-2xl font-bold text-slate-800">{campaigns.reduce((sum, c) => sum + c.usage, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">이번 달 할인액</p>
          <p className="text-2xl font-bold text-pink-600">₩8,450,000</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">예정 캠페인</p>
          <p className="text-2xl font-bold text-blue-600">{campaigns.filter(c => c.status === '예정').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex gap-2 flex-wrap">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'all' ? '전체' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">캠페인명</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">유형</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">혜택</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">대상</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">기간</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">사용</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCampaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{campaign.name}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[campaign.type]}`}>
                    {campaign.type}
                  </span>
                </td>
                <td className="px-6 py-4 font-medium text-pink-600">{campaign.discount}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{campaign.target}</td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {campaign.startDate} ~ {campaign.endDate}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-slate-600">{campaign.usage.toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  <button className="text-pink-600 hover:text-pink-700 font-medium text-sm">
                    수정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
