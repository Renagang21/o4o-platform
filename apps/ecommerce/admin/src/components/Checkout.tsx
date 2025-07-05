import React, { useState } from "react";
import { useCart } from "./CartContext";
import { useOrders } from "./OrderContext";
import { useNavigate } from "react-router-dom";

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { addOrder } = useOrders();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", address: "", memo: "" });
  const [error, setError] = useState("");

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) {
      setError("이름, 연락처, 주소는 필수입니다.");
      return;
    }
    if (items.length === 0) {
      setError("장바구니가 비어 있습니다.");
      return;
    }
    addOrder({
      items,
      total,
      name: form.name,
      phone: form.phone,
      address: form.address,
      memo: form.memo,
    });
    clearCart();
    navigate("/orders");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">주문하기</h2>
      <div className="mb-2">총합계: <b>₩{total}</b></div>
      <input name="name" className="input" placeholder="이름" value={form.name} onChange={handleChange} required />
      <input name="phone" className="input" placeholder="연락처" value={form.phone} onChange={handleChange} required />
      <input name="address" className="input" placeholder="주소" value={form.address} onChange={handleChange} required />
      <textarea name="memo" className="input" placeholder="메모" value={form.memo} onChange={handleChange} />
      <button type="submit" className="btn mt-2 w-full">주문하기</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </form>
  );
} 