/**
 * SummaryPage
 *
 * AI 요약 메인 페이지 (최소 계약 기반)
 * - AI 요약 카드 (3~5개)
 * - 패턴 관찰 블록
 * - 제품 유형 힌트
 * - 선택형 CTA
 *
 * @package @o4o/pharmacy-ai-insight
 */

import React, { useState, useEffect } from 'react';
import type {
  AiInsightOutput,
  InsightCard,
  PatternObservation,
  ProductHint,
  CtaSuggestion,
} from '../../backend/dto/index.js';
import { AI_DISCLAIMER } from '../../backend/dto/index.js';

// ========================================
// Components
// ========================================

interface SummaryCardProps {
  card: InsightCard;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ card }) => {
  const toneColors = {
    neutral: 'border-gray-300 bg-gray-50',
    positive: 'border-green-300 bg-green-50',
    cautious: 'border-yellow-300 bg-yellow-50',
  };

  const confidenceBadge = {
    low: 'bg-yellow-100 text-yellow-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-green-100 text-green-700',
  };

  const categoryIcon: Record<string, string> = {
    glucose: 'drop',
    pattern: 'chart',
    product: 'box',
    general: 'info',
  };

  return (
    <div className={`rounded-lg border-2 p-4 ${toneColors[card.tone]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{categoryIcon[card.category] || 'AI'}</span>
          <h3 className="font-semibold text-gray-900">{card.title}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded ${confidenceBadge[card.confidence]}`}>
          {card.confidence === 'high' ? '높음' : card.confidence === 'medium' ? '보통' : '낮음'}
        </span>
      </div>
      <p className="text-gray-700 text-sm">{card.content}</p>
    </div>
  );
};

interface PatternBlockProps {
  pattern: PatternObservation;
}

