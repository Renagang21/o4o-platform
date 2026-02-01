/**
 * RecruitingProductsPage - 파트너 모집 중인 제품 목록
 *
 * WO-PARTNER-RECRUIT-PHASE1-V1
 *
 * 공급자(GlycoPharm)가 파트너 모집으로 설정한 활성 제품을 보여줌
 * Phase 1: 읽기 전용 (소개하기 버튼은 비활성)
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recruitingApi, partnerDashboardApi, type RecruitingProduct } from '../../lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  cgm_device: 'CGM 기기',
  test_strip: '시험지',
  lancet: '란셋',
  meter: '측정기',
  accessory: '액세서리',
  other: '기타',
};

export default function RecruitingProductsPage() {
  const [products, setProducts] = useState<RecruitingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await recruitingApi.getRecruitingProducts();
        setProducts(data);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAddItem = async (productId: string) => {
    setAddingIds((prev) => new Set(prev).add(productId));
    try {
      const result = await partnerDashboardApi.addItem(productId, 'glycopharm');
      if (result.already_exists) {
        setToastMessage('이미 소개 중인 제품입니다');
      } else {
        setToastMessage('내 대시보드에 추가되었습니다');
      }
    } catch (err: unknown) {
      const status = err instanceof Error && err.message.includes('401') ? 401 : 0;
      if (status === 401) {
        setToastMessage('로그인이 필요합니다');
      } else {
        setToastMessage('추가에 실패했습니다. 다시 시도해 주세요.');
      }
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">파트너 모집 중인 제품</h1>
        <p className="text-gray-500 mb-8">공급자가 파트너를 모집 중인 제품 목록입니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
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
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">파트너 모집 중인 제품</h1>
        <p className="text-gray-500">공급자가 파트너를 모집 중인 제품 목록입니다.</p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-lg">자료가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                  {product.name}
                </h3>
                <span className="shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded bg-violet-100 text-violet-700 text-xs font-medium">
                  모집중
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-600">카테고리:</span>{' '}
                  {CATEGORY_LABELS[product.category] || product.category}
                </p>
                {product.pharmacy_name && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-gray-600">공급:</span>{' '}
                    {product.pharmacy_name}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-gray-600">가격:</span>{' '}
                  {product.sale_price ? (
                    <>
                      <span className="line-through text-gray-400 mr-1">
                        {product.price.toLocaleString()}원
                      </span>
                      <span className="text-red-600 font-medium">
                        {product.sale_price.toLocaleString()}원
                      </span>
                    </>
                  ) : (
                    <span>{product.price.toLocaleString()}원</span>
                  )}
                </p>
              </div>

              <button
                onClick={() => handleAddItem(product.id)}
                disabled={addingIds.has(product.id)}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  addingIds.has(product.id)
                    ? 'bg-violet-300 text-white cursor-wait'
                    : 'bg-violet-600 text-white hover:bg-violet-700 cursor-pointer'
                }`}
              >
                {addingIds.has(product.id) ? '추가 중...' : '이 제품 소개하기'}
              </button>
            </div>
          ))}
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
