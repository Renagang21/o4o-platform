import { useState } from 'react';
import { 
  Search, 
  Filter,
  Download,
  Eye,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Package
} from 'lucide-react';
import { Card, CardContent, Button, Input } from '@o4o/ui';
import { formatCurrency, formatDate } from '@o4o/utils';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'failed';
  paymentMethod: string;
  shippingAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-001',
    customer: {
      name: '김철수',
      email: 'kim@example.com',
      phone: '010-1234-5678'
    },
    items: [
      { name: '무선 블루투스 이어폰 Pro', quantity: 1, price: 89000 },
      { name: '충전 케이스', quantity: 1, price: 15000 }
    ],
    totalAmount: 104000,
    status: 'processing',
    paymentStatus: 'paid',
    paymentMethod: '신용카드',
    shippingAddress: '서울시 강남구 테헤란로 123, 아파트 101동 202호',
    createdAt: new Date('2024-01-20T10:30:00'),
    updatedAt: new Date('2024-01-20T11:00:00')
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-002',
    customer: {
      name: '이영희',
      email: 'lee@example.com',
      phone: '010-2345-6789'
    },
    items: [
      { name: '스마트워치 Series 5', quantity: 1, price: 299000 }
    ],
    totalAmount: 299000,
    status: 'shipped',
    paymentStatus: 'paid',
    paymentMethod: '계좌이체',
    shippingAddress: '부산시 해운대구 마린시티 456',
    createdAt: new Date('2024-01-19T14:20:00'),
    updatedAt: new Date('2024-01-20T09:15:00')
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-003',
    customer: {
      name: '박민수',
      email: 'park@example.com',
      phone: '010-3456-7890'
    },
    items: [
      { name: '휴대용 블루투스 스피커', quantity: 2, price: 149000 }
    ],
    totalAmount: 298000,
    status: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: '카카오페이',
    shippingAddress: '대구시 중구 동성로 789',
    createdAt: new Date('2024-01-18T16:45:00'),
    updatedAt: new Date('2024-01-20T10:30:00')
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-004',
    customer: {
      name: '정수진',
      email: 'jung@example.com',
      phone: '010-4567-8901'
    },
    items: [
      { name: '태블릿 보호 케이스', quantity: 1, price: 39000 },
      { name: '강화유리 필름', quantity: 2, price: 12000 }
    ],
    totalAmount: 63000,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: '무통장입금',
    shippingAddress: '인천시 연수구 송도동 123-45',
    createdAt: new Date('2024-01-20T13:00:00'),
    updatedAt: new Date('2024-01-20T13:00:00')
  }
];

const statusConfig = {
  pending: { label: '주문확인중', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  processing: { label: '처리중', icon: Package, color: 'bg-blue-100 text-blue-800' },
  shipped: { label: '배송중', icon: Truck, color: 'bg-purple-100 text-purple-800' },
  delivered: { label: '배송완료', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: '취소됨', icon: XCircle, color: 'bg-red-100 text-red-800' }
};

const paymentStatusConfig = {
  paid: { label: '결제완료', color: 'bg-green-100 text-green-800' },
  pending: { label: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
  failed: { label: '결제실패', color: 'bg-red-100 text-red-800' }
};

export default function VendorOrders() {
  const navigate = useNavigate();
  const [orders] = useState(mockOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o: any) => o.status === 'pending').length,
    processing: orders.filter((o: any) => o.status === 'processing').length,
    shipped: orders.filter((o: any) => o.status === 'shipped').length,
    delivered: orders.filter((o: any) => o.status === 'delivered').length
  };

  const handleViewOrder = (id: string) => {
    navigate(`/vendor/orders/${id}`);
  };

  const handleUpdateStatus = (_orderId: string, _newStatus: Order['status']) => {
    // API 호출하여 상태 업데이트
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
          <p className="text-gray-600 mt-1">주문 현황을 확인하고 배송 상태를 관리하세요</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          주문 내역 다운로드
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">전체 주문</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">주문확인중</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">처리중</p>
                <p className="text-2xl font-bold">{stats.processing}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">배송중</p>
                <p className="text-2xl font-bold">{stats.shipped}</p>
              </div>
              <Truck className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">배송완료</p>
                <p className="text-2xl font-bold">{stats.delivered}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="주문번호, 고객명, 이메일로 검색..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedStatus}
                onChange={(e: any) => setSelectedStatus(e.target.value)}
              >
                <option value="all">전체 상태</option>
                <option value="pending">주문확인중</option>
                <option value="processing">처리중</option>
                <option value="shipped">배송중</option>
                <option value="delivered">배송완료</option>
                <option value="cancelled">취소됨</option>
              </select>
              <select
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={dateRange}
                onChange={(e: any) => setDateRange(e.target.value)}
              >
                <option value="all">전체 기간</option>
                <option value="today">오늘</option>
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
              </select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                필터
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 주문 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    고객
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상품
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    결제
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order: any) => {
                  const status = statusConfig[order.status as keyof typeof statusConfig];
                  const paymentStatus = paymentStatusConfig[order.paymentStatus as keyof typeof paymentStatusConfig];
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(order.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customer.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {order.items[0].name}
                          </div>
                          {order.items.length > 1 && (
                            <div className="text-gray-500">
                              외 {order.items.length - 1}개
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.totalAmount)}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${paymentStatus.color}`}>
                            {paymentStatus.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <status.icon className="h-4 w-4 mr-2" />
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewOrder(order.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {order.status === 'processing' && (
                            <Button
                              size="sm"
                              onClick={() => handleUpdateStatus(order.id, 'shipped')}
                            >
                              배송시작
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}