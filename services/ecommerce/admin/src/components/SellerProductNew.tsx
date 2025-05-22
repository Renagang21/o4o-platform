import React, { useState } from "react";
import { useSeller } from "./SellerContext";
import { useSellerProducts } from "./SellerProductContext";
import { useNavigate } from "react-router-dom";

export default function SellerProductNew() {
  const { seller } = useSeller();
  const { addProduct } = useSellerProducts();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    imageUrl: "",
  });
  const [error, setError] = useState("");

  if (!seller) {
    return <div className="p-4 border rounded bg-white max-w-lg mx-auto">판매자 등록이 필요합니다.</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.price || !form.stock) {
      setError("상품명, 가격, 재고는 필수입니다.");
      return;
    }
    addProduct({
      sellerId: seller.id,
      title: form.title,
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock),
      imageUrl: form.imageUrl,
    });
    navigate("/seller/products");
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">상품 등록</h2>
      <input name="title" className="input" placeholder="상품명" value={form.title} onChange={handleChange} required />
      <textarea name="description" className="input" placeholder="설명" value={form.description} onChange={handleChange} />
      <input name="price" className="input" type="number" placeholder="가격" value={form.price} onChange={handleChange} required />
      <input name="stock" className="input" type="number" placeholder="재고" value={form.stock} onChange={handleChange} required />
      <input name="imageUrl" className="input" placeholder="이미지 URL" value={form.imageUrl} onChange={handleChange} />
      <button type="submit" className="btn mt-2 w-full">등록</button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </form>
  );
} 