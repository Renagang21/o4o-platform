/**
 * HubContentPage — K-Cosmetics 콘텐츠/자료 탐색 (StoreHub 내부)
 *
 * WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1
 *
 * /store-hub/content 진입점. 콘텐츠 라이브러리로 연결.
 */

import { FileText, ExternalLink } from 'lucide-react';

export function HubContentPage() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-6 h-6 text-pink-600" />
        <h1 className="text-xl font-bold text-slate-800">콘텐츠/자료</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        CMS 콘텐츠를 탐색하고 내 매장에 복사합니다.
      </p>
      <a
        href="/library/content"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
      >
        콘텐츠 라이브러리 보기
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export default HubContentPage;
