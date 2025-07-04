import React from "react";
import { useSellerAuth } from "./SellerAuthContext";

export default function SellerDashboard() {
  const { seller } = useSellerAuth();
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">판매자 대시보드</h2>
      <div className="mb-4">{seller ? <b>{seller.name}</b> : ""}님, 환영합니다!</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded p-4 text-center">
          <div className="text-lg font-bold">총 상품 수</div>
          <div className="text-2xl">3</div>
        </div>
        <div className="bg-white border rounded p-4 text-center">
          <div className="text-lg font-bold">총 주문 수</div>
          <div className="text-2xl">5</div>
        </div>
        <div className="bg-white border rounded p-4 text-center">
          <div className="text-lg font-bold">정산 대기</div>
          <div className="text-2xl">₩0</div>
        </div>
      </div>
      <div className="bg-white border rounded p-4">
        <div className="font-bold mb-2">최근 주문</div>
        <ul className="text-sm">
          <li>2024-05-01 | 상품A x2 | ₩20,000</li>
          <li>2024-04-28 | 상품B x1 | ₩10,000</li>
        </ul>
      </div>
    </div>
  );
} 