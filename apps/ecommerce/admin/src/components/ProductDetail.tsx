import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail?: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setError("로그인이 필요합니다.");
      setLoading(false);
      return;
    }
    fetch(`/admin/products/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("상품을 찾을 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setProduct(data.product || data);
        setError("");
        setLoading(false);
        console.log(data);
      })
      .catch((e) => {
        setError(e.message || "불러오기 실패");
        setLoading(false);
      });
  }, [id, token]);

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert("삭제되었습니다.");
        navigate("/products");
      } else {
        alert("삭제 실패");
      }
    } catch {
      alert("삭제 중 오류 발생");
    }
  };

  if (loading) return <div>로딩 중...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!product) return <div>상품 정보가 없습니다.</div>;

  return (
    <div className="p-4 border rounded bg-white">
      <h2 className="text-xl font-bold mb-4">상품 상세</h2>
      {product.thumbnail && <img src={product.thumbnail} alt="thumbnail" className="w-32 h-32 object-cover mb-2" />}
      <div><b>이름:</b> {product.title}</div>
      <div><b>설명:</b> {product.description}</div>
      <div><b>가격:</b> {product.price}</div>
      <div className="mt-4 flex gap-2">
        <button className="btn" onClick={() => alert("수정 기능은 추후 구현")}>수정</button>
        <button className="btn bg-red-500" onClick={handleDelete}>삭제</button>
      </div>
    </div>
  );
} 