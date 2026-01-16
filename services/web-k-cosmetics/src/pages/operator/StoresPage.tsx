/**
 * StoresPage - K-Cosmetics 매장 네트워크 관리
 */

import { useState } from 'react';

// 매장 데이터
const stores = [
  { id: 1, name: '뷰티랩 강남점', address: '서울 강남구 역삼동 123-45', status: '운영중', sales: '₩12.5M', products: 156, joinDate: '2023-06-15' },
  { id: 2, name: '코스메틱 홍대점', address: '서울 마포구 서교동 234-56', status: '운영중', sales: '₩8.9M', products: 89, joinDate: '2023-08-20' },
  { id: 3, name: '스킨케어 명동점', address: '서울 중구 명동2가 12-34', status: '일시중지', sales: '₩15.2M', products: 203, joinDate: '2023-04-10' },
  { id: 4, name: '메이크업 신촌점', address: '서울 서대문구 창천동 56-78', status: '운영중', sales: '₩6.7M', products: 67, joinDate: '2023-09-05' },
  { id: 5, name: '뷰티스타 압구정점', address: '서울 강남구 신사동 89-01', status: '운영중', sales: '₩21.3M', products: 312, joinDate: '2023-02-28' },
];

const statusColors: Record<string, string> = {
  '운영중': 'bg-green-100 text-green-700',
  '일시중지': 'bg-yellow-100 text-yellow-700',
  '탈퇴': 'bg-red-100 text-red-700',
};

export default function StoresPage() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStores = stores.filter(store => {
    const matchesFilter = filter === 'all' || store.status === filter;
    const matchesSearch = store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         store.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">매장 네트워크</h1>
          <p className="text-slate-500 mt-1">K-Cosmetics 제휴 매장을 관리합니다</p>
        </div>
        <button className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium">
          + 매장 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">전체 매장</p>
          <p className="text-2xl font-bold text-slate-800">{stores.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">운영중</p>
          <p className="text-2xl font-bold text-green-600">{stores.filter(s => s.status === '운영중').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">총 매출</p>
          <p className="text-2xl font-bold text-slate-800">₩64.6M</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">등록 상품</p>
          <p className="text-2xl font-bold text-slate-800">827</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="매장명 또는 주소 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="flex gap-2">
            {['all', '운영중', '일시중지'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
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

      {/* Stores Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">매장명</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">주소</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">매출</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">상품수</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStores.map((store) => (
              <tr key={store.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{store.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{store.address}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[store.status]}`}>
                    {store.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-800">{store.sales}</td>
                <td className="px-6 py-4 text-right text-slate-600">{store.products}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{store.joinDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
