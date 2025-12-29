/**
 * SupplierOps Orders Page
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Truck, CheckCircle, Clock, AlertCircle, Eye, Settings } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

interface OrderRelay {
  id: string;
  orderId: string;
  sellerName: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: string;
  trackingNumber?: string;
  createdAt: Date;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<OrderRelay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [orderCounts, setOrderCounts] = useState({
    pending: 3,
    dispatched: 8,
    fulfilled: 45,
    failed: 1,
  });

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setOrders([
        {
          id: '1',
          orderId: 'ORD-001',
          sellerName: '뷰티샵 A',
          productName: '프리미엄 에센스 세럼',
          quantity: 2,
          totalPrice: 64000,
          status: 'pending',
          createdAt: new Date(),
        },
        {
          id: '2',
          orderId: 'ORD-002',
          sellerName: '스킨케어몰',
          productName: '수분 크림',
          quantity: 3,
          totalPrice: 75000,
          status: 'dispatched',
          trackingNumber: '1234567890',
          createdAt: new Date(Date.now() - 86400000),
        },
        {
          id: '3',
          orderId: 'ORD-003',
          sellerName: '뷰티샵 A',
          productName: '클렌징 폼',
          quantity: 5,
          totalPrice: 60000,
          status: 'fulfilled',
          trackingNumber: '0987654321',
          createdAt: new Date(Date.now() - 172800000),
        },
      ]);
      setLoading(false);
    }, 500);
  }, [filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            대기중
          </span>
        );
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            <Truck className="w-3 h-3" />
            발송됨
          </span>
        );
      case 'fulfilled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            완료됨
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3" />
            오류
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const filteredOrders = orders.filter((o) =>
    o.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // DataTable column definitions
  const columns: Column<OrderRelay>[] = [
    {
      key: 'orderInfo',
      title: '주문 정보',
      render: (_: unknown, record: OrderRelay) => (
        <div>
          <p className="font-medium">{record.productName}</p>
          <p className="text-xs text-gray-500">#{record.orderId}</p>
        </div>
      ),
    },
    {
      key: 'sellerName',
      title: '판매자',
      dataIndex: 'sellerName',
    },
    {
      key: 'quantity',
      title: '수량',
      dataIndex: 'quantity',
      align: 'center',
      sortable: true,
    },
    {
      key: 'totalPrice',
      title: '금액',
      dataIndex: 'totalPrice',
      align: 'right',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{value.toLocaleString()}원</span>
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
      key: 'trackingNumber',
      title: '운송장',
      dataIndex: 'trackingNumber',
      render: (value: string | undefined) => (
        <span className="text-sm text-gray-600">{value || '-'}</span>
      ),
    },
    {
      key: 'actions',
      title: '상세',
      align: 'center',
      render: () => (
        <button className="text-blue-600 hover:text-blue-800">
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
        console.log('Screen options clicked');
      },
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="주문/Relay 모니터링"
        subtitle="주문 Relay 현황을 확인하고 배송 정보를 업데이트하세요"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{orderCounts.pending}</p>
          <p className="text-sm text-gray-600">대기중</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{orderCounts.dispatched}</p>
          <p className="text-sm text-gray-600">발송됨</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{orderCounts.fulfilled}</p>
          <p className="text-sm text-gray-600">완료됨</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{orderCounts.failed}</p>
          <p className="text-sm text-gray-600">오류</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="상품명 검색..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              className="px-4 py-2 border rounded-lg"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">전체</option>
              <option value="pending">대기중</option>
              <option value="dispatched">발송됨</option>
              <option value="fulfilled">완료됨</option>
              <option value="failed">오류</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<OrderRelay>
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          loading={loading}
          emptyText="주문이 없습니다"
        />
      </div>
    </div>
  );
};

export default Orders;
