/**
 * AiBusinessPackPage - AI 카드 노출 사업자 설명 패키지
 *
 * Work Order: WO-AI-CARD-EXPOSURE-BUSINESS-PACK-V1
 *
 * 공급자/파트너/영업/온보딩에서 사용할 수 있는 설명 패키지
 * - 기술 용어 제거
 * - 계약/영업 문안으로 사용 가능
 * - 신뢰 확보를 위한 "하지 않는 것" 명시
 */

import { Link } from 'react-router-dom';

export default function AiBusinessPackPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Neture
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">AI 정보 노출 안내</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/admin/ai-card-report" className="text-sm text-gray-500 hover:text-gray-700">
                노출 리포트
              </Link>
              <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
                대시보드
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI 기반 맥락 정보 노출 안내</h1>
          <p className="text-gray-500 mt-1">
            사업자를 위한 AI 정보 노출 기능 설명입니다.
          </p>
        </div>

        {/* Section 1: 개요 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. 개요</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              AI는 사용자의 질문과 현재 화면의 맥락을 기반으로
              <strong className="text-gray-800"> 관련 정보(상품/매장/콘텐츠)를 함께 표시</strong>합니다.
            </p>
            <p>
              이 기능은 사용자가 필요한 정보를 더 빠르게 찾을 수 있도록 돕습니다.
              AI가 질문의 의도와 현재 보고 있는 페이지를 분석하여,
              관련성이 높은 정보를 선별하여 보여줍니다.
            </p>
          </div>
        </section>

        {/* Section 2: 노출 방식 요약 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">2. 노출 방식</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-primary-600 mb-1">최대 3개</div>
              <div className="text-sm text-gray-500">한 번에 표시되는 정보</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">맥락 우선</div>
              <div className="text-sm text-gray-500">현재 화면 기준 선별</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-600 mb-1">보장 없음</div>
              <div className="text-sm text-gray-500">상황에 따라 달라짐</div>
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              노출은 <strong>보장되지 않으며</strong>, 사용자의 질문과 맥락에 따라 달라집니다.
              한 번의 AI 응답에 표시되는 정보는 최대 3개입니다.
            </p>
          </div>
        </section>

        {/* Section 3: 노출 규칙 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. 노출 우선순위</h2>
          <p className="text-gray-600 mb-4">
            정보는 아래 순서에 따라 선별되어 표시됩니다:
          </p>
          <ol className="space-y-4">
            <li className="flex items-start gap-4">
              <span className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">같은 매장의 정보가 우선 표시됩니다</p>
                <p className="text-sm text-gray-500 mt-1">
                  사용자가 특정 매장 페이지에서 질문하면, 해당 매장의 다른 상품이나 정보가 먼저 표시됩니다.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">관련 상품이 있는 경우 함께 표시됩니다</p>
                <p className="text-sm text-gray-500 mt-1">
                  특정 상품에 대해 질문하면, 관련된 다른 상품 정보가 함께 제공됩니다.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">같은 카테고리의 정보가 표시될 수 있습니다</p>
                <p className="text-sm text-gray-500 mt-1">
                  같은 분류에 속한 다른 상품이나 매장 정보가 표시됩니다.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="w-8 h-8 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center font-bold flex-shrink-0">
                4
              </span>
              <div>
                <p className="font-medium text-gray-900">위 조건이 없을 경우, 서비스 대표 정보가 표시됩니다</p>
                <p className="text-sm text-gray-500 mt-1">
                  특정 맥락이 없는 일반 질문의 경우, 서비스에서 제공하는 주요 정보가 안내됩니다.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Section 4: 노출 예시 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">4. 노출 예시</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">상품 페이지에서 질문하는 경우</p>
              <p className="text-sm text-gray-600">
                "이 상품 배송은 얼마나 걸려요?"
              </p>
              <p className="text-sm text-primary-600 mt-2">
                → 해당 상품 정보와 같은 카테고리 상품이 함께 표시됩니다
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">매장 페이지에서 질문하는 경우</p>
              <p className="text-sm text-gray-600">
                "이 매장의 인기 상품이 뭐예요?"
              </p>
              <p className="text-sm text-primary-600 mt-2">
                → 해당 매장의 다른 상품들이 함께 표시됩니다
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">홈에서 일반 질문하는 경우</p>
              <p className="text-sm text-gray-600">
                "여기서 뭘 살 수 있어요?"
              </p>
              <p className="text-sm text-primary-600 mt-2">
                → 서비스 대표 정보와 주요 상품이 안내됩니다
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: 하지 않는 것 (신뢰 핵심) */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">5. 하지 않는 것</h2>
          <p className="text-gray-600 mb-4">
            투명한 운영을 위해 다음 사항을 명확히 합니다:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                ✕
              </span>
              <p className="text-gray-700">
                <strong>노출 수량을 임의로 늘리지 않습니다.</strong>
                <span className="text-gray-500 text-sm block">최대 3개 규칙은 예외 없이 적용됩니다.</span>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                ✕
              </span>
              <p className="text-gray-700">
                <strong>노출을 구매로 보장하지 않습니다.</strong>
                <span className="text-gray-500 text-sm block">노출은 사용자의 질문과 맥락에 따라 결정됩니다.</span>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                ✕
              </span>
              <p className="text-gray-700">
                <strong>개인 사용자 정보를 기반으로 추천하지 않습니다.</strong>
                <span className="text-gray-500 text-sm block">개인화가 아닌 공개된 맥락 규칙만 사용합니다.</span>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                ✕
              </span>
              <p className="text-gray-700">
                <strong>특정 사업자를 우대하지 않습니다.</strong>
                <span className="text-gray-500 text-sm block">모든 사업자에게 동일한 규칙이 적용됩니다.</span>
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: 리포트 안내 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">6. 노출 현황 확인</h2>
          <p className="text-gray-600 mb-4">
            모든 노출은 운영 리포트로 확인할 수 있습니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/admin/ai-card-report"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <span>AI 카드 노출 리포트 보기</span>
              <span>→</span>
            </Link>
            <Link
              to="/admin/ai-card-rules"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span>기술 규칙 상세 보기</span>
              <span>→</span>
            </Link>
          </div>
        </section>

        {/* Summary Box */}
        <div className="p-6 bg-gray-800 text-white rounded-xl">
          <h3 className="font-semibold mb-3">핵심 요약</h3>
          <ul className="space-y-2 text-gray-300 text-sm">
            <li>• AI는 질문의 맥락에 따라 관련 정보를 함께 표시합니다</li>
            <li>• 한 번에 최대 3개의 정보가 표시됩니다</li>
            <li>• 노출은 보장되지 않으며, 공개된 규칙에 따라 결정됩니다</li>
            <li>• 모든 노출은 리포트로 확인할 수 있습니다</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
