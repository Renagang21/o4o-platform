import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [productCount, setProductCount] = useState<number | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<{ products: any[] }>("/admin/products", {}, false, true),
      apiFetch<{ orders: any[] }>("/admin/orders", {}, false, true),
    ])
      .then(([prod, ord]) => {
        setProductCount(prod.products.length);
        setOrderCount(ord.orders.length);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "불러오기 실패");
        setLoading(false);
      });
  }, []);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">관리자 대시보드</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <Link to="/admin/products" className="block bg-white border rounded p-6 shadow hover:shadow-lg transition">
          <div className="flex items-center gap-4">
            <span className="text-3xl">📦</span>
            <div>
              <div className="text-lg font-bold">총 상품 수</div>
              <div className="text-2xl">{productCount}</div>
            </div>
          </div>
        </Link>
        <Link to="/admin/orders" className="block bg-white border rounded p-6 shadow hover:shadow-lg transition">
          <div className="flex items-center gap-4">
            <span className="text-3xl">🧾</span>
            <div>
              <div className="text-lg font-bold">총 주문 수</div>
              <div className="text-2xl">{orderCount}</div>
            </div>
          </div>
        </Link>
      </div>
      {/* 확장: 최근 주문, 오늘 등록 상품 등 */}
    </div>
  );
} 