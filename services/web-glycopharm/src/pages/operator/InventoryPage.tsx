/**
 * Operator Inventory Page (Inventory & Supply Management)
 *
 * 세미-프랜차이즈 재고 및 공급 관리
 * - 중앙 재고 현황
 * - 공급업체 관리
 * - 발주/입고 관리
 */

import { useState } from 'react';
import {
  Boxes,
  Search,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Package,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  RefreshCw,
} from 'lucide-react';

// Types
interface InventoryItem {
  id: string;
  productName: string;
  sku: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  avgDailySales: number;
  daysOfStock: number;
  lastRestocked: string;
  supplier: string;
  status: 'normal' | 'low' | 'critical' | 'overstock';
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  items: number;
  totalAmount: number;
  status: 'draft' | 'pending' | 'confirmed' | 'shipped' | 'received';
  createdAt: string;
  expectedDate?: string;
}

type TabType = 'inventory' | 'orders' | 'suppliers';

// Sample inventory data
const sampleInventory: InventoryItem[] = [
  {
    id: '1',
    productName: '글루코스 모니터링 키트 프로',
    sku: 'GP-MON-001',
    category: '혈당 모니터링',
    currentStock: 245,
    minStock: 50,
    maxStock: 500,
    avgDailySales: 8,
    daysOfStock: 31,
    lastRestocked: '2025-01-10',
    supplier: '한국의료기기',
    status: 'normal',
  },
  {
    id: '2',
    productName: '혈당 측정 스트립 100매',
    sku: 'GP-STR-003',
    category: '소모품',
    currentStock: 45,
    minStock: 100,
    maxStock: 1000,
    avgDailySales: 25,
    daysOfStock: 2,
    lastRestocked: '2025-01-05',
    supplier: '메디컬서플라이',
    status: 'critical',
  },
  {
    id: '3',
    productName: '당뇨 관리 종합 세트',
    sku: 'GP-SET-002',
    category: '관리 세트',
    currentStock: 89,
    minStock: 30,
    maxStock: 200,
    avgDailySales: 3,
    daysOfStock: 30,
    lastRestocked: '2025-01-08',
    supplier: '한국의료기기',
    status: 'normal',
  },
  {
    id: '4',
    productName: '인슐린 냉장 파우치',
    sku: 'GP-ACC-004',
    category: '액세서리',
    currentStock: 78,
    minStock: 40,
    maxStock: 150,
    avgDailySales: 4,
    daysOfStock: 20,
    lastRestocked: '2025-01-12',
    supplier: 'CoolMed Korea',
    status: 'low',
  },
  {
    id: '5',
    productName: '디지털 혈압계 스마트',
    sku: 'GP-BPM-005',
    category: '측정기기',
    currentStock: 180,
    minStock: 20,
    maxStock: 100,
    avgDailySales: 2,
    daysOfStock: 90,
    lastRestocked: '2025-01-15',
    supplier: 'HealthTech Korea',
    status: 'overstock',
  },
];

// Sample purchase orders
const samplePurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-2025-0045',
    supplier: '메디컬서플라이',
    items: 3,
    totalAmount: 12500000,
    status: 'pending',
    createdAt: '2025-01-16',
    expectedDate: '2025-01-20',
  },
  {
    id: '2',
    poNumber: 'PO-2025-0044',
    supplier: '한국의료기기',
    items: 5,
    totalAmount: 8900000,
    status: 'shipped',
    createdAt: '2025-01-14',
    expectedDate: '2025-01-17',
  },
  {
    id: '3',
    poNumber: 'PO-2025-0043',
    supplier: 'CoolMed Korea',
    items: 2,
    totalAmount: 3200000,
    status: 'received',
    createdAt: '2025-01-10',
  },
];

// Stats
const inventoryStats = {
  totalItems: 156,
  totalValue: 245000000,
  lowStockItems: 12,
  criticalItems: 3,
  pendingOrders: 5,
  incomingShipments: 3,
};

