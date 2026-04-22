/**
 * SupplierOps — 상품 검색 페이지
 *
 * WO-O4O-PRODUCT-INPUT-ASSIST-V1
 *
 * 공급자 상품 등록의 첫 단계.
 * ProductMaster를 검색하여 선택하면 등록 폼으로 이동하며 자동 채움이 적용된다.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, ChevronRight, ArrowLeft } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { searchProductMaster } from '../../../api/product-library.api';
import type { ProductMasterSearchResult } from '../../../api/product-library.api';

const DEBOUNCE_MS = 300;

const ProductSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductMasterSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchProductMaster(query, 5);
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (master: ProductMasterSearchResult) => {
    navigate('/supplierops/products/create', { state: { master } });
  };

  const handleCreateNew = () => {
    navigate('/supplierops/products/create');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="상품 추가"
        subtitle="등록할 상품을 검색하거나 직접 입력하세요"
        actions={[
          {
            id: 'back',
            label: '목록으로',
            icon: <ArrowLeft className="w-4 h-4" />,
            onClick: () => navigate('/supplierops/products'),
            variant: 'secondary' as const,
          },
        ]}
      />

      {/* 검색 입력 */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          상품명 검색
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상품명 입력 (예: 타이레놀정 500mg)"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          상품명, 바코드, 제조사명으로 검색할 수 있습니다.
        </p>
      </div>

      {/* 검색 결과 */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-6 text-center text-sm text-gray-500">
          검색 중...
        </div>
      )}

      {!loading && searched && results.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden mb-4">
          <div className="px-4 py-2 bg-gray-50 border-b text-xs font-medium text-gray-500 uppercase tracking-wide">
            검색 결과 ({results.length}건)
          </div>
          <ul className="divide-y divide-gray-100">
            {results.map((master) => (
              <li key={master.id}>
                <button
                  onClick={() => handleSelect(master)}
                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-blue-50 transition-colors text-left group"
                >
                  {/* 이미지 */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    {master.primaryImageUrl ? (
                      <img
                        src={master.primaryImageUrl}
                        alt={master.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{master.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {master.manufacturerName}
                      {master.regulatoryType && (
                        <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                          {master.regulatoryType}
                        </span>
                      )}
                    </p>
                    {master.specification && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{master.specification}</p>
                    )}
                  </div>

                  <ChevronRight className="flex-shrink-0 w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center mb-4">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">검색 결과가 없습니다</p>
          <p className="text-xs text-gray-500 mt-1">
            "{query}"에 해당하는 상품을 찾을 수 없습니다.
          </p>
        </div>
      )}

      {/* 신규 등록 버튼 */}
      <div className="bg-white rounded-lg shadow p-4 border-2 border-dashed border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">찾는 제품이 없습니다</p>
            <p className="text-xs text-gray-500 mt-0.5">검색 없이 직접 상품 정보를 입력합니다</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            신규 상품 등록 →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductSearchPage;
