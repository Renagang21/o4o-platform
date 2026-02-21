/**
 * TestCenterPage - KPA-a 테스트 센터 메인 페이지
 *
 * WO-KPA-A-TEST-CENTER-PHASE1-MAIN-PAGE-V1
 *
 * 3개 테스트 카드 진입 허브:
 * - 메인 화면 테스트 (/test/main)
 * - 약국 HUB 테스트 (/test/hub)
 * - 약국 매장관리 테스트 (/test/store)
 *
 * 권한: 비로그인 접근 가능
 */

import { Link } from 'react-router-dom';

const TEST_CARDS = [
  {
    title: '메인 화면 테스트',
    description: '처음 화면이 이해되는지, 정보가 잘 보이는지 확인합니다.',
    href: '/test/main',
    buttonLabel: '메인 화면 테스트 시작',
    color: '#2563eb',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  {
    title: '약국 HUB 테스트',
    description: '약국 운영에 필요한 관리 기능이 이해되는지 확인합니다.',
    href: '/test/hub',
    buttonLabel: 'HUB 테스트 시작',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#c4b5fd',
  },
  {
    title: '약국 매장관리 테스트',
    description: '고객에게 보여줄 약국 화면을 관리하는 흐름을 확인합니다.',
    href: '/test/store',
    buttonLabel: '매장관리 테스트 시작',
    color: '#059669',
    bgColor: '#ecfdf5',
    borderColor: '#86efac',
  },
];

export function TestCenterPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-4">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 no-underline">
            {'<-'} 홈으로
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 m-0">테스트 센터</h1>
            <p className="text-sm text-slate-500 m-0">서비스 체험 및 개선 참여</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-full text-xs text-white/90">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            시범 운영
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* 안내 영역 */}
        <section className="mb-8">
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-[15px] text-slate-600 leading-relaxed mb-1">
              본 서비스는 시범 운영 단계입니다.
            </p>
            <p className="text-[15px] text-slate-600 leading-relaxed mb-1">
              실제 약국에서 사용한다고 가정하고 체험해 주십시오.
            </p>
            <p className="text-[15px] text-slate-600 leading-relaxed">
              테스트 후 의견은 개선에 반영됩니다.
            </p>
          </div>
        </section>

        {/* 카드 3개 */}
        <section className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TEST_CARDS.map((card) => (
              <div
                key={card.href}
                className="bg-white rounded-2xl p-7 border flex flex-col"
                style={{ borderColor: card.borderColor, backgroundColor: card.bgColor }}
              >
                <h2 className="text-lg font-bold text-slate-900 mb-3">{card.title}</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
                  {card.description}
                </p>
                <Link
                  to={card.href}
                  className="inline-block text-center px-6 py-3 text-white text-sm font-semibold rounded-lg no-underline hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: card.color }}
                >
                  {card.buttonLabel}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 유의사항 */}
        <section className="mb-8">
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">시범 운영 안내</h3>
            <ul className="m-0 pl-5 text-sm text-amber-800 leading-relaxed space-y-1">
              <li>화면이나 기능이 예고 없이 변경될 수 있습니다</li>
              <li>일부 기능은 아직 개발 중이거나 미완성일 수 있습니다</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}

export default TestCenterPage;
