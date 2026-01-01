import { useState } from 'react';
import { NavLink, useParams, useSearchParams } from 'react-router-dom';
import { Search, Filter, Package, Star, ShoppingCart } from 'lucide-react';

// Mock products
const allProducts = [
  { id: '1', name: '프리스타일 리브레2 센서', category: '연속혈당측정기', price: 50000, discountPrice: 45000, rating: 4.8, reviews: 128, stock: 25 },
  { id: '2', name: '덱스콤 G7 스타터킷', category: '연속혈당측정기', price: 120000, rating: 4.9, reviews: 86, stock: 15 },
  { id: '3', name: '아큐첵 가이드 측정기', category: '혈당측정기', price: 35000, rating: 4.7, reviews: 204, stock: 40 },
  { id: '4', name: '아큐첵 가이드 검사지 50매', category: '검사지', price: 25000, rating: 4.6, reviews: 312, stock: 100 },
  { id: '5', name: '당뇨 영양바 (10개입)', category: '당뇨식품', price: 15000, rating: 4.5, reviews: 89, stock: 200 },
  { id: '6', name: '당케어 혈당 보조제', category: '건강기능식품', price: 35000, discountPrice: 29000, rating: 4.4, reviews: 156, stock: 80 },
  { id: '7', name: '란셋 (100개입)', category: '검사지', price: 12000, rating: 4.3, reviews: 78, stock: 150 },
  { id: '8', name: '인슐린 보관 파우치', category: '기타', price: 18000, rating: 4.6, reviews: 45, stock: 30 },
];

const categories = ['전체', '연속혈당측정기', '혈당측정기', '검사지', '건강기능식품', '당뇨식품', '기타'];
const sortOptions = [
  { value: 'popular', label: '인기순' },
  { value: 'newest', label: '최신순' },
  { value: 'price_low', label: '가격 낮은순' },
  { value: 'price_high', label: '가격 높은순' },
  { value: 'rating', label: '평점순' },
];

export default function StoreProducts() {
  const { pharmacyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const categoryParam = searchParams.get('category') || '전체';

  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryParam === '전체' || product.category === categoryParam;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price_low':
        return (a.discountPrice || a.price) - (b.discountPrice || b.price);
      case 'price_high':
        return (b.discountPrice || b.price) - (a.discountPrice || a.price);
      case 'rating':
        return b.rating - a.rating;
      case 'newest':
        return parseInt(b.id) - parseInt(a.id);
      default:
        return b.reviews - a.reviews;
    }
  });

  const handleCategoryChange = (category: string) => {
    if (category === '전체') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">전체 상품</h1>
        <p className="text-slate-500 text-sm">{sortedProducts.length}개의 상품</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="상품 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Category & Sort */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  categoryParam === category
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedProducts.map((product) => (
          <NavLink
            key={product.id}
            to={`/store/${pharmacyId}/products/${product.id}`}
            className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group"
          >
            <div className="relative aspect-square bg-slate-100 flex items-center justify-center">
              <Package className="w-12 h-12 text-slate-300" />
              {product.discountPrice && (
                <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg">
                  {Math.round((1 - product.discountPrice / product.price) * 100)}% OFF
                </span>
              )}
              {product.stock <= 10 && product.stock > 0 && (
                <span className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-lg">
                  품절 임박
                </span>
              )}
              {product.stock === 0 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold">품절</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <span className="text-xs text-slate-400">{product.category}</span>
              <h3 className="font-medium text-slate-800 text-sm line-clamp-2 mt-1 group-hover:text-primary-600 transition-colors">
                {product.name}
              </h3>
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-slate-600">{product.rating}</span>
                <span className="text-xs text-slate-400">({product.reviews})</span>
              </div>
              <div className="mt-2">
                {product.discountPrice ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {product.discountPrice.toLocaleString()}원
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      {product.price.toLocaleString()}원
                    </span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-primary-600">
                    {product.price.toLocaleString()}원
                  </span>
                )}
              </div>
            </div>
          </NavLink>
        ))}
      </div>

      {/* Empty State */}
      {sortedProducts.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">상품이 없습니다</h3>
          <p className="text-slate-500">검색 조건에 맞는 상품이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
