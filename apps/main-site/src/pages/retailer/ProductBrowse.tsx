import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useProductStore } from '../../stores/productStore';
import { useOrderStore } from '../../stores/orderStore';
import { useAuthStore } from '../../stores/authStore';
import { Product } from '../../types/product';
import { Retailer } from '../../types/user';

export default function ProductBrowse() {
  const navigate = useNavigate();
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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 0 });
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'sales' | 'rating'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchProducts({
      status: 'active',
      approvalStatus: 'approved',
    });
  }, []);

  const getUserGrade = () => {
    if (user?.userType === 'retailer') {
      return (user as Retailer).grade || 'gold';
    }
    return 'gold';
  };

  const getGradePrice = (product: Product) => {
    const grade = getUserGrade();
    return product.pricing[grade as keyof typeof product.pricing];
  };

  const getGradeBadge = () => {
    const grade = getUserGrade();
    const badges = {
      gold: 'bg-yellow-100 text-yellow-800',
      premium: 'bg-purple-100 text-purple-800',
      vip: 'bg-red-100 text-red-800',
    };
    
    const labels = {
      gold: 'GOLD',
      premium: 'PREMIUM',
      vip: 'VIP',
    };

    return (
      <span className={`px-2 py-1 text-xs font-bold rounded ${badges[grade as keyof typeof badges]}`}>
        {labels[grade as keyof typeof labels]} 회원
      </span>
    );
  };

  const handleSearch = () => {
    setFilters({
      search: searchTerm,
      categoryId: selectedCategory,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      sortBy,
      sortOrder,
    });
    fetchProducts();
  };

  const handleAddToCart = async (productId: string, quantity: number = 1) => {
    try {
      await addToCart(productId, quantity);
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

  const getDiscountRate = (basePrice: number, gradePrice: number) => {
    const discount = ((basePrice - gradePrice) / basePrice) * 100;
    return Math.round(discount);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">상품 둘러보기</h1>
              <div className="mt-2 flex items-center space-x-2">
                {getGradeBadge()}
                <span className="text-sm text-gray-600">회원 등급별 특가로 쇼핑하세요!</span>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate('/retailer/cart')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                🛒 장바구니
              </button>
              <button
                onClick={() => navigate('/retailer/orders')}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                주문 내역
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 검색 및 필터 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상품명 검색
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="상품명, 브랜드로 검색"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리
              </label>
              <select
                value={selectedCategory}
                onChange={(e: any) => setSelectedCategory(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">전체 카테고리</option>
                {flatCategories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                가격 범위 (최소)
              </label>
              <input
                type="number"
                value={priceRange.min || ''}
                onChange={(e: any) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="최소 가격"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                정렬 기준
              </label>
              <select
                value={`${sortBy}_${sortOrder}`}
                onChange={(e: any) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('_');
                  setSortBy(newSortBy as 'name' | 'price' | 'sales' | 'rating');
                  setSortOrder(newSortOrder as 'asc' | 'desc');
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

            <div className="flex items-end space-x-2">
              <button
                onClick={handleSearch}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                검색
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setPriceRange({ min: 0, max: 0 });
                  setSortBy('name');
                  setSortOrder('asc');
                  clearFilters();
                  fetchProducts();
                }}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                초기화
              </button>
            </div>
          </div>
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
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-6">
              {products.map((product: any) => {
                const gradePrice = getGradePrice(product);
                const discountRate = getDiscountRate(product.basePrice, gradePrice);
                
                return (
                  <div key={product.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-t-lg bg-gray-200">
                      <img
                        src={product.images[0] || '/images/placeholder.jpg'}
                        alt={product.name}
                        className="h-48 w-full object-cover object-center group-hover:opacity-75"
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
                      
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {product.name}
                      </h3>
                      
                      <p className="text-xs text-gray-500 mb-2">
                        {product.brand} {product.model}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          {discountRate > 0 && (
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-400 line-through">
                                ₩{formatPrice(product.basePrice)}
                              </span>
                              <span className="text-xs font-bold text-red-600">
                                {discountRate}% 할인
                              </span>
                            </div>
                          )}
                          <div className="text-lg font-bold text-gray-900">
                            ₩{formatPrice(gradePrice)}
                          </div>
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
                          onClick={() => navigate(`/retailer/products/${product.id}`)}
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
                );
              })}
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
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page: any) => (
                        <button
                          key={page}
                          onClick={() => {
                            // 페이지 변경 로직 구현 필요
                          }}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pagination.current
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
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
  );
}