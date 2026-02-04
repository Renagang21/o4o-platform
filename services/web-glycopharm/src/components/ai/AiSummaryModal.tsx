/**
 * AiSummaryModal - AI 요약 실제 연동 모달
 *
 * Work Order: WO-AI-SUMMARY-INTEGRATION-V1
 *
 * 목적:
 * - 실제 AI API (/api/ai/query)를 호출하여 요약 제공
 * - 로딩, 에러, 성공 상태 처리
 * - 모든 서비스에서 공통 사용
 */

import { useState, useEffect } from 'react';
import { SparklesIcon, CloseIcon, LoaderIcon, AlertIcon, RefreshIcon } from './icons';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

interface AiSummaryModalProps {
  /** 모달 표시 여부 */
  open: boolean;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 컨텍스트 라벨 (예: "대시보드 요약", "상품 요약") */
  contextLabel?: string;
  /** 요약할 데이터 컨텍스트 */
  contextData?: Record<string, unknown>;
  /** 서비스 ID (예: 'neture', 'glycopharm') */
  serviceId?: string;
}

type ModalState = 'loading' | 'success' | 'error';

export function AiSummaryModal({
  open,
  onClose,
  contextLabel,
  contextData,
  serviceId = 'neture',
}: AiSummaryModalProps) {
  const [state, setState] = useState<ModalState>('loading');
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string>('');

  const fetchSummary = async () => {
    setState('loading');
    setError('');
    setSummary('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          question: `${contextLabel || '현재 화면'}의 주요 지표와 현황을 요약해 주세요.`,
          contextType: 'service',
          serviceId,
          contextData: contextData || {},
          pageType: 'home',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('로그인이 필요합니다.');
        }
        if (response.status === 429) {
          throw new Error('일일 사용량을 초과했습니다. 내일 다시 시도해 주세요.');
        }
        throw new Error('AI 서비스에 연결할 수 없습니다.');
      }

      const data = await response.json();

      if (data.success && data.answer) {
        setSummary(data.answer);
        setState('success');
      } else if (data.errorCode === 'LIMIT_EXCEEDED') {
        throw new Error('일일 사용량을 초과했습니다.');
      } else if (data.errorCode === 'AI_DISABLED') {
        throw new Error('AI 기능이 비활성화되어 있습니다.');
      } else if (data.errorCode === 'NO_API_KEY') {
        throw new Error('AI 서비스가 설정되지 않았습니다.');
      } else {
        throw new Error(data.error || 'AI 응답을 받지 못했습니다.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
      setState('error');
    }
  };

  useEffect(() => {
    if (open) {
      fetchSummary();
    }
  }, [open, contextLabel, serviceId]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.headerIcon}>
              <SparklesIcon size={22} style={{ color: '#64748b' }} />
            </div>
            <div>
              <h2 style={styles.title}>AI 요약</h2>
              <p style={styles.subtitle}>
                {contextLabel || '현재 화면'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeButton} aria-label="닫기">
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {state === 'loading' && (
            <div style={styles.loadingContainer}>
              <LoaderIcon size={32} style={{ color: '#64748b', animation: 'spin 1s linear infinite' }} />
              <p style={styles.loadingText}>AI가 데이터를 분석하고 있습니다...</p>
            </div>
          )}

          {state === 'error' && (
            <div style={styles.errorContainer}>
              <AlertIcon size={32} style={{ color: '#64748b' }} />
              <p style={styles.errorText}>{error}</p>
              <button onClick={fetchSummary} style={styles.retryButton}>
                <RefreshIcon size={16} />
                다시 시도
              </button>
            </div>
          )}

          {state === 'success' && (
            <div style={styles.summaryContainer}>
              <div style={styles.summaryContent}>
                {summary.split('\n').map((line, index) => (
                  <p key={index} style={styles.summaryLine}>
                    {line || <br />}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          {state === 'success' && (
            <button onClick={fetchSummary} style={styles.refreshButton}>
              <RefreshIcon size={14} />
              새로고침
            </button>
          )}
          <button onClick={onClose} style={styles.closeBtn}>
            닫기
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '80vh',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    zIndex: 1001,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  closeButton: {
    padding: '8px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '16px',
  },
  loadingText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    gap: '12px',
  },
  errorText: {
    fontSize: '14px',
    color: '#dc2626',
    margin: 0,
    textAlign: 'center',
  },
  retryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '8px',
  },
  summaryContainer: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '20px',
  },
  summaryContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryLine: {
    fontSize: '14px',
    color: '#334155',
    margin: 0,
    lineHeight: 1.7,
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  closeBtn: {
    padding: '10px 24px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default AiSummaryModal;
