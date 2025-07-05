import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface OrderInfo {
  id: string;
  total: number;
  date: string;
}

const ORDER_CONFIRM_KEY = 'order_confirmation';

const OrderConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderInfo | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(ORDER_CONFIRM_KEY);
    if (raw) {
      setOrder(JSON.parse(raw));
    } else {
      navigate('/');
    }
  }, [navigate]);

  if (!order) return null;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
      <h1 className="text-3xl font-bold mb-4 text-green-700">주문이 완료되었습니다!</h1>
      <div className="mb-6 text-lg">
        <div className="mb-2">주문이 성공적으로 접수되었습니다.</div>
        <div className="mb-2"><span className="font-semibold">주문번호:</span> {order.id}</div>
        <div className="mb-2"><span className="font-semibold">총 금액:</span> <span className="text-blue-700">₩{order.total.toLocaleString()}</span></div>
        <div className="mb-2"><span className="font-semibold">주문일시:</span> {new Date(order.date).toLocaleString()}</div>
      </div>
      <button
        className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition"
        onClick={() => navigate('/orders')}
      >
        주문 내역 보기
      </button>
    </div>
  );
};

export default OrderConfirmation; 