/**
 * FlowListPage - Flow 목록 페이지
 *
 * 핵심 원칙:
 * - 이 페이지는 교육 과정 목록이 아닙니다
 * - 콘텐츠를 순서대로 보여주는 흐름(Flow) 목록입니다
 * - 메인 네비게이션에서 직접 진입하지 않습니다
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Flow, FlowListParams, PaginatedResponse } from '../types/LearningTypes.js';
import type { LearningApi } from '../functions/learningApi.js';

interface FlowListPageProps {
  api: LearningApi;
}

export function FlowListPage({ api }: FlowListPageProps) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadFlows();
  }, [page]);

  const loadFlows = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: FlowListParams = {
        isActive: true,
        page,
        limit: 12,
      };

      const response = await api.getFlows(params);
      setFlows(response.data);
      setTotalPages(response.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Flow 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>Flow 목록을 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <span style={styles.errorIcon}>⚠️</span>
        <p>{error}</p>
        <button style={styles.retryButton} onClick={loadFlows}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 안내 메시지 */}
      <div style={styles.infoBox}>
        💡 이 기능은 교육·평가가 아닌, 콘텐츠를 순서대로 보여주기 위한 도구입니다.
      </div>

      <h1 style={styles.title}>콘텐츠 순서 흐름</h1>
      <p style={styles.description}>콘텐츠를 순서대로 확인하세요</p>

      {flows.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📋</span>
          <p>등록된 순서 흐름이 없습니다.</p>
        </div>
      ) : (
        <>
          <div style={styles.grid}>
            {flows.map((flow) => (
              <Link key={flow.id} to={`/flow/${flow.id}`} style={styles.cardLink}>
                <div style={styles.card}>
                  {flow.imageUrl ? (
                    <img src={flow.imageUrl} alt={flow.title} style={styles.cardImage} />
                  ) : (
                    <div style={styles.cardImagePlaceholder}>📚</div>
                  )}
                  <div style={styles.cardContent}>
                    <h3 style={styles.cardTitle}>{flow.title}</h3>
                    <p style={styles.cardDescription}>{flow.description}</p>
                    <div style={styles.cardMeta}>
                      <span>📖 {flow.steps.length}개 단계</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={styles.pageButton}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                이전
              </button>
              <span style={styles.pageInfo}>
                {page} / {totalPages}
              </span>
              <button
                style={styles.pageButton}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px 40px',
  },
  infoBox: {
    padding: '12px 16px',
    backgroundColor: '#EFF6FF',
    borderRadius: '8px',
    color: '#1E40AF',
    fontSize: '14px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    marginBottom: '8px',
  },
  description: {
    fontSize: '16px',
    color: '#64748b',
    margin: 0,
    marginBottom: '32px',
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
    animation: 'spin 1s linear infinite',
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
  retryButton: {
    marginTop: '16px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '24px',
  },
  cardLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  cardImage: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '160px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  },
  cardContent: {
    padding: '20px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
    marginBottom: '8px',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    marginBottom: '12px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardMeta: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '32px',
  },
  pageButton: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#64748b',
  },
};

export default FlowListPage;
