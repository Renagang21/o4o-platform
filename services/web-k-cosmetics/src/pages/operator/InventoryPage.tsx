/**
 * InventoryPage - K-Cosmetics 재고/공급 관리
 */

import { useState } from 'react';

const inventory = [
  { id: 1, name: '수분 크림 50ml', brand: '글로우랩', sku: 'GL-MC-001', stock: 234, minStock: 50, status: '정상', lastRestock: '2024-01-10' },
  { id: 2, name: '비타민C 세럼', brand: '스킨퓨어', sku: 'SP-VS-002', stock: 156, minStock: 30, status: '정상', lastRestock: '2024-01-12' },
  { id: 3, name: '클렌징 폼', brand: '클린뷰티', sku: 'CB-CF-003', stock: 0, minStock: 40, status: '품절', lastRestock: '2023-12-20' },
  { id: 4, name: '선크림 SPF50+', brand: '썬가드', sku: 'SG-SC-004', stock: 89, minStock: 100, status: '부족', lastRestock: '2024-01-08' },
  { id: 5, name: '립스틱 레드', brand: '컬러팝', sku: 'CP-LS-005', stock: 12, minStock: 25, status: '부족', lastRestock: '2024-01-05' },
  { id: 6, name: '아이크림', brand: '글로우랩', sku: 'GL-EC-006', stock: 45, minStock: 30, status: '정상', lastRestock: '2024-01-11' },
];

const statusColors: Record<string, string> = {
  '정상': 'bg-green-100 text-green-700',
  '부족': 'bg-yellow-100 text-yellow-700',
  '품절': 'bg-red-100 text-red-700',
};

export default function InventoryPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statuses = ['all', '정상', '부족', '품절'];

  const filteredInventory = inventory.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">재고/공급 관리</h1>
          <p className="text-slate-500 mt-1">상품 재고 현황 및 공급 관리</p>
        </div>
        <button className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium">
          + 입고 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">전체 품목</p>
          <p className="text-2xl font-bold text-slate-800">{inventory.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">재고 정상</p>
          <p className="text-2xl font-bold text-green-600">{inventory.filter(i => i.status === '정상').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">재고 부족</p>
          <p className="text-2xl font-bold text-yellow-600">{inventory.filter(i => i.status === '부족').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">품절</p>
          <p className="text-2xl font-bold text-red-600">{inventory.filter(i => i.status === '품절').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="상품명, 브랜드, SKU 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <div className="flex gap-2">
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

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상품명</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">브랜드</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">SKU</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">현재고</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">안전재고</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">최근입고</th>
              <th className="text-center px-6 py-4 text-sm font-medium text-slate-500">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInventory.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{item.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{item.brand}</td>
                <td className="px-6 py-4 text-sm text-slate-500 font-mono">{item.sku}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-800">{item.stock}</td>
                <td className="px-6 py-4 text-right text-slate-500">{item.minStock}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{item.lastRestock}</td>
                <td className="px-6 py-4 text-center">
                  <button className="text-pink-600 hover:text-pink-700 font-medium text-sm">
                    발주
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
