import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Package, 
  ChevronUp, 
  ChevronDown, 
  ChevronsUpDown,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  Phone,
  Grid3X3,
  List
} from 'lucide-react';
import { Order, getStatusText, getStatusColor, shippingCompanies } from '../types/order';
import { StatusBadge } from '../ui/StatusBadge';
import { useOrders, useOrderPagination } from '../context/OrderContext';

interface OrderListTableProps {
  onViewOrder: (order: Order) => void;
  className?: string;
}

export const OrderListTable: React.FC<OrderListTableProps> = ({
  onViewOrder,
  className = ''
}) => {
  const { state, setSorting } = useOrders();
  const { orders, pagination, totalPages, totalItems, setPage, setPageSize } = useOrderPagination();
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Check screen size for responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768; // md breakpoint
      setIsMobile(mobile);
      if (mobile && viewMode === 'table') {
        setViewMode('cards');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [viewMode]);

  const handleSort = (column: string) => {
    const newOrder = state.sortBy === column && state.sortOrder === 'asc' ? 'desc' : 'asc';
    setSorting(column, newOrder);
  };

  const getSortIcon = (column: string) => {
    if (state.sortBy !== column) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return state.sortOrder === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const maskPhone = (phone: string) => {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1-****-$2');
  };

  const getShippingCompanyName = (companyId?: string) => {
    if (!companyId) return '-';
    const company = shippingCompanies.find(c => c.id === companyId);
    return company ? company.name : companyId;
  };

  // Mobile Card Component
  const OrderCard: React.FC<{ order: Order }> = ({ order }) => {
    const statusColor = getStatusColor(order.status);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <button
                onClick={() => onViewOrder(order)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors text-left"
              >
                {order.orderNumber}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                {formatFullDate(order.createdAt)}
              </p>
            </div>
            
            {/* Status Badge */}
            <div className="flex-shrink-0 ml-2">
              <StatusBadge status={getStatusText(order.status)} size="sm" />
            </div>
          </div>

          {/* Product Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {order.productImage ? (
                <img
                  src={order.productImage}
                  alt={order.productName}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              ) : (
                <Package className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 line-clamp-2">
                {order.productName}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                수량: {order.quantity}개 • {formatCurrency(order.unitPrice)}
              </div>
            </div>
          </div>

          {/* Customer & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-1">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="text-xs min-w-0">
                <div className="text-gray-500">고객</div>
                <div className="font-medium text-gray-900 truncate">{order.customerName}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="text-xs">
                <div className="text-gray-500">주문액</div>
                <div className="font-medium text-gray-900">{formatCurrency(order.totalAmount)}</div>
              </div>
            </div>
          </div>

          {/* Seller & Shipping */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="text-xs min-w-0">
                <div className="text-gray-500">판매자</div>
                <div className="font-medium text-gray-900 truncate">{order.sellerName}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div className="text-xs">
                <div className="text-gray-500">배송</div>
                <div className="font-medium text-gray-900">
                  {order.trackingNumber ? getShippingCompanyName(order.shippingCompany) : '준비중'}
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-start gap-1">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs min-w-0">
              <div className="text-gray-500">배송지</div>
              <div className="text-gray-900 line-clamp-2">
                {order.shippingAddress.address} {order.shippingAddress.detailAddress}
              </div>
              <div className="text-gray-500 mt-1">
                {order.recipientName} • {maskPhone(order.recipientPhone)}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={() => onViewOrder(order)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              <Eye className="w-4 h-4" />
              상세 보기
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (state.loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {/* Table header skeleton */}
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
            {/* Table rows skeleton */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {/* View Mode Toggle (Desktop Only) */}
      {!isMobile && (
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            총 {totalItems}개 주문
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'table'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <List className="w-4 h-4" />
              테이블
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                viewMode === 'cards'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              카드
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'table' ? (
        /* Table View */
        <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('orderNumber')}
                style={{ width: '160px' }}
              >
                <div className="flex items-center gap-2">
                  주문번호
                  {getSortIcon('orderNumber')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('createdAt')}
                style={{ width: '140px' }}
              >
                <div className="flex items-center gap-2">
                  주문일시
                  {getSortIcon('createdAt')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('productName')}
                style={{ width: '200px' }}
              >
                <div className="flex items-center gap-2">
                  상품명
                  {getSortIcon('productName')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('quantity')}
                style={{ width: '80px' }}
              >
                <div className="flex items-center justify-center gap-2">
                  수량
                  {getSortIcon('quantity')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('sellerName')}
                style={{ width: '120px' }}
              >
                <div className="flex items-center gap-2">
                  판매자
                  {getSortIcon('sellerName')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: '180px' }}
              >
                고객정보
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('status')}
                style={{ width: '100px' }}
              >
                <div className="flex items-center justify-center gap-2">
                  상태
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: '80px' }}
              >
                관리
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Package className="w-12 h-12 text-gray-400" />
                    <div>
                      <p className="text-gray-500 text-lg font-medium">주문이 없습니다</p>
                      <p className="text-gray-400 text-sm mt-1">새로운 주문이 들어오면 여기에 표시됩니다.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr 
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Order Number */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onViewOrder(order)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {order.orderNumber}
                    </button>
                  </td>

                  {/* Created At */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(order.createdAt)}
                    </div>
                  </td>

                  {/* Product */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        {order.productImage ? (
                          <img
                            src={order.productImage}
                            alt={order.productName}
                            className="w-10 h-10 object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {order.productName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(order.unitPrice)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-medium text-gray-900">
                      {order.quantity}
                    </span>
                  </td>

                  {/* Seller */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{order.sellerName}</div>
                    {order.partnerName && (
                      <div className="text-xs text-gray-500">
                        파트너: {order.partnerName}
                      </div>
                    )}
                  </td>

                  {/* Customer Info */}
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{order.recipientName}</div>
                    <div className="text-xs text-gray-500">{maskPhone(order.recipientPhone)}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {order.shippingAddress.address}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={getStatusText(order.status)} size="sm" />
                    {order.trackingNumber && (
                      <div className="text-xs text-gray-500 mt-1">
                        {getShippingCompanyName(order.shippingCompany)}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => onViewOrder(order)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="상세 보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      ) : (
        /* Card View */
        <div className="p-4">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Package className="w-12 h-12 text-gray-400" />
              <div className="text-center">
                <p className="text-gray-500 text-lg font-medium">주문이 없습니다</p>
                <p className="text-gray-400 text-sm mt-1">새로운 주문이 들어오면 여기에 표시됩니다.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="border-t border-gray-200 bg-gray-50">
          {/* Desktop Pagination */}
          <div className="hidden md:flex items-center justify-between px-6 py-4">
            {/* Results Info */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                총 <span className="font-medium">{totalItems}</span>개 중{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.pageSize + 1}
                </span>
                -{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.pageSize, totalItems)}
                </span>
                개 표시
              </div>

              {/* Page Size Selector */}
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10개씩</option>
                <option value={20}>20개씩</option>
                <option value={50}>50개씩</option>
                <option value={100}>100개씩</option>
              </select>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
            </div>
          </div>

          {/* Mobile Pagination */}
          <div className="md:hidden px-4 py-3 space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>
                {pagination.page} / {totalPages} 페이지
              </span>
              <span>
                총 {totalItems}개
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
              >
                이전
              </button>
              
              <div className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-md bg-white min-w-[80px] text-center">
                {pagination.page} / {totalPages}
              </div>
              
              <button
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page === totalPages}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
              >
                다음
              </button>
            </div>

            <div className="flex justify-center">
              <select
                value={pagination.pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10개씩 보기</option>
                <option value={20}>20개씩 보기</option>
                <option value={50}>50개씩 보기</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};