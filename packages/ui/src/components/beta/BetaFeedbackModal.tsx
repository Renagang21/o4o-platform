import React, { useState, useEffect } from 'react';

interface BetaFeedbackData {
  betaUserEmail: string;
  type: 'bug_report' | 'feature_request' | 'general_feedback' | 'usability' | 'performance' | 'suggestion' | 'complaint';
  title: string;
  description: string;
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  feature?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  contactEmail?: string;
  deviceType?: string;
  screenResolution?: string;
  currentUrl?: string;
  rating?: number;
  additionalComments?: string;
}

interface BetaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Partial<BetaFeedbackData>;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const FEEDBACK_TYPES = [
  { value: 'bug_report', label: '🐛 버그 신고' },
  { value: 'feature_request', label: '✨ 기능 요청' },
  { value: 'general_feedback', label: '💬 일반 피드백' },
  { value: 'usability', label: '🎯 사용성 개선' },
  { value: 'performance', label: '⚡ 성능 문제' },
  { value: 'suggestion', label: '💡 제안사항' },
  { value: 'complaint', label: '😞 불만사항' }
];

const PRIORITIES = [
  { value: 'low', label: '낮음 - 시간이 있을 때 수정' },
  { value: 'medium', label: '보통 - 일반적인 문제' },
  { value: 'high', label: '높음 - 빠른 수정 필요' },
  { value: 'critical', label: '긴급 - 시스템 사용 불가' }
];

const SIGNAGE_FEATURES = [
  { value: 'content_management', label: '콘텐츠 관리' },
  { value: 'playlist_management', label: '플레이리스트 관리' },
  { value: 'scheduling', label: '스케줄링' },
  { value: 'templates', label: '템플릿' },
  { value: 'analytics', label: '분석 및 통계' },
  { value: 'store_management', label: '매장 관리' },
  { value: 'user_interface', label: '사용자 인터페이스' },
  { value: 'mobile_app', label: '모바일 앱' },
  { value: 'api', label: 'API' },
  { value: 'integration', label: '외부 연동' }
];

export const BetaFeedbackModal: React.FC<BetaFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  onShowToast
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BetaFeedbackData>({
    betaUserEmail: '',
    type: 'general_feedback',
    title: '',
    description: '',
    reproductionSteps: '',
    expectedBehavior: '',
    actualBehavior: '',
    feature: '',
    priority: 'medium',
    contactEmail: '',
    deviceType: '',
    screenResolution: '',
    currentUrl: window.location.href,
    rating: undefined,
    additionalComments: '',
    ...initialData
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  useEffect(() => {
    // Auto-detect device information
    setFormData(prev => ({
      ...prev,
      deviceType: /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      currentUrl: window.location.href
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.betaUserEmail) {
      onShowToast('베타 사용자 이메일을 입력해주세요.', 'error');
      return;
    }

    if (!formData.title) {
      onShowToast('제목을 입력해주세요.', 'error');
      return;
    }

    if (!formData.description) {
      onShowToast('설명을 입력해주세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.();
        onClose();
        // Reset form
        setFormData({
          betaUserEmail: formData.betaUserEmail,
          type: 'general_feedback',
          title: '',
          description: '',
          reproductionSteps: '',
          expectedBehavior: '',
          actualBehavior: '',
          feature: '',
          priority: 'medium',
          contactEmail: '',
          deviceType: '',
          screenResolution: '',
          currentUrl: window.location.href,
          rating: undefined,
          additionalComments: ''
        });
      } else {
        onShowToast(data.error?.message || '피드백 제출에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Submit error:', error);
      onShowToast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BetaFeedbackData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            베타 피드백 제출
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Beta User Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                베타 사용자 이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.betaUserEmail}
                onChange={(e) => handleInputChange('betaUserEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                피드백 유형 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {FEEDBACK_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Feature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                관련 기능
              </label>
              <select
                value={formData.feature}
                onChange={(e) => handleInputChange('feature', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">선택하세요</option>
                {SIGNAGE_FEATURES.map(feature => (
                  <option key={feature.value} value={feature.value}>
                    {feature.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            {(formData.type === 'bug_report' || formData.type === 'performance') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  우선순위
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {PRIORITIES.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="피드백을 간단히 요약해주세요"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                설명 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={4}
                placeholder="상세한 설명을 입력해주세요"
                required
              />
            </div>

            {/* Bug Report Specific Fields */}
            {formData.type === 'bug_report' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    재현 방법
                  </label>
                  <textarea
                    value={formData.reproductionSteps}
                    onChange={(e) => handleInputChange('reproductionSteps', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={3}
                    placeholder="1. 첫 번째 단계\n2. 두 번째 단계\n3. ..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    예상 동작
                  </label>
                  <textarea
                    value={formData.expectedBehavior}
                    onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder="어떻게 동작해야 하나요?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    실제 동작
                  </label>
                  <textarea
                    value={formData.actualBehavior}
                    onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder="실제로 어떻게 동작하나요?"
                  />
                </div>
              </>
            )}

            {/* Rating */}
            {(formData.type === 'general_feedback' || formData.type === 'usability') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  만족도 평가
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleInputChange('rating', star)}
                      className="text-2xl focus:outline-none"
                    >
                      {star <= (formData.rating || 0) ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                추가 의견
              </label>
              <textarea
                value={formData.additionalComments}
                onChange={(e) => handleInputChange('additionalComments', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows={3}
                placeholder="기타 의견이나 제안사항을 자유롭게 작성해주세요"
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                연락받을 이메일 (선택)
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="답변을 받고 싶으시면 입력해주세요"
              />
            </div>

            {/* System Info */}
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                시스템 정보 (자동 수집)
              </h4>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p>기기 유형: {formData.deviceType}</p>
                <p>화면 해상도: {formData.screenResolution}</p>
                <p>현재 URL: {formData.currentUrl}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '제출 중...' : '피드백 제출'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};