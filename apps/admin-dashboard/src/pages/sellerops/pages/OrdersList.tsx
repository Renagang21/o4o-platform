/**
 * SellerOps Orders Page
 *
 * Refactored: PageHeader + DataTable pattern applied
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';

interface Order {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: string;
  relayStatus: string;
  createdAt: Date;
}

const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [orderCounts, setOrderCounts] = useState({
    pending: 5,
    dispatched: 3,
    delivered: 12,
    failed: 1,
  });

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setOrders([
        {
          id: '1',
          productName: '프리미엄 에센스 세럼',
          quantity: 2,
          totalPrice: 78000,
          status: 'pending',
          relayStatus: 'pending',
          createdAt: new Date(),
        },
        {
          id: '2',
          productName: '수분 크림 50ml',
          quantity: 1,
          totalPrice: 28000,
          status: 'dispatched',
          relayStatus: 'dispatched',
          createdAt: new Date(Date.now() - 86400000),
        },
        {
          id: '3',
          productName: '클렌징 폼',
          quantity: 3,
          totalPrice: 57000,
          status: 'delivered',
          relayStatus: 'delivered',
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
            배송중
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            배송완료
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
  const columns: Column<Order>[] = [
    {
      key: 'orderInfo',
      title: '주문 정보',
      render: (_: unknown, record: Order) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {record.productName}
          </div>
          <div className="text-xs text-gray-500">
            #{record.id.slice(0, 8)}
          </div>
        </div>
      ),
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
      title: '주문 상태',
      dataIndex: 'status',
      align: 'center',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'relayStatus',
      title: '배송 상태',
      dataIndex: 'relayStatus',
      align: 'center',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'createdAt',
      title: '주문일',
      dataIndex: 'createdAt',
      align: 'center',
      sortable: true,
      render: (value: Date) => (
        <span className="text-sm text-gray-500">
          {value.toLocaleDateString()}
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
            console.log('View order:', record.id);
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
      id: 'refresh',
      label: '새로고침',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
      },
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="주문/배송 관리"
        subtitle="주문 현황 및 배송 상태 조회"
        actions={headerActions}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {orderCounts.pending}
          </p>
          <p className="text-sm text-gray-600">대기중</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {orderCounts.dispatched}
          </p>
          <p className="text-sm text-gray-600">배송중</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {orderCounts.delivered}
          </p>
          <p className="text-sm text-gray-600">배송완료</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {orderCounts.failed}
          </p>
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
              <option value="dispatched">배송중</option>
              <option value="delivered">배송완료</option>
              <option value="failed">오류</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders DataTable */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <DataTable<Order>
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

export default OrdersList;
