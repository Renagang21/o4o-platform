/**
 * HubB2BPage — K-Cosmetics B2B 상품 카탈로그
 *
 * WO-O4O-HUB-TO-STORE-UX-BRIDGE-V1
 *
 * /store-hub/b2b 진입점.
 * 공급자 상품을 탐색하고 "내 매장에 추가" 신청 후 채널 진열로 연결.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { getCatalog, applyBySupplyProductId, type CatalogProduct } from '../../api/pharmacyProducts';

const CATEGORIES = ['전체', '화장품', '뷰티디바이스', '헤어케어', '스킨케어', '바디케어'];
const PAGE_SIZE = 20;

export function HubB2BPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('전체');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const fetchData = useCallback(async (cat: string, pageOffset: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCatalog({
        category: cat === '전체' ? undefined : cat,
        limit: PAGE_SIZE,
        offset: pageOffset,
      });
      setProducts(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e.message || '카탈로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(category, offset);
  }, [fetchData, category, offset]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setOffset(0);
  };

  const handleApply = async (product: CatalogProduct) => {
    if (applyingId) return;
    setApplyingId(product.id);
    try {
      await applyBySupplyProductId(product.id);
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAdded: true } : p));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '신청 중 오류가 발생했습니다.';
      alert(msg);
    } finally {
      setApplyingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const hasAdded = products.some(p => p.isAdded);

  return (
    <div className="px-1 py-2">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="w-5 h-5 text-pink-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">B2B 상품 카탈로그</h1>
          <p className="text-sm text-slate-500 mt-0.5">공급자 상품을 탐색하고 내 매장에 신청합니다.</p>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 flex-wrap mb-5">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
              category === cat
                ? 'bg-pink-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 콘텐츠 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            onClick={() => fetchData(category, offset)}
            className="px-4 py-2 text-sm text-pink-600 border border-pink-300 rounded-lg hover:bg-pink-50 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-sm text-slate-400">
          현재 공급 가능한 상품이 없습니다.
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3">총 {total}개 상품</p>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">상품명</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden sm:table-cell">공급사</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden md:table-cell">카테고리</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">신청</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 truncate max-w-[200px]">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">{product.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {product.supplierName}
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {product.category ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.isAdded ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          추가됨
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApply(product)}
                          disabled={applyingId === product.id}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {applyingId === product.id ? '신청 중...' : '내 매장에 추가'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={currentPage <= 1}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                &laquo; 이전
              </button>
              <span className="text-sm text-slate-400">{currentPage} / {totalPages}</span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                다음 &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* 안내 */}
      <div className="flex items-start gap-3 px-5 py-4 bg-pink-50/60 border border-pink-100 rounded-xl mt-2 text-sm text-slate-600 leading-relaxed">
        <span className="text-lg shrink-0">💡</span>
        <span>
          <strong>신청 버튼</strong>을 눌러 상품을 내 매장에 추가할 수 있습니다.
          추가된 상품은 채널에 진열하여 고객에게 보여줄 수 있습니다.
        </span>
      </div>

      {/* 채널 진열 CTA — 추가된 상품이 있을 때 표시 */}
      {hasAdded && (
        <div className="flex items-start gap-3 px-5 py-4 bg-green-50 border border-green-200 rounded-xl mt-3 text-sm text-slate-600 leading-relaxed">
          <span className="text-lg shrink-0">✅</span>
          <span>
            추가된 상품은 <strong>채널에서 진열</strong>하면 고객에게 보여집니다.{' '}
            <Link to="/store/channels" className="text-pink-700 font-semibold underline underline-offset-2 hover:text-pink-800">채널 관리로 이동 →</Link>
          </span>
        </div>
      )}
    </div>
  );
}

export default HubB2BPage;
