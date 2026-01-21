/**
 * PharmacyStorePage - 약국 매장 예제 서비스
 *
 * Work Order: WO-O4O-EXAMPLE-SERVICE-V1
 *
 * 목적:
 * - 매장 기반 사업자가 "이런 화면이 있을 수 있다"를 이해
 * - 설명 없이 활용 이미지 전달
 *
 * 원칙:
 * - Mock 데이터만 사용
 * - 기능 구현 없음
 * - 설계 노출 없음
 */

import { Link } from 'react-router-dom';
import { Package, TrendingUp, Users, Bell } from 'lucide-react';

// Mock 데이터
const mockProducts = [
  { id: 1, name: '비타민D 1000IU', category: '건강기능식품', price: 12000, stock: 'available' },
  { id: 2, name: '오메가3 플러스', category: '건강기능식품', price: 28000, stock: 'available' },
  { id: 3, name: '프로바이오틱스', category: '건강기능식품', price: 35000, stock: 'low' },
  { id: 4, name: '루테인 골드', category: '건강기능식품', price: 42000, stock: 'available' },
];

const mockOrders = [
  { id: 'ORD-001', customer: '김**', items: 2, total: 40000, status: '배송중' },
  { id: 'ORD-002', customer: '이**', items: 1, total: 28000, status: '준비중' },
  { id: 'ORD-003', customer: '박**', items: 3, total: 77000, status: '완료' },
];

const mockStats = [
  { label: '이번 달 주문', value: '47건', icon: Package, color: 'text-blue-600' },
  { label: '매출', value: '1,240,000원', icon: TrendingUp, color: 'text-green-600' },
  { label: '단골 고객', value: '23명', icon: Users, color: 'text-purple-600' },
  { label: '새 알림', value: '3건', icon: Bell, color: 'text-orange-600' },
];

export default function PharmacyStorePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">건강한약국</h1>
              <p className="text-sm text-gray-500">서울 강남구</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                운영중
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {mockStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-sm text-gray-500">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 취급 상품 */}
          <section className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">취급 상품</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {mockProducts.map((product) => (
                <div key={product.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {product.price.toLocaleString()}원
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        product.stock === 'low'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {product.stock === 'low' ? '재고 부족' : '판매 가능'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 최근 주문 */}
          <section className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">최근 주문</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {mockOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{order.id}</p>
                    <p className="text-sm text-gray-500">
                      {order.customer} · {order.items}개 상품
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {order.total.toLocaleString()}원
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        order.status === '완료'
                          ? 'bg-gray-100 text-gray-600'
                          : order.status === '배송중'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Info Banner */}
        <div className="mt-8 bg-slate-50 rounded-xl p-6 border border-slate-200">
          <p className="text-slate-600 text-center text-sm">
            재고 보유 없이 상품을 취급합니다. 주문이 들어오면 공급사에서 직접 배송됩니다.
          </p>
        </div>

        {/* Example Notice */}
        <div className="mt-4 text-center">
          <p className="text-slate-400 text-xs">
            이 화면은 예시입니다. 실제 데이터가 아닙니다.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <Link to="/examples" className="hover:text-gray-700">
              ← 예제 목록
            </Link>
            <span>o4o 예제 서비스</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