const PatternBlock: React.FC<PatternBlockProps> = ({ pattern }) => {
  const frequencyText: Record<string, string> = {
    occasional: '가끔',
    frequent: '자주',
    consistent: '지속적',
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900">{pattern.patternType}</h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {frequencyText[pattern.frequency] || pattern.frequency}
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-3">{pattern.description}</p>
      <div className="flex flex-wrap gap-2">
        {pattern.possibleFactors.map((factor, idx) => (
          <span
            key={idx}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
          >
            {factor}
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2 italic">
        * 참고 정보이며 확정 결론이 아닙니다
      </p>
    </div>
  );
};

interface ProductHintBlockProps {
  hint: ProductHint;
}

const ProductHintBlock: React.FC<ProductHintBlockProps> = ({ hint }) => (
  <div className="bg-white rounded-lg border p-4 flex items-center gap-4">
    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
      <span className="text-xl">box</span>
    </div>
    <div className="flex-1">
      <h4 className="font-medium text-gray-900">{hint.productType}</h4>
      <p className="text-sm text-gray-600">{hint.relevanceReason}</p>
    </div>
    <span className="text-xs text-gray-400">
      (참고 정보)
    </span>
  </div>
);

interface CtaButtonProps {
  cta: CtaSuggestion;
  onClick: (cta: CtaSuggestion) => void;
}

const CtaButton: React.FC<CtaButtonProps> = ({ cta, onClick }) => {
  const typeStyles: Record<string, string> = {
    info: 'bg-purple-600 text-white hover:bg-purple-700',
    reference: 'bg-blue-600 text-white hover:bg-blue-700',
    consult: 'bg-green-600 text-white hover:bg-green-700',
  };

  return (
    <button
      onClick={() => onClick(cta)}
      className={`px-4 py-2 rounded-lg transition-colors ${typeStyles[cta.type] || 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
    >
      {cta.label}
    </button>
  );
};

// ========================================
// Main Page
// ========================================

export const SummaryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<AiInsightOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsight();
  }, []);

  const fetchInsight = async () => {
    try {
      setLoading(true);

      // Mock 데이터 (실제 구현 시 API 호출)
      const mockInsight: AiInsightOutput = {
        pharmacyId: 'mock-pharmacy-id',
        summaryCards: [
          {
            id: 'card-glucose',
            category: 'glucose',
            title: '혈당 요약',
            content: '평균 혈당 135mg/dL, 목표 범위 유지율 68%, 변동성 보통으로 관찰됩니다.',
            tone: 'neutral',
            confidence: 'medium',
          },
          {
            id: 'card-variability',
            category: 'pattern',
            title: '혈당 변동성',
            content: '혈당 변동이 일반적인 수준으로 관찰됩니다. (CV: 28.5%)',
            tone: 'neutral',
            confidence: 'medium',
          },
          {
            id: 'card-time',
            category: 'pattern',
            title: '시간대별 패턴',
            content: '오후 시간대에 혈당 변화가 관찰됩니다.',
            tone: 'neutral',
            confidence: 'medium',
          },
          {
            id: 'card-general',
            category: 'general',
            title: '안내',
            content: '이 정보는 참고용입니다. 구체적인 건강 관리는 전문가와 상담하시기 바랍니다.',
            tone: 'neutral',
            confidence: 'high',
          },
        ],
        patterns: [
          {
            patternType: '식후 혈당 상승 경향',
            description: '오후 시간대에 혈당이 상승하는 경향이 관찰됩니다.',
            frequency: 'occasional',
            possibleFactors: ['해당 시간대 활동', '식사'],
            isConclusion: false,
          },
        ],
        productHints: [
          {
            productType: '혈당 측정 소모품',
            relevanceReason: '측정기 관련 소모품입니다.',
            priority: 85,
            isRecommendation: false,
          },
          {
            productType: '건강 보조 식품',
            relevanceReason: '건강 관리에 관심이 있는 분들이 찾는 제품군입니다.',
            priority: 60,
            isRecommendation: false,
          },
        ],
        ctaSuggestions: [
          { id: 'cta-info', label: '관련 제품 정보 보기', type: 'info', action: 'view-products' },
          { id: 'cta-reference', label: '참고 자료 확인', type: 'reference', action: 'view-reference' },
          { id: 'cta-consult', label: '전문가 상담 안내', type: 'consult', action: 'view-consult-info' },
        ],
        generatedAt: new Date().toISOString(),
        disclaimer: AI_DISCLAIMER,
      };

      await new Promise(resolve => setTimeout(resolve, 500));
      setInsight(mockInsight);
    } catch (err) {
      setError('AI 요약 로딩 중 오류가 발생했습니다.');
      console.error('[SummaryPage] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCtaClick = (cta: CtaSuggestion) => {
    if (cta.action) {
      console.log(`[SummaryPage] CTA action: ${cta.action}`);
      // 실제 구현 시 액션 처리
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!insight) {
    return null;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI 인사이트</h1>
          <p className="text-sm text-gray-500 mt-1">
            마지막 생성: {new Date(insight.generatedAt).toLocaleString('ko-KR')}
          </p>
        </div>
        <button
          onClick={fetchInsight}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* AI Summary Cards */}
      {insight.summaryCards && insight.summaryCards.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">AI 요약</h2>
          <div className="space-y-3">
            {insight.summaryCards.map((card) => (
              <SummaryCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}

      {/* Pattern Observations */}
      {insight.patterns && insight.patterns.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">패턴 관찰</h2>
          <div className="space-y-3">
            {insight.patterns.map((pattern, idx) => (
              <PatternBlock key={idx} pattern={pattern} />
            ))}
          </div>
        </div>
      )}

      {/* Product Hints */}
      {insight.productHints && insight.productHints.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">관련 제품 유형</h2>
          <p className="text-xs text-gray-500 mb-2">
            * 제품 추천이 아닌 참고 정보입니다
          </p>
          <div className="space-y-3">
            {insight.productHints.map((hint, idx) => (
              <ProductHintBlock key={idx} hint={hint} />
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      {insight.ctaSuggestions && insight.ctaSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-4 border-t">
          {insight.ctaSuggestions.map(cta => (
            <CtaButton key={cta.id} cta={cta} onClick={handleCtaClick} />
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500">
        {insight.disclaimer}
      </div>
    </div>
  );
};

export default SummaryPage;
