import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
}

interface OrderDetail {
  id: string;
  user: string;
  status: string;
  total: number;
  items: OrderItem[];
}

const mockOrder: OrderDetail = {
  id: '101',
  user: 'user1@email.com',
  status: '처리중',
  total: 50000,
  items: [
    { id: 'a', title: '상품 A', quantity: 2, price: 20000 },
    { id: 'b', title: '상품 B', quantity: 1, price: 10000 },
  ],
};

const AdminOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    // 실제 구현 시 fetch(`/admin/orders/${id}`, { headers: ... })
    setOrder(mockOrder);
  }, [id]);

  if (!order) return null;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button className="mb-4 text-blue-600 underline" onClick={() => navigate('/admin/orders')}>
        ← 주문 목록으로
      </button>
      <h1 className="text-2xl font-bold mb-6">주문 상세</h1>
      <div className="mb-4">
        <div><span className="font-semibold">주문번호:</span> {order.id}</div>
        <div><span className="font-semibold">회원:</span> {order.user}</div>
        <div><span className="font-semibold">상태:</span> {order.status}</div>
        <div><span className="font-semibold">총 금액:</span> ₩{order.total.toLocaleString()}</div>
      </div>
      <div>
        <div className="font-semibold mb-2">주문 상품</div>
        <table className="min-w-full bg-white rounded shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">상품명</th>
              <th className="px-4 py-2 border-b">수량</th>
              <th className="px-4 py-2 border-b">가격</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-2 border-b">{item.title}</td>
                <td className="px-4 py-2 border-b">{item.quantity}</td>
                <td className="px-4 py-2 border-b">₩{item.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrderDetail; 