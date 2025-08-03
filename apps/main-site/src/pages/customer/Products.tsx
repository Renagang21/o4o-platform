import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProductStore } from '../../stores/productStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { Product } from '../../types/product';

export default function CustomerProducts() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const {
    products,
    categories,
    categoryGroups,
    flatCategories,
    filters,
    pagination,
    fetchProducts,
    setFilters,
    clearFilters,
    isLoading,
    error,
    clearError,
  } = useProductStore();
  
  const { addToCart } = useOrderStore();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [priceRange, setPriceRange] = useState({ 
    min: Number(searchParams.get('minPrice')) || 0, 
    max: Number(searchParams.get('maxPrice')) || 0 
  });
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'sales' | 'rating'>(
    (searchParams.get('sort') as any) || 'name'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // URL 파라미터에 따른 초기 검색
    const initialSort = searchParams.get('sort');
    if (initialSort) {
      if (initialSort === 'newest') {
        setSortBy('name');
        setSortOrder('desc');
      } else if (initialSort === 'popular') {
        setSortBy('sales');
        setSortOrder('desc');
      } else if (initialSort === 'rating') {
        setSortBy('rating');
        setSortOrder('desc');
      }
    }

    handleSearch();
  }, []);

  const handleSearch = () => {
    setFilters({
      search: searchTerm,
      categoryId: selectedCategory,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      sortBy,
      sortOrder,
      status: 'active',
      approvalStatus: 'approved',
    });
    fetchProducts();

    // URL 업데이트
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (selectedCategory) params.set('category', selectedCategory);
    if (priceRange.min > 0) params.set('minPrice', priceRange.min.toString());
    if (priceRange.max > 0) params.set('maxPrice', priceRange.max.toString());
    if (sortBy !== 'name' || sortOrder !== 'asc') {
      if (sortBy === 'sales' && sortOrder === 'desc') {
        params.set('sort', 'popular');
      } else if (sortBy === 'rating' && sortOrder === 'desc') {
        params.set('sort', 'rating');
      } else {
        params.set('sort', `${sortBy}_${sortOrder}`);
      }
    }
    setSearchParams(params);
  };

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      await addToCart(productId, 1);
      toast.success('장바구니에 추가되었습니다!');
    } catch (error) {
      toast.error('장바구니 추가에 실패했습니다.');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = flatCategories.find(cat => cat.id === categoryId);
    return category?.name || '미분류';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setPriceRange({ min: 0, max: 0 });
    setSortBy('name');
    setSortOrder('asc');
    clearFilters();
    setSearchParams(new URLSearchParams());
    fetchProducts({
      status: 'active',
      approvalStatus: 'approved',
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">상품 쇼핑</h1>
              <p className="mt-2 text-sm text-gray-600">다양한 상품을 둘러보고 원하는 상품을 찾아보세요.</p>
            </div>
            <div className="flex space-x-4">
              {user && (
                <>
                  <button
                    onClick={() => navigate('/customer/cart')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    🛒 장바구니
                  </button>
                  <button
                    onClick={() => navigate('/customer/orders')}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                  >
                    주문 내역
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:grid lg:grid-cols-4 lg:gap-x-8">
          {/* 사이드바 필터 (데스크톱) */}
          <div className="hidden lg:block">
            <div className="bg-white shadow rounded-lg p-6 sticky top-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">필터</h2>
              
              {/* 카테고리 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">카테고리</h3>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      value=""
                      checked={selectedCategory === ''}
                      onChange={(e: any) => setSelectedCategory(e.target.value)}
                      className="rounded-full border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">전체</span>
                  </label>
                  {categoryGroups.map((group: any) => (
                    <label key={group.id} className="flex items-center">
                      <input
                        type="radio"
                        name="category"
                        value={group.id}
                        checked={selectedCategory === group.id}
                        onChange={(e: any) => setSelectedCategory(e.target.value)}
                        className="rounded-full border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 가격 범위 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">가격 범위</h3>
                <div className="space-y-2">
                  <input
                    type="number"
                    value={priceRange.min || ''}
                    onChange={(e: any) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    placeholder="최소 가격"
                  />
                  <input
                    type="number"
                    value={priceRange.max || ''}
                    onChange={(e: any) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    placeholder="최대 가격"
                  />
                </div>
              </div>

              {/* 정렬 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">정렬</h3>
                <select
                  value={`${sortBy}_${sortOrder}`}
                  onChange={(e: any) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('_');
                    setSortBy(newSortBy as any);
                    setSortOrder(newSortOrder as any);
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="name_asc">이름 (가나다순)</option>
                  <option value="name_desc">이름 (다나가순)</option>
                  <option value="price_asc">가격 (낮은순)</option>
                  <option value="price_desc">가격 (높은순)</option>
                  <option value="sales_desc">인기순</option>
                  <option value="rating_desc">평점순</option>
                </select>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSearch}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  필터 적용
                </button>
                <button
                  onClick={clearAllFilters}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
                >
                  필터 초기화
                </button>
              </div>
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-3">
            {/* 검색바 및 모바일 필터 */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e: any) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="상품명, 브랜드로 검색"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleSearch}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                  >
                    검색
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                  >
                    필터
                  </button>
                </div>
              </div>

              {/* 모바일 필터 */}
              {showFilters && (
                <div className="lg:hidden mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                      <select
                        value={selectedCategory}
                        onChange={(e: any) => setSelectedCategory(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">전체 카테고리</option>
                        {categoryGroups.map((group: any) => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">정렬</label>
                      <select
                        value={`${sortBy}_${sortOrder}`}
                        onChange={(e: any) => {
                          const [newSortBy, newSortOrder] = e.target.value.split('_');
                          setSortBy(newSortBy as any);
                          setSortOrder(newSortOrder as any);
                        }}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="name_asc">이름 (가나다순)</option>
                        <option value="name_desc">이름 (다나가순)</option>
                        <option value="price_asc">가격 (낮은순)</option>
                        <option value="price_desc">가격 (높은순)</option>
                        <option value="sales_desc">인기순</option>
                        <option value="rating_desc">평점순</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={handleSearch}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      필터 적용
                    </button>
                    <button
                      onClick={clearAllFilters}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                    >
                      초기화
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 결과 헤더 */}
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-gray-600">
                총 <span className="font-medium">{pagination.total}</span>개 상품
                {selectedCategory && (
                  <span> • <span className="font-medium">{getCategoryName(selectedCategory)}</span></span>
                )}
              </p>
            </div>

            {/* 상품 목록 */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">상품을 불러오는 중...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
                  <p className="mt-1 text-sm text-gray-500">다른 검색어나 필터를 사용해보세요.</p>
                  <div className="mt-6">
                    <button
                      onClick={clearAllFilters}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      전체 상품 보기
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 p-6">
                  {products.map((product: any) => (
                    <div key={product.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-gray-200">
                        <img
                          src={product.images[0] || '/images/placeholder.jpg'}
                          alt={product.name}
                          className="h-48 w-full object-cover object-center cursor-pointer hover:opacity-75"
                          onClick={() => navigate(`/customer/products/${product.id}`)}
                          onError={(e) => {
                            e.currentTarget.src = '/images/placeholder.jpg';
                          }}
                        />
                      </div>
                      
                      <div className="p-4">
                        <div className="mb-2">
                          <span className="text-xs text-gray-500">
                            {product.categories.map(catId => getCategoryName(catId)).join(', ')}
                          </span>
                        </div>
                        
                        <h3 
                          className="text-sm font-medium text-gray-900 mb-1 cursor-pointer hover:text-blue-600"
                          onClick={() => navigate(`/customer/products/${product.id}`)}
                        >
                          {product.name}
                        </h3>
                        
                        <p className="text-xs text-gray-500 mb-2">
                          {product.brand} {product.model}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-lg font-bold text-gray-900">
                            ₩{formatPrice(product.basePrice)}
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center">
                              <span className="text-yellow-400">★</span>
                              <span className="text-xs text-gray-600 ml-1">
                                {product.rating.toFixed(1)} ({product.reviewCount})
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              재고: {product.stockQuantity}개
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <button
                            onClick={() => navigate(`/customer/products/${product.id}`)}
                            className="w-full bg-gray-100 text-gray-800 px-3 py-2 text-sm rounded hover:bg-gray-200"
                          >
                            상세 보기
                          </button>
                          
                          <button
                            onClick={() => handleAddToCart(product.id)}
                            disabled={product.stockQuantity === 0}
                            className={`w-full px-3 py-2 text-sm rounded ${
                              product.stockQuantity === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {product.stockQuantity === 0 ? '품절' : '장바구니 담기'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 페이지네이션 */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex justify-between flex-1 sm:hidden">
                      <button
                        disabled={pagination.current === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        이전
                      </button>
                      <button
                        disabled={pagination.current === pagination.totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        다음
                      </button>
                    </div>
                    
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          총 <span className="font-medium">{pagination.total}</span>개 상품 중{' '}
                          <span className="font-medium">
                            {(pagination.current - 1) * pagination.pageSize + 1}
                          </span>
                          -{' '}
                          <span className="font-medium">
                            {Math.min(pagination.current * pagination.pageSize, pagination.total)}
                          </span>
                          개 표시
                        </p>
                      </div>
                      
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  page === pagination.current
                                    ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                    <button
                      onClick={clearError}
                      className="mt-2 text-sm text-red-600 hover:text-red-500"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}