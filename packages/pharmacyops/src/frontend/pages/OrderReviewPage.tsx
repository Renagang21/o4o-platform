/**
 * OrderReviewPage
 *
 * 자동발주 검토 및 확정 페이지
 * - 공급자별 주문 분할 표시
 * - 수량 편집 기능
 * - 공급자 변경 옵션
 * - 최종 발주 확정
 *
 * @package @o4o/pharmacyops
 */

import React, { useState, useEffect, useMemo } from 'react';

// ========================================
// Types
// ========================================

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  requiresColdChain: boolean;
  isNarcotic: boolean;
  supplierId: string;
  supplierName: string;
}

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  subtotal: number;
  coldChainRequired: boolean;
  narcoticsIncluded: boolean;
  estimatedDelivery: string;
}

interface OrderSummary {
  totalItems: number;
  totalQuantity: number;
  totalAmount: number;
  supplierCount: number;
  coldChainOrders: number;
  narcoticOrders: number;
}

// ========================================
// Mock Data
// ========================================

const mockOrderItems: OrderItem[] = [
  {
    id: '1',
    productId: 'prod-001',
    productName: '타이레놀 정 500mg',
    productSku: 'TYL-500-100',
    quantity: 50,
    unitPrice: 2500,
    totalPrice: 125000,
    requiresColdChain: false,
    isNarcotic: false,
    supplierId: 'sup-001',
    supplierName: '한국도매약품',
  },
  {
    id: '2',
    productId: 'prod-002',
    productName: '리피토정 20mg',
    productSku: 'LIP-20-30',
    quantity: 25,
    unitPrice: 7500,
    totalPrice: 187500,
    requiresColdChain: false,
    isNarcotic: false,
    supplierId: 'sup-001',
    supplierName: '한국도매약품',
  },
  {
    id: '3',
    productId: 'prod-003',
    productName: '인슐린 글라진 주',
    productSku: 'INS-GL-3ML',
    quantity: 15,
    unitPrice: 30000,
    totalPrice: 450000,
    requiresColdChain: true,
    isNarcotic: false,
    supplierId: 'sup-003',
    supplierName: '바이오팜',
  },
];

// ========================================
// Components
// ========================================

const QuantityEditor: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}> = ({ value, onChange, min = 1, max = 9999 }) => {
  const decrease = () => {
    if (value > min) onChange(value - 1);
  };

  const increase = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex items-center border rounded">
      <button
        onClick={decrease}
        disabled={value <= min}
        className="px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= min && v <= max) {
            onChange(v);
          }
        }}
        className="w-16 text-center border-x py-1"
        min={min}
        max={max}
      />
      <button
        onClick={increase}
        disabled={value >= max}
        className="px-2 py-1 hover:bg-gray-100 disabled:opacity-50"
      >
        +
      </button>
    </div>
  );
};

