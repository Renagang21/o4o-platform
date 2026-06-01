/**
 * HubSignageLibraryPage — GlycoPharm Store HUB 사이니지 진입
 *
 * WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-WRAPPER-V1
 *
 * 1단계 wrapper. Store Hub 컨텍스트를 유지하면서 사이니지 기능으로 진입.
 *
 * ※ KPA canonical HubSignageLibraryPage (hubContentApi + assetSnapshotApi.copy()) 이식은
 *    backend hubContentApi GlycoPharm signage 지원 확인 후 별도 WO에서 수행한다.
 *    (WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1 예정)
 */

import { Monitor, PlaySquare, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HubSignageLibraryPage() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-2">
        <Monitor className="w-6 h-6 text-teal-600" />
        <h1 className="text-xl font-bold text-slate-800">디지털 사이니지</h1>
      </div>
      <p className="text-slate-500 text-sm mb-8">
        운영자가 제공하는 사이니지 콘텐츠를 탐색하고 내 플레이리스트에 활용하세요.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 콘텐츠 라이브러리 */}
        <Link
          to="/store/marketing/signage/library"
          className="flex items-start gap-4 p-5 bg-teal-50 rounded-xl border border-teal-100 hover:border-teal-300 hover:shadow-sm transition-all group no-underline"
        >
          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 group-hover:text-teal-700 mb-1">
              사이니지 콘텐츠 라이브러리
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              운영자·공급자가 제공하는 사이니지 미디어를 탐색하고 내 콘텐츠에 추가합니다
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-teal-500 shrink-0 mt-0.5" />
        </Link>

        {/* 내 플레이리스트 */}
        <Link
          to="/store/marketing/signage/playlist"
          className="flex items-start gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-teal-200 hover:shadow-sm transition-all group no-underline"
        >
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
            <PlaySquare className="w-5 h-5 text-slate-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 group-hover:text-teal-700 mb-1">
              내 플레이리스트 관리
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              추가된 콘텐츠로 플레이리스트를 구성하고 매장 디스플레이에 적용합니다
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-teal-500 shrink-0 mt-0.5" />
        </Link>
      </div>
    </div>
  );
}

export default HubSignageLibraryPage;
