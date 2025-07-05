import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function ProductForm() {
  const { token } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", price: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    if (!token) {
      setError("로그인이 필요합니다.");
      return;
    }
    try {
      const res = await fetch("/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: Number(form.price),
        }),
      });
      const data = await res.json();
      console.log(data);
      if (!res.ok) setError(data.message || "등록 실패");
      else {
        setError("");
        setSuccess("상품이 등록되었습니다.");
        setForm({ title: "", description: "", price: "" });
      }
    } catch (err) {
      setError("네트워크 오류");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded bg-white">
      <h2 className="text-xl font-bold">상품 등록</h2>
      <input name="title" placeholder="상품명" value={form.title} onChange={handleChange} className="input" required />
      <textarea name="description" placeholder="설명" value={form.description} onChange={handleChange} className="input" required />
      <input name="price" type="number" placeholder="가격" value={form.price} onChange={handleChange} className="input" required />
      <button type="submit" className="btn">등록</button>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}
    </form>
  );
} 