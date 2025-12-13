/**
 * SurveyRunner Component
 *
 * Survey 실행 UI 컴포넌트
 * - 다양한 질문 유형 지원 (단일선택, 다중선택, 텍스트, 평점, 척도 등)
 * - 조건부 표시 지원
 * - 진행률 표시
 */

import { useState, useEffect, useMemo } from 'react';
import type {
  Survey,
  SurveyQuestion,
  SurveyResponse,
} from '@/lib/api/contentBundleApi';
import { surveyApi } from '@/lib/api/contentBundleApi';
import { engagementApi } from '@/lib/api/engagementApi';

interface SurveyRunnerProps {
  survey: Survey;
  bundleId?: string;
  onComplete?: (response: SurveyResponse) => void;
  onClose?: () => void;
}

type SurveyState = 'intro' | 'in_progress' | 'completed';

export function SurveyRunner({ survey, bundleId, onComplete, onClose }: SurveyRunnerProps) {
  const [state, setState] = useState<SurveyState>('intro');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [response, setResponse] = useState<SurveyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Filter visible questions based on conditional display
  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (!q.conditionalDisplay) return true;
      const { questionId, operator, value } = q.conditionalDisplay;
      const answer = answers[questionId];
      if (answer === undefined) return false;

      const answerStr = String(answer);
      switch (operator) {
        case 'equals':
          return answerStr === value;
        case 'notEquals':
          return answerStr !== value;
        case 'contains':
          return Array.isArray(answer) ? answer.includes(value) : answerStr.includes(value);
        default:
          return true;
      }
    });
  }, [questions, answers]);

  const currentQuestion = visibleQuestions[currentQuestionIndex];
  const totalQuestions = visibleQuestions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Load questions on mount
  useEffect(() => {
    if (survey.questions) {
      setQuestions(survey.questions);
    } else {
      loadQuestions();
    }
  }, [survey.id]);

  const loadQuestions = async () => {
    try {
      const res = await surveyApi.getQuestions(survey.id);
      if (res.success && res.data) {
        setQuestions(res.data);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await surveyApi.startResponse(survey.id);
      if (res.success && res.data) {
        setResponse(res.data);
        setState('in_progress');
        setStartTime(Date.now());
      } else {
        setError(res.error || '설문을 시작할 수 없습니다.');
      }
    } catch (err) {
      setError('설문을 시작하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[] | number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!response) return;

    // Check required questions
    const unansweredRequired = visibleQuestions.filter(
      (q) => q.isRequired && (answers[q.id] === undefined || answers[q.id] === '')
    );

    if (unansweredRequired.length > 0) {
      setError(`필수 질문에 응답해주세요: ${unansweredRequired.map((q) => q.question.substring(0, 30) + '...').join(', ')}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Submit all answers
      for (const [questionId, value] of Object.entries(answers)) {
        await surveyApi.submitAnswer(response.id, questionId, value);
      }

      // Complete the response
      const res = await surveyApi.completeResponse(response.id);
      if (res.success && res.data) {
        setState('completed');

        // Log engagement
        await engagementApi.logSurveySubmit(bundleId, survey.id, response.id);

        onComplete?.(res.data);
      } else {
        setError(res.error || '설문 제출에 실패했습니다.');
      }
    } catch (err) {
      setError('설문 제출 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Render question input based on type
  const renderQuestionInput = (question: SurveyQuestion) => {
    const value = answers[question.id];

    switch (question.type) {
      case 'single':
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                  value === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'multi':
        const selectedValues = (value as string[]) || [];
        return (
          <div className="space-y-3">
            {question.options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => {
                      const newValues = isSelected
                        ? selectedValues.filter((v) => v !== option.value)
                        : [...selectedValues, option.value];
                      handleAnswerChange(question.id, newValues);
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-gray-900">{option.label}</span>
                </label>
              );
            })}
          </div>
        );

      case 'text':
        return (
          <textarea
            value={(value as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="답변을 입력하세요..."
            maxLength={question.maxLength}
            className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'rating':
        const stars = Array.from({ length: question.scaleMax || 5 }, (_, i) => i + 1);
        return (
          <div className="flex items-center gap-2">
            {stars.map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleAnswerChange(question.id, star)}
                className={`text-3xl transition-colors ${
                  (value as number) >= star ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400`}
              >
                ★
              </button>
            ))}
            {value && (
              <span className="ml-2 text-gray-600">{value}점</span>
            )}
          </div>
        );

      case 'scale':
        const min = question.scaleMin || 1;
        const max = question.scaleMax || 10;
        const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        return (
          <div>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>{question.scaleMinLabel || min}</span>
              <span>{question.scaleMaxLabel || max}</span>
            </div>
            <div className="flex items-center gap-2">
              {scaleValues.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleAnswerChange(question.id, num)}
                  className={`w-10 h-10 rounded-full border-2 font-medium transition-colors ${
                    value === num
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 text-gray-600 hover:border-blue-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => handleAnswerChange(question.id, Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        );

      default:
        return null;
    }
  };

  // Intro Screen
  if (state === 'intro') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{survey.title}</h2>
        {survey.description && (
          <p className="text-gray-600 mb-6">{survey.description}</p>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">설문 정보</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-gray-400">문항 수:</span>
              <span className="font-medium">{questions.length}문항</span>
            </li>
            {survey.allowAnonymous && (
              <li className="flex items-center gap-2">
                <span className="text-gray-400">익명 응답:</span>
                <span className="font-medium">가능</span>
              </li>
            )}
            {survey.endAt && (
              <li className="flex items-center gap-2">
                <span className="text-gray-400">마감일:</span>
                <span className="font-medium">
                  {new Date(survey.endAt).toLocaleDateString('ko-KR')}
                </span>
              </li>
            )}
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '시작 중...' : '설문 시작'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    );
  }

  // In Progress Screen
  if (state === 'in_progress' && currentQuestion) {
    return (
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">{survey.title}</h2>
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
              <span>진행률</span>
              <span>{currentQuestionIndex + 1} / {totalQuestions}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                문항 {currentQuestionIndex + 1}
              </span>
              {currentQuestion.isRequired && (
                <span className="inline-block bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded">
                  필수
                </span>
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900">{currentQuestion.question}</h3>
            {currentQuestion.description && (
              <p className="text-sm text-gray-500 mt-2">{currentQuestion.description}</p>
            )}
          </div>

          {/* Answer Input */}
          {renderQuestionInput(currentQuestion)}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <div className="flex gap-3">
              {isLastQuestion ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? '제출 중...' : '제출하기'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  다음
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Completed Screen
  if (state === 'completed') {
    const timeSpent = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            설문이 완료되었습니다
          </h2>
          <p className="text-gray-600">
            소중한 의견 감사합니다.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Object.keys(answers).length}
              </div>
              <div className="text-sm text-gray-500">응답 문항</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {Math.floor(timeSpent / 60)}분 {timeSpent % 60}초
              </div>
              <div className="text-sm text-gray-500">소요 시간</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default SurveyRunner;
