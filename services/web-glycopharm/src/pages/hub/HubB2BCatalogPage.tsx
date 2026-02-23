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

const CATEGORIES = ['전체', '의약품', '건강기능식품', '의료기기', '화장품', '생활용품'];

function catalogToTableItem(p: CatalogProduct): B2BTableItem {
  return {
    id: p.id,
    name: p.name,
    supplierName: p.supplierName,
    legalCategory: p.category ?? undefined,
    createdAt: p.createdAt,
    note: p.description ?? undefined,
    isApplied: p.isApplied,
    isApproved: p.isApproved,
  };
}

export function HubB2BCatalogPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('전체');
  const [sortKey, setSortKey] = useState<B2BTableSortKey>('createdAt');
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

  const items: B2BTableItem[] = products.map(catalogToTableItem);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/hub" style={{ fontSize: '0.875rem', color: '#0d9488', textDecoration: 'none' }}>
          &larr; GlycoPharm HUB
        </Link>
      </div>

      <header style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#0F172A' }}>
          B2B 상품 카탈로그
        </h1>
        <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: '#64748B' }}>
          공급자가 제공하는 상품을 탐색할 수 있습니다.
        </p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
          상품 카탈로그를 불러오는 중...
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#dc2626' }}>
          <p>{error}</p>
          <button
            onClick={() => fetchData(category)}
            style={{ marginTop: '12px', padding: '6px 16px', fontSize: '0.8125rem', color: '#0d9488', background: 'transparent', border: '1px solid #0d9488', borderRadius: '6px', cursor: 'pointer' }}
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

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        padding: '18px 22px', backgroundColor: '#0d948808',
        borderRadius: '12px', border: '1px solid #0d948820',
        fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginTop: '24px',
      }}>
        <span style={{ fontSize: '18px', flexShrink: 0 }}>💡</span>
        <span>
          상품에 관심이 있으시면 공급사에 직접 문의하세요.
        </span>
      </div>
    </div>
  );
}
