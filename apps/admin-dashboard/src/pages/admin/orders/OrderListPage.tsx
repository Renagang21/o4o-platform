/**
 * Admin Order List Page
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import { Search, Calendar, Download, Eye, Settings } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  productBrand: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplierId: string;
  supplierName: string;
  sellerId: string;
  sellerName: string;
}

interface Address {
  recipientName: string;
  phone: string;
  email: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  city: string;
  country: string;
}

interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  billingAddress: Address;
  shippingAddress: Address;
  summary: {
    subtotal: number;
    shippingFee: number;
    tax: number;
    discount: number;
    total: number;
  };
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentMethod: 'card' | 'bank_transfer' | 'virtual_account' | 'cash';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  paidAt: string | null;
  customerNotes: string;
  internalNotes: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersResponse {
  success: boolean;
  data: {
    items: Order[];
    total: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const OrderListPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Initialize date range to last 7 days
  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    setDateFrom(lastWeek.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  // Fetch orders
  useEffect(() => {
    fetchOrders();
  }, [page, limit, statusFilter, dateFrom, dateTo]);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('q', searchQuery);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      params.append('sortBy', 'orderDate');
      params.append('sortOrder', 'desc');

      const response = await authClient.api.get<OrdersResponse>(
        `/admin/orders?${params.toString()}`
      );

      if (response.data.success) {
        setOrders(response.data.data.items);
        setTotal(response.data.data.total);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        toast.error('주문 목록을 불러올 수 없습니다');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('주문 목록 조회 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page
    fetchOrders();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-orange-100 text-orange-800'
    };

    const statusLabels: Record<string, string> = {
      pending: '대기',
      confirmed: '확인',
      processing: '처리중',
      shipped: '배송중',
      delivered: '배송완료',
      cancelled: '취소',
      returned: '반품'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      card: '카드',
      bank_transfer: '계좌이체',
      virtual_account: '가상계좌',
      cash: '현금'
    };
    return labels[method] || method;
  };

  // DataTable column definitions
  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      title: '주문번호',
      dataIndex: 'orderNumber',
      sortable: true,
      render: (value: string) => (
        <span className="font-medium text-blue-600">{value}</span>
      ),
    },
    {
      key: 'createdAt',
      title: '주문일시',
      dataIndex: 'createdAt',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'buyer',
      title: '고객명',
      render: (_: unknown, record: Order) => (
        <div>
          <div className="text-sm text-gray-900">{record.buyerName}</div>
          <div className="text-xs text-gray-500">{record.buyerEmail}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: '상태',
      dataIndex: 'status',
      align: 'center',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'paymentMethod',
      title: '결제방법',
      dataIndex: 'paymentMethod',
      render: (value: string) => (
        <span className="text-sm text-gray-900">{getPaymentMethodLabel(value)}</span>
      ),
    },
    {
      key: 'total',
      title: '주문금액',
      align: 'right',
      sortable: true,
      render: (_: unknown, record: Order) => (
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(record.summary.total)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '상세',
      align: 'center',
      render: (_: unknown, record: Order) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/admin/orders/${record.id}`);
          }}
          className="text-blue-600 hover:text-blue-900 p-1"
          title="상세 보기"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  // PageHeader actions
  const headerActions = [
    {
      id: 'screen-options',
      label: 'Screen Options',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => {
        // TODO: Implement screen options
      },
      variant: 'secondary' as const,
    },
    {
      id: 'export',
      label: '내보내기',
      icon: <Download className="w-4 h-4" />,
      onClick: () => {
        // TODO: Implement export
      },
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="주문 관리"
        subtitle="전체 주문을 조회하고 관리합니다"
        actions={headerActions}
      />

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              검색
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="주문번호 또는 고객명 검색"
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주문 상태
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="pending">대기</option>
              <option value="confirmed">확인</option>
              <option value="processing">처리중</option>
              <option value="shipped">배송중</option>
              <option value="delivered">배송완료</option>
              <option value="cancelled">취소</option>
              <option value="returned">반품</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              기간
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <span className="flex items-center text-gray-500">~</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<Order>
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          emptyText="조회된 주문이 없습니다"
          onRowClick={(record) => navigate(`/admin/orders/${record.id}`)}
          pagination={{
            current: page,
            pageSize: limit,
            total: total,
            onChange: (newPage) => setPage(newPage),
          }}
        />
      </div>
    </div>
  );
};

export default OrderListPage;