// Status badge for inventory
function InventoryStatusBadge({ status }: { status: InventoryItem['status'] }) {
  const config = {
    normal: { label: '정상', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    low: { label: '부족', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
    critical: { label: '긴급', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    overstock: { label: '과잉', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// Status badge for purchase orders
function POStatusBadge({ status }: { status: PurchaseOrder['status'] }) {
  const config = {
    draft: { label: '작성중', color: 'bg-slate-100 text-slate-600', icon: Clock },
    pending: { label: '대기', color: 'bg-amber-100 text-amber-700', icon: Clock },
    confirmed: { label: '확정', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    shipped: { label: '배송중', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
    received: { label: '입고완료', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  };

  const { label, color, icon: Icon } = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [_selectedItem, _setSelectedItem] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Filter inventory
  const filteredInventory = sampleInventory.filter((item) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !item.productName.toLowerCase().includes(search) &&
        !item.sku.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const paginatedInventory = filteredInventory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">재고/공급 관리</h1>
          <p className="text-slate-500 text-sm">중앙 재고 현황 및 발주 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
            <Plus className="w-4 h-4" />
            발주 생성
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{inventoryStats.totalItems}</p>
              <p className="text-xs text-slate-500">총 품목</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{(inventoryStats.totalValue / 100000000).toFixed(1)}억</p>
              <p className="text-xs text-slate-500">재고 가치</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{inventoryStats.lowStockItems}</p>
              <p className="text-xs text-slate-500">부족 품목</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{inventoryStats.criticalItems}</p>
              <p className="text-xs text-slate-500">긴급 품목</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <ArrowUpFromLine className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{inventoryStats.pendingOrders}</p>
              <p className="text-xs text-slate-500">발주 대기</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{inventoryStats.incomingShipments}</p>
              <p className="text-xs text-slate-500">입고 예정</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="border-b border-slate-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'inventory'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Boxes className="w-4 h-4" />
              재고 현황
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'orders'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              발주/입고
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                {samplePurchaseOrders.filter(o => o.status !== 'received').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'suppliers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              공급업체
            </button>
          </nav>
        </div>

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <>
            {/* Filters */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="상품명, SKU 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="all">전체 상태</option>
                  <option value="normal">정상</option>
                  <option value="low">부족</option>
                  <option value="critical">긴급</option>
                  <option value="overstock">과잉</option>
                </select>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      상품
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      현재고
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      안전재고
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      일평균판매
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      재고일수
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      공급업체
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-slate-800">{item.productName}</p>
                          <p className="text-xs text-slate-500">{item.sku} | {item.category}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-bold ${
                          item.status === 'critical' ? 'text-red-600' :
                          item.status === 'low' ? 'text-amber-600' : 'text-slate-800'
                        }`}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">
                        {item.minStock} ~ {item.maxStock}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-600">
                        {item.avgDailySales}개/일
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`font-medium ${
                          item.daysOfStock < 7 ? 'text-red-600' :
                          item.daysOfStock < 14 ? 'text-amber-600' : 'text-slate-800'
                        }`}>
                          {item.daysOfStock}일
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {item.supplier}
                      </td>
                      <td className="px-4 py-4">
                        <InventoryStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-2 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors text-sm">
                            발주
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Purchase Orders Tab */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    발주번호
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    공급업체
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    품목수
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    금액
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    입고예정
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {samplePurchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-medium text-slate-800">{po.poNumber}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {po.supplier}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-600">
                      {po.items}종
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-slate-800">
                      {(po.totalAmount / 10000).toLocaleString()}만원
                    </td>
                    <td className="px-4 py-4">
                      <POStatusBadge status={po.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {po.expectedDate || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center">
                        <button className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="p-8 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium text-slate-600 mb-2">공급업체 관리</p>
            <p className="text-sm">공급업체 목록 및 계약 정보 관리 기능이 여기에 표시됩니다.</p>
          </div>
        )}

        {/* Pagination (for inventory tab) */}
        {activeTab === 'inventory' && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              총 {filteredInventory.length}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredInventory.length)}개 표시
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
