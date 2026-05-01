/**
 * ContentSurveysPage — /content/surveys
 *
 * WO-KPA-CONTENT-SURVEYS-LIST-V1
 * WO-O4O-SURVEY-CORE-PHASE1-V1: O4O 공통 Survey API 연결, 실제 목록 활성화
 *
 * 콘텐츠 허브의 "설문조사" 전용 목록.
 * 데이터: participationApi.getParticipationSets (내부적으로 /api/v1/surveys?serviceKey=kpa-society 호출)
 *
 * 카드 클릭 분기 (ParticipationListPage 패턴 준수):
 *   - ACTIVE → /participation/${id}/respond
 *   - DRAFT/CLOSED → /participation/${id}/results
 */

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { participationApi } from '../../api/participation';
import type { ParticipationSet } from '../participation/types';
import { ParticipationStatus } from '../participation/types';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_LIMIT = 12;

const STATUS_LABEL: Record<string, string> = {
  [ParticipationStatus.ACTIVE]: '진행중',
  [ParticipationStatus.DRAFT]: '초안',
  [ParticipationStatus.CLOSED]: '종료',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  [ParticipationStatus.ACTIVE]: { bg: '#ecfdf5', text: '#047857' },
  [ParticipationStatus.DRAFT]: { bg: '#f1f5f9', text: '#64748b' },
  [ParticipationStatus.CLOSED]: { bg: '#fef2f2', text: '#b91c1c' },
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

function targetForSurvey(set: ParticipationSet): string {
  return set.status === ParticipationStatus.ACTIVE
    ? `/participation/${set.id}/respond`
    : `/participation/${set.id}/results`;
}

export function ContentSurveysPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [surveys, setSurveys] = useState<ParticipationSet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((pageNum: number) => {
    setLoading(true);
    setError(null);
    participationApi.getParticipationSets({ page: pageNum, limit: PAGE_LIMIT })
      .then((res) => {
        setSurveys(Array.isArray(res.data) ? res.data : []);
        setTotal(typeof res.total === 'number' ? res.total : 0);
      })
      .catch((e: any) => {
        setError(e?.message || '설문조사를 불러오지 못했습니다.');
        setSurveys([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <Link to="/content" style={styles.backLink}>← 콘텐츠 허브</Link>
          <h1 style={styles.title}>설문조사</h1>
          <p style={styles.desc}>구성원 의견을 수집하는 설문 목록입니다.</p>
        </div>
        {isAuthenticated && (
          <Link to="/content/surveys/new" style={styles.primaryBtn}>
            설문 등록
          </Link>
        )}
      </header>

      {error && <div style={styles.errorBox}>{error}</div>}

      {loading ? (
        <div style={styles.placeholder}>불러오는 중...</div>
      ) : surveys.length === 0 ? (
        <div style={styles.placeholder}>
          <p style={{ margin: 0, marginBottom: 8 }}>아직 등록된 설문이 없습니다.</p>
          {isAuthenticated && (
            <Link to="/content/surveys/new" style={styles.emptyCta}>
              첫 설문 만들기 →
            </Link>
          )}
        </div>
      ) : (
        <div style={styles.cardGrid}>
          {surveys.map((s) => {
            const statusColor = STATUS_COLOR[s.status] ?? STATUS_COLOR[ParticipationStatus.DRAFT];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(targetForSurvey(s))}
                style={styles.card}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#94a3b8'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; }}
              >
                <div style={styles.cardHeader}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: statusColor.bg,
                    color: statusColor.text,
                  }}>
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                  <span style={styles.cardDate}>{formatDate(s.createdAt)}</span>
                </div>
                <div style={styles.cardTitle}>{s.title}</div>
                {s.description && <div style={styles.cardDesc}>{s.description}</div>}
                <div style={styles.cardMeta}>
                  <span>질문 {s.questions?.length ?? 0}개</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            « 이전
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{ ...styles.pageBtn, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            다음 »
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '32px 16px 60px' },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' },
  backLink: { fontSize: '0.8125rem', color: '#64748b', textDecoration: 'none', marginBottom: 8, display: 'inline-block' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 4px' },
  desc: { fontSize: '0.875rem', color: '#64748b', margin: 0 },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff',
    fontSize: '0.875rem', fontWeight: 600, borderRadius: 8,
    textDecoration: 'none', whiteSpace: 'nowrap',
  },
  errorBox: { padding: '10px 14px', fontSize: '0.875rem', color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 16 },
  placeholder: { padding: '40px 16px', fontSize: '0.875rem', color: '#94a3b8', textAlign: 'center', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 },
  emptyCta: { fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
  card: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 16,
    backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8,
    cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s', minHeight: 140,
  },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  statusBadge: { display: 'inline-block', padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 600, borderRadius: 4 },
  cardDate: { fontSize: '0.75rem', color: '#94a3b8' },
  cardTitle: {
    fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', marginBottom: 6,
    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%', lineHeight: 1.4,
  },
  cardDesc: {
    fontSize: '0.8125rem', color: '#64748b', marginBottom: 12, flex: 1,
    overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', width: '100%', lineHeight: 1.5,
  },
  cardMeta: { width: '100%', fontSize: '0.75rem', color: '#94a3b8', marginTop: 'auto' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 },
  pageBtn: { padding: '6px 14px', fontSize: '0.8125rem', fontWeight: 500, color: '#475569', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 },
  pageInfo: { fontSize: '0.8125rem', color: '#64748b' },
};

export default ContentSurveysPage;
