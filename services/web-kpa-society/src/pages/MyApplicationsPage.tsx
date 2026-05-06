import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { kpaApi, RoleApplication } from '../api/kpa';
import { useAuth } from '../contexts';
import { GuideBlock } from '@o4o/shared-space-ui';
import { fetchGuidePageContent } from '../api/guideContent';

const GUIDE_PAGE_KEY = 'user.application.status';
const GUIDEBLOCK_SECTION_KEY = 'guideblock-page-help';
const SERVICE_KEY = 'kpa-society';

/**
 * My Applications Page
 * Phase H8-4: Core Auth v2 Integration
 * (C) 내 신청 목록 조회 - 로그인 필수
 */

export function MyApplicationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const [guideTitle, setGuideTitle] = useState<string | null>(null);
  const [guideDesc, setGuideDesc] = useState<string | null>(null);
  const [guideSteps, setGuideSteps] = useState<string[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchGuidePageContent(SERVICE_KEY, GUIDE_PAGE_KEY)
      .then(sections => {
        if (cancelled) return;
        const raw = sections[GUIDEBLOCK_SECTION_KEY];
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.title) setGuideTitle(parsed.title);
          if (parsed.description) setGuideDesc(parsed.description);
          if (Array.isArray(parsed.steps)) setGuideSteps(parsed.steps);
        } catch { /* use fallback */ }
      })
      .catch(() => { /* use fallback */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadApplications();
    }
  }, [filter, isAuthenticated]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);

    try {
      const status = filter !== 'all' ? filter : undefined;
      const response = await kpaApi.getMyApplications(status);
      setApplications(response.applications);
    } catch (err: any) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        setError('로그인이 필요합니다.');
      } else {
        setError(err.message || '신청 목록을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'partner':
        return '약사회 회원';
      case 'seller':
        return '판매자';
      case 'supplier':
        return '공급자';
      case 'admin':
        return '관리자';
      default:
        return role;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '심사 중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '반려됨';
      default:
        return status;
    }
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'pending':
        return { background: '#fff3e0', color: '#e65100' };
      case 'approved':
        return { background: '#e8f5e9', color: '#2e7d32' };
      case 'rejected':
        return { background: '#ffebee', color: '#c62828' };
      default:
        return {};
    }
  };

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  // 미로그인 상태
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.authRequiredCard}>
          <div style={styles.authIcon}>🔒</div>
          <h2 style={styles.authTitle}>로그인이 필요합니다</h2>
          <p style={styles.authMessage}>
            신청 내역을 확인하시려면 먼저 로그인해주세요.
          </p>
          <p style={styles.authHint}>
            우측 상단의 로그인 버튼을 클릭하여 로그인하실 수 있습니다.
          </p>
          <Link to="/" style={styles.backButton}>
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>내 신청 목록</h1>
        <p style={styles.subtitle}>제출한 신청서의 상태를 확인하세요.</p>
      </div>

      <GuideBlock
        variant="info"
        title={guideTitle ?? '신청 상태 확인 안내'}
        description={guideDesc ?? '제출한 신청서의 처리 현황을 확인합니다.'}
        steps={guideSteps ?? [
          '상단 필터에서 원하는 상태(전체/심사 중/승인됨/반려됨)를 선택합니다.',
          '심사 중인 신청은 처리 완료까지 며칠이 소요될 수 있습니다.',
          '반려된 경우 사유를 확인 후 재신청하실 수 있습니다.',
        ]}
        compact
      />

      {/* Filter */}
      <div style={styles.filterContainer}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              ...styles.filterButton,
              ...(filter === status ? styles.filterButtonActive : {}),
            }}
          >
            {status === 'all' ? '전체' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && <div style={styles.loading}>Loading...</div>}

      {/* Error */}
      {error && (
        <div style={styles.errorCard}>
          <p>{error}</p>
          {error.includes('로그인') ? (
            <a href="/login" style={styles.primaryButton}>
              로그인하기
            </a>
          ) : (
            <button onClick={loadApplications} style={styles.retryButton}>
              다시 시도
            </button>
          )}
        </div>
      )}

      {/* Applications List */}
      {!loading && !error && (
        <div style={styles.list}>
          {applications.map((app) => (
            <div key={app.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.roleTag}>{getRoleLabel(app.role)}</span>
                <span style={{ ...styles.statusTag, ...getStatusStyle(app.status) }}>
                  {getStatusLabel(app.status)}
                </span>
              </div>

              <div style={styles.cardBody}>
                {app.businessName && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>상호명</span>
                    <span style={styles.infoValue}>{app.businessName}</span>
                  </div>
                )}
                {app.businessNumber && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>사업자번호</span>
                    <span style={styles.infoValue}>{app.businessNumber}</span>
                  </div>
                )}
                {app.note && (
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>메모</span>
                    <span style={styles.infoValue}>{app.note}</span>
                  </div>
                )}
              </div>

              <div style={styles.cardFooter}>
                <span style={styles.dateText}>
                  신청일: {new Date(app.appliedAt).toLocaleDateString('ko-KR')}
                </span>
                {app.decidedAt && (
                  <span style={styles.dateText}>
                    처리일: {new Date(app.decidedAt).toLocaleDateString('ko-KR')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && applications.length === 0 && (
        <div style={styles.emptyCard}>
          <p style={styles.emptyText}>신청 내역이 없습니다.</p>
          <Link to="/member/apply" style={styles.primaryButton}>
            신청하기
          </Link>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 32,
  },
  filterButton: {
    padding: '10px 20px',
    fontSize: 14,
    border: '1px solid #ddd',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    background: '#0066cc',
    color: '#fff',
    borderColor: '#0066cc',
  },
  loading: {
    textAlign: 'center',
    padding: 60,
    color: '#666',
  },
  errorCard: {
    textAlign: 'center',
    background: '#fff',
    borderRadius: 12,
    padding: 48,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    color: '#d32f2f',
  },
  retryButton: {
    marginTop: 16,
    padding: '10px 24px',
    background: '#0066cc',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  cardHeader: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  roleTag: {
    padding: '6px 12px',
    fontSize: 13,
    background: '#e3f2fd',
    color: '#1976d2',
    borderRadius: 4,
    fontWeight: 500,
  },
  statusTag: {
    padding: '6px 12px',
    fontSize: 13,
    borderRadius: 4,
    fontWeight: 500,
  },
  cardBody: {
    marginBottom: 16,
  },
  infoRow: {
    display: 'flex',
    marginBottom: 8,
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    color: '#888',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  cardFooter: {
    display: 'flex',
    gap: 24,
    paddingTop: 16,
    borderTop: '1px solid #eee',
  },
  dateText: {
    fontSize: 13,
    color: '#888',
  },
  emptyCard: {
    textAlign: 'center',
    background: '#fff',
    borderRadius: 12,
    padding: 60,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  primaryButton: {
    display: 'inline-block',
    padding: '14px 32px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#0066cc',
    borderRadius: 8,
    textDecoration: 'none',
  },
  // Auth required styles
  loadingCard: {
    textAlign: 'center',
    padding: 48,
    color: '#666',
  },
  authRequiredCard: {
    textAlign: 'center',
    background: '#fff',
    borderRadius: 12,
    padding: 48,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  authIcon: {
    fontSize: 48,
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  authMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  authHint: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  backButton: {
    display: 'inline-block',
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#0066cc',
    background: '#e3f2fd',
    borderRadius: 8,
    textDecoration: 'none',
  },
};
