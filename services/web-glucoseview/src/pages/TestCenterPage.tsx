/**
 * TestCenterPage - 서비스 테스트 & 개선 참여 센터
 *
 * Work Order: WO-TEST-CENTER-SEPARATION-V1
 */

import { Link } from 'react-router-dom';

export default function TestCenterPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                ← 홈으로
              </Link>
              <div className="h-6 w-px bg-slate-300" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">
                  🧪
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">테스트 센터</h1>
                  <p className="text-sm text-slate-500">서비스 테스트 & 개선 참여</p>
                </div>
              </div>
            </div>
            {/* 운영형 알파 배지 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
              <span className="text-xs text-white/90">운영형 알파 · v0.8.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 테스트 안내 카드 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">테스트 참여 안내</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold text-slate-800 mb-2">테스트 목적</h3>
              <p className="text-sm text-slate-500">
                실제 사용 환경에서 서비스 안정성과 사용성을 검증합니다.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <div className="text-3xl mb-3">✋</div>
              <h3 className="font-semibold text-slate-800 mb-2">참여 방법</h3>
              <p className="text-sm text-slate-500">
                서비스를 자유롭게 사용하시고, 불편한 점이나 개선 아이디어를 공유해주세요.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <div className="text-3xl mb-3">💬</div>
              <h3 className="font-semibold text-slate-800 mb-2">의견 남기기</h3>
              <p className="text-sm text-slate-500">
                버그 리포트, 기능 제안, 사용성 개선 등 모든 의견을 환영합니다.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="font-semibold text-slate-800 mb-2">반영 방식</h3>
              <p className="text-sm text-slate-500">
                수집된 의견은 우선순위에 따라 검토되며, 주요 개선사항은 공지됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 유의사항 */}
        <section className="mb-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-semibold text-amber-800 mb-3">운영형 알파 단계 유의사항</h3>
            <ul className="text-sm text-amber-700 space-y-2 list-disc pl-5">
              <li>화면이나 기능이 예고 없이 변경될 수 있습니다</li>
              <li>일부 기능은 아직 개발 중이거나 미완성일 수 있습니다</li>
              <li>테스트 데이터는 주기적으로 초기화될 수 있습니다</li>
            </ul>
          </div>
        </section>

        {/* Quick Links */}
        <section className="text-center">
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/test-guide"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              테스트 가이드 보기 →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
