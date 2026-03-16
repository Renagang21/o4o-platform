/**
 * SupplierProductLibraryPage - 상품 라이브러리 검색
 *
 * WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1
 * - ProductMaster 텍스트 검색 (이름/바코드/제조사)
 * - 카테고리/브랜드 필터
 * - 선택 시 상품등록 페이지로 barcode 전달
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  productApi,
  type MasterSearchResult,
  type CategoryTreeItem,
  type BrandItem,
} from '../../lib/api';

// Flatten category tree for select
function flattenCategories(
  categories: CategoryTreeItem[],
  depth = 0,
): { id: string; name: string; depth: number }[] {
  const result: { id: string; name: string; depth: number }[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: cat.name, depth });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

export default function SupplierProductLibraryPage() {
  const navigate = useNavigate();

  // Search state
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [page, setPage] = useState(1);

  // Results
  const [results, setResults] = useState<MasterSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // Reference data
  const [categories, setCategories] = useState<CategoryTreeItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);

  // Load categories and brands
  useEffect(() => {
    productApi.getCategories().then(setCategories);
    productApi.getBrands().then(setBrands);
  }, []);

  const flatCats = flattenCategories(categories);

  // Search function
  const doSearch = useCallback(async (p: number) => {
    setLoading(true);
    const res = await productApi.searchMasters({
      q: query.trim() || undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      page: p,
      limit: 20,
    });
    setResults(res.data);
    setTotal(res.meta.total);
    setTotalPages(res.meta.totalPages);
    setPage(p);
    setLoading(false);
  }, [query, categoryId, brandId]);

  // Initial load
  useEffect(() => {
    doSearch(1);
  }, []);

  // Filter change triggers search
  useEffect(() => {
    doSearch(1);
  }, [categoryId, brandId]);

  const handleSearch = () => {
    doSearch(1);
  };

  const handleSelect = (master: MasterSearchResult) => {
    navigate(`/supplier/products/new?barcode=${encodeURIComponent(master.barcode)}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/supplier/products')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft size={16} />
          내 제품으로 돌아가기
        </button>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Package size={24} />
          상품 라이브러리
        </h1>
        <p className="text-slate-500 mt-1">
          플랫폼에 등록된 상품을 검색하여 내 제품으로 등록합니다
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="상품명, 바코드, 제조사로 검색..."
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium text-sm"
        >
          검색
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">전체 카테고리</option>
          {flatCats.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {'  '.repeat(cat.depth)}{cat.name}
            </option>
          ))}
        </select>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">전체 브랜드</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <span className="flex items-center text-sm text-slate-500">
          {total}개 상품
        </span>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="text-slate-400 text-sm">검색 중...</div>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <Package size={48} className="mb-4 opacity-50" />
          <p className="text-sm">검색 결과가 없습니다</p>
          <p className="text-xs mt-1">다른 키워드로 검색해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((master) => (
            <div
              key={master.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex gap-4 hover:border-emerald-200 transition-colors"
            >
              {/* Image */}
              <div className="w-20 h-20 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {master.primaryImageUrl ? (
                  <img
                    src={master.primaryImageUrl}
                    alt={master.marketingName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package size={24} className="text-slate-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 text-sm truncate">
                  {master.marketingName || master.regulatoryName}
                </h3>
                {master.marketingName && master.regulatoryName !== master.marketingName && (
                  <p className="text-xs text-slate-400 truncate">{master.regulatoryName}</p>
                )}
                <p className="text-xs font-mono text-slate-500 mt-1">{master.barcode}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {master.category && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                      {master.category.name}
                    </span>
                  )}
                  {master.brand && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                      {master.brand.name}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{master.manufacturerName}</span>
                </div>
              </div>

              {/* Action */}
              <div className="flex-shrink-0 flex items-center">
                <button
                  onClick={() => handleSelect(master)}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap"
                >
                  이 상품으로 등록
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => doSearch(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-slate-600 px-4">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => doSearch(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
