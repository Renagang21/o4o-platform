import React from 'react';
import { useCartStore, CartItem } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const { items, updateQuantity, removeFromCart, clearCart } = useCartStore();
  const navigate = useNavigate();
  const total = items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0);

  return (
    <div className="max-w-2xl mx-auto mt-10 p-4 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">장바구니</h1>
      {items.length === 0 ? (
        <div className="text-gray-500 text-center py-10">장바구니가 비어 있습니다.</div>
      ) : (
        <>
          <ul className="divide-y">
            {items.map((item: CartItem) => (
              <li key={item.id} className="flex flex-col sm:flex-row items-center py-4 gap-4">
                {item.thumbnail && (
                  <img src={item.thumbnail} alt={item.title} className="w-20 h-20 object-cover rounded" />
                )}
                <div className="flex-1 w-full">
                  <div className="font-semibold text-lg">{item.title}</div>
                  <div className="text-gray-600">₩{item.price.toLocaleString()}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-2">{item.quantity}</span>
                    <button
                      className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      className="ml-4 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => removeFromCart(item.id)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
                <div className="font-bold text-right min-w-[80px]">
                  ₩{(item.price * item.quantity).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4">
            <div className="text-xl font-bold">
              총 금액: <span className="text-blue-700">₩{total.toLocaleString()}</span>
            </div>
            <div className="flex gap-2">
              <button
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
                onClick={clearCart}
              >
                장바구니 비우기
              </button>
              <button
                className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 transition"
                onClick={() => navigate('/checkout')}
              >
                결제하기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart; 