/**
 * HubB2BPage — K-Cosmetics B2B 상품 탐색 (StoreHub 내부)
 *
 * WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1
 *
 * /store-hub/b2b 진입점. B2B 공급 상품 목록으로 연결.
 */

import { ShoppingCart, ExternalLink } from 'lucide-react';

export function HubB2BPage() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-4">
        <ShoppingCart className="w-6 h-6 text-pink-600" />
        <h1 className="text-xl font-bold text-slate-800">B2B 상품 리스트</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        공급사 상품을 탐색하고 매장에 신청합니다.
      </p>
      <a
        href="/b2b/supply"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
      >
        B2B 상품 보기
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export default HubB2BPage;
