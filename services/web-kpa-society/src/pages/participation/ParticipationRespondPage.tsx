/**
 * ParticipationRespondPage - 응답 참여 페이지
 *
 * 핵심 원칙:
 * - 사람을 평가하지 않는다
 * - 단지 묻고, 모으고, 보여줄 뿐이다
 * - 점수/등급/랭킹 개념 없음
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { participationApi } from '../../api/participation';
import { colors, typography, borderRadius } from '../../styles/theme';
import type {
  ParticipationSet,
  ParticipationQuestion,
  QuestionResponse,
  ParticipationResponse,
} from './types';
import { QuestionType, ParticipationStatus } from './types';

export function ParticipationRespondPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [set, setSet] = useState<ParticipationSet | null>(null);
  const [existingResponse, setExistingResponse] = useState<ParticipationResponse | null>(
    null
  );
  const [answers, setAnswers] = useState<Record<string, QuestionResponse>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [setResponse, responseData] = await Promise.all([
        participationApi.getParticipationSet(id!),
        participationApi.getMyResponse(id!),
      ]);

      setSet(setResponse.data);
      setExistingResponse(responseData);

      // 기존 응답이 있으면 로드
      if (responseData) {
        const existingAnswers: Record<string, QuestionResponse> = {};
        responseData.answers.forEach(answer => {
          existingAnswers[answer.questionId] = answer;
        });
        setAnswers(existingAnswers);
      }
    } catch (err) {
      console.error('Failed to load participation set:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (
    questionId: string,
    optionId: string,
    isMultiple: boolean
  ) => {
    setAnswers(prev => {
      const current = prev[questionId] || { questionId, selectedOptionIds: [] };
      let newSelected: string[];

      if (isMultiple) {
        // 복수 선택
        const currentSelected = current.selectedOptionIds || [];
        if (currentSelected.includes(optionId)) {
          newSelected = currentSelected.filter(id => id !== optionId);
        } else {
          newSelected = [...currentSelected, optionId];
        }
      } else {
        // 단일 선택
        newSelected = [optionId];
      }

      return {
        ...prev,
        [questionId]: {
          questionId,
          selectedOptionIds: newSelected,
        },
      };
    });
  };

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        textAnswer: text,
      },
    }));
  };

  const validateAnswers = (): boolean => {
    if (!set) return false;

    for (const question of set.questions) {
      if (question.isRequired) {
        const answer = answers[question.id];
        if (!answer) {
          setError(`"${question.title}" 질문에 응답해주세요.`);
          return false;
        }
        if (
          (question.type === QuestionType.SINGLE_CHOICE ||
            question.type === QuestionType.MULTIPLE_CHOICE ||
            question.type === QuestionType.QUIZ) &&
          (!answer.selectedOptionIds || answer.selectedOptionIds.length === 0)
        ) {
          setError(`"${question.title}" 질문에 응답해주세요.`);
          return false;
        }
        if (
          question.type === QuestionType.FREE_TEXT &&
          (!answer.textAnswer || !answer.textAnswer.trim())
        ) {
          setError(`"${question.title}" 질문에 응답해주세요.`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateAnswers()) return;

    setError(null);
    setSubmitting(true);

    try {
      const answersArray = Object.values(answers);
      await participationApi.submitResponse(id!, answersArray);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit response:', err);
      setError('응답 제출 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="참여 정보를 불러오는 중..." />;
  }

  if (!set) {
    return (
      <div style={styles.container}>
        <PageHeader
          title="참여"
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '참여', href: '/participation' },
          ]}
        />
        <div style={styles.notFound}>참여를 찾을 수 없습니다.</div>
      </div>
    );
  }

  if (set.status !== ParticipationStatus.ACTIVE) {
    return (
      <div style={styles.container}>
        <PageHeader
          title={set.title}
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '참여', href: '/participation' },
            { label: set.title },
          ]}
        />
        <div style={styles.closed}>
          이 참여는 {set.status === ParticipationStatus.DRAFT ? '아직 시작되지 않았습니다.' : '종료되었습니다.'}
          <Link to={`/participation/${id}/results`} style={styles.resultLink}>
            결과 보기
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <PageHeader
          title={set.title}
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '참여', href: '/participation' },
            { label: set.title },
          ]}
        />
        <Card padding="large" style={styles.successCard}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>응답이 제출되었습니다</h2>
          <p style={styles.successMessage}>
            참여해 주셔서 감사합니다.
          </p>
          <div style={styles.successActions}>
            <Link to={`/participation/${id}/results`} style={styles.viewResultsButton}>
              결과 보기
            </Link>
            <Link to="/participation" style={styles.backButton}>
              목록으로
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={set.title}
        description={set.description}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '참여', href: '/participation' },
          { label: set.title },
        ]}
      />

      {existingResponse && set.scope.allowModification && (
        <div style={styles.existingNotice}>
          이미 응답하셨습니다. 수정하시려면 아래에서 변경 후 다시 제출해주세요.
        </div>
      )}

      {existingResponse && !set.scope.allowModification && (
        <div style={styles.existingNotice}>
          이미 응답하셨습니다. 이 설문은 응답 수정이 불가합니다.
          <Link to={`/participation/${id}/results`} style={styles.resultLink}>
            결과 보기
          </Link>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {/* 응답 수정 불가 상태가 아닌 경우에만 폼 표시 */}
      {(!existingResponse || set.scope.allowModification) && (
        <>
          <div style={styles.questions}>
            {set.questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                answer={answers[question.id]}
                onOptionSelect={(optionId, isMultiple) =>
                  handleOptionSelect(question.id, optionId, isMultiple)
                }
                onTextAnswer={text => handleTextAnswer(question.id, text)}
              />
            ))}
          </div>

          <div style={styles.actions}>
            <button
              onClick={() => navigate('/participation')}
              style={styles.cancelButton}
              disabled={submitting}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              style={styles.submitButton}
              disabled={submitting}
            >
              {submitting ? '제출 중...' : '응답 제출'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 질문 카드 컴포넌트
interface QuestionCardProps {
  question: ParticipationQuestion;
  index: number;
  answer?: QuestionResponse;
  onOptionSelect: (optionId: string, isMultiple: boolean) => void;
  onTextAnswer: (text: string) => void;
}

function QuestionCard({
  question,
  index,
  answer,
  onOptionSelect,
  onTextAnswer,
}: QuestionCardProps) {
  const isMultiple = question.type === QuestionType.MULTIPLE_CHOICE;
  const isText = question.type === QuestionType.FREE_TEXT;

  return (
    <Card padding="medium" style={styles.questionCard}>
      <div style={styles.questionHeader}>
        <span style={styles.questionNumber}>Q{index + 1}</span>
        {question.isRequired && <span style={styles.requiredBadge}>필수</span>}
      </div>
      <h3 style={styles.questionTitle}>{question.title}</h3>
      {question.description && (
        <p style={styles.questionDescription}>{question.description}</p>
      )}

      {isText ? (
        <textarea
          value={answer?.textAnswer || ''}
          onChange={e => onTextAnswer(e.target.value)}
          placeholder="응답을 입력하세요"
          style={styles.textArea}
          rows={4}
        />
      ) : (
        <div style={styles.options}>
          {question.options?.map(option => {
            const isSelected = answer?.selectedOptionIds?.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => onOptionSelect(option.id, isMultiple)}
                style={{
                  ...styles.optionButton,
                  ...(isSelected ? styles.optionButtonSelected : {}),
                }}
              >
                <span style={styles.optionIndicator}>
                  {isMultiple ? (
                    isSelected ? '☑' : '☐'
                  ) : (
                    isSelected ? '●' : '○'
                  )}
                </span>
                {option.text}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  notFound: {
    textAlign: 'center',
    padding: '60px 20px',
    ...typography.bodyL,
    color: colors.neutral500,
  },
  closed: {
    textAlign: 'center',
    padding: '60px 20px',
    ...typography.bodyL,
    color: colors.neutral500,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  resultLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },
  existingNotice: {
    padding: '12px 16px',
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
    marginBottom: '24px',
    ...typography.bodyM,
    color: colors.neutral700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: colors.accentRed,
    borderRadius: borderRadius.md,
    marginBottom: '24px',
  },
  questions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  questionCard: {
    marginBottom: 0,
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  questionNumber: {
    ...typography.bodyM,
    color: colors.primary,
    fontWeight: 600,
  },
  requiredBadge: {
    padding: '2px 6px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  questionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: 0,
  },
  questionDescription: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginTop: '4px',
    marginBottom: 0,
  },
  options: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    textAlign: 'left',
    cursor: 'pointer',
    ...typography.bodyM,
    color: colors.neutral700,
    transition: 'all 0.15s ease',
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF6FF',
    color: colors.primary,
  },
  optionIndicator: {
    fontSize: '16px',
    lineHeight: 1,
  },
  textArea: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '15px',
    marginTop: '16px',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    color: colors.neutral700,
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 32px',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    color: colors.white,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  successCard: {
    textAlign: 'center',
    padding: '48px 24px',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    fontSize: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  successTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: '0 0 8px',
  },
  successMessage: {
    ...typography.bodyL,
    color: colors.neutral500,
    margin: 0,
  },
  successActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '32px',
  },
  viewResultsButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    fontSize: '14px',
    fontWeight: 500,
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    fontSize: '14px',
  },
};
