import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  created_at: string;
}

export default function AdminProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ products: Product[] }>("/admin/products", {}, false, true)
      .then(data => {
        setProducts(data.products);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message || "불러오기 실패");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4">상품 목록</h2>
      <div className="mb-4 text-right">
        <Link to="/admin/products/new" className="btn">+ 신규 등록</Link>
      </div>
      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">상품명</th>
            <th className="border px-2 py-1">가격</th>
            <th className="border px-2 py-1">상태</th>
            <th className="border px-2 py-1">등록일</th>
            <th className="border px-2 py-1">수정</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td className="border px-2 py-1">{p.title}</td>
              <td className="border px-2 py-1 text-right">₩{p.price}</td>
              <td className="border px-2 py-1">{p.status}</td>
              <td className="border px-2 py-1">{new Date(p.created_at).toLocaleString()}</td>
              <td className="border px-2 py-1"><Link to={`/admin/products/${p.id}/edit`} className="text-blue-600 underline">수정</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 