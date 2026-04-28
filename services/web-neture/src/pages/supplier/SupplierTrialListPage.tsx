/**
 * Supplier Trial List Page
 *
 * WO-MARKET-TRIAL-SUPPLIER-RESULTS-AND-FEEDBACK-V1
 * 공급자 본인의 Market Trial 목록 (상태별 현황)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyTrials } from '../../api/trial';
import type { Trial } from '../../api/trial';

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  submitted: '검토 중',
  approved: '승인됨',
  recruiting: '모집 중',
  development: '진행 중',
  outcome_confirming: '결과 확인 중',
  fulfilled: '완료',
  closed: '종료',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#9CA3AF',
  submitted: '#F59E0B',
  approved: '#3B82F6',
  recruiting: '#10B981',
  development: '#6366F1',
  outcome_confirming: '#8B5CF6',
  fulfilled: '#059669',
  closed: '#6B7280',
};

export default function SupplierTrialListPage() {
  const navigate = useNavigate();
  const [trials, setTrials] = useState<Trial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyTrials()
      .then(setTrials)
      .catch(() => setError('목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={s.container}>
        <p style={s.empty}>불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.container}>
        <p style={{ ...s.empty, color: '#EF4444' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>내 유통 참여형 펀딩</h1>
          <p style={s.subtitle}>등록한 체험단 목록을 확인하고 결과를 조회합니다.</p>
        </div>
        <button style={s.createBtn} onClick={() => navigate('/supplier/market-trial/new')}>
          + 새 펀딩 등록
        </button>
      </div>

      {trials.length === 0 ? (
        <div style={s.emptyBox}>
          <p style={s.empty}>등록된 Trial이 없습니다.</p>
          <button style={s.createBtn} onClick={() => navigate('/supplier/market-trial/new')}>
            Trial 등록하기
          </button>
        </div>
      ) : (
        <div style={s.list}>
          {trials.map((trial) => (
            <div
              key={trial.id}
              style={s.card}
              onClick={() => navigate(`/supplier/market-trial/${trial.id}`)}
            >
              <div style={s.cardTop}>
                <span
                  style={{
                    ...s.statusBadge,
                    backgroundColor: STATUS_COLOR[trial.status] ?? '#9CA3AF',
                  }}
                >
                  {STATUS_LABEL[trial.status] ?? trial.status}
                </span>
                <span style={s.date}>
                  {new Date(trial.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <h2 style={s.cardTitle}>{trial.title}</h2>
              {trial.description && (
                <p style={s.cardDesc}>{trial.description.slice(0, 80)}{trial.description.length > 80 ? '...' : ''}</p>
              )}
              <div style={s.cardMeta}>
                <span style={s.metaItem}>
                  참여 {trial.currentParticipants}
                  {trial.maxParticipants ? ` / ${trial.maxParticipants}명` : '명'}
                </span>
                {trial.endDate && (
                  <span style={s.metaItem}>
                    마감: {new Date(trial.endDate).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
              {/* WO-MARKET-TRIAL-EDIT-FLOW-V1 */}
              {trial.status === 'draft' && (
                <button
                  style={s.editBtn}
                  onClick={(e) => { e.stopPropagation(); navigate(`/supplier/market-trial/${trial.id}/edit`); }}
                >
                  수정
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 32px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '4px 0 0 0',
  },
  createBtn: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#2563EB',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  emptyBox: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  empty: {
    color: '#6B7280',
    fontSize: '15px',
    margin: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    padding: '20px 24px',
    backgroundColor: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#fff',
    borderRadius: '20px',
  },
  date: {
    fontSize: '12px',
    color: '#9CA3AF',
  },
  cardTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 6px 0',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
  },
  metaItem: {
    fontSize: '13px',
    color: '#9CA3AF',
  },
  editBtn: {
    marginTop: '8px',
    padding: '5px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
