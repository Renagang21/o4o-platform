/**
 * SupplyDashboardPage - 운영자 공급요청 관리
 *
 * WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-IMPLEMENTATION-V1
 * 기준선: SUPPLY-REQUEST-BASELINE-V1, SUPPLY-DASHBOARD-UI-DESIGN-V1
 *
 * 공급 가능 제품 목록 조회 + 공급요청 실행
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
  const [requestingIds, setRequestingIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<OperatorSupplyProduct | null>(null);

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

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSupplyRequest = async (product: OperatorSupplyProduct) => {
    setConfirmTarget(null);
    setRequestingIds((prev) => new Set(prev).add(product.id));

    try {
      const result = await operatorSupplyApi.createSupplyRequest({
        supplierId: product.supplierId,
        productId: product.id,
        productName: product.name,
        serviceId: 'neture',
        serviceName: 'Neture',
      });

      if (result.success) {
        // 로컬 상태 업데이트: available → pending
        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id ? { ...p, supplyStatus: 'pending' as const } : p,
          ),
        );
        showToast('공급요청이 전송되었습니다');
      } else if (result.error === 'DUPLICATE_REQUEST') {
        showToast('이미 요청한 제품입니다');
      } else {
        showToast('요청에 실패했습니다. 다시 시도해 주세요.');
      }
    } catch {
      showToast('요청에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setRequestingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">공급 요청 관리</h1>
          <p className="text-slate-500 mt-1">공급 가능 제품 조회 및 공급요청</p>
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
            to="/workspace/operator"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            대시보드로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">공급 요청 관리</h1>
          <p className="text-slate-500 mt-1">공급 가능 제품 조회 및 공급요청</p>
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
          <p className="text-slate-400 text-sm mt-1">공급 가능한 제품이 아직 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const status = STATUS_CONFIG[product.supplyStatus] || STATUS_CONFIG.available;
            const isRequesting = requestingIds.has(product.id);
            const canRequest = product.supplyStatus === 'available';

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
                <div className="space-y-1.5 mb-4">
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
                  {product.rejectReason && product.supplyStatus === 'rejected' && (
                    <p className="text-sm text-red-500">
                      <span className="font-medium">거절 사유:</span>{' '}
                      {product.rejectReason}
                    </p>
                  )}
                </div>

                {/* Action Button */}
                {canRequest ? (
                  <button
                    onClick={() => setConfirmTarget(product)}
                    disabled={isRequesting}
                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isRequesting
                        ? 'bg-primary-300 text-white cursor-wait'
                        : 'bg-primary-600 text-white hover:bg-primary-700 cursor-pointer'
                    }`}
                  >
                    {isRequesting ? '요청 중...' : '공급요청'}
                  </button>
                ) : (
                  <div className="w-full py-2 px-4 rounded-lg text-sm font-medium text-center bg-gray-100 text-gray-400">
                    {product.supplyStatus === 'pending' && '요청 대기중'}
                    {product.supplyStatus === 'approved' && '공급 진행중'}
                    {product.supplyStatus === 'rejected' && '거절됨'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 w-full">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">공급요청 확인</h3>
            <p className="text-sm text-gray-600 mb-1">
              다음 제품의 공급을 요청하시겠습니까?
            </p>
            <p className="text-sm font-medium text-slate-800 mb-4">
              {confirmTarget.name}
              <span className="text-gray-400 font-normal"> — {confirmTarget.supplierName}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTarget(null)}
                className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleSupplyRequest(confirmTarget)}
                className="flex-1 py-2 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                요청
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
