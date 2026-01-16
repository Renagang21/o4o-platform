/**
 * ProductsPage - 상품 관리 페이지
 * Route: /platform/stores/products
 *
 * 매장의 상품을 등록, 수정, 삭제합니다.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../contexts';
import { AiSummaryButton } from '../../components/ai';

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  status: 'active' | 'pending' | 'inactive';
  imageUrl?: string;
  category: string;
}

// Mock data - will be replaced with API call
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Advanced Snail 96 Mucin Power Essence',
    brand: 'COSRX',
    price: 25000,
    stock: 50,
    status: 'active',
    category: '스킨케어',
  },
  {
    id: '2',
    name: 'Green Tea Seed Serum',
    brand: 'Innisfree',
    price: 32000,
    stock: 30,
    status: 'active',
    category: '스킨케어',
  },
  {
    id: '3',
    name: 'Water Sleeping Mask',
    brand: 'Laneige',
    price: 38000,
    stock: 25,
    status: 'active',
    category: '마스크',
  },
  {
    id: '4',
    name: 'First Care Activating Serum',
    brand: 'Sulwhasoo',
    price: 120000,
    stock: 10,
    status: 'pending',
    category: '스킨케어',
  },
  {
    id: '5',
    name: 'Play Color Eyes',
    brand: 'Etude',
    price: 28000,
    stock: 0,
    status: 'inactive',
    category: '메이크업',
  },
];

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
}

function getStatusBadge(status: Product['status']) {
  switch (status) {
    case 'active':
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">노출 중</span>;
    case 'pending':
      return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">검수 중</span>;
    case 'inactive':
      return <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-500 rounded-full">비활성</span>;
  }
}

export default function ProductsPage() {
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Product['status']>('all');

  useEffect(() => {
    // Simulate API call
    const fetchProducts = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setProducts(mockProducts);
      setIsLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-slate-500 mb-6">
            상품 관리 기능을 이용하려면 로그인해 주세요.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link to="/platform/stores" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <nav className="text-sm text-slate-500">
              <Link to="/platform/stores" className="hover:text-pink-600">대시보드</Link>
              <span className="mx-2">/</span>
              <span className="text-slate-800">상품 관리</span>
            </nav>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
              <p className="text-slate-500 mt-1">
                매장에 노출할 상품을 등록하고 관리합니다
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AiSummaryButton contextLabel="상품 현황" />
              <Link
                to="/platform/stores/products/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                상품 등록
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="상품명 또는 브랜드 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="all">전체 상태</option>
                <option value="active">노출 중</option>
                <option value="pending">검수 중</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Package className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-slate-500">등록된 상품이 없습니다</p>
              <Link
                to="/platform/stores/products/new"
                className="mt-4 text-pink-600 font-medium hover:underline"
              >
                첫 상품 등록하기
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      상품
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      카테고리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      가격
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      재고
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{product.name}</p>
                            <p className="text-sm text-slate-500">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{product.category}</td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{formatPrice(product.price)}</td>
                      <td className="px-6 py-4">
                        <span className={product.stock === 0 ? 'text-red-600 font-medium' : 'text-slate-600'}>
                          {product.stock}개
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(product.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1 text-slate-400 hover:text-slate-600" title="수정">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-slate-400 hover:text-slate-600" title="삭제">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <p>총 {filteredProducts.length}개 상품</p>
          <p>
            노출 중: {products.filter(p => p.status === 'active').length} |
            검수 중: {products.filter(p => p.status === 'pending').length} |
            비활성: {products.filter(p => p.status === 'inactive').length}
          </p>
        </div>
      </div>
    </div>
  );
}
