import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useParams, useNavigate } from "react-router-dom";

export default function AdminProductEdit() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState({ title: "", description: "", price: "", image: "", stock: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    apiFetch(`/admin/products/${id}`, {}, false, true)
      .then((data) => {
        setForm({
          title: data.title,
          description: data.description,
          price: data.price,
          image: data.image,
          stock: data.stock,
        });
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "불러오기 실패");
        setLoading(false);
      });
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiFetch(`/admin/products/${id}`, {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: Number(form.price),
          image: form.image,
          stock: Number(form.stock),
        }),
      }, false, true);
      setSuccess("상품이 수정되었습니다.");
      setTimeout(() => navigate("/admin/products"), 1000);
    } catch (e: any) {
      setError(e.message || "수정 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto border rounded bg-white mt-6">
      <h2 className="text-xl font-bold mb-4">상품 수정</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {success && <div className="text-green-600 mb-2">{success}</div>}
      <input name="title" className="input mb-2" placeholder="상품명" value={form.title} onChange={handleChange} required />
      <textarea name="description" className="input mb-2" placeholder="설명" value={form.description} onChange={handleChange} required />
      <input name="price" className="input mb-2" placeholder="가격" type="number" value={form.price} onChange={handleChange} required />
      <input name="image" className="input mb-2" placeholder="이미지 URL" value={form.image} onChange={handleChange} />
      <input name="stock" className="input mb-2" placeholder="재고" type="number" value={form.stock} onChange={handleChange} required />
      <button type="submit" className="btn w-full" disabled={saving}>{saving ? "저장 중..." : "수정"}</button>
    </form>
  );
} 