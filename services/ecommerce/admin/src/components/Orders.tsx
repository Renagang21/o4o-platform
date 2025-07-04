import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";

interface Order {
  id: string;
  created_at: string;
  items: { title: string; quantity: number }[];
  total: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ orders: Order[] }>("/store/orders", {}, true)
      .then((data) => {
        setOrders(data.orders);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "불러오기 실패");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="p-4 border rounded bg-white max-w-lg mx-auto text-red-500">{error}</div>;
  if (orders.length === 0) {
    return <div className="p-4 border rounded bg-white max-w-lg mx-auto">주문 내역이 없습니다.</div>;
  }

  return (
    <div className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">주문 내역</h2>
      <table className="min-w-full mb-4">
        <thead>
          <tr>
            <th>주문일시</th>
            <th>상품명</th>
            <th>수량</th>
            <th>총합계</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{new Date(order.created_at).toLocaleString()}</td>
              <td>{order.items.map(i => i.title).join(", ")}</td>
              <td>{order.items.reduce((sum, i) => sum + i.quantity, 0)}</td>
              <td>₩{order.total}</td>
              <td><Link to={`/orders/${order.id}`}>상세보기</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 