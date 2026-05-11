/**
 * StoreProductInfoCreatorPage — 상품 정보 제작
 *
 * WO-O4O-KPA-STORE-PRODUCT-INFO-CREATOR-MENU-V1
 * Placeholder: 실제 제작 기능은 후속 WO에서 구현
 */

import { FileText } from 'lucide-react';

export default function StoreProductInfoCreatorPage() {
  return (
    <div className="max-w-[960px] p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 m-0">상품 정보 제작</h1>
        <p className="text-sm text-slate-500 mt-1">내 매장 상품의 상세 정보 콘텐츠를 만듭니다.</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 gap-4">
        <FileText size={40} className="text-slate-300" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600 m-0">상품 정보를 제작하는 기능은 다음 단계에서 구현됩니다.</p>
          <p className="text-xs text-slate-400 mt-1 m-0">상품 상세 설명, 이미지, 홍보 문구 등을 통합 관리할 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}
