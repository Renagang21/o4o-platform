import { useState } from 'react';
import {
  Search,
  Plus,
  Package,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
} from 'lucide-react';

// Mock products
const mockProducts = [
  {
    id: '1',
    name: '프리스타일 리브레2 센서',
    category: 'CGM',
    price: 50000,
    stock: 25,
    status: 'active',
    image: null,
  },
  {
    id: '2',
    name: '덱스콤 G7 스타터킷',
    category: 'CGM',
    price: 120000,
    stock: 15,
    status: 'active',
    image: null,
  },
  {
    id: '3',
    name: '아큐첵 가이드 측정기',
    category: '혈당측정기',
    price: 35000,
    stock: 40,
    status: 'active',
    image: null,
  },
  {
    id: '4',
    name: '아큐첵 가이드 검사지 50매',
    category: '검사지',
    price: 25000,
    stock: 0,
    status: 'out_of_stock',
    image: null,
  },
  {
    id: '5',
    name: '당뇨 영양바 (10개입)',
    category: '건강식품',
    price: 15000,
    stock: 100,
    status: 'active',
    image: null,
  },
];

const categories = ['전체', 'CGM', '혈당측정기', '검사지', '건강식품', '기타'];

export default function PharmacyProducts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredProducts = mockProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
          <p className="text-slate-500 text-sm">총 {mockProducts.length}개의 상품</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
        >
          <Plus className="w-5 h-5" />
          상품 등록
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="상품명으로 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Product Image */}
            <div className="aspect-video bg-slate-100 flex items-center justify-center">
              <Package className="w-12 h-12 text-slate-300" />
            </div>

            {/* Product Info */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-slate-400">{product.category}</span>
                  <h3 className="font-semibold text-slate-800 mt-1">{product.name}</h3>
                </div>
                <button className="p-1 hover:bg-slate-100 rounded-lg">
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-lg font-bold text-primary-600">
                  {product.price.toLocaleString()}원
                </p>
                <div className="flex items-center gap-1">
                  {product.status === 'out_of_stock' ? (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-lg">
                      품절
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
                <button className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
                  <Edit2 className="w-4 h-4" />
                  수정
                </button>
                <button className="p-2 text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">상품이 없습니다</h3>
          <p className="text-slate-500 mb-4">검색 조건에 맞는 상품이 없습니다.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('전체');
            }}
            className="text-primary-600 font-medium hover:text-primary-700"
          >
            필터 초기화
          </button>
        </div>
      )}

      {/* Add Product Modal - Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">상품 등록</h2>
            <p className="text-slate-500 mb-6">상품 등록 기능은 추후 구현됩니다.</p>
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
