/**
 * SurveyCampaignViewerPage
 *
 * Survey campaign viewer for main-site users.
 * Displays survey questions and handles user responses.
 *
 * Phase R8: Survey Campaign Module
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getSurveyCampaign,
  submitSurveyResponse,
  type SurveyCampaign,
  type SurveyQuestion,
  type SurveyQuestionOption,
  type SurveyAnswer,
} from '@/lib/api/surveyCampaignApi';
import { useAuth } from '@/context';

interface SurveyState {
  currentQuestionIndex: number;
  answers: Record<string, string | string[] | number>;
  isComplete: boolean;
  startTime: number;
}

export default function SurveyCampaignViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const [surveyState, setSurveyState] = useState<SurveyState>({
    currentQuestionIndex: 0,
    answers: {},
    isComplete: false,
    startTime: Date.now(),
  });

  useEffect(() => {
    async function fetchCampaign() {
      if (!id) return;

      setLoading(true);
      const response = await getSurveyCampaign(id);

      if (response.success && response.data) {
        setCampaign(response.data);

        // Sort questions by order
        const sortedQuestions = [...response.data.questions].sort(
          (a, b) => a.order - b.order
        );
        setQuestions(sortedQuestions);

        setSurveyState((prev) => ({
          ...prev,
          startTime: Date.now(),
        }));
      } else {
        setError(response.error || 'Failed to load survey campaign');
      }

      setLoading(false);
    }

    fetchCampaign();
  }, [id]);

  const currentQuestion = questions[surveyState.currentQuestionIndex];

  const handleTextChange = useCallback(
    (value: string) => {
      if (!currentQuestion || surveyState.isComplete) return;

      setSurveyState((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [currentQuestion.id]: value,
        },
      }));
    },
    [currentQuestion, surveyState.isComplete]
  );

  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (!currentQuestion || surveyState.isComplete) return;

      setSurveyState((prev) => {
        const currentAnswer = prev.answers[currentQuestion.id];

        let newAnswer: string | string[];
        if (currentQuestion.type === 'multiple_choice') {
          // Toggle selection for multiple choice
          const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];
          if (currentArray.includes(optionId)) {
            newAnswer = currentArray.filter((id) => id !== optionId);
          } else {
            newAnswer = [...currentArray, optionId];
          }
        } else {
          // Single selection for single choice
          newAnswer = optionId;
        }

        return {
          ...prev,
          answers: {
            ...prev.answers,
            [currentQuestion.id]: newAnswer,
          },
        };
      });
    },
    [currentQuestion, surveyState.isComplete]
  );

  const handleRatingSelect = useCallback(
    (value: number) => {
      if (!currentQuestion || surveyState.isComplete) return;

      setSurveyState((prev) => ({
        ...prev,
        answers: {
          ...prev.answers,
          [currentQuestion.id]: value,
        },
      }));
    },
    [currentQuestion, surveyState.isComplete]
  );

  const handleNext = useCallback(() => {
    if (surveyState.currentQuestionIndex < questions.length - 1) {
      setSurveyState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    }
  }, [surveyState.currentQuestionIndex, questions.length]);

  const handlePrevious = useCallback(() => {
    if (surveyState.currentQuestionIndex > 0) {
      setSurveyState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
      }));
    }
  }, [surveyState.currentQuestionIndex]);

  const handleSubmit = useCallback(async () => {
    if (!campaign) return;

    setSubmitting(true);

    // Build answers array
    const answers: SurveyAnswer[] = questions.map((q) => ({
      questionId: q.id,
      value: surveyState.answers[q.id] ?? '',
    }));

    // Submit the response
    const result = await submitSurveyResponse(campaign.id, {
      userId: user?.id,
      isAnonymous: !user,
      answers,
    });

    if (result.success) {
      setSurveyState((prev) => ({
        ...prev,
        isComplete: true,
      }));
      setSubmitResult({ success: true, message: result.message || 'Survey submitted successfully!' });
    } else {
      setSubmitResult({ success: false, message: result.error || 'Failed to submit survey' });
    }

    setSubmitting(false);
  }, [campaign, user, questions, surveyState.answers]);

  const isCurrentQuestionAnswered = useCallback(() => {
    if (!currentQuestion) return false;

    const answer = surveyState.answers[currentQuestion.id];

    if (!currentQuestion.required) return true;

    if (answer === undefined || answer === null || answer === '') return false;

    if (Array.isArray(answer)) {
      return answer.length > 0;
    }

    return true;
  }, [currentQuestion, surveyState.answers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="mt-2 text-gray-600">{error || 'Survey not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Survey Complete View
  if (surveyState.isComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">
            {submitResult?.success ? 'Thank you!' : 'Oops!'}
          </div>

          <h1 className="text-2xl font-bold mb-4">
            {submitResult?.success ? 'Survey Completed!' : 'Submission Failed'}
          </h1>

          <p className="text-lg text-gray-600 mb-6">
            {submitResult?.message}
          </p>

          {campaign.reward && submitResult?.success && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">Your Reward:</h3>
              <p className="text-sm">
                {campaign.reward.type}: {campaign.reward.value}
                {campaign.reward.description && ` - ${campaign.reward.description}`}
              </p>
            </div>
          )}

          <button
            onClick={() => navigate(-1)}
            className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return
          </button>
        </div>
      </div>
    );
  }

  // Survey Question View
  const isLastQuestion = surveyState.currentQuestionIndex === questions.length - 1;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">{campaign.title}</h1>
          {campaign.description && (
            <p className="text-gray-600 mt-2">{campaign.description}</p>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Question {surveyState.currentQuestionIndex + 1} of {questions.length}
            </span>
            {currentQuestion?.required && (
              <span className="text-red-500">Required</span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${
                  ((surveyState.currentQuestionIndex + 1) / questions.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Question */}
        {currentQuestion && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">{currentQuestion.question}</h2>
            {currentQuestion.description && (
              <p className="text-gray-500 text-sm mb-4">{currentQuestion.description}</p>
            )}

            {/* Single Choice / Multiple Choice */}
            {(currentQuestion.type === 'single_choice' ||
              currentQuestion.type === 'multiple_choice') &&
              currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option: SurveyQuestionOption) => {
                    const answer = surveyState.answers[currentQuestion.id];
                    const isSelected = Array.isArray(answer)
                      ? answer.includes(option.id)
                      : answer === option.id;

                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(option.id)}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-5 h-5 mr-3 ${
                              currentQuestion.type === 'multiple_choice'
                                ? 'rounded'
                                : 'rounded-full'
                            } border-2 flex items-center justify-center ${
                              isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                          <span>{option.text}</span>
                        </div>
                        {option.imageUrl && (
                          <img
                            src={option.imageUrl}
                            alt=""
                            className="mt-3 max-h-40 rounded"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

            {/* Text Input */}
            {currentQuestion.type === 'text' && (
              <input
                type="text"
                value={(surveyState.answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={currentQuestion.placeholder || 'Enter your answer'}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {/* Textarea */}
            {currentQuestion.type === 'textarea' && (
              <textarea
                value={(surveyState.answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={currentQuestion.placeholder || 'Enter your answer'}
                rows={4}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {/* Rating */}
            {currentQuestion.type === 'rating' && (
              <div className="flex justify-center space-x-2">
                {Array.from(
                  { length: (currentQuestion.maxValue || 5) - (currentQuestion.minValue || 1) + 1 },
                  (_, i) => i + (currentQuestion.minValue || 1)
                ).map((value) => {
                  const isSelected = surveyState.answers[currentQuestion.id] === value;
                  return (
                    <button
                      key={value}
                      onClick={() => handleRatingSelect(value)}
                      className={`w-12 h-12 rounded-full text-lg font-semibold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Scale */}
            {currentQuestion.type === 'scale' && (
              <div>
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>{currentQuestion.minLabel || currentQuestion.minValue || 1}</span>
                  <span>{currentQuestion.maxLabel || currentQuestion.maxValue || 10}</span>
                </div>
                <input
                  type="range"
                  min={currentQuestion.minValue || 1}
                  max={currentQuestion.maxValue || 10}
                  value={(surveyState.answers[currentQuestion.id] as number) || currentQuestion.minValue || 1}
                  onChange={(e) => handleRatingSelect(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center mt-2 text-lg font-semibold">
                  {surveyState.answers[currentQuestion.id] || currentQuestion.minValue || 1}
                </div>
              </div>
            )}

            {/* Date */}
            {currentQuestion.type === 'date' && (
              <input
                type="date"
                value={(surveyState.answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleTextChange(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {/* Email */}
            {currentQuestion.type === 'email' && (
              <input
                type="email"
                value={(surveyState.answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={currentQuestion.placeholder || 'email@example.com'}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {/* Phone */}
            {currentQuestion.type === 'phone' && (
              <input
                type="tel"
                value={(surveyState.answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={currentQuestion.placeholder || '010-0000-0000'}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {currentQuestion.type === 'multiple_choice' && (
              <p className="text-sm text-gray-500 mt-3">Select all that apply</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={surveyState.currentQuestionIndex === 0}
            className={`px-4 py-2 rounded ${
              surveyState.currentQuestionIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !isCurrentQuestionAnswered()}
              className={`px-6 py-2 rounded text-white ${
                submitting || !isCurrentQuestionAnswered()
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Survey'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!isCurrentQuestionAnswered()}
              className={`px-6 py-2 rounded text-white ${
                !isCurrentQuestionAnswered()
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
