/**
 * AnswerCompositionRulesPage - AI 응답 구성 규칙 관리 페이지
 *
 * Work Order: WO-AI-ANSWER-COMPOSITION-RULES-V1
 *
 * AI 응답 + Context Asset 배치·톤·비율 규칙 확인
 * - 질문 유형별 규칙
 * - 목적 태그별 노출 규칙
 * - 톤 & 문구 규칙
 * - 위반 조건 정의
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  MessageSquare,
  Layout,
  Tag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Shield,
  Sparkles,
  Ban,
} from 'lucide-react';
import {
  QUESTION_TYPE_INFO,
  PLACEMENT_RULES,
  BASE_EXPOSURE_RULES,
  MAX_CARDS_PER_RESPONSE,
  QUESTION_TYPE_PURPOSE_ALLOWANCE,
  TONE_RULES,
  CARD_UI_RULES,
  EXPERIMENT_COMPOSITION_RULES,
  VIOLATION_CONDITIONS,
  PROHIBITED_ACTIONS,
} from './answerCompositionRules';

// ===== 섹션 헤더 컴포넌트 =====
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary-600" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// ===== 질문 유형 카드 =====
function QuestionTypeCard({ type }: { type: (typeof QUESTION_TYPE_INFO)[0] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const placementRule = PLACEMENT_RULES.find((r) => r.questionType === type.type);
  const purposeAllowance = QUESTION_TYPE_PURPOSE_ALLOWANCE.find((a) => a.questionType === type.type);

  const getPlacementBadgeColor = (placement: string) => {
    switch (placement) {
      case 'bottom':
        return 'bg-green-100 text-green-700';
      case 'bottom_with_cards':
        return 'bg-blue-100 text-blue-700';
      case 'parallel_cards':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPlacementLabel = (placement: string) => {
    switch (placement) {
      case 'bottom':
        return '하단 배치';
      case 'bottom_with_cards':
        return '하단 + 카드';
      case 'parallel_cards':
        return '병렬 카드';
      default:
        return placement;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900">{type.label}</div>
            <div className="text-sm text-gray-500">{type.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {placementRule && (
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${getPlacementBadgeColor(placementRule.placement)}`}
            >
              {getPlacementLabel(placementRule.placement)}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {/* 예시 */}
          <div className="pt-4 mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">예시 질문</div>
            <ul className="space-y-1">
              {type.examples.map((example, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  <span>"{example}"</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 특징 */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">특징</div>
            <div className="flex flex-wrap gap-2">
              {type.characteristics.map((char, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {char}
                </span>
              ))}
            </div>
          </div>

          {/* 허용 목적 태그 */}
          {purposeAllowance && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  허용 태그
                </div>
                <div className="flex flex-wrap gap-1">
                  {purposeAllowance.allowedPurposeTags.length > 0 ? (
                    purposeAllowance.allowedPurposeTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">없음</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  금지 태그
                </div>
                <div className="flex flex-wrap gap-1">
                  {purposeAllowance.disallowedPurposeTags.length > 0 ? (
                    purposeAllowance.disallowedPurposeTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">없음</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 사유 */}
          {purposeAllowance && (
            <div className="mt-3 p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">{purposeAllowance.reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ===== 메인 컴포넌트 =====
export default function AnswerCompositionRulesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'tone' | 'violations'>(
    'overview'
  );

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
              <span className="text-sm font-medium text-gray-600">AI 관리</span>
            </div>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
              대시보드
            </Link>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6">
            <Link
              to="/admin/ai"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              대시보드
            </Link>
            <Link
              to="/admin/ai/engines"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              엔진 설정
            </Link>
            <Link
              to="/admin/ai/policy"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              사용 기준 설정
            </Link>
            <Link
              to="/admin/ai/asset-quality"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              품질 관리
            </Link>
            <Link
              to="/admin/ai/cost"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              비용 현황
            </Link>
            <Link
              to="/admin/ai/context-assets"
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm"
            >
              Context Asset
            </Link>
            <Link
              to="/admin/ai/composition-rules"
              className="py-4 px-1 border-b-2 border-primary-600 text-primary-600 font-medium text-sm"
            >
              응답 규칙
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">AI 응답 구성 규칙</h1>
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              V1
            </span>
          </div>
          <p className="text-gray-500">
            AI 응답과 Context Asset의 배치·톤·비율 규칙을 확인합니다.
          </p>
        </div>

        {/* Principle Banner */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-primary-900 mb-1">Perplexity형 UX 원칙</div>
              <div className="text-sm text-primary-700 space-y-1">
                <p>• AI 응답이 항상 주인공</p>
                <p>• Context Asset은 보조 정보</p>
                <p>
                  • <strong>광고처럼 보이면 실패, 정보처럼 느껴지면 성공</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'overview', label: '개요', icon: BookOpen },
            { id: 'questions', label: '질문 유형별', icon: MessageSquare },
            { id: 'tone', label: '톤 & 문구', icon: Tag },
            { id: 'violations', label: '위반 조건', icon: AlertTriangle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 기본 원칙 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={Shield}
                title="기본 원칙"
                description="AI 응답 구성의 핵심 원칙"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800 mb-2">AI 응답 본문</div>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• 항상 완결된 답변</li>
                    <li>• Context Asset을 전제로 쓰지 않음</li>
                    <li>• "아래 광고 참고" 문구 금지</li>
                  </ul>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="font-medium text-blue-800 mb-2">Context Asset 역할</div>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 보조 정보 역할</li>
                    <li>• 주요 콘텐츠가 아님</li>
                    <li>• 응답 중간 삽입 금지</li>
                  </ul>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="font-medium text-purple-800 mb-2">성공 기준</div>
                  <ul className="text-sm text-purple-700 space-y-1">
                    <li>• 광고처럼 보이면 실패</li>
                    <li>• 정보처럼 느껴지면 성공</li>
                    <li>• 신뢰 유지가 최우선</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 노출 비율 규칙 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={Layout}
                title="노출 비율 규칙"
                description="목적 태그별 최대 노출 수"
              />
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-blue-600">
                  응답당 최대 카드 수: <strong>{MAX_CARDS_PER_RESPONSE}개</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {BASE_EXPOSURE_RULES.map((rule) => (
                  <div key={rule.purposeTag} className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">{rule.maxCount}</div>
                    <div className="text-sm font-medium text-gray-700">{rule.purposeTag}</div>
                    {rule.condition && (
                      <div className="text-xs text-amber-600 mt-1">{rule.condition}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 카드 UI 규칙 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={Layout}
                title="카드 UI 규칙"
                description="Context Asset 카드 디자인 규칙"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CARD_UI_RULES.map((rule, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      rule.allowed ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <span className="text-sm text-gray-700">{rule.rule}</span>
                    <div className="flex items-center gap-2">
                      {rule.exception && (
                        <span className="text-xs text-amber-600">({rule.exception})</span>
                      )}
                      {rule.allowed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 실험과의 관계 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={Sparkles}
                title="실험과의 관계"
                description="규칙은 실험 위에 고정"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800 mb-2">실험에서 변경 가능</div>
                  <ul className="text-sm text-green-700 space-y-1">
                    {EXPERIMENT_COMPOSITION_RULES.canVary.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="font-medium text-red-800 mb-2">실험에서 변경 불가</div>
                  <ul className="text-sm text-red-700 space-y-1">
                    {EXPERIMENT_COMPOSITION_RULES.cannotVary.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">
                  {EXPERIMENT_COMPOSITION_RULES.principle}
                </p>
              </div>
            </div>

            {/* 금지 사항 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader icon={Ban} title="금지 사항" description="V1에서 허용되지 않는 동작" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {PROHIBITED_ACTIONS.map((action, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700"
                  >
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              <SectionHeader
                icon={MessageSquare}
                title="질문 유형 분류"
                description="질문 유형에 따른 Context Asset 배치 규칙"
              />
              <p className="text-sm text-gray-600">
                AI는 질문을 분류하고, 유형에 맞는 규칙에 따라 Context Asset을 배치합니다.
              </p>
            </div>
            <div className="space-y-3">
              {QUESTION_TYPE_INFO.map((type) => (
                <QuestionTypeCard key={type.type} type={type} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tone' && (
          <div className="space-y-6">
            {/* 금지 표현 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={XCircle}
                title="금지 표현"
                description="사용해서는 안 되는 광고성 문구"
              />
              <div className="p-4 bg-red-50 rounded-lg mb-3">
                <p className="text-sm text-red-700 font-medium">
                  {TONE_RULES.find((r) => r.type === 'forbidden')?.reason}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {TONE_RULES.find((r) => r.type === 'forbidden')?.expressions.map((expr, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-full"
                  >
                    "{expr}"
                  </span>
                ))}
              </div>
            </div>

            {/* 허용 표현 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={CheckCircle}
                title="허용 표현"
                description="사용 가능한 정보 제공형 문구"
              />
              <div className="p-4 bg-green-50 rounded-lg mb-3">
                <p className="text-sm text-green-700 font-medium">
                  {TONE_RULES.find((r) => r.type === 'allowed')?.reason}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {TONE_RULES.find((r) => r.type === 'allowed')?.expressions.map((expr, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-full"
                  >
                    "{expr}"
                  </span>
                ))}
              </div>
            </div>

            {/* 예시 비교 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={Tag}
                title="적용 예시"
                description="같은 내용을 다르게 표현하는 방법"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="font-medium text-red-800 mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    잘못된 예시
                  </div>
                  <div className="space-y-2 text-sm text-red-700">
                    <p>"지금 바로 이 제품을 구매하세요!"</p>
                    <p>"베스트셀러 추천드립니다"</p>
                    <p>"최고의 선택, 놓치지 마세요"</p>
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    올바른 예시
                  </div>
                  <div className="space-y-2 text-sm text-green-700">
                    <p>"관련하여 참고할 수 있는 제품입니다"</p>
                    <p>"이와 관련된 자료로는..."</p>
                    <p>"추가로 도움이 될 수 있는 정보입니다"</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'violations' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={AlertTriangle}
                title="규칙 위반 조건"
                description="품질 루프에서 탐지되는 위반 조건"
              />
              <p className="text-sm text-gray-600 mb-4">
                아래 조건이 탐지되면 관리자 점검 대상으로 분류됩니다.
              </p>
              <div className="space-y-3">
                {VIOLATION_CONDITIONS.map((condition) => (
                  <div
                    key={condition.id}
                    className={`p-4 rounded-lg border ${
                      condition.severity === 'error'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div
                          className={`font-medium ${
                            condition.severity === 'error' ? 'text-red-800' : 'text-amber-800'
                          }`}
                        >
                          {condition.name}
                        </div>
                        <p
                          className={`text-sm mt-1 ${
                            condition.severity === 'error' ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          {condition.description}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          condition.severity === 'error'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {condition.severity === 'error' ? '오류' : '경고'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 품질 루프 연결 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>품질 루프 연결</strong>: 위반 조건이 탐지되면{' '}
                <Link to="/admin/ai/asset-quality" className="underline">
                  품질 관리 페이지
                </Link>
                에서 개선 요청으로 등록됩니다. 서비스 운영자와 관리자가 협력하여 규칙 준수 상태를
                유지합니다.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
