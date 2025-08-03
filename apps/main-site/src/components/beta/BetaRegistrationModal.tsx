import { FC, FormEvent, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Card } from '../common/Card';
import { Alert } from '../common/Alert';
import { useToast } from '../../hooks/useToast';

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

export const BetaRegistrationModal: FC<BetaRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
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

  const handleInputChange = <K extends keyof BetaRegistrationData>(field: K, value: BetaRegistrationData[K]) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData((prev: any) => ({
      ...prev,
      interestedFeatures: prev.interestedFeatures?.includes(feature)
        ? prev.interestedFeatures.filter((f: any) => f !== feature)
        : [...(prev.interestedFeatures || []), feature]
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.email && formData.name);
      case 2:
        return !!(formData.type && formData.interestArea);
      case 3:
        return true; // Optional fields
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev: any) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev: any) => prev - 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) {
      showToast('필수 항목을 모두 입력해주세요.', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/beta/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        showToast('베타 신청이 성공적으로 완료되었습니다! 검토 후 연락드리겠습니다.', 'success');
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
        showToast(data.error?.message || '등록 중 오류가 발생했습니다.', 'error');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      showToast('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        기본 정보
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        베타 프로그램 참여를 위한 기본 정보를 입력해주세요.
      </p>
      
      <Input
        label="이메일 주소 *"
        type="email"
        value={formData.email}
        onChange={(e: any) => handleInputChange('email', e.target.value)}
        placeholder="your.email@example.com"
        required
      />
      
      <Input
        label="이름 *"
        value={formData.name}
        onChange={(e: any) => handleInputChange('name', e.target.value)}
        placeholder="홍길동"
        required
      />
      
      <Input
        label="전화번호"
        value={formData.phone}
        onChange={(e: any) => handleInputChange('phone', e.target.value)}
        placeholder="010-1234-5678"
      />
      
      <Input
        label="회사명"
        value={formData.company}
        onChange={(e: any) => handleInputChange('company', e.target.value)}
        placeholder="회사명 (개인의 경우 생략 가능)"
      />
      
      <Input
        label="직책"
        value={formData.jobTitle}
        onChange={(e: any) => handleInputChange('jobTitle', e.target.value)}
        placeholder="대표, 마케팅 매니저, 개발자 등"
      />
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        사용자 유형 및 관심 분야
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        어떤 목적으로 사이니지 시스템을 활용하실 예정인지 알려주세요.
      </p>
      
      <Select
        label="사용자 유형 *"
        value={formData.type}
        onChange={(value: any) => handleInputChange('type', value)}
        options={USER_TYPES}
        required
      />
      
      <Select
        label="관심 분야 *"
        value={formData.interestArea}
        onChange={(value: any) => handleInputChange('interestArea', value)}
        options={INTEREST_AREAS}
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          사용 목적 및 계획
        </label>
        <textarea
          value={formData.useCase}
          onChange={(e: any) => handleInputChange('useCase', e.target.value)}
          placeholder="어떤 목적으로 사이니지 시스템을 사용하실 예정인지 구체적으로 설명해주세요."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        상세 정보 및 기대사항
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        더 나은 서비스 제공을 위해 추가 정보를 알려주세요.
      </p>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          관심 있는 기능들
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FEATURES.map((feature: any) => (
            <label key={feature} className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={formData.interestedFeatures?.includes(feature) || false}
                onChange={() => handleFeatureToggle(feature)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{feature}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          기대사항 및 요구사항
        </label>
        <textarea
          value={formData.expectations}
          onChange={(e: any) => handleInputChange('expectations', e.target.value)}
          placeholder="베타 프로그램에서 기대하는 점이나 특별히 원하는 기능이 있다면 알려주세요."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
      
      <Select
        label="어떻게 저희를 알게 되셨나요?"
        value={formData.referralSource}
        onChange={(value: any) => handleInputChange('referralSource', value)}
        options={REFERRAL_SOURCES}
        placeholder="선택해주세요"
      />
    </div>
  );

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-6">
      {[1, 2, 3].map((step: any) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {step}
          </div>
          {step < 3 && (
            <div
              className={`w-12 h-1 mx-2 ${
                step < currentStep
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            사이니지 베타 프로그램 신청
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            새로운 디지털 사이니지 시스템의 베타 테스터가 되어보세요!
          </p>
        </div>

        {renderStepIndicator()}

        <form onSubmit={handleSubmit}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <div className="flex justify-between mt-8">
            <div>
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={loading}
                >
                  이전
                </Button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                취소
              </Button>
              
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={!validateStep(currentStep) || loading}
                >
                  다음
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                >
                  신청 완료
                </Button>
              )}
            </div>
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
                베타 프로그램 안내
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                신청해주신 정보를 검토한 후 2-3일 내에 승인 여부를 이메일로 알려드립니다. 
                승인되시면 무료로 베타 버전을 사용하실 수 있으며, 피드백을 통해 시스템 개선에 참여하실 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};