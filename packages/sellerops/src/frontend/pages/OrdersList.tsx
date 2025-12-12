/**
 * SellerOps Orders Page
 *
 * 주문 목록 및 배송 상태 조회
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Truck,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
} from 'lucide-react';
import type { OrderListItemDto } from '../../dto/index.js';

type ProductTypeFilter = 'all' | 'general' | 'cosmetics' | 'food' | 'health' | 'electronics';

interface OrdersListProps {
  sellerId: string;
  apiBaseUrl?: string;
  onViewDetail?: (orderId: string) => void;
}

export const OrdersList: React.FC<OrdersListProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/sellerops',
  onViewDetail,
}) => {
  const [orders, setOrders] = useState<OrderListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>('all');
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchOrders();
    fetchOrderCounts();
  }, [sellerId, filterStatus, productTypeFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `${apiBaseUrl}/orders?sellerId=${sellerId}`;
      if (filterStatus !== 'all') {
        url += `&status=${filterStatus}`;
      }
      if (productTypeFilter !== 'all') {
        url += `&productType=${productTypeFilter}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderCounts = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/orders/counts?sellerId=${sellerId}`
      );
      if (response.ok) {
        const data = await response.json();
        setOrderCounts(data);
      }
    } catch (err) {
      console.error('Error fetching order counts:', err);
    }
  };

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">주문/배송 관리</h1>
        <p className="text-gray-600">주문 현황 및 배송 상태 조회</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {orderCounts['pending'] || 0}
          </p>
          <p className="text-sm text-gray-600">대기중</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {orderCounts['dispatched'] || 0}
          </p>
          <p className="text-sm text-gray-600">배송중</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {orderCounts['delivered'] || 0}
          </p>
          <p className="text-sm text-gray-600">배송완료</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {orderCounts['failed'] || 0}
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
              <option value="all">전체 상태</option>
              <option value="pending">대기중</option>
              <option value="dispatched">배송중</option>
              <option value="delivered">배송완료</option>
              <option value="failed">오류</option>
            </select>
            <select
              className="px-4 py-2 border rounded-lg"
              value={productTypeFilter}
              onChange={(e) => setProductTypeFilter(e.target.value as ProductTypeFilter)}
            >
              <option value="all">전체 상품유형</option>
              <option value="general">일반</option>
              <option value="cosmetics">화장품</option>
              <option value="food">식품</option>
              <option value="health">건강식품</option>
              <option value="electronics">전자제품</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주문 정보
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                수량
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                금액
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주문 상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                배송 상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                주문일
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상세
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
                    <div className="text-sm font-medium text-gray-900">
                      {order.productName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {order.totalPrice.toLocaleString()}원
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(order.relayStatus)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {onViewDetail && (
                      <button
                        onClick={() => onViewDetail(order.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
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

export default OrdersList;
