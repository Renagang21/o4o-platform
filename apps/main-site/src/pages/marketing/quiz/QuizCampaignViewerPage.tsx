/**
 * QuizCampaignViewerPage
 *
 * Quiz campaign viewer for main-site users.
 * Displays quiz questions and handles user responses.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getQuizCampaign,
  recordQuizAttempt,
  type QuizCampaign,
  type QuizQuestion,
  type QuizOption,
  type QuizReward,
} from '@/lib/api/quizCampaignApi';
import { useAuth } from '@/context';

interface QuizState {
  currentQuestionIndex: number;
  answers: Record<string, string[]>;
  isComplete: boolean;
  score: number;
  totalPoints: number;
  passed: boolean;
  startTime: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function QuizCampaignViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<QuizCampaign | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [quizState, setQuizState] = useState<QuizState>({
    currentQuestionIndex: 0,
    answers: {},
    isComplete: false,
    score: 0,
    totalPoints: 0,
    passed: false,
    startTime: Date.now(),
  });

  useEffect(() => {
    async function fetchCampaign() {
      if (!id) return;

      setLoading(true);
      const response = await getQuizCampaign(id);

      if (response.success && response.data) {
        setCampaign(response.data);

        // Process questions
        let processedQuestions = [...response.data.questions];

        // Shuffle questions if enabled
        if (response.data.shuffleQuestions) {
          processedQuestions = shuffleArray(processedQuestions);
        }

        // Shuffle options if enabled
        if (response.data.shuffleOptions) {
          processedQuestions = processedQuestions.map((q) => ({
            ...q,
            options: shuffleArray(q.options),
          }));
        }

        setQuestions(processedQuestions);
        setQuizState((prev) => ({
          ...prev,
          startTime: Date.now(),
        }));
      } else {
        setError(response.error || 'Failed to load quiz campaign');
      }

      setLoading(false);
    }

    fetchCampaign();
  }, [id]);

  const currentQuestion = questions[quizState.currentQuestionIndex];

  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (!currentQuestion || quizState.isComplete) return;

      setQuizState((prev) => {
        const currentAnswers = prev.answers[currentQuestion.id] || [];

        let newAnswers: string[];
        if (currentQuestion.type === 'multiple_choice') {
          // Toggle selection for multiple choice
          if (currentAnswers.includes(optionId)) {
            newAnswers = currentAnswers.filter((id) => id !== optionId);
          } else {
            newAnswers = [...currentAnswers, optionId];
          }
        } else {
          // Single selection for single choice and true/false
          newAnswers = [optionId];
        }

        return {
          ...prev,
          answers: {
            ...prev.answers,
            [currentQuestion.id]: newAnswers,
          },
        };
      });
    },
    [currentQuestion, quizState.isComplete]
  );

  const handleNext = useCallback(() => {
    if (quizState.currentQuestionIndex < questions.length - 1) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
      }));
    }
  }, [quizState.currentQuestionIndex, questions.length]);

  const handlePrevious = useCallback(() => {
    if (quizState.currentQuestionIndex > 0) {
      setQuizState((prev) => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1,
      }));
    }
  }, [quizState.currentQuestionIndex]);

  const calculateScore = useCallback(() => {
    let score = 0;
    let totalPoints = 0;

    for (const question of questions) {
      totalPoints += question.points;
      const userAnswers = quizState.answers[question.id] || [];
      const correctAnswers = question.correctAnswers;

      // Check if answers match exactly
      const isCorrect =
        userAnswers.length === correctAnswers.length &&
        userAnswers.every((a) => correctAnswers.includes(a));

      if (isCorrect) {
        score += question.points;
      }
    }

    return { score, totalPoints };
  }, [questions, quizState.answers]);

  const handleSubmit = useCallback(async () => {
    if (!campaign || !user) return;

    setSubmitting(true);

    const { score, totalPoints } = calculateScore();
    const scorePercent = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const passed = scorePercent >= campaign.passScorePercent;
    const timeSpentSeconds = Math.floor((Date.now() - quizState.startTime) / 1000);

    // Record the attempt
    await recordQuizAttempt(campaign.id, {
      userId: user.id,
      answers: quizState.answers,
      score,
      totalPoints,
      passed,
      timeSpentSeconds,
    });

    setQuizState((prev) => ({
      ...prev,
      isComplete: true,
      score,
      totalPoints,
      passed,
    }));

    setSubmitting(false);
  }, [campaign, user, quizState.answers, quizState.startTime, calculateScore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="mt-2 text-gray-600">{error || 'Quiz not found'}</p>
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

  // Quiz Complete View
  if (quizState.isComplete) {
    const scorePercent =
      quizState.totalPoints > 0
        ? Math.round((quizState.score / quizState.totalPoints) * 100)
        : 0;

    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Quiz Complete!</h1>

          <div
            className={`text-6xl font-bold mb-4 ${
              quizState.passed ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {scorePercent}%
          </div>

          <p className="text-lg mb-2">
            Score: {quizState.score} / {quizState.totalPoints} points
          </p>

          <div
            className={`inline-block px-4 py-2 rounded-full text-white font-semibold mb-6 ${
              quizState.passed ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            {quizState.passed ? 'PASSED' : 'NOT PASSED'}
          </div>

          {campaign.showCorrectAnswers && (
            <div className="mt-8 text-left">
              <h3 className="text-lg font-semibold mb-4">Review Answers:</h3>
              {questions.map((question, index) => {
                const userAnswers = quizState.answers[question.id] || [];
                const isCorrect =
                  userAnswers.length === question.correctAnswers.length &&
                  userAnswers.every((a) => question.correctAnswers.includes(a));

                return (
                  <div
                    key={question.id}
                    className={`p-4 mb-4 rounded-lg ${
                      isCorrect ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <p className="font-medium mb-2">
                      {index + 1}. {question.question}
                    </p>
                    <div className="ml-4">
                      <p className="text-sm text-gray-600">
                        Your answer:{' '}
                        {userAnswers
                          .map(
                            (answerId: string) =>
                              question.options.find((o: QuizOption) => o.id === answerId)?.text
                          )
                          .join(', ') || 'No answer'}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-green-600">
                          Correct answer:{' '}
                          {question.correctAnswers
                            .map(
                              (answerId: string) =>
                                question.options.find((o: QuizOption) => o.id === answerId)?.text
                            )
                            .join(', ')}
                        </p>
                      )}
                      {question.explanation && (
                        <p className="text-sm text-gray-500 mt-2 italic">
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {campaign.rewards.length > 0 && quizState.passed && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-2">Earned Rewards:</h3>
              {campaign.rewards
                .filter((r: QuizReward) => scorePercent >= r.minScorePercent)
                .map((reward: QuizReward, index: number) => (
                  <p key={index} className="text-sm">
                    {reward.type}: {reward.value}
                    {reward.description && ` - ${reward.description}`}
                  </p>
                ))}
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

  // Quiz Question View
  const selectedAnswers = quizState.answers[currentQuestion?.id] || [];
  const isLastQuestion = quizState.currentQuestionIndex === questions.length - 1;

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
              Question {quizState.currentQuestionIndex + 1} of {questions.length}
            </span>
            <span>{currentQuestion?.points} points</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{
                width: `${
                  ((quizState.currentQuestionIndex + 1) / questions.length) * 100
                }%`,
              }}
            />
          </div>
        </div>

        {/* Question */}
        {currentQuestion && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">{currentQuestion.question}</h2>

            <div className="space-y-3">
              {currentQuestion.options.map((option: QuizOption) => {
                const isSelected = selectedAnswers.includes(option.id);
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
                        className={`w-5 h-5 mr-3 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-600' : 'border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-3 h-3 rounded-full bg-blue-600" />
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

            {currentQuestion.type === 'multiple_choice' && (
              <p className="text-sm text-gray-500 mt-3">
                Select all that apply
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevious}
            disabled={quizState.currentQuestionIndex === 0}
            className={`px-4 py-2 rounded ${
              quizState.currentQuestionIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedAnswers.length === 0}
              className={`px-6 py-2 rounded text-white ${
                submitting || selectedAnswers.length === 0
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={selectedAnswers.length === 0}
              className={`px-6 py-2 rounded text-white ${
                selectedAnswers.length === 0
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
