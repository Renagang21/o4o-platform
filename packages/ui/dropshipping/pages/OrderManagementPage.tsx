import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  CheckCircle,
  Search, 
  Filter, 
  RotateCcw,
  Download,
  Calendar,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { Order, OrderStatus, getStatusText, getStatusColor } from '../types/order';
import { OrderProvider, useOrders, useOrderFilters } from '../context/OrderContext';
import { OrderListTable } from '../components/OrderListTable';
import { OrderFilterPanel } from '../components/OrderFilterPanel';
import { OrderDetailModal } from '../components/OrderDetailModal';
import { ToastProvider, useSuccessToast, useWarningToast } from '../ui/ToastNotification';

interface OrderManagementPageProps {
  currentRole: string;
  activeMenu: string;
  onMenuChange: (menuId: string) => void;
}

// Main content component (wrapped by providers)
const OrderManagementContent: React.FC<OrderManagementPageProps> = ({
  currentRole,
  activeMenu,
  onMenuChange
}) => {
  const { state, applyFilters, loadOrders, getOrderStats } = useOrders();
  const { filters, hasActiveFilters, clearFilters } = useOrderFilters();
  const showSuccess = useSuccessToast();
  const showWarning = useWarningToast();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalState, setModalState] = useState<{
    type: 'none' | 'detail';
    order?: Order | null;
  }>({ type: 'none' });

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters({ search: searchTerm });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, applyFilters]);

  // Computed statistics
  const stats = useMemo(() => {
    return getOrderStats();
  }, [getOrderStats]);

  // Status card configurations
  const statusCards = [
    {
      title: '신규 주문',
      value: stats.newOrders,
      icon: ShoppingCart,
      color: 'blue' as const,
      status: 'new' as OrderStatus,
      subtitle: '처리 대기 중'
    },
    {
      title: '배송 준비',
      value: stats.processingOrders,
      icon: Package,
      color: 'yellow' as const,
      status: 'processing' as OrderStatus,
      subtitle: '픽업 예정'
    },
    {
      title: '배송 중',
      value: stats.shippingOrders,
      icon: Truck,
      color: 'purple' as const,
      status: 'shipping' as OrderStatus,
      subtitle: '배송 진행 중'
    },
    {
      title: '배송 완료',
      value: stats.deliveredOrders,
      icon: CheckCircle,
      color: 'green' as const,
      status: 'delivered' as OrderStatus,
      subtitle: '정상 완료'
    }
  ];

  // Event handlers
  const handleStatusCardClick = (status: OrderStatus) => {
    applyFilters({ status: [status] });
    showSuccess('필터 적용', `${getStatusText(status)} 주문만 표시합니다.`);
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setModalState({ type: 'detail', order });
  };

  const handleRefresh = async () => {
    await loadOrders();
    showSuccess('새로고침 완료', '주문 목록이 업데이트되었습니다.');
  };

  const handleExport = () => {
    showSuccess('내보내기 완료', '주문 목록이 CSV 파일로 다운로드되었습니다.');
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    clearFilters();
    showSuccess('필터 초기화', '모든 필터가 해제되었습니다.');
  };

  const closeModal = () => {
    setModalState({ type: 'none' });
    setSelectedOrder(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">주문 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            총 {stats.totalOrders}개의 주문을 관리하고 있습니다.
          </p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statusCards.map((card, index) => (
          <button
            key={index}
            onClick={() => handleStatusCardClick(card.status)}
            className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 text-left group"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 bg-${card.color}-100 rounded-lg flex-shrink-0 group-hover:bg-${card.color}-200 transition-colors`}>
                <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${card.color}-600`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm text-gray-600 truncate">{card.title}</div>
                <div className={`text-lg sm:text-xl font-bold text-${card.color}-600`}>
                  {card.value.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 truncate mt-1">{card.subtitle}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Revenue Summary */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center md:text-left">
            <div className="text-sm text-blue-700 font-medium">총 매출</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {formatCurrency(stats.totalRevenue)}
            </div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-sm text-blue-700 font-medium">총 마진</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {formatCurrency(stats.totalMargin)}
            </div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-sm text-blue-700 font-medium">평균 주문액</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">
              {formatCurrency(stats.averageOrderValue)}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="주문번호, 상품명, 고객명으로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:flex md:items-center gap-2">
            <button
              onClick={() => setIsFilterPanelOpen(true)}
              className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-md transition-colors text-sm ${
                hasActiveFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">필터</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">초기화</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">새로고침</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">내보내기</span>
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">활성 필터:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {filters.search && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    검색: "{filters.search}"
                  </span>
                )}
                {filters.status.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                    상태: {filters.status.map(status => getStatusText(status)).join(', ')}
                  </span>
                )}
                {(filters.dateRange.start || filters.dateRange.end) && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                    기간: {filters.dateRange.start || '시작'} ~ {filters.dateRange.end || '끝'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Table */}
      <OrderListTable
        onViewOrder={handleViewOrder}
      />

      {/* Modals */}
      <OrderFilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
      />

      <OrderDetailModal
        isOpen={modalState.type === 'detail'}
        onClose={closeModal}
        order={selectedOrder}
      />
    </div>
  );
};

// Main component with providers
export const OrderManagementPage: React.FC<OrderManagementPageProps> = (props) => {
  return (
    <ToastProvider position="top-right" maxToasts={3}>
      <OrderProvider>
        <OrderManagementContent {...props} />
      </OrderProvider>
    </ToastProvider>
  );
};