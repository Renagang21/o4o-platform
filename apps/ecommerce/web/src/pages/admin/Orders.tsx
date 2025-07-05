import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Order {
  id: string;
  user: string;
  total: number;
  status: string;
}

const mockOrders: Order[] = [
  { id: '101', user: 'user1@email.com', total: 50000, status: '처리중' },
  { id: '102', user: 'user2@email.com', total: 120000, status: '배송중' },
  { id: '103', user: 'user3@email.com', total: 80000, status: '완료' },
];

const statusOptions = ['처리중', '배송중', '완료'];

const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // 실제 구현 시 fetch('/admin/orders', { headers: ... })
    setOrders(mockOrders);
  }, []);

  const handleStatusChange = (id: string, status: string) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">주문 관리</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">주문번호</th>
              <th className="px-4 py-2 border-b">회원</th>
              <th className="px-4 py-2 border-b">총 금액</th>
              <th className="px-4 py-2 border-b">상태</th>
              <th className="px-4 py-2 border-b">관리</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-2 border-b">{order.id}</td>
                <td className="px-4 py-2 border-b">{order.user}</td>
                <td className="px-4 py-2 border-b">₩{order.total.toLocaleString()}</td>
                <td className="px-4 py-2 border-b">
                  <select
                    className="border rounded px-2 py-1"
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 border-b">
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    상세
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders; 