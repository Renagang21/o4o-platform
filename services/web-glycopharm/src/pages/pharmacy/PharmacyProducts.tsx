/**
 * PharmacyProducts - 약국 상품 관리
 * Mock 데이터 제거, API 연동 구조
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Package,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  Loader2,
  AlertCircle,
  LayoutGrid,
  Table,
  Tag,
  Sparkles,
  X,
  RefreshCw,
} from 'lucide-react';
import { pharmacyApi, type PharmacyProduct, type ProductAiTagData, type ProductSearchResultData } from '@/api/pharmacy';
import { toast } from '@o4o/error-handling';
import { DataTable, type Column } from '@o4o/ui';

export default function PharmacyProducts() {
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // AI Tag Search state (WO-O4O-AI-TAG-SEARCH-V1)
  const [searchMode, setSearchMode] = useState<'normal' | 'ai'>('normal');
  const [aiSearchResults, setAiSearchResults] = useState<ProductSearchResultData[]>([]);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);

  // AI Tag modal state (WO-O4O-PRODUCT-AI-TAGGING-V1)
  const [tagModalProductId, setTagModalProductId] = useState<string | null>(null);
  const [tagModalProductName, setTagModalProductName] = useState('');
  const [aiTags, setAiTags] = useState<ProductAiTagData[]>([]);
  const [manualTags, setManualTags] = useState<ProductAiTagData[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagGenerating, setTagGenerating] = useState(false);
  const [newManualTag, setNewManualTag] = useState('');

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 카테고리 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await pharmacyApi.getCategories();
        if (res.success && res.data) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // 상품 로드
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await pharmacyApi.getProducts({
        categoryId: selectedCategory || undefined,
        search: debouncedSearch || undefined,
        pageSize: 20,
      });

      if (res.success && res.data) {
        setProducts(res.data.items);
        setTotalCount(res.data.total);
      } else {
        throw new Error('상품을 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Products load error:', err);
      setError(err.message || '상품을 불러오는데 실패했습니다.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, debouncedSearch]);

  useEffect(() => {
    if (searchMode === 'normal') {
      loadProducts();
    }
  }, [loadProducts, searchMode]);

  // AI 태그 검색 (WO-O4O-AI-TAG-SEARCH-V1)
  useEffect(() => {
    if (searchMode !== 'ai' || !debouncedSearch) {
      setAiSearchResults([]);
      return;
    }

    const doSearch = async () => {
      setAiSearchLoading(true);
      try {
        const res = await pharmacyApi.searchProductsByAiTag(debouncedSearch);
        if (res.success && res.data) {
          setAiSearchResults(res.data.products);
        }
      } catch (err) {
        console.error('AI tag search error:', err);
        setAiSearchResults([]);
      } finally {
        setAiSearchLoading(false);
      }
    };
    doSearch();
  }, [debouncedSearch, searchMode]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?')) return;

    try {
      await pharmacyApi.deleteProduct(productId);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || '상품 삭제에 실패했습니다.');
    }
  };

  // === AI Tag handlers (WO-O4O-PRODUCT-AI-TAGGING-V1) ===
  const openTagModal = async (productId: string, productName: string) => {
    setTagModalProductId(productId);
    setTagModalProductName(productName);
    setAiTags([]);
    setManualTags([]);
    setNewManualTag('');
    setTagsLoading(true);
    try {
      const res = await pharmacyApi.getProductAiTags(productId);
      if (res.success && res.data) {
        setAiTags(res.data.aiTags);
        setManualTags(res.data.manualTags);
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    } finally {
      setTagsLoading(false);
    }
  };

  const closeTagModal = () => {
    setTagModalProductId(null);
    setTagModalProductName('');
  };

  const handleRegenerateTags = async () => {
    if (!tagModalProductId) return;
    setTagGenerating(true);
    try {
      await pharmacyApi.regenerateProductAiTags(tagModalProductId);
      // Refresh tags after short delay (fire-and-forget on backend)
      setTimeout(async () => {
        const res = await pharmacyApi.getProductAiTags(tagModalProductId);
        if (res.success && res.data) {
          setAiTags(res.data.aiTags);
          setManualTags(res.data.manualTags);
        }
        setTagGenerating(false);
      }, 4000);
    } catch (err) {
      console.error('Failed to regenerate tags:', err);
      setTagGenerating(false);
    }
  };

  const handleAddManualTag = async () => {
    if (!tagModalProductId || !newManualTag.trim()) return;
    try {
      const res = await pharmacyApi.addProductManualTag(tagModalProductId, newManualTag.trim());
      if (res.success && res.data) {
        setManualTags((prev) => [...prev, res.data!]);
        setNewManualTag('');
      }
    } catch (err) {
      console.error('Failed to add manual tag:', err);
    }
  };

  const handleDeleteTag = async (tagId: string, source: string) => {
    if (!tagModalProductId) return;
    try {
      await pharmacyApi.deleteProductAiTag(tagModalProductId, tagId);
      if (source === 'ai') {
        setAiTags((prev) => prev.filter((t) => t.id !== tagId));
      } else {
        setManualTags((prev) => prev.filter((t) => t.id !== tagId));
      }
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  // Format price
  const formatPrice = (price: number) => `${price.toLocaleString()}원`;

  // Table Columns
  const columns: Column<Record<string, any>>[] = [
    { key: 'image', title: '이미지', dataIndex: 'image', width: '80px' },
    { key: 'name', title: '상품명', dataIndex: 'name', sortable: true },
    { key: 'supplier', title: '공급자', dataIndex: 'supplier', width: '150px' },
    { key: 'category', title: '카테고리', dataIndex: 'category', width: '120px' },
    { key: 'price', title: '가격', dataIndex: 'price', width: '120px', align: 'right', sortable: true },
    { key: 'stock', title: '재고', dataIndex: 'stock', width: '80px', align: 'center', sortable: true },
    { key: 'status', title: '상태', dataIndex: 'status', width: '100px', align: 'center' },
    { key: 'actions', title: '', dataIndex: 'actions', width: '140px' },
  ];

  // Transform products to table rows
  const tableRows = products.map((product) => {
    // Status badge
    const renderStatusBadge = () => {
      if (product.status === 'out_of_stock') {
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700">
            품절
          </span>
        );
      } else if (product.status === 'inactive') {
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-600">
            비활성
          </span>
        );
      } else {
        return (
          <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-700">
            활성
          </span>
        );
      }
    };

    return {
      id: product.id,
      image: product.thumbnailUrl ? (
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          className="w-12 h-12 object-cover rounded"
        />
      ) : (
        <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">
          <Package className="w-6 h-6 text-slate-400" />
        </div>
      ),
      name: (
        <div>
          <span className="font-medium">{product.name}</span>
          {product.isDropshipping && (
            <p className="text-xs text-primary-600 mt-1">공급자 직배송</p>
          )}
        </div>
      ),
      supplier: <span className="text-sm text-slate-600">{product.supplierName}</span>,
      category: (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
          <Tag className="w-3 h-3" />
          {product.categoryName}
        </span>
      ),
      price: (
        <div className="text-right">
          {product.salePrice ? (
            <>
              <div className="font-bold text-red-600">{formatPrice(product.salePrice)}</div>
              <div className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</div>
            </>
          ) : (
            <div className="font-bold">{formatPrice(product.price)}</div>
          )}
        </div>
      ),
      stock: <span className={product.stock === 0 ? 'text-red-600' : ''}>{product.stock}</span>,
      status: renderStatusBadge(),
      actions: (
        <div className="flex gap-2">
          <button
            onClick={() => console.log('View:', product.id)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            보기
          </button>
          <button
            onClick={() => openTagModal(product.id, product.name)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            AI 태그
          </button>
          <button
            onClick={() => console.log('Edit:', product.id)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            수정
          </button>
          <button
            onClick={() => handleDeleteProduct(product.id)}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            삭제
          </button>
        </div>
      ),
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
          <p className="text-slate-500 text-sm">
            {loading ? '불러오는 중...' : `총 ${totalCount}개의 상품`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
          >
            <Plus className="w-5 h-5" />
            상품 등록
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Mode Toggle + Input */}
          <div className="flex-1 flex gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
              <button
                onClick={() => { setSearchMode('normal'); setSearchQuery(''); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  searchMode === 'normal'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Search className="w-3.5 h-3.5 inline mr-1" />
                일반
              </button>
              <button
                onClick={() => { setSearchMode('ai'); setSearchQuery(''); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  searchMode === 'ai'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                AI 태그
              </button>
            </div>
            <div className="flex-1 relative">
              {searchMode === 'ai' ? (
                <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchMode === 'ai' ? 'AI 태그로 검색 (예: 혈당, 면역, 비타민)' : '상품명으로 검색...'}
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 ${
                  searchMode === 'ai'
                    ? 'border-indigo-200 focus:ring-indigo-500'
                    : 'border-slate-200 focus:ring-primary-500'
                }`}
              />
            </div>
          </div>

          {/* Category Filter (normal mode only) */}
          <div className={`flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 ${searchMode === 'ai' ? 'hidden' : ''}`}>
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !selectedCategory
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading (normal mode) */}
      {searchMode === 'normal' && loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      )}

      {/* Error (normal mode) */}
      {searchMode === 'normal' && !loading && error && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">오류가 발생했습니다</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={loadProducts}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* AI Tag Search Results (WO-O4O-AI-TAG-SEARCH-V1) */}
      {searchMode === 'ai' && !aiSearchLoading && debouncedSearch && (
        <>
          {aiSearchResults.length > 0 ? (
            <div>
              <p className="text-sm text-slate-500 mb-3">
                "{debouncedSearch}" 검색 결과 {aiSearchResults.length}건
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aiSearchResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400">{result.categoryName}</p>
                        <h3 className="font-semibold text-slate-800 mt-1 truncate">{result.marketingName}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{result.regulatoryName}</p>
                        {result.specification && (
                          <p className="text-xs text-slate-400 mt-0.5">{result.specification}</p>
                        )}
                        {result.brandName && (
                          <p className="text-xs text-slate-400">{result.brandName}</p>
                        )}
                      </div>
                      {result.score > 0 && (
                        <span className="shrink-0 ml-2 px-2 py-1 text-xs font-medium rounded-lg bg-indigo-100 text-indigo-700">
                          {Math.round(result.score * 100)}%
                        </span>
                      )}
                    </div>
                    {result.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {result.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 text-xs rounded-md ${
                              tag.includes(debouncedSearch)
                                ? 'bg-indigo-100 text-indigo-700 font-medium'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl">
              <Sparkles className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">검색 결과가 없습니다</h3>
              <p className="text-slate-500">"{debouncedSearch}"에 해당하는 AI 태그 상품이 없습니다.</p>
            </div>
          )}
        </>
      )}

      {/* AI Search Loading */}
      {searchMode === 'ai' && aiSearchLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {/* AI Search Empty State (no query) */}
      {searchMode === 'ai' && !aiSearchLoading && !debouncedSearch && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Sparkles className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">AI 태그 검색</h3>
          <p className="text-slate-500">태그 키워드를 입력하세요 (예: 혈당, 면역, 비타민)</p>
        </div>
      )}

      {/* Products - Card View or Table View */}
      {searchMode === 'normal' && !loading && !error && products.length > 0 && (
        <>
          {viewMode === 'card' ? (
            /* Card View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Product Image */}
                  <div className="aspect-video bg-slate-100 flex items-center justify-center">
                    {product.thumbnailUrl ? (
                      <img
                        src={product.thumbnailUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-12 h-12 text-slate-300" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs text-slate-400">{product.categoryName}</span>
                        <h3 className="font-semibold text-slate-800 mt-1">{product.name}</h3>
                        {product.isDropshipping && (
                          <p className="text-xs text-primary-600 mt-1">공급자 직배송</p>
                        )}
                      </div>
                      <button className="p-1 hover:bg-slate-100 rounded-lg">
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div>
                        {product.salePrice ? (
                          <div>
                            <p className="text-lg font-bold text-red-600">
                              {product.salePrice.toLocaleString()}원
                            </p>
                            <p className="text-sm text-slate-400 line-through">
                              {product.price.toLocaleString()}원
                            </p>
                          </div>
                        ) : (
                          <p className="text-lg font-bold text-primary-600">
                            {product.price.toLocaleString()}원
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {product.status === 'out_of_stock' ? (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg">
                            품절
                          </span>
                        ) : product.status === 'inactive' ? (
                          <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">
                            비활성
                          </span>
                        ) : (
                          <span className="text-sm text-slate-500">재고 {product.stock}개</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                      <button className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                        <Eye className="w-4 h-4" />
                        보기
                      </button>
                      <button
                        onClick={() => openTagModal(product.id, product.name)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        태그
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
                        <Edit2 className="w-4 h-4" />
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View */
            <div className="bg-white rounded-xl shadow-sm">
              <DataTable
                columns={columns}
                dataSource={tableRows}
                rowKey="id"
                loading={loading}
                emptyText="등록된 상품이 없습니다"
              />
            </div>
          )}
        </>
      )}

      {/* Empty State (normal mode) */}
      {searchMode === 'normal' && !loading && !error && products.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">상품이 없습니다</h3>
          <p className="text-slate-500 mb-4">
            {debouncedSearch
              ? '검색 조건에 맞는 상품이 없습니다.'
              : '등록된 상품이 없습니다. 상품을 등록해주세요.'}
          </p>
          {debouncedSearch && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
              }}
              className="text-primary-600 font-medium hover:text-primary-700"
            >
              필터 초기화
            </button>
          )}
        </div>
      )}

      {/* Add Product Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">상품 등록</h2>
            <p className="text-slate-500 mb-6">
              공급자 상품 목록에서 상품을 선택하여 등록할 수 있습니다.
            </p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* AI Tag Modal (WO-O4O-PRODUCT-AI-TAGGING-V1) */}
      {tagModalProductId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  AI 태그 관리
                </h2>
                <p className="text-sm text-slate-500 mt-1">{tagModalProductName}</p>
              </div>
              <button onClick={closeTagModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {tagsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <>
                  {/* AI Tags */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700">AI 추천 태그</h3>
                      <button
                        onClick={handleRegenerateTags}
                        disabled={tagGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        {tagGenerating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {tagGenerating ? '생성 중...' : 'AI 태그 생성'}
                      </button>
                    </div>
                    {aiTags.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {aiTags.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm group"
                          >
                            {t.tag}
                            <span className="text-xs text-indigo-400">
                              {Math.round(t.confidence * 100)}%
                            </span>
                            <button
                              onClick={() => handleDeleteTag(t.id, 'ai')}
                              className="ml-0.5 text-indigo-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 py-2">
                        {tagGenerating ? 'AI가 태그를 생성하고 있습니다...' : 'AI 태그가 없습니다. "AI 태그 생성"을 클릭하세요.'}
                      </p>
                    )}
                  </div>

                  {/* Manual Tags */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">운영자 태그</h3>
                    {manualTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {manualTags.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm group"
                          >
                            {t.tag}
                            <button
                              onClick={() => handleDeleteTag(t.id, 'manual')}
                              className="ml-0.5 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newManualTag}
                        onChange={(e) => setNewManualTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddManualTag()}
                        placeholder="태그 입력 후 Enter"
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleAddManualTag}
                        disabled={!newManualTag.trim()}
                        className="px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t">
              <button
                onClick={closeTagModal}
                className="w-full py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
