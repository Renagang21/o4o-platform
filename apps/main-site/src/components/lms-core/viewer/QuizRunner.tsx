/**
 * QuizRunner Component
 *
 * Quiz 실행 UI 컴포넌트
 * - 질문 순서대로 표시
 * - 객관식/다중선택/주관식 지원
 * - 타이머 지원 (optional)
 * - 결과 표시
 */

import { useState, useEffect } from 'react';
import type { Quiz, QuizAttempt } from '@/lib/api/contentBundleApi';
import { quizApi } from '@/lib/api/contentBundleApi';
import { engagementApi } from '@/lib/api/engagementApi';

interface QuizRunnerProps {
  quiz: Quiz;
  bundleId?: string;
  onComplete?: (attempt: QuizAttempt) => void;
  onClose?: () => void;
}

type QuizState = 'intro' | 'in_progress' | 'completed';

export function QuizRunner({ quiz, bundleId, onComplete, onClose }: QuizRunnerProps) {
  const [state, setState] = useState<QuizState>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  // Timer effect
  useEffect(() => {
    if (state !== 'in_progress' || !quiz.timeLimit) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 0) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state, quiz.timeLimit]);

  const handleStart = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await quizApi.startAttempt(quiz.id);
      if (response.success && response.data) {
        setAttempt(response.data);
        setState('in_progress');
        if (quiz.timeLimit) {
          setTimeLeft(quiz.timeLimit * 60); // Convert minutes to seconds
        }
      } else {
        setError(response.error || '퀴즈를 시작할 수 없습니다.');
      }
    } catch (err) {
      setError('퀴즈를 시작하는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
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
    if (!attempt) return;

    setLoading(true);
    setError(null);

    try {
      // Submit all answers
      for (const [questionId, answer] of Object.entries(answers)) {
        await quizApi.submitAnswer(attempt.id, questionId, answer);
      }

      // Complete the attempt
      const response = await quizApi.completeAttempt(attempt.id);
      if (response.success && response.data) {
        setResult(response.data);
        setState('completed');

        // Log engagement
        await engagementApi.logQuizSubmit(
          bundleId,
          quiz.id,
          response.data.score || 0,
          response.data.passed || false,
          Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }))
        );

        onComplete?.(response.data);
      } else {
        setError(response.error || '퀴즈 제출에 실패했습니다.');
      }
    } catch (err) {
      setError('퀴즈 제출 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Intro Screen
  if (state === 'intro') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{quiz.title}</h2>
        {quiz.description && (
          <p className="text-gray-600 mb-6">{quiz.description}</p>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">퀴즈 정보</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="text-gray-400">문항 수:</span>
              <span className="font-medium">{totalQuestions}문항</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-gray-400">합격 점수:</span>
              <span className="font-medium">{quiz.passingScore}점 이상</span>
            </li>
            {quiz.timeLimit && (
              <li className="flex items-center gap-2">
                <span className="text-gray-400">제한 시간:</span>
                <span className="font-medium">{quiz.timeLimit}분</span>
              </li>
            )}
            {quiz.maxAttempts && (
              <li className="flex items-center gap-2">
                <span className="text-gray-400">최대 시도:</span>
                <span className="font-medium">{quiz.maxAttempts}회</span>
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
            {loading ? '시작 중...' : '퀴즈 시작'}
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{quiz.title}</h2>
            {timeLeft !== null && (
              <div className={`font-mono text-lg ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}`}>
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
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
            <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded mb-3">
              문제 {currentQuestionIndex + 1}
            </span>
            <h3 className="text-lg font-medium text-gray-900">{currentQuestion.question}</h3>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.type === 'text' ? (
              <textarea
                value={(answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="답변을 입력하세요..."
                className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            ) : currentQuestion.type === 'single' ? (
              currentQuestion.options?.map((option, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-gray-900">{option}</span>
                </label>
              ))
            ) : currentQuestion.type === 'multi' ? (
              currentQuestion.options?.map((option, idx) => {
                const selectedAnswers = (answers[currentQuestion.id] as string[]) || [];
                const isSelected = selectedAnswers.includes(option);
                return (
                  <label
                    key={idx}
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={option}
                      checked={isSelected}
                      onChange={() => {
                        const newAnswers = isSelected
                          ? selectedAnswers.filter((a) => a !== option)
                          : [...selectedAnswers, option];
                        handleAnswerChange(currentQuestion.id, newAnswers);
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-gray-900">{option}</span>
                  </label>
                );
              })
            ) : null}
          </div>
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
  if (state === 'completed' && result) {
    const isPassed = result.passed;
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              isPassed ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            <span className="text-3xl">{isPassed ? '🎉' : '😔'}</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isPassed ? '축하합니다!' : '아쉽네요'}
          </h2>
          <p className="text-gray-600">
            {isPassed
              ? '퀴즈를 성공적으로 완료했습니다.'
              : '합격 점수에 도달하지 못했습니다.'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {result.score?.toFixed(0) || 0}점
              </div>
              <div className="text-sm text-gray-500">획득 점수</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {quiz.passingScore}점
              </div>
              <div className="text-sm text-gray-500">합격 기준</div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">정답 수</span>
              <span className="font-medium">
                {result.earnedPoints} / {result.totalPoints}
              </span>
            </div>
            {result.timeSpent && (
              <div className="flex justify-between text-sm mt-2">
                <span className="text-gray-500">소요 시간</span>
                <span className="font-medium">
                  {Math.floor(result.timeSpent / 60)}분 {result.timeSpent % 60}초
                </span>
              </div>
            )}
          </div>
        </div>

        {quiz.showCorrectAnswers && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">정답 확인</h3>
            <div className="space-y-3">
              {quiz.questions.map((q, idx) => {
                const userAnswer = answers[q.id];
                const isCorrect = result.answers?.find((a) => a.questionId === q.id)?.isCorrect;
                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg border ${
                      isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{idx + 1}. {q.question}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          내 답변: {Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer || '(미응답)'}
                        </p>
                        {!isCorrect && q.answer && (
                          <p className="text-sm text-green-600 mt-1">
                            정답: {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

export default QuizRunner;
