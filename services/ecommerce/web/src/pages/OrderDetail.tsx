import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
}

interface OrderDetail {
  id: string;
  created_at: string;
  status: string;
  total: number;
  shipping_address: {
    first_name: string;
    address_1: string;
    phone: string;
  };
  items: OrderItem[];
}

const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/store/orders/${id}`);
        if (!res.ok) throw new Error('주문 정보를 불러오지 못했습니다.');
        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : '에러 발생');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
  }
  if (error || !order) {
    return <div className="text-center text-red-500 py-10">{error || '주문 정보를 찾을 수 없습니다.'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">주문 상세</h1>
      <div className="mb-4">
        <div className="font-semibold">주문번호: {order.id}</div>
        <div className="text-gray-600 text-sm">{new Date(order.created_at).toLocaleString()}</div>
        <div className="text-sm text-gray-500">상태: {order.status}</div>
      </div>
      <div className="mb-6">
        <div className="font-semibold mb-1">수령인 정보</div>
        <div>이름: {order.shipping_address.first_name}</div>
        <div>주소: {order.shipping_address.address_1}</div>
        <div>연락처: {order.shipping_address.phone}</div>
      </div>
      <div className="mb-6">
        <div className="font-semibold mb-2">주문 상품</div>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between items-center py-2">
              <div>
                <div className="font-semibold">{item.title}</div>
                <div className="text-gray-600 text-sm">수량: {item.quantity}</div>
              </div>
              <div className="font-bold">₩{(item.price * item.quantity).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
      <div className="text-right text-lg font-bold">
        총 금액: <span className="text-blue-700">₩{order.total.toLocaleString()}</span>
      </div>
    </div>
  );
};

const ProtectedOrderDetail = () => (
  <ProtectedRoute>
    <OrderDetailPage />
  </ProtectedRoute>
);

export default ProtectedOrderDetail; 