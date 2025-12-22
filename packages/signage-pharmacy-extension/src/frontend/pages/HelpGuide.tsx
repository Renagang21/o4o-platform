/**
 * Help Guide Page
 *
 * Phase 3: Basic onboarding and help guide for pharmacy signage.
 * Provides step-by-step instructions and tips.
 */

import React, { useState } from 'react';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  tips: string[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'content',
    title: '1. 콘텐츠 선택',
    description: '콘텐츠 라이브러리에서 약국에 맞는 콘텐츠를 선택하세요.',
    icon: 'folder',
    tips: [
      '카테고리별로 필터링하여 원하는 콘텐츠를 쉽게 찾을 수 있습니다.',
      '선택한 콘텐츠는 플레이리스트에 추가할 수 있습니다.',
      '미리보기로 콘텐츠 내용을 확인하세요.',
    ],
  },
  {
    id: 'playlist',
    title: '2. 플레이리스트 구성',
    description: '선택한 콘텐츠를 플레이리스트로 구성하세요.',
    icon: 'list',
    tips: [
      '프리셋 템플릿을 사용하면 빠르게 시작할 수 있습니다.',
      '드래그 앤 드롭으로 순서를 변경할 수 있습니다.',
      '복제 기능으로 기존 플레이리스트를 재활용하세요.',
    ],
  },
  {
    id: 'schedule',
    title: '3. 편성표 설정',
    description: '시간대별로 다른 플레이리스트를 자동 재생하세요.',
    icon: 'calendar',
    tips: [
      '오전/오후/저녁 시간대별로 다른 콘텐츠를 설정할 수 있습니다.',
      '영업시간에 맞게 시작/종료 시간을 설정하세요.',
      '편성된 콘텐츠는 자동으로 재생됩니다.',
    ],
  },
  {
    id: 'quick-action',
    title: '4. 즉시 실행',
    description: '필요할 때 특정 플레이리스트를 즉시 재생하세요.',
    icon: 'play',
    tips: [
      '긴급 공지 기능으로 즉각적인 안내가 가능합니다.',
      '즉시 실행 후에는 자동으로 원래 편성으로 돌아갑니다.',
      '프로모션이나 특별 이벤트에 활용하세요.',
    ],
  },
];

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '플레이리스트에 콘텐츠를 추가하려면?',
    answer: '플레이리스트 편집 화면에서 "콘텐츠 추가" 버튼을 누르면 선택한 콘텐츠 목록이 표시됩니다. 먼저 콘텐츠 라이브러리에서 사용할 콘텐츠를 선택해주세요.',
  },
  {
    question: '편성표가 적용되지 않아요.',
    answer: '디스플레이가 온라인 상태인지 확인해주세요. 대시보드에서 디스플레이 연결 상태를 확인할 수 있습니다.',
  },
  {
    question: '긴급 공지를 끄려면?',
    answer: '긴급 공지 페이지에서 "공지 종료하기" 버튼을 누르면 원래 편성으로 돌아갑니다.',
  },
  {
    question: '콘텐츠를 직접 업로드할 수 있나요?',
    answer: '현재는 제공되는 콘텐츠 라이브러리에서 선택하는 방식입니다. 직접 업로드 기능은 추후 업데이트 예정입니다.',
  },
];

interface GuideStepCardProps {
  step: GuideStep;
  isExpanded: boolean;
  onToggle: () => void;
}

const GuideStepCard: React.FC<GuideStepCardProps> = ({ step, isExpanded, onToggle }) => {
  const getIcon = (icon: string) => {
    switch (icon) {
      case 'folder':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      case 'list':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'play':
        return (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
      >
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
          {getIcon(step.icon)}
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-gray-900">{step.title}</h3>
          <p className="text-sm text-gray-500">{step.description}</p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 pb-4 border-t bg-gray-50">
          <div className="pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">TIP</h4>
            <ul className="space-y-2">
              {step.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

interface FaqCardProps {
  item: FaqItem;
  isExpanded: boolean;
  onToggle: () => void;
}

const FaqCard: React.FC<FaqCardProps> = ({ item, isExpanded, onToggle }) => {
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">{item.question}</span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 text-sm text-gray-600">
          {item.answer}
        </div>
      )}
    </div>
  );
};

export const HelpGuide: React.FC = () => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set(['content']));
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">사용 가이드</h1>
        <p className="text-gray-500 mt-1">
          약국 디지털 사이니지를 효과적으로 활용하는 방법을 알아보세요
        </p>
      </div>

      {/* Quick Start */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h2 className="text-lg font-semibold mb-2">빠른 시작</h2>
          <p className="text-blue-100 mb-4">
            처음 사용하시나요? 아래 단계를 따라 쉽게 시작하세요.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="/pharmacy-signage/templates"
              className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              프리셋 템플릿으로 시작하기
            </a>
            <a
              href="/pharmacy-signage/content"
              className="px-4 py-2 bg-blue-400 text-white rounded-lg text-sm font-medium hover:bg-blue-300 transition-colors"
            >
              콘텐츠 둘러보기
            </a>
          </div>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">단계별 가이드</h2>
        <div className="space-y-3">
          {GUIDE_STEPS.map((step) => (
            <GuideStepCard
              key={step.id}
              step={step}
              isExpanded={expandedSteps.has(step.id)}
              onToggle={() => toggleStep(step.id)}
            />
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">자주 묻는 질문</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {FAQ_ITEMS.map((item, index) => (
            <FaqCard
              key={index}
              item={item}
              isExpanded={expandedFaq === index}
              onToggle={() => setExpandedFaq(expandedFaq === index ? null : index)}
            />
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-2">도움이 필요하신가요?</h2>
        <p className="text-gray-600 text-sm mb-4">
          추가 문의사항이 있으시면 관리자에게 연락해주세요.
        </p>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            support@neture.co.kr
          </span>
        </div>
      </div>
    </div>
  );
};

export default HelpGuide;
