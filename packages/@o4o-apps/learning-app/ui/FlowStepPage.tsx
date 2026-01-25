/**
 * FlowStepPage - 단계 보기 페이지
 *
 * 핵심 원칙:
 * - 이 페이지는 학습 페이지가 아닙니다
 * - 콘텐츠를 순서대로 보여주는 뷰어입니다
 * - 완료/이수 개념 없음, 단순 위치 추적만 수행
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { FlowWithSteps, FlowProgress, FlowStepWithContent } from '../types/LearningTypes.js';
import type { LearningApi } from '../functions/learningApi.js';
import { FlowNavigator } from './FlowNavigator.js';

interface FlowStepPageProps {
  api: LearningApi;
}

export function FlowStepPage({ api }: FlowStepPageProps) {
  const { flowId, stepIndex: stepIndexParam } = useParams<{ flowId: string; stepIndex: string }>();
  const navigate = useNavigate();
  const stepIndex = parseInt(stepIndexParam || '0', 10);

  const [flow, setFlow] = useState<FlowWithSteps | null>(null);
  const [progress, setProgress] = useState<FlowProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (flowId) loadData();
  }, [flowId]);

  useEffect(() => {
    // 진행 상태 업데이트 (위치 저장)
    if (flow && flowId && !isNaN(stepIndex)) {
      api.updateProgress(flowId, stepIndex).catch(() => {
        // 실패해도 무시 (선택적 기능)
      });
    }
  }, [flowId, stepIndex, flow]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const flowRes = await api.getFlow(flowId!);
      setFlow(flowRes.data);

      try {
        const progressRes = await api.getMyProgress(flowId!);
        setProgress(progressRes.data);
      } catch {
        // 신규 진행
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '단계를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (stepIndex > 0) {
      navigate(`/flow/${flowId}/step/${stepIndex - 1}`);
    }
  };

  const handleNext = () => {
    if (flow && stepIndex < flow.steps.length - 1) {
      navigate(`/flow/${flowId}/step/${stepIndex + 1}`);
    }
  };

  const handleStepSelect = (index: number) => {
    navigate(`/flow/${flowId}/step/${index}`);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>단계를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div style={styles.errorContainer}>
        <span style={styles.errorIcon}>⚠️</span>
        <p>{error || '단계를 찾을 수 없습니다.'}</p>
        <button style={styles.backButton} onClick={() => navigate(`/flow/${flowId}`)}>
          흐름으로 돌아가기
        </button>
      </div>
    );
  }

  const currentStep = flow.steps[stepIndex];
  if (!currentStep) {
    return (
      <div style={styles.errorContainer}>
        <span style={styles.errorIcon}>⚠️</span>
        <p>존재하지 않는 단계입니다.</p>
        <button style={styles.backButton} onClick={() => navigate(`/flow/${flowId}`)}>
          흐름으로 돌아가기
        </button>
      </div>
    );
  }

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === flow.steps.length - 1;

  return (
    <div style={styles.wrapper}>
      {/* 사이드바 */}
      <FlowNavigator
        flow={flow}
        currentStepIndex={stepIndex}
        viewedSteps={progress?.viewedSteps || []}
        onStepSelect={handleStepSelect}
        onClose={() => navigate(`/flow/${flowId}`)}
      />

      {/* 메인 콘텐츠 */}
      <main style={styles.main}>
        {/* 상단 바 */}
        <div style={styles.topBar}>
          <Link to={`/flow/${flowId}`} style={styles.backLink}>
            ← 흐름으로
          </Link>
          <span style={styles.stepIndicator}>
            {stepIndex + 1} / {flow.steps.length}
          </span>
        </div>

        {/* 안내 메시지 */}
        <div style={styles.infoBox}>
          💡 콘텐츠를 순서대로 확인하세요.
        </div>

        {/* 콘텐츠 영역 */}
        <div style={styles.contentArea}>
          <h1 style={styles.stepTitle}>
            {currentStep.title || currentStep.content?.title || `단계 ${stepIndex + 1}`}
          </h1>

          {currentStep.description && (
            <p style={styles.stepDescription}>{currentStep.description}</p>
          )}

          {/* 콘텐츠 본문 */}
          {currentStep.content ? (
            <div style={styles.contentBody}>
              {currentStep.content.imageUrl && (
                <img
                  src={currentStep.content.imageUrl}
                  alt={currentStep.content.title}
                  style={styles.contentImage}
                />
              )}
              {currentStep.content.summary && (
                <p style={styles.contentSummary}>{currentStep.content.summary}</p>
              )}
              <div
                style={styles.contentHtml}
                dangerouslySetInnerHTML={{ __html: currentStep.content.body }}
              />
            </div>
          ) : (
            <div style={styles.noContent}>
              <span style={styles.noContentIcon}>📄</span>
              <p>콘텐츠가 연결되지 않았습니다.</p>
              <span style={styles.noContentId}>Content ID: {currentStep.contentId}</span>
            </div>
          )}
        </div>

        {/* 네비게이션 버튼 */}
        <div style={styles.navigation}>
          <button
            style={{
              ...styles.navButton,
              ...(isFirst ? styles.navButtonDisabled : {}),
            }}
            onClick={handlePrevious}
            disabled={isFirst}
          >
            ← 이전 단계
          </button>

          {isLast ? (
            <Link to={`/flow/${flowId}`} style={styles.completeButton}>
              흐름으로 돌아가기 →
            </Link>
          ) : (
            <button style={styles.nextButton} onClick={handleNext}>
              다음 단계 →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
  },
  main: {
    flex: 1,
    marginLeft: '280px',
    padding: '24px 32px 40px',
    maxWidth: '900px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#64748b',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    marginBottom: '16px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: '#64748b',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  backButton: {
    marginTop: '16px',
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  backLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
  },
  stepIndicator: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  infoBox: {
    padding: '10px 14px',
    backgroundColor: '#EFF6FF',
    borderRadius: '6px',
    color: '#1E40AF',
    fontSize: '13px',
    marginBottom: '24px',
  },
  contentArea: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '32px',
    marginBottom: '24px',
  },
  stepTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    marginBottom: '12px',
  },
  stepDescription: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e2e8f0',
  },
  contentBody: {},
  contentImage: {
    width: '100%',
    maxHeight: '400px',
    objectFit: 'cover',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  contentSummary: {
    fontSize: '16px',
    color: '#475569',
    lineHeight: 1.7,
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  contentHtml: {
    fontSize: '16px',
    color: '#334155',
    lineHeight: 1.8,
  },
  noContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px 24px',
    color: '#64748b',
  },
  noContentIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  noContentId: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '8px',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  navButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  nextButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  completeButton: {
    padding: '12px 24px',
    backgroundColor: '#22c55e',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
};

export default FlowStepPage;
