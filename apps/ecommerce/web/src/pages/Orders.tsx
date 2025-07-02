import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/store/orders');
        if (!res.ok) throw new Error('주문 목록을 불러오지 못했습니다.');
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '에러 발생');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
  }
  if (error) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">주문 내역</h1>
      {orders.length === 0 ? (
        <div className="text-gray-500 text-center py-10">주문 내역이 없습니다.</div>
      ) : (
        <ul className="divide-y">
          {orders.map((order) => (
            <li
              key={order.id}
              className="py-4 cursor-pointer hover:bg-gray-50 transition"
              onClick={() => navigate(`/orders/${order.id}`)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">주문번호: {order.id}</div>
                  <div className="text-gray-600 text-sm">{new Date(order.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-700">₩{order.total.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">{order.status}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ProtectedOrders = () => (
  <ProtectedRoute>
    <Orders />
  </ProtectedRoute>
);

export default ProtectedOrders; 