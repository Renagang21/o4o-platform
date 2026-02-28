/**
 * BranchDashboardPage - 분회 메인 대시보드
 *
 * SVC-C: 분회 서비스 홈
 * WO-KPA-SOCIETY-PHASE6-BRANCH-UX-STANDARD-V1
 * WO-KPA-B-ORG-LEVEL-DASHBOARD-DIFF-V1: organizationType × organizationRole 카드 차등 렌더링
 *
 * 구조:
 * 1. Hero — 조직명, 조직 유형 + 역할 배지
 * 2. 공지 영역 — 최근 공지 3건 (empty state 포함)
 * 3. Registry 기반 카드 — organizationType × organizationRole에 따라 차등 렌더링
 *
 * NOTE: /demo/* 링크 금지. basePath는 BranchContext에서 가져옴.
 */

import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useBranchContext } from '../../contexts/BranchContext';
import { useAuth } from '../../contexts/AuthContext';
import { branchApi } from '../../api/branch';
import { getOrgDashboardLayout } from './organization-dashboard-map';
import { ORG_CARD_REGISTRY } from './organization-dashboard-cards';

interface NewsItem {
  id: string;
  title: string;
  date: string;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  district: '지부',
  branch: '분회',
};

const ROLE_LABELS: Record<string, string> = {
  admin: '관리자',
  operator: '운영자',
  member: '회원',
};

export function BranchDashboardPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branchName, basePath } = useBranchContext();
  const { user } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    if (!branchId) return;
    setNewsLoading(true);
    branchApi.getNews(branchId, { limit: 3 })
      .then((res) => {
        const items = (res.data?.items || []).map((item: any) => ({
          id: item.id,
          title: item.title,
          date: (item.created_at || item.createdAt || '').slice(0, 10),
        }));
        setNews(items);
      })
      .catch(() => {
        setNews([]);
      })
      .finally(() => setNewsLoading(false));
  }, [branchId]);

  // organizationType × organizationRole 기반 카드 레이아웃 결정
  const organizationType = user?.kpaMembership?.organizationType;
  const organizationRole = user?.kpaMembership?.organizationRole;
  const cardKeys = getOrgDashboardLayout(organizationType, organizationRole);
  const orgTypeLabel = organizationType ? ORG_TYPE_LABELS[organizationType] || null : null;
  const roleLabel = organizationRole ? ROLE_LABELS[organizationRole] || null : null;

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <div style={styles.badgeRow}>
            <div style={styles.heroBadge}>
              {orgTypeLabel ? `커뮤니티 소속 ${orgTypeLabel}` : '커뮤니티 소속 분회'}
            </div>
            {roleLabel && (
              <div style={styles.roleBadge}>{roleLabel}</div>
            )}
          </div>
          <h1 style={styles.heroTitle}>
            {branchName}
          </h1>
          <p style={styles.heroSubtitle}>
            분회 공지사항, 자료, 회원 소통을 한 곳에서
          </p>
          <div style={styles.heroButtons}>
            <Link to={`${basePath}/news/notice`} style={styles.heroPrimaryButton}>
              공지사항 확인
            </Link>
            <Link to={`${basePath}/about`} style={styles.heroSecondaryButton}>
              분회 소개
            </Link>
          </div>
        </div>
      </section>

      {/* 공지 영역 */}
      <section style={styles.section}>
        <div style={styles.cardHeader}>
          <h2 style={styles.sectionTitle}>최근 공지</h2>
          <Link to={`${basePath}/news`} style={styles.moreLink}>더보기 →</Link>
        </div>
        {newsLoading ? (
          <div style={styles.newsCard}>
            <div style={{ padding: '16px 0', color: colors.neutral400, fontSize: '14px' }}>불러오는 중...</div>
          </div>
        ) : news.length > 0 ? (
          <div style={styles.newsCard}>
            {news.map((item) => (
              <Link key={item.id} to={`${basePath}/news/${item.id}`} style={styles.newsItem}>
                <span style={styles.newsTitle}>{item.title}</span>
                <span style={styles.newsDate}>{item.date}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>등록된 공지사항이 없습니다.</p>
          </div>
        )}
      </section>

      {/* Registry 기반 카드 렌더링 */}
      <div style={styles.cardsContainer}>
        {cardKeys.map((key) => {
          const CardComponent = ORG_CARD_REGISTRY[key];
          return (
            <CardComponent
              key={key}
              basePath={basePath}
              orgName={branchName}
            />
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 16px 48px',
  },

  // Hero Section
  heroSection: {
    position: 'relative',
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    borderRadius: 0,
    padding: '60px 40px',
    marginLeft: 'calc(-50vw + 50%)',
    marginRight: 'calc(-50vw + 50%)',
    width: '100vw',
    marginBottom: 0,
    color: colors.white,
    overflow: 'hidden',
    minHeight: '280px',
    display: 'flex',
    alignItems: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 100%)',
    pointerEvents: 'none',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center',
  },
  badgeRow: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  heroBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.3)',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    border: '1px solid rgba(255,255,255,0.5)',
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: '12px',
    lineHeight: 1.3,
  },
  heroSubtitle: {
    fontSize: '1rem',
    opacity: 0.9,
    marginBottom: '24px',
  },
  heroButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  heroPrimaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: colors.white,
    color: '#059669',
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  heroSecondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: colors.white,
    borderRadius: '8px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    textDecoration: 'none',
    border: '2px solid rgba(255,255,255,0.5)',
  },

  // Section
  section: {
    marginTop: '32px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  moreLink: {
    fontSize: '0.8125rem',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },

  // News card
  newsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: '4px 20px',
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
  },
  newsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: `1px solid ${colors.gray200}`,
    textDecoration: 'none',
  },
  newsTitle: {
    fontSize: '0.875rem',
    color: colors.neutral900,
    fontWeight: 500,
  },
  newsDate: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },

  // Empty state
  emptyState: {
    padding: '32px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.md,
    border: `2px dashed ${colors.neutral300}`,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '0.875rem',
    color: colors.neutral400,
    margin: 0,
  },

  // Cards container
  cardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginTop: '32px',
  },
};
