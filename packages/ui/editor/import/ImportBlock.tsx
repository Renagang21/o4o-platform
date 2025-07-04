import React from 'react';
import { CheckCircle2, AlertCircle, Loader2, Clock, Download } from 'lucide-react';

export interface ImportStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  error?: string;
}

interface ImportBlockProps {
  title: string;
  description: string;
  steps: ImportStep[];
  onCancel?: () => void;
  progress?: number; // 0-100 percentage
}

export function ImportBlock({ 
  title, 
  description, 
  steps, 
  onCancel, 
  progress = 0 
}: ImportBlockProps) {
  const getStepIcon = (status: ImportStep['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'loading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepStatusColor = (status: ImportStep['status']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-500';
      case 'loading':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const isImporting = steps.some(step => step.status === 'loading');
  const hasErrors = steps.some(step => step.status === 'error');

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Download className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isImporting}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
        )}
      </div>

      {/* 전체 진행률 */}
      {progress > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">전체 진행률</span>
            <span className="text-gray-900 font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 단계별 진행 상황 */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getStepIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${getStepStatusColor(step.status)}`}>
                {step.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {step.description}
              </div>
              {step.status === 'error' && step.error && (
                <div className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded border border-red-200">
                  <strong>오류:</strong> {step.error}
                </div>
              )}
            </div>
            {step.status === 'completed' && (
              <div className="flex-shrink-0 text-xs text-green-600 font-medium">
                완료
              </div>
            )}
            {step.status === 'loading' && (
              <div className="flex-shrink-0 text-xs text-blue-600 font-medium">
                진행 중...
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 하단 상태 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        {isImporting && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>가져오기 진행 중...</span>
          </div>
        )}
        {hasErrors && !isImporting && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>일부 단계에서 오류가 발생했습니다.</span>
          </div>
        )}
        {!isImporting && !hasErrors && steps.every(step => step.status === 'completed') && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>가져오기가 성공적으로 완료되었습니다!</span>
          </div>
        )}
      </div>
    </div>
  );
}

// 사전 정의된 가져오기 단계들
export const createWordPressImportSteps = (url: string): ImportStep[] => [
  {
    id: 'fetch',
    name: 'WordPress 페이지 가져오기',
    description: `${url}에서 HTML 콘텐츠를 다운로드합니다.`,
    status: 'pending'
  },
  {
    id: 'parse',
    name: 'HTML 구조 분석',
    description: '콘텐츠 영역을 식별하고 불필요한 요소를 제거합니다.',
    status: 'pending'
  },
  {
    id: 'clean',
    name: '콘텐츠 정리',
    description: '스크립트, 스타일 및 메타데이터를 정리합니다.',
    status: 'pending'
  },
  {
    id: 'convert',
    name: 'Tiptap 블록 변환',
    description: 'HTML 요소를 Tiptap 에디터 블록으로 변환합니다.',
    status: 'pending'
  },
  {
    id: 'extensions',
    name: '필요한 확장 로딩',
    description: '변환된 블록에 필요한 Tiptap 확장을 자동으로 로딩합니다.',
    status: 'pending'
  },
  {
    id: 'insert',
    name: '에디터에 삽입',
    description: '변환된 블록을 에디터에 삽입합니다.',
    status: 'pending'
  }
];

export const createHtmlImportSteps = (): ImportStep[] => [
  {
    id: 'validate',
    name: 'HTML 유효성 검사',
    description: '입력된 HTML 코드의 구조를 검증합니다.',
    status: 'pending'
  },
  {
    id: 'sanitize',
    name: '보안 검사',
    description: '악성 스크립트 및 위험한 요소를 제거합니다.',
    status: 'pending'
  },
  {
    id: 'convert',
    name: 'Tiptap 블록 변환',
    description: 'HTML 요소를 Tiptap 에디터 블록으로 변환합니다.',
    status: 'pending'
  },
  {
    id: 'extensions',
    name: '필요한 확장 로딩',
    description: '변환된 블록에 필요한 Tiptap 확장을 자동으로 로딩합니다.',
    status: 'pending'
  },
  {
    id: 'insert',
    name: '에디터에 삽입',
    description: '변환된 블록을 에디터에 삽입합니다.',
    status: 'pending'
  }
];

export const createMarkdownImportSteps = (): ImportStep[] => [
  {
    id: 'parse',
    name: '마크다운 파싱',
    description: '마크다운 문법을 분석하고 구조화합니다.',
    status: 'pending'
  },
  {
    id: 'convert',
    name: 'HTML 변환',
    description: '마크다운을 HTML로 변환합니다.',
    status: 'pending'
  },
  {
    id: 'tiptap',
    name: 'Tiptap 블록 변환',
    description: 'HTML을 Tiptap 에디터 블록으로 변환합니다.',
    status: 'pending'
  },
  {
    id: 'extensions',
    name: '필요한 확장 로딩',
    description: '변환된 블록에 필요한 Tiptap 확장을 자동으로 로딩합니다.',
    status: 'pending'
  },
  {
    id: 'insert',
    name: '에디터에 삽입',
    description: '변환된 블록을 에디터에 삽입합니다.',
    status: 'pending'
  }
];