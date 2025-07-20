import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Download,
  Eye,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  DollarSign,
  CreditCard,
  Truck
} from 'lucide-react';
import { useOrders, useBulkOrderAction, useUpdateOrderStatus } from '@/hooks/useOrders';
import { OrderFilters, OrderStatus } from '@/types/ecommerce';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const Orders: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  // API Hooks
  const { data: ordersData, isLoading } = useOrders(page, 20, {
    ...filters,
    search: searchTerm
  });
  const bulkOrderAction = useBulkOrderAction();
  const updateOrderStatus = useUpdateOrderStatus();

  const orders = ordersData?.data || [];
  const totalPages = Math.ceil((ordersData?.total || 0) / 20);

  const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: { 
      bg: 'bg-yellow-100', 
      text: 'text-yellow-800',
      icon: <Clock className="w-4 h-4" />
    },
    processing: { 
      bg: 'bg-blue-100', 
      text: 'text-blue-800',
      icon: <RefreshCw className="w-4 h-4" />
    },
    shipped: { 
      bg: 'bg-purple-100', 
      text: 'text-purple-800',
      icon: <Truck className="w-4 h-4" />
    },
    completed: { 
      bg: 'bg-green-100', 
      text: 'text-green-800',
      icon: <CheckCircle className="w-4 h-4" />
    },
    cancelled: { 
      bg: 'bg-gray-100', 
      text: 'text-gray-800',
      icon: <XCircle className="w-4 h-4" />
    },
    refunded: { 
      bg: 'bg-red-100', 
      text: 'text-red-800',
      icon: <DollarSign className="w-4 h-4" />
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedOrders.length === 0) return;

    if (bulkAction === 'delete') {
      if (!window.confirm(`정말로 ${selectedOrders.length}개의 주문을 삭제하시겠습니까?`)) {
        return;
      }
    }

    const action = bulkAction.startsWith('status_') ? 'update_status' : bulkAction as 'delete' | 'export';
    
    await bulkOrderAction.mutateAsync({
      action,
      orderIds: selectedOrders,
      data: bulkAction.startsWith('status_') ? {
        status: bulkAction.replace('status_', '') as OrderStatus
      } : undefined
    });

    setSelectedOrders([]);
    setBulkAction('');
  };

  const handleQuickStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus.mutateAsync({
      orderId,
      status,
      note: `상태가 ${status}로 변경되었습니다.`
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '대기중',
      processing: '처리중',
      shipped: '배송중',
      completed: '완료',
      cancelled: '취소됨',
      refunded: '환불됨'
    };
    return labels[status] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      card: '신용카드',
      bank_transfer: '계좌이체',
      virtual_account: '가상계좌',
      phone: '휴대폰결제',
      kakao_pay: '카카오페이',
      naver_pay: '네이버페이',
      toss: '토스'
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
          <p className="text-gray-600 mt-1">
            총 {ordersData?.total || 0}개의 주문이 있습니다
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              bulkOrderAction.mutate({
                action: 'export',
                orderIds: selectedOrders.length > 0 ? selectedOrders : [],
              });
            }}
            className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="주문번호, 고객명, 이메일로 검색..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </form>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border rounded-lg hover:bg-gray-50 ml-4"
          >
            <Filter className="w-4 h-4 mr-2" />
            필터
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setFilters({})}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              !filters.status ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            전체 ({ordersData?.total || 0})
          </button>
          {['pending', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'].map((status) => {
            const statusInfo = statusColors[status];
            return (
              <button
                key={status}
                onClick={() => setFilters({ ...filters, status: status as OrderStatus })}
                className={`px-4 py-2 rounded-lg whitespace-nowrap flex items-center gap-2 ${
                  filters.status === status ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {statusInfo.icon}
                {getStatusLabel(status)}
              </button>
            );
          })}
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="border-t pt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                주문 상태
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as OrderStatus })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">전체 상태</option>
                <option value="pending">대기중</option>
                <option value="processing">처리중</option>
                <option value="shipped">배송중</option>
                <option value="completed">완료</option>
                <option value="cancelled">취소됨</option>
                <option value="refunded">환불됨</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                검색 기간
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">전체 기간</option>
                <option value="today">오늘</option>
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-blue-800">
            {selectedOrders.length}개의 주문이 선택되었습니다
          </p>
          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="">일괄 작업 선택</option>
              <option value="status_processing">처리중으로 변경</option>
              <option value="status_shipped">배송중으로 변경</option>
              <option value="status_completed">완료로 변경</option>
              <option value="export">선택 항목 내보내기</option>
              <option value="delete">삭제</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction}
              className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              적용
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">주문이 없습니다</h3>
          <p className="text-gray-500">아직 주문이 없습니다.</p>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders(orders.map(o => o.id));
                      } else {
                        setSelectedOrders([]);
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  주문번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  일시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  고객
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  결제
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  총액
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">작업</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => {
                const statusInfo = statusColors[order.status] || statusColors.pending;
                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedOrders.includes(order.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrders([...selectedOrders, order.id]);
                          } else {
                            setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                          }
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={`#/orders/${order.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/orders/${order.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        #{order.orderNumber}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm', { locale: ko })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                        {statusInfo.icon}
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.customerName || '게스트'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {getPaymentMethodLabel(order.paymentMethod || '')}
                        </span>
                      </div>
                      {order.paymentStatus === 'completed' ? (
                        <span className="text-xs text-green-600">결제완료</span>
                      ) : (
                        <span className="text-xs text-red-600">미결제</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="text-gray-400 hover:text-gray-600"
                          title="주문 상세보기"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <select
                          value={order.status}
                          onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="pending">대기중</option>
                          <option value="processing">처리중</option>
                          <option value="shipped">배송중</option>
                          <option value="completed">완료</option>
                          <option value="cancelled">취소</option>
                          <option value="refunded">환불</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <nav className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              이전
            </button>
            
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = page > 3 ? page - 2 + i : i + 1;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 border rounded-lg ${
                    page === pageNum ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              다음
            </button>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Orders;