/**
 * AiCardExplainPage - AI 카드 노출 규칙 설명 페이지
 *
 * Work Order: WO-AI-CONTEXT-CARD-RULES-V1
 *
 * 운영자/사업자에게 AI 카드 노출 원리를 설명하는 읽기 전용 페이지
 * - 설정 기능 없음
 * - 텍스트 설명만 제공
 */

import { Link } from 'react-router-dom';

export default function AiCardExplainPage() {
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
              <span className="text-sm font-medium text-gray-600">AI 카드 노출 규칙</span>
            </div>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              대시보드로
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AI 카드 노출 규칙</h1>
          <p className="text-gray-500 mt-1">
            AI 응답에 표시되는 카드의 노출 원리를 설명합니다.
          </p>
        </div>

        {/* Section 1: 개요 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. 개요</h2>
          <p className="text-gray-600 leading-relaxed">
            AI 응답에는 질문 맥락에 따라 관련 카드가 표시됩니다.
            이 카드는 사용자가 질문한 내용과 관련된 상품, 매장, 콘텐츠 정보를 제공합니다.
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              모든 카드 노출에는 명확한 사유가 기록되어 있어,
              "왜 이 카드가 표시되었는지" 설명할 수 있습니다.
            </p>
          </div>
        </section>

        {/* Section 2: 카드 개수 규칙 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">2. 카드 개수 규칙</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">최대 3개</p>
                <p className="text-sm text-gray-500">
                  AI 응답 1회당 최대 3개의 카드가 표시됩니다.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center text-sm font-medium">
                0
              </span>
              <div>
                <p className="font-medium text-gray-900">상황에 따라 0~3개</p>
                <p className="text-sm text-gray-500">
                  관련 정보가 없는 경우 카드가 표시되지 않을 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: 우선순위 규칙 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. 우선순위 규칙</h2>
          <p className="text-gray-600 mb-4">
            카드는 아래 순서대로 우선 노출됩니다:
          </p>
          <ol className="space-y-4">
            <li className="flex items-start gap-4">
              <span className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-bold">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">같은 매장</p>
                <p className="text-sm text-gray-500">
                  현재 보고 있는 매장의 다른 상품/정보
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">같은 상품</p>
                <p className="text-sm text-gray-500">
                  현재 보고 있는 상품과 관련된 정보
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center font-bold">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900">같은 카테고리</p>
                <p className="text-sm text-gray-500">
                  같은 카테고리에 속한 다른 상품
                </p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="w-8 h-8 bg-gray-100 text-gray-700 rounded-lg flex items-center justify-center font-bold">
                4
              </span>
              <div>
                <p className="font-medium text-gray-900">서비스 대표 정보</p>
                <p className="text-sm text-gray-500">
                  특정 맥락이 없는 경우 서비스 대표 카드 표시
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Section 4: 예시 */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">4. 노출 예시</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">매장 페이지에서 질문</p>
              <p className="text-sm text-gray-600">
                "이 매장에서 가장 인기 있는 상품이 뭐예요?"
              </p>
              <p className="text-sm text-green-600 mt-2">
                → 해당 매장의 상품 카드 우선 노출 (same_store)
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">상품 상세에서 질문</p>
              <p className="text-sm text-gray-600">
                "이 상품과 비슷한 다른 상품 있나요?"
              </p>
              <p className="text-sm text-blue-600 mt-2">
                → 관련 상품 카드 노출 (same_product)
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">카테고리 페이지에서 질문</p>
              <p className="text-sm text-gray-600">
                "건강식품 중에서 추천해주세요"
              </p>
              <p className="text-sm text-purple-600 mt-2">
                → 같은 카테고리 상품 카드 노출 (same_category)
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">홈에서 일반 질문</p>
              <p className="text-sm text-gray-600">
                "이 서비스에서 뭘 할 수 있나요?"
              </p>
              <p className="text-sm text-gray-500 mt-2">
                → 서비스 대표 정보 카드 노출 (service_fallback)
              </p>
            </div>
          </div>
        </section>

        {/* Note */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>참고:</strong> 이 규칙은 시스템에 고정되어 있으며,
            모든 카드 노출은 자동으로 로그에 기록됩니다.
            추후 리포트 및 분석에 활용될 수 있습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
