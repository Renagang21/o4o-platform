/**
 * TestHubPage - 약국 HUB 테스트 (placeholder)
 *
 * WO-KPA-A-TEST-CENTER-PHASE1-MAIN-PAGE-V1
 * Phase 2에서 HUB 기능 트리 기반 테스트 콘텐츠 구현 예정
 */

import { Link } from 'react-router-dom';

export default function TestHubPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/test" className="text-sm text-slate-500 hover:text-slate-700 no-underline">
            {'<-'} 테스트 센터
          </Link>
          <span className="text-base font-semibold text-slate-900">약국 HUB 테스트</span>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <div className="bg-white rounded-xl border border-slate-200 p-10">
          <div className="text-4xl mb-4">{'📊'}</div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">약국 HUB 테스트</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            약국 운영에 필요한 관리 기능이 이해되는지 확인하는 테스트입니다.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            상세 테스트 콘텐츠는 준비 중입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
