/**
 * SettlementsPage - K-Cosmetics 정산 관리
 */

import { useState } from 'react';

const settlements = [
  { id: 1, store: '뷰티랩 강남점', period: '2024-01', sales: '₩12,500,000', fee: '₩1,250,000', payout: '₩11,250,000', status: '정산완료', payoutDate: '2024-02-05' },
  { id: 2, store: '코스메틱 홍대점', period: '2024-01', sales: '₩8,900,000', fee: '₩890,000', payout: '₩8,010,000', status: '정산완료', payoutDate: '2024-02-05' },
  { id: 3, store: '스킨케어 명동점', period: '2024-01', sales: '₩15,200,000', fee: '₩1,520,000', payout: '₩13,680,000', status: '정산대기', payoutDate: '-' },
  { id: 4, store: '메이크업 신촌점', period: '2024-01', sales: '₩6,700,000', fee: '₩670,000', payout: '₩6,030,000', status: '정산중', payoutDate: '-' },
  { id: 5, store: '뷰티스타 압구정점', period: '2024-01', sales: '₩21,300,000', fee: '₩2,130,000', payout: '₩19,170,000', status: '정산완료', payoutDate: '2024-02-05' },
];

const statusColors: Record<string, string> = {
  '정산대기': 'bg-gray-100 text-gray-700',
  '정산중': 'bg-yellow-100 text-yellow-700',
  '정산완료': 'bg-green-100 text-green-700',
  '보류': 'bg-red-100 text-red-700',
};

export default function SettlementsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('2024-01');

  const statuses = ['all', '정산대기', '정산중', '정산완료'];
  const periods = ['2024-01', '2023-12', '2023-11'];

  const filteredSettlements = settlements.filter(s =>
    (statusFilter === 'all' || s.status === statusFilter) &&
    s.period === periodFilter
  );

  const totalSales = filteredSettlements.reduce((sum, s) => {
    const amount = parseInt(s.sales.replace(/[₩,]/g, ''));
    return sum + amount;
  }, 0);

  const totalPayout = filteredSettlements.reduce((sum, s) => {
    const amount = parseInt(s.payout.replace(/[₩,]/g, ''));
    return sum + amount;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">정산 관리</h1>
          <p className="text-slate-500 mt-1">매장별 매출 정산 현황을 관리합니다</p>
        </div>
        <button className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium">
          일괄 정산
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">정산 대상</p>
          <p className="text-2xl font-bold text-slate-800">{filteredSettlements.length}건</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">총 매출</p>
          <p className="text-2xl font-bold text-slate-800">₩{totalSales.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">총 정산금</p>
          <p className="text-2xl font-bold text-green-600">₩{totalPayout.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">정산완료</p>
          <p className="text-2xl font-bold text-blue-600">{filteredSettlements.filter(s => s.status === '정산완료').length}건</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {periods.map((period) => (
              <option key={period} value={period}>{period}</option>
            ))}
          </select>
          <div className="flex gap-2 flex-1">
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
      </div>

      {/* Settlements Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">매장명</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">정산기간</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">매출액</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">수수료</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">정산금</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">지급일</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSettlements.map((settlement) => (
              <tr key={settlement.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{settlement.store}</p>
                </td>
                <td className="px-6 py-4 text-slate-600">{settlement.period}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-800">{settlement.sales}</td>
                <td className="px-6 py-4 text-right text-red-600">{settlement.fee}</td>
                <td className="px-6 py-4 text-right font-medium text-green-600">{settlement.payout}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[settlement.status]}`}>
                    {settlement.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{settlement.payoutDate}</td>
                <td className="px-6 py-4 text-center">
                  <button className="text-pink-600 hover:text-pink-700 font-medium text-sm">
                    상세
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
