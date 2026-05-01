/**
 * ParticipationResultPage - 결과 보기 페이지
 *
 * 핵심 원칙:
 * - 사람을 평가하지 않는다
 * - 단지 묻고, 모으고, 보여줄 뿐이다
 * - 점수/등급/랭킹 개념 없음
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, Card } from '../../components/common';
import { participationApi } from '../../api/participation';
import { colors, typography, borderRadius } from '../../styles/theme';
import type { ParticipationSet, ParticipationResult, QuestionResult } from './types';
import { QUESTION_TYPE_LABELS, QuestionType, ParticipationStatus } from './types';

export function ParticipationResultPage() {
  const { id } = useParams<{ id: string }>();
  const [set, setSet] = useState<ParticipationSet | null>(null);
  const [result, setResult] = useState<ParticipationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [setResponse, resultResponse] = await Promise.all([
        participationApi.getParticipationSet(id!),
        participationApi.getResults(id!),
      ]);

      setSet(setResponse.data);
      setResult(resultResponse.data);
    } catch (err) {
      console.error('Failed to load results:', err);
      setError('결과를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="결과를 불러오는 중..." />;
  }

  if (error || !set || !result) {
    return (
      <div style={styles.container}>
        <PageHeader
          title="결과"
          breadcrumb={[
            { label: '홈', href: '/' },
            { label: '참여', href: '/participation' },
          ]}
        />
        <div style={styles.error}>
          {error || '결과를 찾을 수 없습니다.'}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title={`${set.title} - 결과`}
        description={set.description}
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '참여', href: '/participation' },
          { label: set.title },
          { label: '결과' },
        ]}
      />

      {/* 요약 */}
      <Card padding="medium" style={styles.summaryCard}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>{result.totalRespondents}</span>
            <span style={styles.summaryLabel}>총 응답자</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>{set.questions.length}</span>
            <span style={styles.summaryLabel}>질문 수</span>
          </div>
          <div style={styles.summaryItem}>
            <span style={styles.summaryValue}>
              {set.scope.anonymity === 'anonymous' ? '익명' : '기명'}
            </span>
            <span style={styles.summaryLabel}>응답 방식</span>
          </div>
        </div>
        <div style={styles.lastUpdated}>
          마지막 업데이트: {new Date(result.lastUpdated).toLocaleString()}
        </div>
      </Card>

      {/* 질문별 결과 */}
      <div style={styles.results}>
        {result.questionResults.map((qResult, index) => (
          <QuestionResultCard key={qResult.questionId} result={qResult} index={index} />
        ))}
      </div>

      {/* 하단 액션 */}
      <div style={styles.actions}>
        <Link to="/participation" style={styles.backButton}>
          목록으로
        </Link>
        {set.status === ParticipationStatus.ACTIVE && (
          <Link to={`/participation/${id}/respond`} style={styles.respondButton}>
            응답하기
          </Link>
        )}
      </div>
    </div>
  );
}

// 질문 결과 카드 컴포넌트
interface QuestionResultCardProps {
  result: QuestionResult;
  index: number;
}

function QuestionResultCard({ result, index }: QuestionResultCardProps) {
  const isTextType = result.questionType === QuestionType.FREE_TEXT;
  const maxPercentage =
    result.optionResults?.reduce(
      (max, opt) => Math.max(max, opt.percentage),
      0
    ) || 0;

  return (
    <Card padding="medium" style={styles.resultCard}>
      <div style={styles.resultHeader}>
        <span style={styles.questionNumber}>Q{index + 1}</span>
        <span style={styles.typeBadge}>
          {QUESTION_TYPE_LABELS[result.questionType]}
        </span>
        <span style={styles.responseCount}>
          응답 {result.totalResponses}명
        </span>
      </div>

      <h3 style={styles.questionTitle}>{result.questionTitle}</h3>

      {isTextType ? (
        <TextResponses answers={result.textAnswers || []} />
      ) : (
        <OptionResults
          options={result.optionResults || []}
          maxPercentage={maxPercentage}
        />
      )}
    </Card>
  );
}

// 텍스트 응답 표시 컴포넌트
interface TextResponsesProps {
  answers: string[];
}

function TextResponses({ answers }: TextResponsesProps) {
  const [showAll, setShowAll] = useState(false);
  const displayAnswers = showAll ? answers : answers.slice(0, 5);

  if (answers.length === 0) {
    return (
      <div style={styles.noResponses}>아직 응답이 없습니다.</div>
    );
  }

  return (
    <div style={styles.textResponses}>
      {displayAnswers.map((answer, idx) => (
        <div key={idx} style={styles.textAnswer}>
          {answer}
        </div>
      ))}
      {answers.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={styles.showMoreButton}
        >
          {answers.length - 5}개 더 보기
        </button>
      )}
      {showAll && answers.length > 5 && (
        <button
          onClick={() => setShowAll(false)}
          style={styles.showMoreButton}
        >
          접기
        </button>
      )}
    </div>
  );
}

// 선택지 결과 표시 컴포넌트
interface OptionResultsProps {
  options: { optionId: string; optionText: string; count: number; percentage: number }[];
  maxPercentage: number;
}

function OptionResults({ options, maxPercentage }: OptionResultsProps) {
  if (options.length === 0) {
    return (
      <div style={styles.noResponses}>아직 응답이 없습니다.</div>
    );
  }

  return (
    <div style={styles.optionResults}>
      {options.map(option => {
        const isHighest = option.percentage === maxPercentage && option.percentage > 0;
        return (
          <div key={option.optionId} style={styles.optionResult}>
            <div style={styles.optionInfo}>
              <span style={styles.optionText}>{option.optionText}</span>
              <span style={styles.optionStats}>
                {option.count}명 ({option.percentage}%)
              </span>
            </div>
            <div style={styles.barContainer}>
              <div
                style={{
                  ...styles.bar,
                  width: `${option.percentage}%`,
                  backgroundColor: isHighest ? colors.primary : colors.neutral300,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: colors.accentRed,
    borderRadius: borderRadius.md,
  },
  summaryCard: {
    marginBottom: '24px',
  },
  summaryGrid: {
    display: 'flex',
    justifyContent: 'space-around',
    textAlign: 'center',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  summaryValue: {
    ...typography.headingL,
    color: colors.primary,
  },
  summaryLabel: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  lastUpdated: {
    ...typography.bodyS,
    color: colors.neutral400,
    textAlign: 'center',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  resultCard: {
    marginBottom: 0,
  },
  resultHeader: {
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
  typeBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '12px',
  },
  responseCount: {
    marginLeft: 'auto',
    ...typography.bodyS,
    color: colors.neutral500,
  },
  questionTitle: {
    ...typography.headingS,
    color: colors.neutral900,
    margin: '0 0 16px',
  },
  noResponses: {
    ...typography.bodyM,
    color: colors.neutral400,
    fontStyle: 'italic',
    padding: '20px 0',
    textAlign: 'center',
  },
  optionResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  optionResult: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  optionInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    ...typography.bodyM,
    color: colors.neutral700,
  },
  optionStats: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  barContainer: {
    height: '8px',
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  textResponses: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  textAnswer: {
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.md,
    ...typography.bodyM,
    color: colors.neutral700,
  },
  showMoreButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    color: colors.neutral600,
    fontSize: '13px',
    cursor: 'pointer',
    alignSelf: 'center',
    marginTop: '8px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
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
  respondButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    fontSize: '14px',
    fontWeight: 500,
  },
};
