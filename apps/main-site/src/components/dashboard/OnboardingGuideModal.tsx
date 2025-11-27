/**
 * Phase 3-2: Onboarding Guide Modal
 *
 * Shows a step-by-step guide for newly approved Seller/Supplier users
 * Helps users understand and complete essential setup tasks
 */

import React, { useState } from 'react';
import { X, CheckCircle, Circle, ChevronRight, Rocket } from 'lucide-react';
import { authClient } from '@o4o/auth-client';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  icon: string;
}

interface OnboardingGuideModalProps {
  role: 'seller' | 'supplier';
  onClose: () => void;
}

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({ role, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Define steps based on role
  const sellerSteps: OnboardingStep[] = [
    {
      id: 'profile',
      title: '프로필 완성하기',
      description: '사업자 정보와 연락처를 입력하여 신뢰도를 높이세요. 필수 정보를 모두 입력하면 구매자에게 더 신뢰감을 줄 수 있습니다.',
      actionLabel: '프로필 완성하기',
      actionUrl: '/account/profile',
      icon: '👤'
    },
    {
      id: 'settlement',
      title: '정산 계좌 등록',
      description: '판매 수익을 받을 계좌를 등록하세요. 정산 계좌가 등록되어야 판매 대금을 수령할 수 있습니다.',
      actionLabel: '계좌 등록하기',
      actionUrl: '/dashboard/seller#settlements',
      icon: '💰'
    },
    {
      id: 'products',
      title: '첫 상품 등록',
      description: '공급자의 상품을 선택하여 판매를 시작하세요. 카테고리별 인기 상품을 먼저 등록해보세요.',
      actionLabel: '상품 등록하기',
      actionUrl: '/dashboard/seller#products',
      icon: '📦'
    },
    {
      id: 'policies',
      title: '이용 약관 확인',
      description: '판매자 이용 약관과 정책을 확인하세요. 서비스 이용에 필요한 정책과 수수료 구조를 이해할 수 있습니다.',
      actionLabel: '약관 확인하기',
      actionUrl: '/policies',
      icon: '📋'
    }
  ];

  const supplierSteps: OnboardingStep[] = [
    {
      id: 'profile',
      title: '프로필 완성하기',
      description: '사업자 정보와 연락처를 입력하여 파트너십 신뢰도를 높이세요. 완전한 프로필은 판매자와의 협업에 필수입니다.',
      actionLabel: '프로필 완성하기',
      actionUrl: '/account/profile',
      icon: '👤'
    },
    {
      id: 'settlement',
      title: '정산 계좌 등록',
      description: '공급 대금을 받을 계좌를 등록하세요. 정산 계좌가 등록되어야 공급 대금을 수령할 수 있습니다.',
      actionLabel: '계좌 등록하기',
      actionUrl: '/dashboard/supplier#settlements',
      icon: '💰'
    },
    {
      id: 'products',
      title: '첫 상품 등록',
      description: '공급할 상품을 등록하여 판매자에게 제공하세요. 상품 정보가 상세할수록 판매자의 관심이 높아집니다.',
      actionLabel: '상품 등록하기',
      actionUrl: '/dashboard/supplier#products',
      icon: '📦'
    },
    {
      id: 'policies',
      title: '이용 약관 확인',
      description: '공급자 이용 약관과 정책을 확인하세요. 정산 주기, 수수료 구조 등을 이해할 수 있습니다.',
      actionLabel: '약관 확인하기',
      actionUrl: '/policies',
      icon: '📋'
    }
  ];

  const steps = role === 'seller' ? sellerSteps : supplierSteps;
  const roleDisplayName = role === 'seller' ? '판매자' : '공급자';

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      setCompleting(true);

      // Call API to mark onboarding as completed
      await authClient.api.put('/api/user/onboarding/complete');

      // Close modal
      onClose();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Still close modal even if API fails - user can always re-open onboarding from help
      onClose();
    } finally {
      setCompleting(false);
    }
  };

  const handleSkip = async () => {
    if (confirm('지금 건너뛰시겠습니까? 언제든지 도움말에서 다시 확인할 수 있습니다.')) {
      await handleComplete();
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">{roleDisplayName} 시작 가이드</h2>
              <p className="text-blue-100 text-sm mt-1">
                환영합니다! 아래 단계를 따라 서비스를 시작하세요.
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 h-1 rounded-full transition-all ${
                  index <= currentStep ? 'bg-white' : 'bg-blue-400'
                }`}
              ></div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step Icon and Title */}
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{currentStepData.icon}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Step List */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
              <span className="font-medium">진행 상황</span>
              <span>
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-2 rounded transition-colors ${
                    index === currentStep ? 'bg-blue-50' : ''
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle
                      className={`w-5 h-5 flex-shrink-0 ${
                        index === currentStep ? 'text-blue-600' : 'text-gray-300'
                      }`}
                    />
                  )}
                  <span
                    className={`text-sm ${
                      index === currentStep
                        ? 'text-blue-900 font-medium'
                        : index < currentStep
                        ? 'text-gray-500 line-through'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <a
            href={currentStepData.actionUrl}
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center mb-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex items-center justify-center gap-2">
              <span>{currentStepData.actionLabel}</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </a>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-between bg-gray-50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              건너뛰기
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {completing ? '완료 중...' : '가이드 완료'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuideModal;
