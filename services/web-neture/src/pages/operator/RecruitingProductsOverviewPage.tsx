/**
 * RecruitingProductsOverviewPage — 운영자 판매자 모집 제품 Overview
 *
 * WO-NETURE-OPERATOR-PRODUCT-SUPPLY-OVERVIEW-V1
 *
 * 판매자 모집 중인 상품을 운영자 관점에서 조회.
 * partner/recruiting-products API 재사용 (공개 엔드포인트).
 */

import { useState, useEffect, useCallback } from 'react';
import { Package, Search, RefreshCw, Users } from 'lucide-react';

interface RecruitingProduct {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  sale_price?: number;
  stock_quantity: number;
  status: string;
  is_featured: boolean;
  is_partner_recruiting: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cgm_device: 'CGM 기기',
  test_strip: '시험지',
  lancet: '란셋',
  meter: '측정기',
  accessory: '액세서리',
  other: '기타',
};

export default function RecruitingProductsOverviewPage() {
  const [products, setProducts] = useState<RecruitingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const base = apiBase.replace(/\/api\/v1\/neture\/?$/, '');
      const res = await fetch(`${base}/api/v1/neture/partner/recruiting-products`);
      const json = await res.json();
      setProducts(Array.isArray(json.data) ? json.data : json || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.pharmacy_name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">판매자 모집 제품</h1>
          <p className="text-sm text-slate-500 mt-1">현재 판매자 모집 중인 상품 현황</p>
        </div>
        <button
          onClick={fetchProducts}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />새로고침
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">모집 중 상품</p>
              <p className="text-xl font-bold text-slate-900">{products.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">추천 상품</p>
              <p className="text-xl font-bold text-slate-900">{products.filter(p => p.is_featured).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">카테고리</p>
              <p className="text-xl font-bold text-slate-900">{new Set(products.map(p => p.category)).size}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="상품명 / 약국명 / 카테고리 검색"
            className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-sm text-slate-500">총 {filtered.length}건</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase border-b border-slate-200">
              <th className="px-4 py-3 font-medium">상품명</th>
              <th className="px-4 py-3 font-medium">약국/공급자</th>
              <th className="px-4 py-3 font-medium text-center">카테고리</th>
              <th className="px-4 py-3 font-medium text-right">가격</th>
              <th className="px-4 py-3 font-medium text-center">재고</th>
              <th className="px-4 py-3 font-medium text-center">상태</th>
              <th className="px-4 py-3 font-medium text-center">추천</th>
              <th className="px-4 py-3 font-medium">등록일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">불러오는 중...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                {search ? '조건에 맞는 상품이 없습니다.' : '모집 중인 상품이 없습니다.'}
              </td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.sku}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.pharmacy_name || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    {CATEGORY_LABELS[p.category] || p.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div>
                    {p.sale_price ? (
                      <>
                        <span className="text-slate-400 line-through text-xs">₩{p.price.toLocaleString()}</span>
                        <span className="text-slate-800 font-medium ml-1">₩{p.sale_price.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="text-slate-800 font-medium">₩{p.price.toLocaleString()}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{p.stock_quantity}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    p.is_partner_recruiting ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {p.is_partner_recruiting ? '모집중' : p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {p.is_featured && <span className="text-amber-500 text-sm">★</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(p.created_at).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
