import { FC } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const RecentOrders: FC = () => {
  const orders = [
    {
      id: 'ORD-2024-001',
      status: '결제완료',
      amount: 150000,
      date: '2024-03-15'
    },
    {
      id: 'ORD-2024-002',
      status: '배송중',
      amount: 89000,
      date: '2024-03-14'
    },
    {
      id: 'ORD-2024-003',
      status: '주문접수',
      amount: 234000,
      date: '2024-03-14'
    },
    {
      id: 'ORD-2024-004',
      status: '배송완료',
      amount: 45000,
      date: '2024-03-13'
    },
    {
      id: 'ORD-2024-005',
      status: '결제완료',
      amount: 178000,
      date: '2024-03-13'
    }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      '결제완료': 'bg-blue-100 text-blue-800',
      '배송중': 'bg-yellow-100 text-yellow-800',
      '주문접수': 'bg-gray-100 text-gray-800',
      '배송완료': 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            최근 주문
          </h2>
          <Link
            to="/dashboard/orders"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
          >
            전체보기
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {orders.map((order) => (
          <div key={order.id} className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">
                {order.id}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {order.date}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {order.amount.toLocaleString()}원
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentOrders; 