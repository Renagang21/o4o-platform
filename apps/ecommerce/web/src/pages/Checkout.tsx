import React, { useState } from 'react';
import { useCartStore } from '../store/cartStore';

interface CheckoutForm {
  name: string;
  address: string;
  phone: string;
}

const initialForm: CheckoutForm = {
  name: '',
  address: '',
  phone: '',
};

const Checkout: React.FC = () => {
  const { items, clearCart } = useCartStore();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Partial<CheckoutForm>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const validate = (): boolean => {
    const newErrors: Partial<CheckoutForm> = {};
    if (!form.name.trim()) newErrors.name = '이름을 입력하세요.';
    if (!form.address.trim()) newErrors.address = '주소를 입력하세요.';
    if (!form.phone.trim()) newErrors.phone = '연락처를 입력하세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      // 1. Create cart (if needed, or use local cart)
      // 2. Create order via Medusa API
      const orderRes = await fetch('/store/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.phone + '@dummy.com', // Medusa requires email, so use phone as dummy
          shipping_address: {
            first_name: form.name,
            address_1: form.address,
            phone: form.phone,
            country_code: 'kr',
            city: 'Seoul',
            postal_code: '00000',
          },
          items: items.map((item) => ({
            variant_id: item.id,
            quantity: item.quantity,
          })),
        }),
      });
      if (!orderRes.ok) {
        throw new Error('주문 생성에 실패했습니다.');
      }
      setSuccess(true);
      clearCart();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : '주문 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 bg-green-50 rounded shadow">
        <h2 className="text-2xl font-bold mb-4 text-green-700">주문이 완료되었습니다!</h2>
        <p className="mb-4">주문이 성공적으로 접수되었습니다. 주문 내역 페이지에서 확인할 수 있습니다.</p>
        <a href="/orders" className="text-blue-600 underline">주문 내역 보기</a>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-6">결제 및 주문 확인</h1>
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block font-semibold mb-1">이름</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={`w-full border rounded px-3 py-2 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            disabled={loading}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block font-semibold mb-1">주소</label>
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            className={`w-full border rounded px-3 py-2 ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
            disabled={loading}
          />
          {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
        </div>
        <div>
          <label className="block font-semibold mb-1">연락처</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className={`w-full border rounded px-3 py-2 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
            disabled={loading}
          />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50"
          disabled={loading || items.length === 0}
        >
          {loading ? '주문 처리 중...' : '주문하기'}
        </button>
        {apiError && <p className="text-red-500 text-center mt-2">{apiError}</p>}
      </form>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">장바구니 상품</h2>
        {items.length === 0 ? (
          <p className="text-gray-500">장바구니가 비어 있습니다.</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.id} className="flex items-center py-3">
                {item.thumbnail && (
                  <img src={item.thumbnail} alt={item.title} className="w-16 h-16 object-cover rounded mr-4" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-gray-600">수량: {item.quantity}</div>
                </div>
                <div className="font-bold">₩{(item.price * item.quantity).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="text-right text-lg font-bold">
        총 금액: <span className="text-blue-700">₩{total.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default Checkout; 