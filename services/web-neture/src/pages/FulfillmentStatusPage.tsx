/**
 * Fulfillment 상태 조회 화면
 * Phase H8-FE: Trial Observation Frontend (H8-3 연계)
 *
 * 목적: 현재 Trial 참여가 어느 단계인지 관측한다
 * 사용 API: GET /api/trial-fulfillment/:participationId
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getFulfillment, Fulfillment } from '../api/trial';

export function FulfillmentStatusPage() {
  const { participationId } = useParams<{ participationId: string }>();

  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (participationId) {
      loadFulfillment(participationId);
    }
  }, [participationId]);

  async function loadFulfillment(id: string) {
    try {
      setLoading(true);
      setError(null);
      const data = await getFulfillment(id);
      setFulfillment(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load fulfillment status');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Fulfillment 상태</h1>
      <p style={styles.subtitle}>Participation ID: {participationId}</p>

      {error && <p style={styles.error}>오류: {error}</p>}

      {!fulfillment ? (
        <div style={styles.card}>
          <p>Fulfillment 정보가 없습니다.</p>
          <p style={styles.hint}>아직 처리가 시작되지 않았을 수 있습니다.</p>
        </div>
      ) : (
        <div style={styles.card}>
          <div style={styles.statusRow}>
            <span style={styles.statusLabel}>상태:</span>
            <span style={getStatusStyle(fulfillment.status)}>{fulfillment.status}</span>
          </div>

          {fulfillment.orderId && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Order ID:</span>
              <span>{fulfillment.orderId}</span>
            </div>
          )}

          {fulfillment.orderNumber && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Order Number:</span>
              <span>{fulfillment.orderNumber}</span>
            </div>
          )}

          {fulfillment.createdAt && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>생성일:</span>
              <span>{new Date(fulfillment.createdAt).toLocaleString()}</span>
            </div>
          )}

          {fulfillment.updatedAt && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>수정일:</span>
              <span>{new Date(fulfillment.updatedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      <div style={styles.statusFlow}>
        <h3 style={styles.flowTitle}>처리 흐름</h3>
        <div style={styles.flowSteps}>
          {['pending', 'processing', 'shipped', 'delivered', 'completed'].map((step, i) => (
            <div
              key={step}
              style={{
                ...styles.flowStep,
                ...(fulfillment?.status === step ? styles.flowStepActive : {}),
                ...(getStepIndex(fulfillment?.status) > i ? styles.flowStepCompleted : {}),
              }}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.actions}>
        <button onClick={() => loadFulfillment(participationId!)} style={styles.secondaryButton}>
          새로고침
        </button>
      </div>

      <Link to="/trials" style={styles.link}>목록으로 돌아가기</Link>
    </div>
  );
}

function getStepIndex(status?: string): number {
  const steps = ['pending', 'processing', 'shipped', 'delivered', 'completed'];
  return status ? steps.indexOf(status) : -1;
}

function getStatusStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
  };
  switch (status) {
    case 'completed':
      return { ...base, background: '#d4edda', color: '#155724' };
    case 'delivered':
      return { ...base, background: '#cce5ff', color: '#004085' };
    case 'shipped':
      return { ...base, background: '#fff3cd', color: '#856404' };
    case 'processing':
      return { ...base, background: '#e2e3e5', color: '#383d41' };
    default:
      return { ...base, background: '#f8f9fa', color: '#6c757d' };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    fontSize: '24px',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  card: {
    padding: '20px',
    background: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
  },
  statusLabel: {
    fontWeight: 'bold',
    marginRight: '10px',
  },
  infoRow: {
    display: 'flex',
    marginBottom: '8px',
  },
  infoLabel: {
    fontWeight: 'bold',
    marginRight: '10px',
    minWidth: '100px',
  },
  hint: {
    color: '#666',
    fontSize: '14px',
    marginTop: '10px',
  },
  statusFlow: {
    marginBottom: '20px',
  },
  flowTitle: {
    fontSize: '16px',
    marginBottom: '10px',
  },
  flowSteps: {
    display: 'flex',
    gap: '5px',
  },
  flowStep: {
    flex: 1,
    padding: '8px 4px',
    textAlign: 'center',
    background: '#e9ecef',
    borderRadius: '4px',
    fontSize: '11px',
    color: '#6c757d',
  },
  flowStepActive: {
    background: '#0066cc',
    color: 'white',
  },
  flowStepCompleted: {
    background: '#28a745',
    color: 'white',
  },
  actions: {
    marginBottom: '15px',
  },
  secondaryButton: {
    padding: '10px 20px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  link: {
    color: '#0066cc',
    textDecoration: 'none',
  },
  error: {
    color: '#dc3545',
    marginBottom: '10px',
  },
};
