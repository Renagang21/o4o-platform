interface RoutineStep {
  step: number;
  productId: string;
  productName?: string;
  category?: string;
  description?: string;
}

interface RoutinePreviewProps {
  title: string;
  description?: string;
  timeOfUse: 'morning' | 'evening' | 'both';
  steps: RoutineStep[];
  skinType: string[];
  concerns: string[];
}

export default function RoutinePreview({ title, description, timeOfUse, steps, skinType, concerns }: RoutinePreviewProps) {
  const getTimeOfUseLabel = (time: string) => {
    const labels: Record<string, string> = {
      morning: '아침',
      evening: '저녁',
      both: '아침/저녁',
    };
    return labels[time] || time;
  };

  const getSkinTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      dry: '건성',
      oily: '지성',
      combination: '복합성',
      sensitive: '민감성',
      normal: '중성',
    };
    return labels[type] || type;
  };

  const getConcernLabel = (concern: string) => {
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
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border-2 border-purple-200">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🧴</span>
        <h3 className="text-xl font-bold text-gray-900">{title || '루틴 제목'}</h3>
      </div>

      {description && (
        <p className="text-gray-700 mb-4">{description}</p>
      )}

      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-700">사용시간:</span>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{getTimeOfUseLabel(timeOfUse)}</span>
        </div>
        {skinType.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-700">피부타입:</span>
            <div className="flex gap-1">
              {skinType.map((type) => (
                <span key={type} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  {getSkinTypeLabel(type)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {concerns.length > 0 && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <span className="font-semibold text-gray-700">피부고민:</span>
          <div className="flex gap-1 flex-wrap">
            {concerns.map((concern) => (
              <span key={concern} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                {getConcernLabel(concern)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-purple-200 pt-4 mt-4">
        <h4 className="font-semibold text-gray-900 mb-3">루틴 단계</h4>
        {steps.length === 0 ? (
          <div className="text-gray-500 text-center py-4">
            아직 추가된 제품이 없습니다
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 bg-white p-3 rounded shadow-sm">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                  {step.step}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {step.category || '제품'} → {step.productName || `제품 ID: ${step.productId}`}
                  </div>
                  {step.description && (
                    <div className="text-sm text-gray-600 mt-1">{step.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {steps.length < 2 && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded">
          ⚠️ 루틴은 최소 2단계 이상이어야 합니다 (현재 {steps.length}단계)
        </div>
      )}
    </div>
  );
}
