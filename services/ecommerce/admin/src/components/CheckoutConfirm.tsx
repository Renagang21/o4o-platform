import React, { useState } from "react";
import { useCart } from "./CartContext";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function CheckoutConfirm() {
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  const [payment, setPayment] = useState("card");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert("장바구니가 비어 있습니다.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiFetch("/store/orders", {
        method: "POST",
        body: JSON.stringify({
          items: items.map(i => ({
            product_id: i.id,
            quantity: i.quantity,
          })),
          payment_method: payment,
          // 실제 구현 시 사용자 정보 추가 필요
        }),
      }, true);
      clearCart();
      navigate("/orders");
    } catch (e: any) {
      setError(e.message || "주문 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">결제 요약 및 확정</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="mb-2">총합계: <b>₩{total}</b></div>
      <div className="mb-2">상품 목록:</div>
      <ul className="mb-2">
        {items.map((i) => (
          <li key={i.id}>{i.title} x {i.quantity} (₩{i.price * i.quantity})</li>
        ))}
      </ul>
      <div className="mb-2">
        <label className="mr-2">
          <input type="radio" name="payment" value="card" checked={payment === "card"} onChange={() => setPayment("card")} /> 카드
        </label>
        <label>
          <input type="radio" name="payment" value="vbank" checked={payment === "vbank"} onChange={() => setPayment("vbank")} /> 가상계좌
        </label>
      </div>
      <button type="submit" className="btn mt-2 w-full" disabled={loading}>{loading ? "결제 중..." : "결제하기"}</button>
    </form>
  );
} 