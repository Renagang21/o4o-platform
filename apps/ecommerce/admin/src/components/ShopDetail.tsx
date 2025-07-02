import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "./CartContext";
import { apiFetch } from "../api";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail?: string;
}

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!id) return;
    apiFetch<{ product: Product }>(`/store/products/${id}`)
      .then((data) => {
        setProduct(data.product);
        setError("");
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "불러오기 실패");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!product) return <div>상품 정보가 없습니다.</div>;

  return (
    <div className="p-4 border rounded bg-white max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">{product.title}</h2>
      {product.thumbnail && <img src={product.thumbnail} alt="thumbnail" className="w-48 h-48 object-cover mb-2 mx-auto" />}
      <div className="mb-2">{product.description}</div>
      <div className="mb-2 font-bold">₩{product.price}</div>
      <div className="flex items-center gap-2 mb-4">
        <label>수량:</label>
        <input type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="input w-20" />
      </div>
      <button className="btn bg-green-500 w-full" onClick={() => addToCart({ id: product.id, title: product.title, price: product.price, thumbnail: product.thumbnail }, quantity)}>
        장바구니 담기
      </button>
    </div>
  );
} 