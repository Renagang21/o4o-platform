import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRoutineRecommendation } from '../services/api';
import type { RoutineRecommendation } from '../types';

type Step = 'skinType' | 'concerns' | 'timeOfUse' | 'result';

const SKIN_TYPES = [
  { value: 'dry', label: '건성', description: '피부가 건조하고 당김' },
  { value: 'oily', label: '지성', description: '피지 분비가 많고 번들거림' },
  { value: 'combination', label: '복합성', description: 'T존은 지성, 볼은 건성' },
  { value: 'sensitive', label: '민감성', description: '자극에 민감하고 쉽게 붉어짐' },
  { value: 'normal', label: '정상', description: '유수분 밸런스가 적절함' },
];

const CONCERNS = [
  { value: 'acne', label: '여드름', description: '트러블 및 여드름' },
  { value: 'whitening', label: '미백', description: '칙칙한 피부톤 개선' },
  { value: 'wrinkle', label: '주름', description: '주름 및 노화 방지' },
  { value: 'pore', label: '모공', description: '넓은 모공 개선' },
  { value: 'soothing', label: '진정', description: '민감한 피부 진정' },
  { value: 'moisturizing', label: '보습', description: '건조한 피부 보습' },
  { value: 'elasticity', label: '탄력', description: '피부 탄력 개선' },
  { value: 'trouble', label: '트러블', description: '피부 트러블 케어' },
];

const TIME_OF_USE = [
  { value: 'morning', label: '아침 루틴', description: '출근 전 간단한 케어' },
  { value: 'evening', label: '저녁 루틴', description: '하루 끝 집중 케어' },
];

export default function RoutineBuilderPage() {
  const [currentStep, setCurrentStep] = useState<Step>('skinType');
  const [skinType, setSkinType] = useState<string>('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [timeOfUse, setTimeOfUse] = useState<'morning' | 'evening'>('morning');
  const [recommendation, setRecommendation] = useState<RoutineRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGetRecommendation() {
    if (!skinType || concerns.length === 0) {
      alert('피부 타입과 고민을 선택해주세요');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchRoutineRecommendation({
        skinType,
        concerns,
        timeOfUse,
      });
      setRecommendation(response.data);
      setCurrentStep('result');
    } catch (error) {
      console.error('Failed to get recommendation:', error);
      alert('루틴 추천을 가져오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSkinType('');
    setConcerns([]);
    setTimeOfUse('morning');
    setRecommendation(null);
    setCurrentStep('skinType');
  }

  function toggleConcern(concern: string) {
    setConcerns((prev) =>
      prev.includes(concern)
        ? prev.filter((c) => c !== concern)
        : [...prev, concern]
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">루틴 빌더</h1>
      <p className="text-gray-600 mb-8">
        당신의 피부 타입과 고민에 맞는 스킨케어 루틴을 추천해드립니다
      </p>

      {currentStep !== 'result' && (
        <div className="bg-white rounded-lg shadow p-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">진행 상황</span>
              <span className="text-sm font-medium text-gray-700">
                {currentStep === 'skinType' && '1/3'}
                {currentStep === 'concerns' && '2/3'}
                {currentStep === 'timeOfUse' && '3/3'}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{
                  width:
                    currentStep === 'skinType'
                      ? '33%'
                      : currentStep === 'concerns'
                      ? '66%'
                      : '100%',
                }}
              />
            </div>
          </div>

          {/* Step 1: Skin Type */}
          {currentStep === 'skinType' && (
            <div>
              <h2 className="text-2xl font-semibold mb-2">피부 타입을 선택해주세요</h2>
              <p className="text-gray-600 mb-6">가장 가까운 피부 타입을 선택해주세요</p>
              <div className="space-y-3">
                {SKIN_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSkinType(type.value)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      skinType === type.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setCurrentStep('concerns')}
                  disabled={!skinType}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Concerns */}
          {currentStep === 'concerns' && (
            <div>
              <h2 className="text-2xl font-semibold mb-2">피부 고민을 선택해주세요</h2>
              <p className="text-gray-600 mb-6">최대 3가지까지 선택 가능합니다</p>
              <div className="space-y-3">
                {CONCERNS.map((concern) => (
                  <button
                    key={concern.value}
                    onClick={() => toggleConcern(concern.value)}
                    disabled={!concerns.includes(concern.value) && concerns.length >= 3}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      concerns.includes(concern.value)
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="font-semibold text-gray-900">{concern.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{concern.description}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setCurrentStep('skinType')}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  onClick={() => setCurrentStep('timeOfUse')}
                  disabled={concerns.length === 0}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Time of Use */}
          {currentStep === 'timeOfUse' && (
            <div>
              <h2 className="text-2xl font-semibold mb-2">언제 사용할 루틴인가요?</h2>
              <p className="text-gray-600 mb-6">아침과 저녁 루틴은 약간 다릅니다</p>
              <div className="space-y-3">
                {TIME_OF_USE.map((time) => (
                  <button
                    key={time.value}
                    onClick={() => setTimeOfUse(time.value as 'morning' | 'evening')}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      timeOfUse === time.value
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{time.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{time.description}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setCurrentStep('concerns')}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  onClick={handleGetRecommendation}
                  disabled={loading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '추천 생성 중...' : '루틴 추천 받기'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {currentStep === 'result' && recommendation && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-2xl font-semibold mb-2">추천 루틴</h2>
            <p className="text-gray-600 mb-6">
              {getSkinTypeLabel(recommendation.skinType)} 피부,{' '}
              {recommendation.concerns.map((c) => getConcernLabel(c)).join(', ')} 고민을 위한{' '}
              {recommendation.timeOfUse === 'morning' ? '아침' : '저녁'} 루틴
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-blue-800">총 {recommendation.totalSteps}단계</span>
                  <span className="mx-2 text-blue-800">•</span>
                  <span className="text-sm text-blue-800">예상 소요시간: {recommendation.estimatedTime}</span>
                </div>
              </div>
            </div>

            {/* Routine Steps */}
            <div className="space-y-4 mb-6">
              {recommendation.routine.map((step) => (
                <div key={step.step} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                      {step.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{step.category}</h3>
                      <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                      {step.product ? (
                        <Link
                          to={`/product/${step.product.id}`}
                          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <span>{step.product.name}</span>
                          <span>→</span>
                        </Link>
                      ) : (
                        <p className="text-sm text-gray-500">추천 제품을 찾을 수 없습니다</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            {recommendation.tips && recommendation.tips.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">팁</h3>
                <ul className="space-y-1">
                  {recommendation.tips.map((tip, index) => (
                    <li key={index} className="text-sm text-green-800">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                다시 만들기
              </button>
              <button
                onClick={() => alert('저장 기능 구현 예정')}
                className="flex-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                루틴 저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSkinTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    dry: '건성',
    oily: '지성',
    combination: '복합성',
    sensitive: '민감성',
    normal: '정상',
  };
  return labels[type] || type;
}

function getConcernLabel(concern: string): string {
  const labels: Record<string, string> = {
    acne: '여드름',
    whitening: '미백',
    wrinkle: '주름',
    pore: '모공',
    soothing: '진정',
    moisturizing: '보습',
    elasticity: '탄력',
    trouble: '트러블',
  };
  return labels[concern] || concern;
}
