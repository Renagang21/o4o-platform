import React from "react";
import { useSeller } from "./SellerContext";
import { useSellerProducts } from "./SellerProductContext";
import { Link } from "react-router-dom";

export default function SellerProducts() {
  const { seller } = useSeller();
  const { products, deleteProduct } = useSellerProducts();

  if (!seller) {
    return <div className="p-4 border rounded bg-white max-w-lg mx-auto">판매자 등록이 필요합니다.</div>;
  }

  const myProducts = products.filter(p => p.sellerId === seller.id);

  return (
    <div className="p-4 border rounded bg-white max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">내 상품 목록</h2>
      <Link to="/seller/products/new" className="btn mb-4">상품 등록</Link>
      {myProducts.length === 0 ? (
        <div>등록된 상품이 없습니다.</div>
      ) : (
        <table className="min-w-full">
          <thead>
            <tr>
              <th>상품명</th>
              <th>가격</th>
              <th>등록일</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {myProducts.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>₩{p.price}</td>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td>
                  {/* <Link to={`/seller/products/edit/${p.id}`} className="btn mr-2">수정</Link> */}
                  <button className="btn bg-red-500" onClick={() => deleteProduct(p.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 