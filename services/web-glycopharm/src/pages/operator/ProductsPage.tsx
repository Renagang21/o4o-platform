/**
 * Operator Products Page (Product Management)
 *
 * 세미-프랜차이즈 상품 관리
 * - 상품 목록 및 카테고리 관리
 * - 가격 정책 관리
 * - 재고 현황 모니터링
 */

import { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Copy,
  TrendingUp,
  Boxes,
} from 'lucide-react';

// Types
interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand: string;
  basePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  status: 'active' | 'draft' | 'outOfStock' | 'discontinued';
  salesCount: number;
  createdAt: string;
  imageUrl?: string;
}

type TabType = 'all' | 'active' | 'lowStock' | 'draft';

// Sample data
const sampleProducts: Product[] = [
  {
    id: '1',
    name: '글루코스 모니터링 키트 프로',
    sku: 'GP-MON-001',
    category: '혈당 모니터링',
    brand: 'GlycoPharm',
    basePrice: 89000,
    sellingPrice: 99000,
    stock: 245,
    minStock: 50,
    status: 'active',
    salesCount: 1520,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: '당뇨 관리 종합 세트',
    sku: 'GP-SET-002',
    category: '관리 세트',
    brand: 'GlycoPharm',
    basePrice: 156000,
    sellingPrice: 179000,
    stock: 89,
    minStock: 30,
    status: 'active',
    salesCount: 856,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: '혈당 측정 스트립 100매',
    sku: 'GP-STR-003',
    category: '소모품',
    brand: 'GlycoPharm',
    basePrice: 32000,
    sellingPrice: 39000,
    stock: 12,
    minStock: 100,
    status: 'outOfStock',
    salesCount: 4520,
    createdAt: '2024-01-10',
  },
  {
    id: '4',
    name: '인슐린 냉장 파우치',
    sku: 'GP-ACC-004',
    category: '액세서리',
    brand: 'CoolMed',
    basePrice: 28000,
    sellingPrice: 35000,
    stock: 156,
    minStock: 40,
    status: 'active',
    salesCount: 623,
    createdAt: '2024-03-05',
  },
  {
    id: '5',
    name: '디지털 혈압계 스마트',
    sku: 'GP-BPM-005',
    category: '측정기기',
    brand: 'HealthTech',
    basePrice: 65000,
    sellingPrice: 79000,
    stock: 0,
    minStock: 20,
    status: 'outOfStock',
    salesCount: 312,
    createdAt: '2024-04-12',
  },
  {
    id: '6',
    name: '당뇨 영양 보조제 (신제품)',
    sku: 'GP-SUP-006',
    category: '보조제',
    brand: 'GlycoPharm',
    basePrice: 45000,
    sellingPrice: 55000,
    stock: 200,
    minStock: 50,
    status: 'draft',
    salesCount: 0,
    createdAt: '2025-01-10',
  },
];

// Stats
const productStats = {
  totalProducts: 156,
  activeProducts: 132,
  lowStockProducts: 18,
  draftProducts: 6,
  totalInventoryValue: 245000000,
  avgMargin: 18.5,
};

// Status badge
function StatusBadge({ status }: { status: Product['status'] }) {
  const config = {
    active: { label: '판매중', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    draft: { label: '준비중', color: 'bg-slate-100 text-slate-600', icon: Clock },
    outOfStock: { label: '품절', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    discontinued: { label: '단종', color: 'bg-slate-100 text-slate-500', icon: AlertCircle },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter products
  const filteredProducts = sampleProducts.filter((product) => {
    if (activeTab === 'active' && product.status !== 'active') return false;
    if (activeTab === 'lowStock' && product.stock >= product.minStock) return false;
    if (activeTab === 'draft' && product.status !== 'draft') return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !product.name.toLowerCase().includes(search) &&
        !product.sku.toLowerCase().includes(search) &&
        !product.brand.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;

    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const tabs = [
    { id: 'all' as const, label: '전체 상품', count: sampleProducts.length },
    { id: 'active' as const, label: '판매중', count: sampleProducts.filter(p => p.status === 'active').length },
    { id: 'lowStock' as const, label: '재고 부족', count: sampleProducts.filter(p => p.stock < p.minStock).length },
    { id: 'draft' as const, label: '준비중', count: sampleProducts.filter(p => p.status === 'draft').length },
  ];

  const categories = [...new Set(sampleProducts.map(p => p.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
          <p className="text-slate-500 text-sm">네트워크 상품 카탈로그 및 가격 관리</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
          <Plus className="w-4 h-4" />
          상품 등록
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{productStats.totalProducts}</p>
              <p className="text-xs text-slate-500">전체 상품</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{productStats.activeProducts}</p>
              <p className="text-xs text-slate-500">판매중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{productStats.lowStockProducts}</p>
              <p className="text-xs text-slate-500">재고 부족</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{productStats.draftProducts}</p>
              <p className="text-xs text-slate-500">준비중</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{(productStats.totalInventoryValue / 100000000).toFixed(1)}억</p>
              <p className="text-xs text-slate-500">재고 가치</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{productStats.avgMargin}%</p>
              <p className="text-xs text-slate-500">평균 마진</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="bg-white rounded-xl shadow-sm">
        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="상품명, SKU, 브랜드 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">전체 카테고리</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  상품 정보
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  원가
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  판매가
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  재고
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  판매량
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.sku} | {product.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
                      <Tag className="w-3 h-3" />
                      {product.category}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-slate-600">{product.basePrice.toLocaleString()}원</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-slate-800">{product.sellingPrice.toLocaleString()}원</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`font-medium ${product.stock < product.minStock ? 'text-red-600' : 'text-slate-800'}`}>
                      {product.stock}
                    </span>
                    <span className="text-slate-400 text-xs ml-1">/ {product.minStock}</span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-medium text-slate-800">{product.salesCount.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center">
                      <div className="relative">
                        <button
                          onClick={() => setSelectedProduct(selectedProduct === product.id ? null : product.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                        {selectedProduct === product.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setSelectedProduct(null)}
                            />
                            <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border py-2 z-20">
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Eye className="w-4 h-4" />
                                상세 보기
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Edit className="w-4 h-4" />
                                수정
                              </button>
                              <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Copy className="w-4 h-4" />
                                복제
                              </button>
                              <hr className="my-1" />
                              <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Trash2 className="w-4 h-4" />
                                삭제
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              총 {filteredProducts.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredProducts.length)}개 표시
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-500 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
