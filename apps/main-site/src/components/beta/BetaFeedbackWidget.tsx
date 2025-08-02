import { Component, FC, FormEvent, useEffect, useState } from 'react';
import { BetaFeedbackModal } from './BetaFeedbackModal';
import { BetaRegistrationModal } from './BetaRegistrationModal';
import { useToast } from '../../hooks/useToast';

interface BetaFeedbackWidgetProps {
  page?: string;
  feature?: string;
  className?: string;
}

export const BetaFeedbackWidget: FC<BetaFeedbackWidgetProps> = ({
  page = 'signage',
  feature,
  className
}) => {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [betaUserEmail, setBetaUserEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState<string>('general_feedback');

  const handleQuickFeedback = (type: string) => {
    const email = localStorage.getItem('betaUserEmail');
    if (!email) {
      showToast('베타 프로그램에 먼저 등록해주세요.', 'warning');
      setShowRegistrationModal(true);
      return;
    }

    setBetaUserEmail(email);
    setFeedbackType(type);
    setShowFeedbackModal(true);
    setIsExpanded(false);
  };

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!betaUserEmail) {
      showToast('이메일을 입력해주세요.', 'error');
      return;
    }

    // Store email for convenience
    localStorage.setItem('betaUserEmail', betaUserEmail);
    setShowFeedbackModal(true);
    setIsExpanded(false);
  };

  const handleRegistrationSuccess = () => {
    showToast('베타 등록이 완료되었습니다! 이제 피드백을 제출할 수 있습니다.', 'success');
  };

  const quickFeedbackButtons = [
    {
      type: 'bug_report',
      label: '🐛 버그 신고',
      color: 'bg-red-500 hover:bg-red-600',
      description: '문제나 오류를 발견했어요'
    },
    {
      type: 'feature_request',
      label: '✨ 기능 요청',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: '새로운 기능이 필요해요'
    },
    {
      type: 'usability',
      label: '🎯 사용성',
      color: 'bg-green-500 hover:bg-green-600',
      description: '더 쉽게 사용하고 싶어요'
    },
    {
      type: 'general_feedback',
      label: '💬 일반 피드백',
      color: 'bg-purple-500 hover:bg-purple-600',
      description: '전반적인 의견을 전하고 싶어요'
    }
  ];

  if (!isExpanded) {
    return (
      <>
        <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
          <button
            onClick={() => setIsExpanded(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
            title="베타 피드백 보내기"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
          </button>
        </div>

        <BetaFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
          onSuccess={() => showToast('피드백이 제출되었습니다. 감사합니다!', 'success')}
          initialData={{
            betaUserEmail,
            type: feedbackType as 'bug_report' | 'feature_request' | 'general_feedback' | 'usability' | 'performance' | 'suggestion' | 'complaint',
            feature,
            currentUrl: window.location.href
          }}
        />

        <BetaRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          onSuccess={handleRegistrationSuccess}
        />
      </>
    );
  }

  return (
    <>
      <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-80 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">베타 피드백</h3>
              <p className="text-xs text-blue-100">사이니지 시스템 개선에 도움을 주세요</p>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Quick Feedback Buttons */}
            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                빠른 피드백
              </h4>
              {quickFeedbackButtons.map((button) => (
                <button
                  key={button.type}
                  onClick={() => handleQuickFeedback(button.type)}
                  className={`w-full text-left p-3 rounded-lg text-white transition-colors ${button.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{button.label}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-xs text-white/80 mt-1">{button.description}</p>
                </button>
              ))}
            </div>

            {/* Email Input for Non-Beta Users */}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
              <form onSubmit={handleEmailSubmit}>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  베타 사용자 이메일
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={betaUserEmail}
                    onChange={(e) => setBetaUserEmail(e.target.value)}
                    placeholder="beta@example.com"
                    className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    확인
                  </button>
                </div>
              </form>
              
              <div className="mt-3 flex items-center justify-between text-xs">
                <button
                  onClick={() => setShowRegistrationModal(true)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  베타 프로그램 가입하기
                </button>
                <span className="text-gray-500 dark:text-gray-400">
                  현재 페이지: {page}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BetaFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSuccess={() => showToast('피드백이 제출되었습니다. 감사합니다!', 'success')}
        initialData={{
          betaUserEmail,
          type: feedbackType as any,
          feature,
          currentUrl: window.location.href
        }}
      />

      <BetaRegistrationModal
        isOpen={showRegistrationModal}
        onClose={() => setShowRegistrationModal(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </>
  );
};

// Beta Status Checker Component
interface BetaStatusProps {
  email: string;
  onStatusChange?: (status: { approved: boolean; betaLevel: string; accessGranted: boolean }) => void;
}

export const BetaStatusChecker: FC<BetaStatusProps> = ({
  email,
  onStatusChange
}) => {
  const [status, setStatus] = useState<{ approved: boolean; betaLevel: string; accessGranted: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/beta/status/${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
        onStatusChange?.(data.data);
      } else {
        setStatus(null);
        onStatusChange?.(null);
      }
    } catch (error) {
      console.error('Status check error:', error);
      setStatus(null);
      onStatusChange?.(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [email]);

  if (!email || loading) return null;

  if (!status) {
    return (
      <div className="text-xs text-red-600 dark:text-red-400">
        베타 프로그램 미등록
      </div>
    );
  }

  const statusColors = {
    pending: 'text-yellow-600 dark:text-yellow-400',
    approved: 'text-green-600 dark:text-green-400',
    active: 'text-blue-600 dark:text-blue-400',
    inactive: 'text-gray-600 dark:text-gray-400',
    suspended: 'text-red-600 dark:text-red-400'
  };

  const statusLabels = {
    pending: '승인 대기중',
    approved: '승인됨',
    active: '활성',
    inactive: '비활성',
    suspended: '정지됨'
  };

  return (
    <div className={`text-xs ${statusColors[status.status as keyof typeof statusColors]}`}>
      베타 상태: {statusLabels[status.status as keyof typeof statusLabels]} 
      {status.canProvideFeedback && ' ✓'}
    </div>
  );
};