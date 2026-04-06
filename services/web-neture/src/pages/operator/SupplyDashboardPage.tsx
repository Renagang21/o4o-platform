/**
 * SupplyDashboardPage - 운영자 공급 가능 상품 조회
 *
 * WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-IMPLEMENTATION-V1
 * WO-NETURE-OPERATOR-SUPPLY-MENU-CLEANUP-V1:
 *   공급요청 버튼 제거 — 백엔드 미구현 (404) 상태였던 미완성 기능 정리
 *   조회 전용 화면으로 전환
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Package } from 'lucide-react';
import { operatorSupplyApi, type OperatorSupplyProduct } from '../../lib/api';

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  available: {
    label: '공급 가능',
    className: 'bg-gray-100 text-gray-600',
  },
  pending: {
    label: '요청됨',
    className: 'bg-amber-100 text-amber-700',
  },
  approved: {
    label: '공급중',
    className: 'bg-green-100 text-green-700',
  },
  rejected: {
    label: '거절됨',
    className: 'bg-red-100 text-red-600',
  },
};

export default function SupplyDashboardPage() {
  const [products, setProducts] = useState<OperatorSupplyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await operatorSupplyApi.getSupplyProducts();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">공급 가능 상품</h1>
          <p className="text-slate-500 mt-1">현재 공개·활성 상태인 공급 가능 상품 현황</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            to="/operator"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">공급 가능 상품</h1>
          <p className="text-slate-500 mt-1">현재 공개·활성 상태인 공급 가능 상품 현황</p>
        </div>
        <button
          onClick={fetchProducts}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500 text-lg">자료가 없습니다</p>
          <p className="text-slate-400 text-sm mt-1">현재 공개·활성 상태인 공급 가능 제품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const status = STATUS_CONFIG[product.supplyStatus] || STATUS_CONFIG.available;

            return (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                {/* Header: Name + Badge */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-800 leading-tight">
                    {product.name}
                  </h3>
                  <span
                    className={`shrink-0 ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-gray-600">공급자:</span>{' '}
                    {product.supplierName || '-'}
                  </p>
                  {product.category && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-600">카테고리:</span>{' '}
                      {product.category}
                    </p>
                  )}
                  {product.priceGeneral && (
                    <p className="text-sm text-gray-500">
                      <span className="font-medium text-gray-600">공급가:</span>{' '}
                      ₩{product.priceGeneral.toLocaleString()}
                    </p>
                  )}
                  {product.rejectReason && product.supplyStatus === 'rejected' && (
                    <p className="text-sm text-red-500">
                      <span className="font-medium">거절 사유:</span>{' '}
                      {product.rejectReason}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
