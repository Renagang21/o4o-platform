/**
 * Trial 목록 화면
 * Phase H8-FE: Trial Observation Frontend
 *
 * 목적: 현재 존재하는 Trial을 "보이게" 한다
 * 사용 API: GET /api/market-trial
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTrials, Trial } from '../api/trial';

export function TrialListPage() {
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrials();
  }, []);

  async function loadTrials() {
    try {
      setLoading(true);
      setError(null);
      const data = await getTrials();
      setTrials(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trials');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Trial 목록</h1>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Trial 목록</h1>
        <p style={styles.error}>오류: {error}</p>
        <button onClick={loadTrials} style={styles.button}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Trial 목록</h1>

      {trials.length === 0 ? (
        <p>등록된 Trial이 없습니다.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>제목</th>
              <th style={styles.th}>공급자</th>
              <th style={styles.th}>보상 옵션</th>
              <th style={styles.th}>상태</th>
              <th style={styles.th}>참여자</th>
              <th style={styles.th}>액션</th>
            </tr>
          </thead>
          <tbody>
            {trials.map((trial) => (
              <tr key={trial.id}>
                <td style={styles.td}>{trial.title}</td>
                <td style={styles.td}>{trial.supplierName}</td>
                <td style={styles.td}>
                  {trial.rewardOptions?.map((opt, i) => (
                    <span key={i} style={styles.badge}>
                      {opt.type}
                    </span>
                  )) || '-'}
                </td>
                <td style={styles.td}>
                  <span style={getStatusStyle(trial.status)}>{trial.status}</span>
                </td>
                <td style={styles.td}>
                  {trial.currentParticipants} / {trial.maxParticipants}
                </td>
                <td style={styles.td}>
                  <Link to={`/trial/${trial.id}`} style={styles.link}>
                    상세 보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function getStatusStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  };
  switch (status) {
    case 'active':
      return { ...base, background: '#d4edda', color: '#155724' };
    case 'closed':
      return { ...base, background: '#f8d7da', color: '#721c24' };
    default:
      return { ...base, background: '#e2e3e5', color: '#383d41' };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  title: {
    fontSize: '24px',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '10px',
    borderBottom: '2px solid #ddd',
    background: '#f5f5f5',
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #ddd',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 6px',
    margin: '0 2px',
    background: '#e0e0e0',
    borderRadius: '3px',
    fontSize: '11px',
  },
  link: {
    color: '#0066cc',
    textDecoration: 'none',
  },
  button: {
    padding: '8px 16px',
    background: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: '#dc3545',
    marginBottom: '10px',
  },
};
