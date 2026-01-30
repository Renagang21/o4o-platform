/**
 * Operator Products Page (Product Management)
 *
 * 세미-프랜차이즈 상품 관리
 * - 상품 목록 및 카테고리 관리
 * - 가격 정책 관리
 * - 재고 현황 모니터링
 *
 * WO-GLYCOPHARM-PRODUCTS-API: Real database queries (no mock data)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Boxes,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { glycopharmApi, type OperatorProduct, type OperatorProductStats, type ProductStatus } from '@/api/glycopharm';
import { WordPressTable, type WordPressTableColumn, type WordPressTableRow } from '@/components/common/WordPressTable';
import { type RowAction } from '@/components/common/RowActions';

type TabType = 'all' | 'active' | 'lowStock' | 'draft';

// Empty stats (no mock values)
const EMPTY_STATS: OperatorProductStats = {
  totalProducts: 0,
  activeProducts: 0,
  lowStockProducts: 0,
  draftProducts: 0,
  totalInventoryValue: 0,
  avgMargin: 0,
};

// Status badge
function StatusBadge({ status }: { status: ProductStatus }) {
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
  const [products, setProducts] = useState<OperatorProduct[]>([]);
  const [stats, setStats] = useState<OperatorProductStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const itemsPerPage = 10;

  // Format price
  const formatPrice = (price: number) => `${price.toLocaleString()}원`;

  // Map tab to status filter
  const getStatusFilter = (tab: TabType): ProductStatus | undefined => {
    switch (tab) {
      case 'active':
        return 'active';
      case 'draft':
        return 'draft';
      default:
        return undefined;
    }
  };

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await glycopharmApi.getOperatorProducts({
        status: getStatusFilter(activeTab),
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
      });

      if (response.success && response.data) {
        setProducts(response.data.products);
        setStats(response.data.stats);
        setTotalPages(response.data.pagination.totalPages);
        setTotalProducts(response.data.pagination.total);
      } else {
        setProducts([]);
        setStats(EMPTY_STATS);
      }
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err?.message || '상품 데이터를 불러올 수 없습니다');
      setProducts([]);
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, categoryFilter, searchTerm]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Tab counts (based on stats)
  const tabs = [
    { id: 'all' as const, label: '전체 상품', count: stats.totalProducts },
    { id: 'active' as const, label: '판매중', count: stats.activeProducts },
    { id: 'lowStock' as const, label: '재고 부족', count: stats.lowStockProducts },
    { id: 'draft' as const, label: '준비중', count: stats.draftProducts },
  ];

  // Loading state
  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-slate-500 text-sm">상품 데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  // WordPress Table Columns
  const columns: WordPressTableColumn[] = [
    { id: 'image', label: '이미지', width: '80px' },
    { id: 'name', label: '상품명', sortable: true },
    { id: 'category', label: '카테고리', width: '120px' },
    { id: 'basePrice', label: '원가', width: '120px', align: 'right' },
    { id: 'sellingPrice', label: '판매가', width: '120px', align: 'right', sortable: true },
    { id: 'stock', label: '재고', width: '100px', align: 'right', sortable: true },
    { id: 'status', label: '상태', width: '120px', align: 'center' },
    { id: 'salesCount', label: '판매량', width: '100px', align: 'right', sortable: true },
  ];

  // Transform products to table rows
  const tableRows: WordPressTableRow[] = products.map((product) => {
    const actions: RowAction[] = [
      {
        label: '상세 보기',
        onClick: () => console.log('View:', product.id),
      },
      {
        label: '수정',
        onClick: () => console.log('Edit:', product.id),
      },
      {
        label: '복제',
        onClick: () => console.log('Copy:', product.id),
      },
      {
        label: '삭제',
        onClick: () => console.log('Delete:', product.id),
        className: 'text-red-600 hover:bg-red-50',
      },
    ];

    return {
      id: product.id,
      data: {
        image: (
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-slate-400" />
          </div>
        ),
        name: (
          <div>
            <p className="font-medium text-slate-800">{product.name}</p>
            <p className="text-xs text-slate-500">{product.sku} | {product.brand}</p>
          </div>
        ),
        category: (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-xs text-slate-600">
            <Tag className="w-3 h-3" />
            {product.category}
          </span>
        ),
        basePrice: <span className="text-slate-600">{formatPrice(product.basePrice)}</span>,
        sellingPrice: <span className="font-medium text-slate-800">{formatPrice(product.sellingPrice)}</span>,
        stock: (
          <div className="text-right">
            <span className={`font-medium ${product.stock < product.minStock ? 'text-red-600' : 'text-slate-800'}`}>
              {product.stock}
            </span>
            <span className="text-slate-400 text-xs ml-1">/ {product.minStock}</span>
          </div>
        ),
        status: <StatusBadge status={product.status} />,
        salesCount: <span className="font-medium text-slate-800">{product.salesCount.toLocaleString()}</span>,
      },
      actions,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
          <p className="text-slate-500 text-sm">네트워크 상품 카탈로그 및 가격 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
            <Plus className="w-4 h-4" />
            상품 등록
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">{error}</p>
            <p className="text-xs text-amber-600">빈 데이터로 표시됩니다.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats.totalProducts}</p>
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
              <p className="text-2xl font-bold text-slate-800">{stats.activeProducts}</p>
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
              <p className="text-2xl font-bold text-slate-800">{stats.lowStockProducts}</p>
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
              <p className="text-2xl font-bold text-slate-800">{stats.draftProducts}</p>
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
              <p className="text-2xl font-bold text-slate-800">
                {stats.totalInventoryValue > 0 ? `${(stats.totalInventoryValue / 100000000).toFixed(1)}억` : '0'}
              </p>
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
              <p className="text-2xl font-bold text-slate-800">{stats.avgMargin}%</p>
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="all">전체 카테고리</option>
            </select>
          </div>
        </div>

        {/* WordPress Table */}
        <WordPressTable
          columns={columns}
          rows={tableRows}
          loading={isLoading}
          emptyMessage="자료가 없습니다"
        />

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              총 {totalProducts}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalProducts)}개 표시
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
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
