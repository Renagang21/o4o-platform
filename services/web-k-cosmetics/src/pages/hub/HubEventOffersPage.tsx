/**
 * HubEventOffersPage — K-Cosmetics 캠페인·이벤트 (StoreHub 내부)
 *
 * WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1
 *
 * /store-hub/event-offers 진입점. 커뮤니티/캠페인으로 연결.
 */

import { Megaphone, ExternalLink } from 'lucide-react';

export function HubEventOffersPage() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Megaphone className="w-6 h-6 text-pink-600" />
        <h1 className="text-xl font-bold text-slate-800">캠페인·이벤트</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        플랫폼 캠페인에 참여합니다.
      </p>
      <a
        href="/community"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
      >
        커뮤니티·캠페인 보기
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export default HubEventOffersPage;
