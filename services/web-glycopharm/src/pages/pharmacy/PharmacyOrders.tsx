import { useState } from 'react';
import {
  Search,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChevronDown,
} from 'lucide-react';

// Mock orders
const mockOrders = [
  {
    id: 'ORD-2024-001',
    customer: '김철수',
    phone: '010-1234-5678',
    items: [
      { name: '프리스타일 리브레2 센서', qty: 2, price: 50000 },
      { name: '당뇨 영양바', qty: 5, price: 15000 },
    ],
    total: 175000,
    status: 'pending',
    createdAt: '2024-01-15 14:30',
    address: '서울시 강남구 테헤란로 123',
  },
  {
    id: 'ORD-2024-002',
    customer: '이영희',
    phone: '010-2345-6789',
    items: [{ name: '덱스콤 G7 스타터킷', qty: 1, price: 120000 }],
    total: 120000,
    status: 'confirmed',
    createdAt: '2024-01-15 12:15',
    address: '서울시 서초구 서초대로 456',
  },
  {
    id: 'ORD-2024-003',
    customer: '박민수',
    phone: '010-3456-7890',
    items: [
      { name: '아큐첵 가이드 측정기', qty: 1, price: 35000 },
      { name: '아큐첵 가이드 검사지', qty: 3, price: 25000 },
    ],
    total: 110000,
    status: 'shipped',
    createdAt: '2024-01-15 10:00',
    address: '서울시 송파구 올림픽로 789',
  },
  {
    id: 'ORD-2024-004',
    customer: '정수진',
    phone: '010-4567-8901',
    items: [{ name: '프리스타일 리브레2 센서', qty: 4, price: 50000 }],
    total: 200000,
    status: 'delivered',
    createdAt: '2024-01-14 16:45',
    address: '서울시 마포구 월드컵북로 321',
  },
  {
    id: 'ORD-2024-005',
    customer: '최동현',
    phone: '010-5678-9012',
    items: [{ name: '당뇨 영양바', qty: 10, price: 15000 }],
    total: 150000,
    status: 'cancelled',
    createdAt: '2024-01-14 09:30',
    address: '서울시 영등포구 여의대로 555',
  },
];

const statusConfig: Record<string, { icon: typeof Clock; label: string; color: string }> = {
  pending: { icon: Clock, label: '주문 대기', color: 'yellow' },
  confirmed: { icon: CheckCircle, label: '주문 확인', color: 'blue' },
  shipped: { icon: Truck, label: '배송 중', color: 'purple' },
  delivered: { icon: Package, label: '배송 완료', color: 'green' },
  cancelled: { icon: XCircle, label: '취소됨', color: 'red' },
};

const statusTabs = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'confirmed', label: '확인' },
  { key: 'shipped', label: '배송중' },
  { key: 'delivered', label: '완료' },
];

export default function PharmacyOrders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const filteredOrders = mockOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">주문 관리</h1>
        <p className="text-slate-500 text-sm">총 {mockOrders.length}건의 주문</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="주문번호 또는 고객명으로 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === tab.key
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => {
          const status = statusConfig[order.status];
          const StatusIcon = status.icon;
          const isExpanded = expandedOrder === order.id;

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Order Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-${status.color}-100 flex items-center justify-center`}>
                    <StatusIcon className={`w-5 h-5 text-${status.color}-600`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{order.id}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${status.color}-100 text-${status.color}-700`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {order.customer} · {order.items.length}개 상품 · {order.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-bold text-slate-800">
                    {order.total.toLocaleString()}원
                  </p>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Order Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t bg-slate-50">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Items */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">주문 상품</h4>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-white rounded-lg"
                          >
                            <span className="text-sm text-slate-700">{item.name}</span>
                            <span className="text-sm text-slate-500">
                              {item.qty}개 × {item.price.toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">배송 정보</h4>
                      <div className="p-3 bg-white rounded-lg space-y-1">
                        <p className="text-sm text-slate-700">{order.customer}</p>
                        <p className="text-sm text-slate-500">{order.phone}</p>
                        <p className="text-sm text-slate-500">{order.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {order.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
                        주문 확인
                      </button>
                      <button className="py-2 px-4 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors">
                        취소
                      </button>
                    </div>
                  )}
                  {order.status === 'confirmed' && (
                    <button className="w-full mt-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors">
                      배송 시작
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button className="w-full mt-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors">
                      배송 완료 처리
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">주문이 없습니다</h3>
          <p className="text-slate-500">검색 조건에 맞는 주문이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
