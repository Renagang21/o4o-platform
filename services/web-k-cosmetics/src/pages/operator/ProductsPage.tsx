/**
 * ProductsPage - K-Cosmetics 상품 관리
 */

import { useState } from 'react';

const products = [
  { id: 1, name: '수분 크림 50ml', brand: '글로우랩', category: '스킨케어', price: '₩45,000', stock: 234, status: '판매중' },
  { id: 2, name: '비타민C 세럼', brand: '스킨퓨어', category: '에센스', price: '₩68,000', stock: 156, status: '판매중' },
  { id: 3, name: '클렌징 폼', brand: '클린뷰티', category: '클렌징', price: '₩22,000', stock: 0, status: '품절' },
  { id: 4, name: '선크림 SPF50+', brand: '썬가드', category: '선케어', price: '₩32,000', stock: 89, status: '판매중' },
  { id: 5, name: '립스틱 레드', brand: '컬러팝', category: '메이크업', price: '₩28,000', stock: 12, status: '재고부족' },
];

const statusColors: Record<string, string> = {
  '판매중': 'bg-green-100 text-green-700',
  '품절': 'bg-red-100 text-red-700',
  '재고부족': 'bg-yellow-100 text-yellow-700',
  '판매중지': 'bg-gray-100 text-gray-700',
};

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');

  const categories = ['all', '스킨케어', '에센스', '클렌징', '선케어', '메이크업'];

  const filteredProducts = products.filter(product => {
    const matchesCategory = category === 'all' || product.category === category;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
          <p className="text-slate-500 mt-1">플랫폼 전체 상품을 관리합니다</p>
        </div>
        <button className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium">
          + 상품 등록
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">전체 상품</p>
          <p className="text-2xl font-bold text-slate-800">{products.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">판매중</p>
          <p className="text-2xl font-bold text-green-600">{products.filter(p => p.status === '판매중').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">품절</p>
          <p className="text-2xl font-bold text-red-600">{products.filter(p => p.status === '품절').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-sm text-slate-500">재고 부족</p>
          <p className="text-2xl font-bold text-yellow-600">{products.filter(p => p.status === '재고부족').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="상품명 또는 브랜드 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat === 'all' ? '전체 카테고리' : cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상품명</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">브랜드</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">카테고리</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">가격</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-500">재고</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-500">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{product.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{product.brand}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{product.category}</td>
                <td className="px-6 py-4 text-right font-medium text-slate-800">{product.price}</td>
                <td className="px-6 py-4 text-right text-slate-600">{product.stock}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[product.status]}`}>
                    {product.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
