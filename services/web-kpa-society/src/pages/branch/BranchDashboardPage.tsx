/**
 * BranchDashboardPage - 분회 메인 대시보드
 *
 * SVC-C: 분회 서비스 홈
 * WO-KPA-SOCIETY-PHASE6-BRANCH-UX-STANDARD-V1
 *
 * 표준 섹션 구성:
 * 1. Hero — 분회명, 한 줄 소개, "커뮤니티 소속 분회" 배지
 * 2. 공지 영역 — 최근 공지 3건 (empty state 포함)
 * 3. 빠른 이동 카드 — 소식, 자료실, 커뮤니티(포럼), 문의/연락처
 * 4. 분회 안내 — 소개, 임원, 연락처, 본부 이동
 *
 * NOTE: /demo/* 링크 금지. basePath는 BranchContext에서 가져옴.
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useBranchContext } from '../../contexts/BranchContext';

// Mock data (실제로는 API에서 가져옴)
const mockBranchNews = [
  { id: 1, title: '12월 정기 모임 안내', date: '2024-12-18' },
  { id: 2, title: '송년회 일정 공지', date: '2024-12-15' },
  { id: 3, title: '분회장 인사말씀', date: '2024-12-10' },
];

export function BranchDashboardPage() {
  const { branchName, basePath } = useBranchContext();

  // 빠른 이동 카드 (WO T6-1 표준: 소식, 자료실, 커뮤니티, 문의)
  const shortcuts = [
    { icon: '📢', label: '소식', href: `${basePath}/news` },
    { icon: '📁', label: '자료실', href: `${basePath}/docs` },
    { icon: '💬', label: '커뮤니티', href: `${basePath}/forum` },
    { icon: '📞', label: '연락처', href: `${basePath}/about/contact` },
  ];

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>커뮤니티 소속 분회</div>
          <h1 style={styles.heroTitle}>
            {branchName} 분회
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
        {mockBranchNews.length > 0 ? (
          <div style={styles.newsCard}>
            {mockBranchNews.map((news) => (
              <Link key={news.id} to={`${basePath}/news/${news.id}`} style={styles.newsItem}>
                <span style={styles.newsTitle}>{news.title}</span>
                <span style={styles.newsDate}>{news.date}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>등록된 공지사항이 없습니다.</p>
          </div>
        )}
      </section>

      {/* 빠른 이동 카드 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>바로가기</h2>
        <div style={styles.shortcutGrid}>
          {shortcuts.map((item) => (
            <Link key={item.label} to={item.href} style={styles.shortcutCard}>
              <span style={styles.shortcutIcon}>{item.icon}</span>
              <span style={styles.shortcutLabel}>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 분회 안내 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>분회 안내</h2>
        <div style={styles.infoGrid}>
          <Link to={`${basePath}/about`} style={styles.infoCard}>
            <span style={styles.infoIcon}>🏢</span>
            <span style={styles.infoLabel}>분회 소개</span>
          </Link>
          <Link to={`${basePath}/about/officers`} style={styles.infoCard}>
            <span style={styles.infoIcon}>👥</span>
            <span style={styles.infoLabel}>임원 안내</span>
          </Link>
          <Link to={`${basePath}/about/contact`} style={styles.infoCard}>
            <span style={styles.infoIcon}>📞</span>
            <span style={styles.infoLabel}>연락처</span>
          </Link>
          <Link to="/" style={styles.infoCard}>
            <span style={styles.infoIcon}>🏛️</span>
            <span style={styles.infoLabel}>본부 이동</span>
          </Link>
        </div>
      </section>
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
  heroBadge: {
    display: 'inline-block',
    padding: '6px 16px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '20px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    marginBottom: '20px',
    border: '1px solid rgba(255,255,255,0.3)',
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

  // Shortcuts (4-column)
  shortcutGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginTop: '16px',
  },
  shortcutCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px 12px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
    textDecoration: 'none',
    transition: 'border-color 0.2s',
  },
  shortcutIcon: {
    fontSize: '1.5rem',
  },
  shortcutLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral700,
  },

  // Info Grid
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '12px',
    marginTop: '16px',
  },
  infoCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 12px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
    textDecoration: 'none',
  },
  infoIcon: {
    fontSize: '28px',
    marginBottom: '8px',
  },
  infoLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral700,
  },
};
