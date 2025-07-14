import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Card } from '../common/Card';
import { Alert } from '../common/Alert';
import { useToast } from '@o4o/utils';

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
  initialData
}) => {
  const { showToast } = useToast();
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

  React.useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  React.useEffect(() => {
    // Auto-detect device information
    setFormData(prev => ({
      ...prev,
      deviceType: /Mobile|Android|iP(ad|hone)/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      screenResolution: `${screen.width}x${screen.height}`,
      currentUrl: window.location.href
    }));
  }, []);

  const handleInputChange = (field: keyof BetaFeedbackData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.betaUserEmail || !formData.type || !formData.title || !formData.description) {
      showToast('필수 항목을 모두 입력해주세요.', 'error');
      return false;
    }

    if (formData.title.length < 5) {
      showToast('제목은 5자 이상 입력해주세요.', 'error');
      return false;
    }

    if (formData.description.length < 10) {
      showToast('설명은 10자 이상 입력해주세요.', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showToast('피드백이 성공적으로 제출되었습니다! 소중한 의견 감사합니다.', 'success');
        onSuccess?.();
        onClose();
        // Reset form
        setFormData({
          betaUserEmail: formData.betaUserEmail, // Keep email for convenience
          type: 'general_feedback',
          title: '',
          description: '',
          reproductionSteps: '',
          expectedBehavior: '',
          actualBehavior: '',
          feature: '',
          priority: 'medium',
          contactEmail: '',
          deviceType: formData.deviceType,
          screenResolution: formData.screenResolution,
          currentUrl: window.location.href,
          rating: undefined,
          additionalComments: ''
        });
      } else {
        showToast(data.error?.message || '피드백 제출 중 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      showToast('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderBugReportFields = () => {
    if (formData.type !== 'bug_report') return null;

    return (
      <div className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <h4 className="font-medium text-red-800 dark:text-red-200">버그 신고 추가 정보</h4>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            재현 단계
          </label>
          <textarea
            value={formData.reproductionSteps}
            onChange={(e) => handleInputChange('reproductionSteps', e.target.value)}
            placeholder="문제를 재현하기 위한 단계를 순서대로 설명해주세요&#10;1. 첫 번째 단계&#10;2. 두 번째 단계&#10;3. ..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            예상 동작
          </label>
          <textarea
            value={formData.expectedBehavior}
            onChange={(e) => handleInputChange('expectedBehavior', e.target.value)}
            placeholder="어떻게 동작해야 한다고 생각하시나요?"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            실제 동작
          </label>
          <textarea
            value={formData.actualBehavior}
            onChange={(e) => handleInputChange('actualBehavior', e.target.value)}
            placeholder="실제로는 어떻게 동작하나요?"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>
    );
  };

  const renderRatingField = () => {
    if (!['general_feedback', 'usability'].includes(formData.type)) return null;

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          만족도 평가 (1-5점)
        </label>
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => handleInputChange('rating', rating)}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors ${
                formData.rating === rating
                  ? 'border-yellow-400 bg-yellow-400 text-white'
                  : 'border-gray-300 text-gray-500 hover:border-yellow-400 dark:border-gray-600 dark:text-gray-400'
              }`}
            >
              ⭐
            </button>
          ))}
        </div>
        {formData.rating && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formData.rating}점 - {
              formData.rating <= 2 ? '불만족' : 
              formData.rating <= 3 ? '보통' : 
              formData.rating <= 4 ? '만족' : '매우 만족'
            }
          </p>
        )}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            베타 피드백 제출
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            여러분의 소중한 피드백으로 더 나은 서비스를 만들어가겠습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="베타 사용자 이메일 *"
            type="email"
            value={formData.betaUserEmail}
            onChange={(e) => handleInputChange('betaUserEmail', e.target.value)}
            placeholder="베타 프로그램에 등록한 이메일 주소"
            required
          />

          <Select
            label="피드백 유형 *"
            value={formData.type}
            onChange={(value) => handleInputChange('type', value)}
            options={FEEDBACK_TYPES}
            required
          />

          <Input
            label="제목 *"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="피드백 제목을 간단히 입력해주세요 (5자 이상)"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              상세 설명 *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="피드백 내용을 자세히 설명해주세요 (10자 이상)"
              rows={4}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {renderBugReportFields()}

          <Select
            label="관련 기능"
            value={formData.feature}
            onChange={(value) => handleInputChange('feature', value)}
            options={SIGNAGE_FEATURES}
            placeholder="관련된 기능을 선택해주세요"
          />

          <Select
            label="우선순위"
            value={formData.priority}
            onChange={(value) => handleInputChange('priority', value)}
            options={PRIORITIES}
          />

          {renderRatingField()}

          <Input
            label="회신받을 이메일"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
            placeholder="다른 이메일로 회신을 원하시면 입력해주세요"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              추가 의견
            </label>
            <textarea
              value={formData.additionalComments}
              onChange={(e) => handleInputChange('additionalComments', e.target.value)}
              placeholder="추가로 전달하고 싶은 내용이 있다면 자유롭게 작성해주세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Technical Information Display */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              자동 수집된 기술 정보
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
              <div>디바이스: {formData.deviceType}</div>
              <div>해상도: {formData.screenResolution}</div>
              <div className="col-span-2">현재 URL: {formData.currentUrl}</div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              취소
            </Button>
            
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
            >
              피드백 제출
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                피드백 처리 안내
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                제출해주신 피드백은 개발팀에서 검토 후 2-3일 내에 답변드립니다. 
                긴급한 문제의 경우 우선순위를 '높음' 또는 '긴급'으로 설정해주세요.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};