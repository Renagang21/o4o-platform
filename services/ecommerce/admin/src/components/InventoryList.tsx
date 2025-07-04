import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export default function InventoryList() {
  const { token } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("로그인이 필요합니다.");
      return;
    }
    fetch("/admin/inventory-items", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setItems(data);
        setError("");
        console.log(data);
      })
      .catch(() => setError("불러오기 실패"));
  }, [token]);

  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4 border rounded bg-white mt-4">
      <h2 className="text-xl font-bold">재고 목록</h2>
      <table className="min-w-full">
        <thead>
          <tr>
            <th>상품명</th>
            <th>수량</th>
            <th>기타</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>{item.title}</td>
              <td>{item.quantity}</td>
              <td>{JSON.stringify(item)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 