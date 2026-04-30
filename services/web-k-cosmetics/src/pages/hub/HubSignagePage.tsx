/**
 * HubSignagePage — K-Cosmetics 사이니지 탐색 (StoreHub 내부)
 *
 * WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1
 *
 * /store-hub/signage 진입점. 매장 사이니지 관리로 연결.
 */

import { Monitor, ExternalLink } from 'lucide-react';

export function HubSignagePage() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-4">
        <Monitor className="w-6 h-6 text-pink-600" />
        <h1 className="text-xl font-bold text-slate-800">디지털 사이니지</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">
        매장 디스플레이에 활용할 미디어를 탐색합니다.
      </p>
      <a
        href="/store/signage"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 transition-colors"
      >
        사이니지 관리 보기
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

export default HubSignagePage;
