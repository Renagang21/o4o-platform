/**
 * HubB2BCatalogPage — GlycoPharm B2B 상품 카탈로그 (테이블 형태)
 *
 * WO-O4O-B2B-OPERATION-TABLE-STRUCTURE-V1
 *
 * B2BTableList 공용 컴포넌트를 사용하여
 * 플랫폼 B2B 카탈로그를 테이블 형태로 탐색.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  B2BTableList,
  type B2BTableItem,
  type B2BTableSortKey,
} from '@o4o/hub-exploration-core';
import { getCatalog } from '../../api/pharmacyProducts';
import type { CatalogProduct } from '../../api/pharmacyProducts';
import { apiClient } from '@/services/api';

const CATEGORIES = ['전체', '의약품', '건강기능식품', '의료기기', '화장품', '생활용품'];

export function HubB2BCatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('전체');
  const [sortKey, setSortKey] = useState<B2BTableSortKey>('createdAt');
  // Track applying state per product to update UI immediately
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async (cat: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCatalog({
        category: cat === '전체' ? undefined : cat,
        limit: 200,
        offset: 0,
      });
      setProducts(res.data);
    } catch (e: any) {
      setError(e.message || '카탈로그를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(category);
  }, [fetchData, category]);

  const handleSortChange = (key: B2BTableSortKey) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleApply = async (productId: string) => {
    if (applyingId) return;
    setApplyingId(productId);
    try {
      await apiClient.post('/api/v1/glycopharm/pharmacy/products/apply', {
        productId,
        service_key: 'glycopharm',
      });
      // Optimistically mark as applied
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isApplied: true } : p));
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '신청 중 오류가 발생했습니다.';
      alert(msg);
    } finally {
      setApplyingId(null);
    }
  };

  const items: B2BTableItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    supplierName: p.supplierName,
    legalCategory: p.category ?? undefined,
    createdAt: p.createdAt,
    note: p.description ?? undefined,
    isApplied: p.isApplied,
    isApproved: p.isApproved,
    onApply: (!p.isApplied && !p.isApproved)
      ? () => handleApply(p.id)
      : undefined,
  }));

  return (
    <div className="px-1 py-2">
      {/* 페이지 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">B2B 상품 카탈로그</h1>
        <p className="text-sm text-slate-500 mt-0.5">공급자가 제공하는 상품을 탐색하고 내 약국에 신청합니다.</p>
      </div>

      {/* 콘텐츠 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            onClick={() => fetchData(category)}
            className="px-4 py-2 text-sm text-teal-600 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <B2BTableList
          items={items}
          categories={CATEGORIES}
          activeCategory={category}
          onCategoryChange={setCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          pageSize={10}
          emptyMessage="현재 공급 가능한 상품이 없습니다."
        />
      )}

      {/* Store 연결 안내 */}
      <div className="flex items-start gap-3 px-5 py-4 bg-teal-50/60 border border-teal-100 rounded-xl mt-6 text-sm text-slate-600 leading-relaxed">
        <span className="text-lg shrink-0">💡</span>
        <span>
          관심 상품은 <strong>신청 버튼</strong>을 눌러 내 약국에 등록할 수 있습니다.
          승인 후 <Link to="/store/management/b2b" className="text-teal-700 underline underline-offset-2 hover:text-teal-800">매장 B2B 관리</Link>에서 확인하세요.
        </span>
      </div>
    </div>
  );
}
