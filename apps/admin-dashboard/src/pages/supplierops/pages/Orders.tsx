/**
 * SupplierOps Orders Page
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, Truck, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">주문/Relay 모니터링</h1>
        <p className="text-gray-600">주문 Relay 현황을 확인하고 배송 정보를 업데이트하세요</p>
      </div>

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

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                주문 정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                판매자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                수량
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                금액
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                운송장
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                상세
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  주문이 없습니다
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">{order.productName}</p>
                      <p className="text-xs text-gray-500">#{order.orderId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{order.sellerName}</td>
                  <td className="px-6 py-4 text-sm">{order.quantity}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {order.totalPrice.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.trackingNumber || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