const SupplierCard: React.FC<{
  group: SupplierGroup;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
}> = ({ group, onQuantityChange, onRemoveItem }) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Supplier Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium">{group.supplierName}</span>
            <span className="text-sm text-gray-500">
              ({group.items.length}개 품목)
            </span>
            {group.coldChainRequired && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                ❄️ 냉장배송
              </span>
            )}
            {group.narcoticsIncluded && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                ⚠️ 마약류포함
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">₩{group.subtotal.toLocaleString()}</p>
            <p className="text-sm text-gray-500">
              예상 배송: {group.estimatedDelivery}
            </p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full">
        <thead className="bg-gray-50 text-sm text-gray-600">
          <tr>
            <th className="text-left px-4 py-2">제품</th>
            <th className="text-right px-4 py-2">단가</th>
            <th className="text-center px-4 py-2">수량</th>
            <th className="text-right px-4 py-2">금액</th>
            <th className="text-center px-4 py-2 w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {group.items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-gray-500">{item.productSku}</p>
                  <div className="flex gap-1 mt-1">
                    {item.requiresColdChain && (
                      <span className="text-xs text-blue-600">❄️</span>
                    )}
                    {item.isNarcotic && (
                      <span className="text-xs text-red-600">⚠️</span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                ₩{item.unitPrice.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-center">
                  <QuantityEditor
                    value={item.quantity}
                    onChange={(qty) => onQuantityChange(item.id, qty)}
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium">
                ₩{item.totalPrice.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="삭제"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ========================================
// Main Page Component
// ========================================

export const OrderReviewPage: React.FC = () => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('credit');
  const [deliveryNote, setDeliveryNote] = useState<string>('');

  // Load data
  useEffect(() => {
    setTimeout(() => {
      setItems(mockOrderItems);
      setLoading(false);
    }, 500);
  }, []);

  // Group items by supplier
  const supplierGroups: SupplierGroup[] = useMemo(() => {
    const groups = new Map<string, OrderItem[]>();

    items.forEach((item) => {
      if (!groups.has(item.supplierId)) {
        groups.set(item.supplierId, []);
      }
      groups.get(item.supplierId)!.push(item);
    });

    return Array.from(groups.entries()).map(([supplierId, groupItems]) => ({
      supplierId,
      supplierName: groupItems[0].supplierName,
      items: groupItems,
      subtotal: groupItems.reduce((sum, item) => sum + item.totalPrice, 0),
      coldChainRequired: groupItems.some((item) => item.requiresColdChain),
      narcoticsIncluded: groupItems.some((item) => item.isNarcotic),
      estimatedDelivery: '2-3일',
    }));
  }, [items]);

  // Summary
  const summary: OrderSummary = useMemo(() => ({
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0),
    supplierCount: supplierGroups.length,
    coldChainOrders: supplierGroups.filter((g) => g.coldChainRequired).length,
    narcoticOrders: supplierGroups.filter((g) => g.narcoticsIncluded).length,
  }), [items, supplierGroups]);

  // Handlers
  const handleQuantityChange = (itemId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
          : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmitOrder = async () => {
    if (items.length === 0) {
      alert('주문할 품목이 없습니다.');
      return;
    }

    setSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    alert(`${items.length}개 품목, 총 ₩${summary.totalAmount.toLocaleString()} 발주가 완료되었습니다.`);
    setSubmitting(false);

    // Redirect to order list (in real app)
    // navigate('/pharmacyops/orders');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <a href="/pharmacyops/reorder" className="text-blue-600 hover:underline">
            ← 발주 목록으로
          </a>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">발주 검토 및 확정</h1>
        <p className="text-gray-600 mt-1">
          주문 내용을 확인하고 수량을 조정한 후 발주를 확정하세요.
        </p>
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <span className="text-4xl mb-4 block">📭</span>
          <p className="text-gray-500">발주할 품목이 없습니다.</p>
          <a
            href="/pharmacyops/reorder"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            발주 목록으로 이동
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Supplier Orders */}
          <div className="lg:col-span-2 space-y-4">
            {supplierGroups.map((group) => (
              <SupplierCard
                key={group.supplierId}
                group={group}
                onQuantityChange={handleQuantityChange}
                onRemoveItem={handleRemoveItem}
              />
            ))}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* Summary Card */}
              <div className="border rounded-lg p-4">
                <h2 className="font-bold text-lg mb-4">주문 요약</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 품목</span>
                    <span>{summary.totalItems}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">총 수량</span>
                    <span>{summary.totalQuantity}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">공급자</span>
                    <span>{summary.supplierCount}개사</span>
                  </div>
                  {summary.coldChainOrders > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>❄️ 냉장 배송</span>
                      <span>{summary.coldChainOrders}건</span>
                    </div>
                  )}
                  {summary.narcoticOrders > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>⚠️ 마약류 포함</span>
                      <span>{summary.narcoticOrders}건</span>
                    </div>
                  )}
                </div>

                <hr className="my-4" />

                <div className="flex justify-between items-center">
                  <span className="font-medium">총 결제금액</span>
                  <span className="text-xl font-bold text-blue-600">
                    ₩{summary.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">결제 방법</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      value="credit"
                      checked={paymentMethod === 'credit'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span>신용 결제 (월말 정산)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      value="prepaid"
                      checked={paymentMethod === 'prepaid'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <span>선결제</span>
                  </label>
                </div>
              </div>

              {/* Delivery Note */}
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-3">배송 요청사항</h3>
                <textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="배송 관련 요청사항을 입력하세요"
                  className="w-full border rounded p-2 text-sm"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={submitting || items.length === 0}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> 발주 처리 중...
                  </span>
                ) : (
                  `₩${summary.totalAmount.toLocaleString()} 발주 확정`
                )}
              </button>

              {/* Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium mb-1">주문 전 확인사항</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>냉장 배송 품목은 별도 배송됩니다</li>
                  <li>마약류 품목은 관련 법규를 준수하여 배송됩니다</li>
                  <li>발주 확정 후 취소/변경이 제한될 수 있습니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderReviewPage;
