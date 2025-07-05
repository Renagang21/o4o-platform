import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../api";

interface Order {
  id: string;
  created_at: string;
  items: { id: string; title: string; price: number; quantity: number }[];
  total: number;
  name: string;
  phone: string;
  address: string;
  memo?: string;
  status?: string;
  payment_method?: string;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiFetch<{ order: Order }>(`/store/orders/${id}`, {}, true)
      .then((data) => {
        setOrder(data.order);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "불러오기 실패");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div>로딩 중...</div>;
  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 font-bold mb-2">{error}</div>
        <Link to="/orders" className="text-blue-600 underline">주문 목록으로 돌아가기</Link>
      </div>
    );
  }
  if (!order) return null;

  return (
    <div className="p-4 max-w-lg mx-auto bg-white border rounded">
      <h2 className="text-xl font-bold mb-4">주문 상세 정보</h2>
      <div className="mb-2">주문번호: <b>{order.id}</b></div>
      <div className="mb-2">주문일시: {new Date(order.created_at).toLocaleString()}</div>
      <div className="mb-2">결제수단: {order.payment_method || "-"}</div>
      <div className="mb-2">결제상태: {order.status || "-"}</div>
      <div className="mb-2">주문자: {order.name}</div>
      <div className="mb-2">연락처: {order.phone}</div>
      <div className="mb-2">주소: {order.address}</div>
      <div className="mb-2">요청사항: {order.memo}</div>
      <div className="mb-2 font-semibold">상품 목록</div>
      <table className="w-full mb-2 border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">상품명</th>
            <th className="border px-2 py-1">수량</th>
            <th className="border px-2 py-1">단가</th>
            <th className="border px-2 py-1">합계</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="border px-2 py-1">{item.title}</td>
              <td className="border px-2 py-1 text-center">{item.quantity}</td>
              <td className="border px-2 py-1 text-right">₩{item.price}</td>
              <td className="border px-2 py-1 text-right">₩{item.price * item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mb-2 text-right font-bold">총 주문 금액: ₩{order.total}</div>
      <Link to="/orders" className="text-blue-600 underline">주문 목록으로 돌아가기</Link>
    </div>
  );
} 