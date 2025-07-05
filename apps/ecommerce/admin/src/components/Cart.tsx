import React from "react";
import { useCart } from "./CartContext";

export default function Cart() {
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="p-4 border rounded bg-white max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-4">장바구니</h2>
      {items.length === 0 ? (
        <div>장바구니가 비어 있습니다.</div>
      ) : (
        <>
          <table className="min-w-full mb-4">
            <thead>
              <tr>
                <th>상품명</th>
                <th>수량</th>
                <th>가격</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>
                    <input type="number" min={1} value={item.quantity} onChange={e => updateQuantity(item.id, Number(e.target.value))} className="input w-16" />
                  </td>
                  <td>₩{item.price * item.quantity}</td>
                  <td>
                    <button className="btn bg-red-500" onClick={() => removeFromCart(item.id)}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mb-4 font-bold">총합계: ₩{total}</div>
          <div className="flex gap-2">
            <button className="btn bg-gray-400" onClick={clearCart}>장바구니 비우기</button>
            <button className="btn bg-blue-500" onClick={() => alert("주문 기능은 추후 구현")}>주문하기</button>
          </div>
        </>
      )}
    </div>
  );
} 