/**
 * SupplyPage - B2B 공급 페이지
 * Route: /b2b/supply
 *
 * 검증된 공급자의 상품을 조달하고 관리합니다:
 * - 공급자 목록 조회
 * - 상품 카탈로그 탐색
 * - 발주 및 주문 관리
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Package,
  Search,
  Star,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  Building2
} from '@/components/icons';
import { useAuth } from '../../contexts';
import { AiSummaryButton } from '../../components/ai';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface Supplier {
  id: string;
  name: string;
  category: string;
  rating: number;
  productCount: number;
  verified: boolean;
  leadTime: string;
  minOrder: string;
}

interface SupplyProduct {
  id: string;
  name: string;
  brand: string;
  supplier: string;
  wholesalePrice: number;
  retailPrice: number;
  moq: number;
  inStock: boolean;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);
}

export default function SupplyPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'products'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<SupplyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'suppliers') {
          const response = await fetch(`${API_BASE_URL}/api/v1/cosmetics/suppliers`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            setSuppliers(data.data || []);
          } else {
            setSuppliers([]);
          }
        } else {
          const response = await fetch(`${API_BASE_URL}/api/v1/cosmetics/supply/products`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            setProducts(data.data || []);
          } else {
            setProducts([]);
          }
        }
      } catch {
        setSuppliers([]);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center">
          <Truck className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">로그인이 필요합니다</h2>
          <p className="text-slate-500 mb-6">
            B2B 공급 기능을 이용하려면 로그인해 주세요.
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
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">B2B 공급</h1>
              <p className="text-slate-500 mt-1">
                검증된 공급자의 상품을 조달합니다
              </p>
            </div>
            <AiSummaryButton contextLabel="B2B 공급 현황" />
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-4 border-b border-slate-200 -mb-px">
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'suppliers'
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              공급자 목록
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              상품 카탈로그
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'suppliers' ? '공급자 검색...' : '상품명 또는 브랜드 검색...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
          </div>
        ) : activeTab === 'suppliers' ? (
          /* Suppliers List */
          filteredSuppliers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">자료가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-slate-500" />
                    </div>
                    {supplier.verified && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        인증됨
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{supplier.name}</h3>
                  <p className="text-sm text-slate-500 mb-3">{supplier.category}</p>

                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      {supplier.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="w-4 h-4 text-slate-400" />
                      {supplier.productCount}개
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      리드타임: {supplier.leadTime}
                    </span>
                    <span>최소주문: {supplier.minOrder}</span>
                  </div>

                  <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                    상품 보기
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Products Catalog */
          filteredProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">자료가 없습니다</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      상품
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      공급자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      도매가
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      소비자가
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      MOQ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      재고
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
                        <div>
                          <p className="font-medium text-slate-800">{product.name}</p>
                          <p className="text-sm text-slate-500">{product.brand}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{product.supplier}</td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{formatPrice(product.wholesalePrice)}</td>
                      <td className="px-6 py-4 text-slate-500">{formatPrice(product.retailPrice)}</td>
                      <td className="px-6 py-4 text-slate-600">{product.moq}개</td>
                      <td className="px-6 py-4">
                        {product.inStock ? (
                          <span className="text-green-600 font-medium">재고있음</span>
                        ) : (
                          <span className="text-red-500">품절</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          disabled={!product.inStock}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            product.inStock
                              ? 'bg-pink-600 text-white hover:bg-pink-700'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          발주하기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-semibold text-blue-800 mb-2">B2B 공급 안내</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 인증된 공급자의 상품만 플랫폼에서 거래됩니다.</li>
            <li>• 발주 후 리드타임에 따라 상품이 배송됩니다.</li>
            <li>• 대량 발주 시 별도 할인이 적용될 수 있습니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
