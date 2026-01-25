/**
 * FlowDetailPage - Flow 상세 페이지
 *
 * 핵심 원칙:
 * - 이 페이지는 강의 상세가 아닙니다
 * - 콘텐츠 순서 흐름의 설명과 단계 목록을 보여줍니다
 * - 교육/평가 기능 없음
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { FlowWithSteps, FlowProgress } from '../types/LearningTypes.js';
import type { LearningApi } from '../functions/learningApi.js';

interface FlowDetailPageProps {
  api: LearningApi;
}

export function FlowDetailPage({ api }: FlowDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [flow, setFlow] = useState<FlowWithSteps | null>(null);
  const [progress, setProgress] = useState<FlowProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const flowRes = await api.getFlow(id!);
      setFlow(flowRes.data);

      // 진행 상태 조회 (실패해도 무시)
      try {
        const progressRes = await api.getMyProgress(id!);
        setProgress(progressRes.data);
      } catch {
        // 시작하지 않은 상태
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Flow를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (flow) {
      navigate(`/flow/${flow.id}/step/0`);
    }
  };

  const handleContinue = () => {
    if (flow && progress) {
      navigate(`/flow/${flow.id}/step/${progress.currentStepIndex}`);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Flow를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !flow) {
    return (
      <div style={styles.errorContainer}>
        <span style={styles.errorIcon}>⚠️</span>
        <p>{error || 'Flow를 찾을 수 없습니다.'}</p>
        <button style={styles.backButton} onClick={() => navigate('/flow')}>
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 뒤로가기 */}
      <Link to="/flow" style={styles.backLink}>
        ← 목록으로
      </Link>

      {/* 헤더 */}
      <div style={styles.header}>
        {flow.imageUrl && (
          <img src={flow.imageUrl} alt={flow.title} style={styles.headerImage} />
        )}
        <div style={styles.headerContent}>
          <h1 style={styles.title}>{flow.title}</h1>
          <p style={styles.description}>{flow.description}</p>
          <div style={styles.meta}>
            <span>📖 {flow.steps.length}개 단계</span>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div style={styles.infoBox}>
        💡 콘텐츠를 순서대로 확인하세요. 교육·평가 기능이 아닙니다.
      </div>

      {/* 액션 버튼 */}
      <div style={styles.actions}>
        {progress ? (
          <>
            <div style={styles.progressInfo}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${((progress.currentStepIndex + 1) / flow.steps.length) * 100}%`,
                  }}
                />
              </div>
              <span style={styles.progressText}>
                {progress.currentStepIndex + 1} / {flow.steps.length} 단계
              </span>
            </div>
            <button style={styles.continueButton} onClick={handleContinue}>
              계속 보기
            </button>
          </>
        ) : (
          <button style={styles.startButton} onClick={handleStart}>
            시작하기
          </button>
        )}
      </div>

      {/* 단계 목록 */}
      <div style={styles.stepsSection}>
        <h2 style={styles.sectionTitle}>단계 목록</h2>
        <div style={styles.stepList}>
          {flow.steps.map((step, index) => {
            const isViewed = progress?.viewedSteps.includes(index);
            const isCurrent = progress?.currentStepIndex === index;

            return (
              <Link
                key={index}
                to={`/flow/${flow.id}/step/${index}`}
                style={{
                  ...styles.stepItem,
                  ...(isCurrent ? styles.stepItemCurrent : {}),
                }}
              >
                <div style={styles.stepNumber}>
                  {isViewed ? '✓' : index + 1}
                </div>
                <div style={styles.stepInfo}>
                  <span style={styles.stepTitle}>
                    {step.title || step.content?.title || `단계 ${index + 1}`}
                  </span>
                  {step.description && (
                    <span style={styles.stepDescription}>{step.description}</span>
                  )}
                </div>
                <span style={styles.stepArrow}>→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '24px 20px 40px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
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
    minHeight: '400px',
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
  backLink: {
    display: 'inline-block',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '16px',
  },
  header: {
    marginBottom: '24px',
  },
  headerImage: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    borderRadius: '12px',
    marginBottom: '20px',
  },
  headerContent: {},
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    marginBottom: '12px',
  },
  description: {
    fontSize: '16px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
    marginBottom: '16px',
  },
  meta: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  infoBox: {
    padding: '12px 16px',
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    color: '#1E40AF',
    fontSize: '14px',
    marginBottom: '24px',
  },
  actions: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '32px',
  },
  progressInfo: {
    marginBottom: '16px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    transition: 'width 0.3s',
  },
  progressText: {
    fontSize: '14px',
    color: '#64748b',
  },
  startButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  continueButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  stepsSection: {},
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
    marginBottom: '16px',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background-color 0.2s',
  },
  stepItemCurrent: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    flexShrink: 0,
  },
  stepInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stepTitle: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#0f172a',
  },
  stepDescription: {
    fontSize: '13px',
    color: '#64748b',
  },
  stepArrow: {
    color: '#94a3b8',
    fontSize: '18px',
  },
};

export default FlowDetailPage;
