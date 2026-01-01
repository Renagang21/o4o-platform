import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

// Mock cart items
const initialCartItems = [
  { id: '1', name: '프리스타일 리브레2 센서', price: 45000, quantity: 2, stock: 25 },
  { id: '2', name: '아큐첵 가이드 검사지 50매', price: 25000, quantity: 3, stock: 100 },
  { id: '3', name: '당뇨 영양바 (10개입)', price: 15000, quantity: 1, stock: 200 },
];

export default function StoreCart() {
  const { pharmacyId } = useParams();
  const [cartItems, setCartItems] = useState(initialCartItems);

  const handleQuantityChange = (id: string, delta: number) => {
    setCartItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + delta;
          if (newQty >= 1 && newQty <= item.stock) {
            return { ...item, quantity: newQty };
          }
        }
        return item;
      })
    );
  };

  const handleRemove = (id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 50000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingCart className="w-20 h-20 text-slate-200 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">장바구니가 비어있습니다</h2>
        <p className="text-slate-500 mb-6">상품을 추가해주세요</p>
        <NavLink
          to={`/store/${pharmacyId}/products`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors"
        >
          쇼핑 계속하기
        </NavLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">장바구니</h1>
          <p className="text-slate-500 text-sm">{cartItems.length}개의 상품</p>
        </div>
        <NavLink
          to={`/store/${pharmacyId}/products`}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          쇼핑 계속하기
        </NavLink>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl shadow-sm p-4 flex gap-4"
            >
              {/* Image */}
              <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="w-10 h-10 text-slate-300" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="font-medium text-slate-800">{item.name}</h3>
                <p className="text-lg font-bold text-primary-600 mt-1">
                  {item.price.toLocaleString()}원
                </p>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantity */}
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(item.id, -1)}
                      disabled={item.quantity <= 1}
                      className="p-1.5 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(item.id, 1)}
                      disabled={item.quantity >= item.stock}
                      className="p-1.5 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="text-right">
                <p className="text-sm text-slate-400">소계</p>
                <p className="font-bold text-slate-800">
                  {(item.price * item.quantity).toLocaleString()}원
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
            <h2 className="font-semibold text-slate-800 mb-4">주문 요약</h2>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">상품 금액</span>
                <span className="text-slate-800">{subtotal.toLocaleString()}원</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">배송비</span>
                <span className="text-slate-800">
                  {shippingFee === 0 ? (
                    <span className="text-green-600">무료</span>
                  ) : (
                    `${shippingFee.toLocaleString()}원`
                  )}
                </span>
              </div>
              {subtotal < 50000 && (
                <p className="text-xs text-primary-600 bg-primary-50 p-2 rounded-lg">
                  {(50000 - subtotal).toLocaleString()}원 더 담으면 무료배송!
                </p>
              )}
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">총 결제금액</span>
                <span className="text-2xl font-bold text-primary-600">
                  {total.toLocaleString()}원
                </span>
              </div>
            </div>

            <button className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors">
              주문하기
            </button>

            <p className="text-xs text-slate-400 text-center mt-4">
              주문 시 이용약관 및 개인정보처리방침에 동의하는 것으로 간주됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
