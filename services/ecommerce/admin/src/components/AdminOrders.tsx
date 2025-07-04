import React from "react";
import { useOrders } from "./OrderContext";
import { Link } from "react-router-dom";

const STATUS_OPTIONS = ["결제 완료", "배송 중", "배송 완료"];

export default function AdminOrders() {
  const { orders, updateOrderStatus, deleteOrder } = useOrders();

  if (orders.length === 0) {
    return <div className="p-4 border rounded bg-white max-w-2xl mx-auto">주문 내역이 없습니다.</div>;
  }

  return (
    <div className="p-4 border rounded bg-white max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">관리자 주문 관리</h2>
      <table className="min-w-full mb-4 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">주문번호</th>
            <th className="border px-2 py-1">주문일시</th>
            <th className="border px-2 py-1">상태</th>
            <th className="border px-2 py-1">결제수단</th>
            <th className="border px-2 py-1">총금액</th>
            <th className="border px-2 py-1">상세</th>
            <th className="border px-2 py-1">상태변경</th>
            <th className="border px-2 py-1">삭제</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="border px-2 py-1">{order.id}</td>
              <td className="border px-2 py-1">{new Date(order.createdAt).toLocaleString()}</td>
              <td className="border px-2 py-1">{order.status || "-"}</td>
              <td className="border px-2 py-1">{order.paymentMethod || "-"}</td>
              <td className="border px-2 py-1 text-right">₩{order.total}</td>
              <td className="border px-2 py-1"><Link to={`/orders/${order.id}`} className="text-blue-600 underline">상세보기</Link></td>
              <td className="border px-2 py-1">
                <select
                  className="border rounded px-1 py-0.5"
                  value={order.status || STATUS_OPTIONS[0]}
                  onChange={e => updateOrderStatus(order.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
              <td className="border px-2 py-1">
                <button
                  className="text-red-600 underline"
                  onClick={() => {
                    if (window.confirm("정말 삭제하시겠습니까?")) deleteOrder(order.id);
                  }}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 