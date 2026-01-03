/**
 * Trial 상세 + 참여 화면
 * Phase H8-FE: Trial Observation Frontend
 *
 * 목적: Trial 참여 흐름을 직접 체험한다
 * 사용 API:
 *   - GET /api/market-trial/:id
 *   - POST /api/market-trial/:id/join
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTrial, joinTrial, Trial, Participation } from '../api/trial';

export function TrialDetailPage() {
  const { trialId } = useParams<{ trialId: string }>();
  const navigate = useNavigate();

  const [trial, setTrial] = useState<Trial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRewardType, setSelectedRewardType] = useState<'cash' | 'product' | null>(null);
  const [joining, setJoining] = useState(false);
  const [participation, setParticipation] = useState<Participation | null>(null);

  useEffect(() => {
    if (trialId) {
      loadTrial(trialId);
    }
  }, [trialId]);

  async function loadTrial(id: string) {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrial(id);
      setTrial(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trial');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!trialId || !selectedRewardType) return;

    try {
      setJoining(true);
      setError(null);
      const result = await joinTrial(trialId, selectedRewardType);
      setParticipation(result);
    } catch (err: any) {
      setError(err.message || 'Failed to join trial');
    } finally {
      setJoining(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error && !trial) {
    return (
      <div style={styles.container}>
        <p style={styles.error}>오류: {error}</p>
        <Link to="/trials" style={styles.link}>목록으로 돌아가기</Link>
      </div>
    );
  }

  if (!trial) {
    return (
      <div style={styles.container}>
        <p>Trial을 찾을 수 없습니다.</p>
        <Link to="/trials" style={styles.link}>목록으로 돌아가기</Link>
      </div>
    );
  }

  // 참여 완료 상태
  if (participation) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>참여 완료</h1>
        <div style={styles.card}>
          <p><strong>Trial:</strong> {trial.title}</p>
          <p><strong>Participation ID:</strong> {participation.id}</p>
          <p><strong>보상 타입:</strong> {participation.rewardType}</p>
          <p><strong>상태:</strong> {participation.rewardStatus}</p>
        </div>

        {participation.rewardType === 'product' && (
          <div style={styles.actions}>
            <button
              onClick={() => navigate(`/shipping/${participation.id}`)}
              style={styles.primaryButton}
            >
              배송 주소 입력
            </button>
          </div>
        )}

        <div style={styles.actions}>
          <button
            onClick={() => navigate(`/fulfillment/${participation.id}`)}
            style={styles.secondaryButton}
          >
            Fulfillment 상태 확인
          </button>
        </div>

        <Link to="/trials" style={styles.link}>목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{trial.title}</h1>

      <div style={styles.card}>
        <p><strong>공급자:</strong> {trial.supplierName}</p>
        <p><strong>상태:</strong> {trial.status}</p>
        <p><strong>참여자:</strong> {trial.currentParticipants} / {trial.maxParticipants}</p>
        {trial.description && <p><strong>설명:</strong> {trial.description}</p>}
      </div>

      <h2 style={styles.subtitle}>보상 옵션 선택</h2>
      <div style={styles.rewardOptions}>
        {trial.rewardOptions?.map((opt, i) => (
          <label key={i} style={styles.rewardOption}>
            <input
              type="radio"
              name="rewardType"
              value={opt.type}
              checked={selectedRewardType === opt.type}
              onChange={() => setSelectedRewardType(opt.type)}
              disabled={trial.status !== 'active'}
            />
            <span style={styles.rewardLabel}>
              {opt.type === 'cash' ? '현금' : '상품'}: {opt.value}
              {opt.description && ` (${opt.description})`}
            </span>
          </label>
        ))}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.actions}>
        <button
          onClick={handleJoin}
          disabled={!selectedRewardType || joining || trial.status !== 'active'}
          style={styles.primaryButton}
        >
          {joining ? '참여 중...' : '참여하기'}
        </button>
      </div>

      <Link to="/trials" style={styles.link}>목록으로 돌아가기</Link>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  title: {
    fontSize: '24px',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '18px',
    marginTop: '20px',
    marginBottom: '10px',
  },
  card: {
    padding: '15px',
    background: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  rewardOptions: {
    marginBottom: '20px',
  },
  rewardOption: {
    display: 'block',
    padding: '10px',
    marginBottom: '8px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  rewardLabel: {
    marginLeft: '8px',
  },
  actions: {
    marginBottom: '15px',
  },
  primaryButton: {
    padding: '10px 20px',
    background: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
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
