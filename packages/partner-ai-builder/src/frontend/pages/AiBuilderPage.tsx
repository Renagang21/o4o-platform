/**
 * AI Builder Page
 *
 * AI 기반 루틴 생성기 메인 페이지
 *
 * @package @o4o/partner-ai-builder
 */

import React, { useState, useCallback } from 'react';

// ========================================
// Types
// ========================================

type AllowedIndustry = 'COSMETICS' | 'HEALTH' | 'GENERAL';

interface ProductSelection {
  productId: string;
  productName: string;
  productType: AllowedIndustry;
  category?: string;
}

interface GeneratedRoutine {
  title: string;
  description: string;
  industry: AllowedIndustry;
  steps: {
    stepNumber: number;
    title: string;
    description: string;
    duration?: string;
    tips?: string;
  }[];
  recommendedProducts: string[];
  disclaimer: string;
  tags: string[];
  estimatedDuration?: string;
}

// ========================================
// Mock Data
// ========================================

const MOCK_PRODUCTS: ProductSelection[] = [
  { productId: 'p1', productName: '하이드레이팅 세럼', productType: 'COSMETICS', category: '세럼' },
  { productId: 'p2', productName: '비타민C 앰플', productType: 'COSMETICS', category: '앰플' },
  { productId: 'p3', productName: '진정 토너', productType: 'COSMETICS', category: '토너' },
  { productId: 'p4', productName: '멀티비타민', productType: 'HEALTH', category: '비타민' },
  { productId: 'p5', productName: '오메가3', productType: 'HEALTH', category: '영양제' },
];

// ========================================
// Component
// ========================================

export const AiBuilderPage: React.FC = () => {
  // State
  const [industry, setIndustry] = useState<AllowedIndustry>('COSMETICS');
  const [routineGoal, setRoutineGoal] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRoutine, setGeneratedRoutine] = useState<GeneratedRoutine | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter products by industry
  const availableProducts = MOCK_PRODUCTS.filter((p) => p.productType === industry);

  // Handle product selection
  const handleProductToggle = useCallback((productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }, []);

  // Generate routine
  const handleGenerate = useCallback(async () => {
    if (!routineGoal.trim()) {
      setError('루틴 목표를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock generated routine
      const mockRoutine: GeneratedRoutine = {
        title: `${routineGoal}을 위한 ${industry === 'COSMETICS' ? '스킨케어' : industry === 'HEALTH' ? '건강' : '라이프스타일'} 루틴`,
        description: `매일 실천하는 ${routineGoal} 루틴입니다. 꾸준히 따라하면 좋은 결과를 얻을 수 있습니다.`,
        industry,
        steps: [
          {
            stepNumber: 1,
            title: '준비 단계',
            description: '루틴을 시작하기 전 준비 사항입니다.',
            duration: '2분',
          },
          {
            stepNumber: 2,
            title: '핵심 단계',
            description: '가장 중요한 핵심 케어 단계입니다.',
            duration: '5분',
            tips: '이 단계를 가장 신경써서 진행하세요.',
          },
          {
            stepNumber: 3,
            title: '마무리 단계',
            description: '루틴을 마무리하는 단계입니다.',
            duration: '2분',
          },
        ],
        recommendedProducts: selectedProducts,
        disclaimer: industry === 'COSMETICS'
          ? '본 루틴은 일반적인 스킨케어 가이드이며, 피부 상태에 따라 결과가 다를 수 있습니다.'
          : industry === 'HEALTH'
          ? '본 루틴은 일반적인 건강 관리 가이드이며, 의학적 조언을 대체하지 않습니다.'
          : '본 루틴은 일반적인 가이드라인입니다.',
        tags: ['루틴', industry.toLowerCase(), routineGoal],
        estimatedDuration: '10분',
      };

      setGeneratedRoutine(mockRoutine);
    } catch (err: any) {
      setError(err.message || '루틴 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }, [industry, routineGoal, selectedProducts]);

  // Save routine
  const handleSave = useCallback(async () => {
    if (!generatedRoutine) return;

    try {
      // Mock save
      alert('루틴이 저장되었습니다!');
      // TODO: Call PartnerOps RoutineService
    } catch (err: any) {
      setError(err.message || '저장 중 오류가 발생했습니다.');
    }
  }, [generatedRoutine]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-3xl">🤖</span>
          AI 루틴 생성기
        </h1>
        <p className="text-gray-600 mt-2">
          AI가 자동으로 최적화된 루틴을 생성해드립니다.
        </p>
      </div>

      {/* Industry Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">1. 산업군 선택</h2>
        <div className="flex gap-4">
          {(['COSMETICS', 'HEALTH', 'GENERAL'] as AllowedIndustry[]).map((ind) => (
            <button
              key={ind}
              onClick={() => {
                setIndustry(ind);
                setSelectedProducts([]);
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                industry === ind
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {ind === 'COSMETICS' && '💄 뷰티/스킨케어'}
              {ind === 'HEALTH' && '💪 건강/웰니스'}
              {ind === 'GENERAL' && '🏠 라이프스타일'}
            </button>
          ))}
        </div>
        <p className="text-sm text-red-500 mt-2">
          ⚠️ PHARMACEUTICAL(의약품)은 법적 규제로 인해 AI 루틴 생성이 제한됩니다.
        </p>
      </div>

      {/* Routine Goal */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">2. 루틴 목표</h2>
        <input
          type="text"
          value={routineGoal}
          onChange={(e) => setRoutineGoal(e.target.value)}
          placeholder="예: 보습 강화, 주름 개선, 건강한 아침 시작..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Product Selection */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">3. 제품 선택 (선택사항)</h2>
        <p className="text-sm text-gray-500 mb-4">
          루틴에 포함할 제품을 선택하세요. 선택하지 않아도 AI가 자동으로 추천합니다.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {availableProducts.map((product) => (
            <button
              key={product.productId}
              onClick={() => handleProductToggle(product.productId)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                selectedProducts.includes(product.productId)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{product.productName}</div>
              <div className="text-sm text-gray-500">{product.category}</div>
            </button>
          ))}
        </div>
        {availableProducts.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            선택한 산업군에 해당하는 제품이 없습니다.
          </p>
        )}
      </div>

      {/* Target Audience (Optional) */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">4. 대상 (선택사항)</h2>
        <input
          type="text"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="예: 20대 여성, 건성 피부, 직장인..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Generate Button */}
      <div className="mb-8">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !routineGoal.trim()}
          className={`w-full py-4 rounded-lg font-semibold text-white transition-colors ${
            isGenerating || !routineGoal.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              AI가 루틴을 생성하고 있습니다...
            </span>
          ) : (
            '🤖 AI 루틴 생성하기'
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Generated Routine */}
      {generatedRoutine && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {generatedRoutine.title}
            </h2>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              AI 생성
            </span>
          </div>

          <p className="text-gray-600 mb-6">{generatedRoutine.description}</p>

          {/* Steps */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">루틴 단계</h3>
            <div className="space-y-4">
              {generatedRoutine.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                      {step.stepNumber}
                    </span>
                    <span className="font-medium">{step.title}</span>
                    {step.duration && (
                      <span className="text-sm text-gray-500">
                        ({step.duration})
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{step.description}</p>
                  {step.tips && (
                    <p className="text-sm text-blue-600 mt-1">💡 {step.tips}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {generatedRoutine.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-700 text-sm">{generatedRoutine.disclaimer}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              💾 루틴으로 저장
            </button>
            <button
              onClick={() => setGeneratedRoutine(null)}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              다시 생성
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiBuilderPage;
