import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "./CartContext";
import { apiFetch } from "../api";

interface Product {
  id: string;
  title: string;
  price: number;
  thumbnail?: string;
}

export default function ShopList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ products: Product[] }>("/store/products")
      .then((data) => {
        setProducts(data.products);
        setError("");
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
    <div>
      <h2 className="text-xl font-bold mb-4">상품 목록</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((p) => (
          <div key={p.id} className="border rounded p-4 flex flex-col items-center bg-white">
            {p.thumbnail && <img src={p.thumbnail} alt={p.title} className="w-32 h-32 object-cover mb-2" />}
            <div className="font-bold text-lg mb-1">{p.title}</div>
            <div className="mb-2">₩{p.price}</div>
            <div className="flex gap-2">
              <button className="btn" onClick={() => navigate(`/product/${p.id}`)}>상세</button>
              <button className="btn bg-green-500" onClick={() => addToCart({ id: p.id, title: p.title, price: p.price, thumbnail: p.thumbnail })}>장바구니 담기</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 