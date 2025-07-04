import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  title: string;
  price: number;
  status?: string;
}

export default function ProductList() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("로그인이 필요합니다.");
      setLoading(false);
      return;
    }
    fetch("/admin/products", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || []);
        setError("");
        setLoading(false);
        console.log(data);
      })
      .catch(() => {
        setError("불러오기 실패");
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-xl font-bold mb-4">상품 목록</h2>
      <table className="min-w-full">
        <thead>
          <tr>
            <th>제목</th>
            <th>가격</th>
            <th>상태</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td>{p.price}</td>
              <td>{p.status || "-"}</td>
              <td>
                <Link to={`/products/${p.id}`} className="btn">상세 보기</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 