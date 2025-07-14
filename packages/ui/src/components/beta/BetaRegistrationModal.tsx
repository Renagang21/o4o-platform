import React, { useState } from 'react';

interface BetaRegistrationData {
  email: string;
  name: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  type: 'individual' | 'business' | 'developer' | 'partner';
  interestArea: 'retail' | 'healthcare' | 'food_service' | 'corporate' | 'education' | 'government' | 'other';
  useCase?: string;
  expectations?: string;
  interestedFeatures?: string[];
  referralSource?: string;
}

interface BetaRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

const USER_TYPES = [
  { value: 'individual', label: '개인 사용자' },
  { value: 'business', label: '비즈니스' },
  { value: 'developer', label: '개발자' },
  { value: 'partner', label: '파트너' }
];

const INTEREST_AREAS = [
  { value: 'retail', label: '소매업' },
  { value: 'healthcare', label: '헬스케어' },
  { value: 'food_service', label: '음식점/카페' },
  { value: 'corporate', label: '기업/사무실' },
  { value: 'education', label: '교육기관' },
  { value: 'government', label: '정부/공공기관' },
  { value: 'other', label: '기타' }
];

const FEATURES = [
  'Content Management',
  'Playlist Management',
  'Scheduling',
  'Templates',
  'Analytics',
  'Store Management',
  'Mobile App',
  'API Integration'
];

const REFERRAL_SOURCES = [
  { value: 'google', label: 'Google 검색' },
  { value: 'social_media', label: '소셜 미디어' },
  { value: 'website', label: '웹사이트' },
  { value: 'word_of_mouth', label: '지인 추천' },
  { value: 'blog', label: '블로그/기사' },
  { value: 'advertisement', label: '광고' },
  { value: 'event', label: '이벤트/세미나' },
  { value: 'other', label: '기타' }
];

export const BetaRegistrationModal: React.FC<BetaRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowToast
}) => {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BetaRegistrationData>({
    email: '',
    name: '',
    phone: '',
    company: '',
    jobTitle: '',
    type: 'individual',
    interestArea: 'other',
    useCase: '',
    expectations: '',
    interestedFeatures: [],
    referralSource: ''
  });

  const handleInputChange = (field: keyof BetaRegistrationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      interestedFeatures: prev.interestedFeatures?.includes(feature)
        ? prev.interestedFeatures.filter(f => f !== feature)
        : [...(prev.interestedFeatures || []), feature]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.email || !formData.name) {
          onShowToast('이메일과 이름을 입력해주세요.', 'error');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          onShowToast('올바른 이메일 형식이 아닙니다.', 'error');
          return false;
        }
        return true;
      case 2:
        return true;
      case 3:
        if (!formData.interestArea) {
          onShowToast('관심 분야를 선택해주세요.', 'error');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/beta/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Store user info
        localStorage.setItem('betaUserEmail', formData.email);
        if (data.data?.id) {
          localStorage.setItem('betaUserId', data.data.id);
        }

        onSuccess?.();
        onClose();
        setCurrentStep(1);
        setFormData({
          email: '',
          name: '',
          phone: '',
          company: '',
          jobTitle: '',
          type: 'individual',
          interestArea: 'other',
          useCase: '',
          expectations: '',
          interestedFeatures: [],
          referralSource: ''
        });
      } else {
        onShowToast(data.error?.message || '베타 등록에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      onShowToast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((step, index) => (
        <React.Fragment key={step}>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              currentStep >= step
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {step}
          </div>
          {index < 2 && (
            <div
              className={`w-16 h-1 ${
                currentStep > step
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        기본 정보
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          이메일 <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="your@email.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="홍길동"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          전화번호
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="010-1234-5678"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          사용자 유형 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.type}
          onChange={(e) => handleInputChange('type', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {USER_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {(formData.type === 'business' || formData.type === 'partner') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              회사명
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="회사 이름"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              직책
            </label>
            <input
              type="text"
              value={formData.jobTitle}
              onChange={(e) => handleInputChange('jobTitle', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="대표, 매니저, 개발자 등"
            />
          </div>
        </>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        사용 목적
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          관심 분야 <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.interestArea}
          onChange={(e) => handleInputChange('interestArea', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {INTEREST_AREAS.map(area => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          사용 사례
        </label>
        <textarea
          value={formData.useCase}
          onChange={(e) => handleInputChange('useCase', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          rows={3}
          placeholder="어떤 용도로 사용하실 계획인가요?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          관심 기능 (복수 선택 가능)
        </label>
        <div className="space-y-2">
          {FEATURES.map(feature => (
            <label key={feature} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.interestedFeatures?.includes(feature) || false}
                onChange={() => handleFeatureToggle(feature)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        추가 정보
      </h3>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          베타 프로그램에 대한 기대사항
        </label>
        <textarea
          value={formData.expectations}
          onChange={(e) => handleInputChange('expectations', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          rows={3}
          placeholder="베타 프로그램을 통해 기대하는 점을 알려주세요"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          어떻게 알게 되셨나요?
        </label>
        <select
          value={formData.referralSource}
          onChange={(e) => handleInputChange('referralSource', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">선택하세요</option>
          {REFERRAL_SOURCES.map(source => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          베타 프로그램 약관
        </h4>
        <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <p>• 베타 프로그램은 신기능 테스트 목적으로 제공됩니다.</p>
          <p>• 피드백은 제품 개선에 사용될 수 있습니다.</p>
          <p>• 베타 기간 중 서비스가 불안정할 수 있습니다.</p>
          <p>• 개인정보는 안전하게 보호됩니다.</p>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            베타 프로그램 등록
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
        <div className="px-6 py-4">
          {renderStepIndicator()}

          <div className="min-h-[400px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : handlePrevious}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            {currentStep === 1 ? '취소' : '이전'}
          </button>

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '등록 중...' : '등록 완료'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};