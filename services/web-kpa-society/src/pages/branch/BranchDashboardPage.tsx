/**
 * BranchDashboardPage - 분회 메인 대시보드
 * 지부 DashboardPage와 동일한 구조, 분회 데이터 표시
 */

import { Link, useParams } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useBranchContext } from '../../contexts/BranchContext';

// Quick Menu items (분회용)
const getQuickMenuItems = (branchId: string) => [
  { icon: '📢', label: '공지사항', href: `/branch/${branchId}/news/notice`, color: '#2563EB' },
  { icon: '🛒', label: '공동구매', href: `/branch/${branchId}/groupbuy`, color: '#059669' },
  { icon: '💬', label: '포럼', href: `/branch/${branchId}/forum`, color: '#F59E0B' },
  { icon: '📁', label: '자료실', href: `/branch/${branchId}/docs`, color: '#EC4899' },
  { icon: '👥', label: '분회 소개', href: `/branch/${branchId}/about`, color: '#6366F1' },
  { icon: '🏢', label: '본부 이동', href: '/', color: '#64748B' },
];

// Mock data (실제로는 API에서 가져옴)
const mockBranchNews = [
  { id: 1, title: '12월 정기 모임 안내', date: '2024-12-18' },
  { id: 2, title: '송년회 일정 공지', date: '2024-12-15' },
  { id: 3, title: '분회장 인사말씀', date: '2024-12-10' },
];

const mockGroupbuys = [
  { id: 1, title: '겨울철 건강식품', price: '45,000원', progress: 78, endDate: '12/25' },
  { id: 2, title: '약국용 소모품', price: '120,000원', progress: 45, endDate: '12/30' },
];

export function BranchDashboardPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { branchName } = useBranchContext();

  const quickMenuItems = getQuickMenuItems(branchId || '');

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroPattern} />
        <div style={styles.heroContent}>
          <div style={styles.heroBadge}>{branchName} 분회</div>
          <h1 style={styles.heroTitle}>
            분회 회원 여러분을<br />환영합니다
          </h1>
          <p style={styles.heroSubtitle}>
            {branchName} 분회 공식 업무 지원 플랫폼
          </p>
          <p style={styles.heroDescription}>
            분회 공지사항, 공동구매, 회원 소통을 한 곳에서
          </p>
          <div style={styles.heroButtons}>
            <Link to={`/branch/${branchId}/news/notice`} style={styles.heroPrimaryButton}>
              공지사항 확인
            </Link>
            <Link to={`/branch/${branchId}/about`} style={styles.heroSecondaryButton}>
              분회 소개
            </Link>
          </div>
        </div>
        <div style={styles.heroDecoration}>
          <div style={styles.decorCircle1} />
          <div style={styles.decorCircle2} />
          <div style={styles.decorCircle3} />
        </div>
      </section>

      {/* Quick Menu */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>바로가기</h2>
        <div style={styles.quickMenuGrid}>
          {quickMenuItems.map((item) => (
            <Link key={item.label} to={item.href} style={styles.quickMenuItem}>
              <span style={{ ...styles.quickMenuIcon, backgroundColor: item.color }}>
                {item.icon}
              </span>
              <span style={styles.quickMenuLabel}>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* News & Groupbuy Grid */}
      <div style={styles.twoColumnGrid}>
        {/* Branch News */}
        <section style={styles.cardSection}>
          <div style={styles.cardHeader}>
            <h2 style={styles.sectionTitle}>분회 소식</h2>
            <Link to={`/branch/${branchId}/news`} style={styles.moreLink}>더보기 →</Link>
          </div>
          <div style={styles.newsList}>
            {mockBranchNews.map((news) => (
              <Link key={news.id} to={`/branch/${branchId}/news/${news.id}`} style={styles.newsItem}>
                <span style={styles.newsTitle}>{news.title}</span>
                <span style={styles.newsDate}>{news.date}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Groupbuy */}
        <section style={styles.cardSection}>
          <div style={styles.cardHeader}>
            <h2 style={styles.sectionTitle}>진행중 공동구매</h2>
            <Link to={`/branch/${branchId}/groupbuy`} style={styles.moreLink}>더보기 →</Link>
          </div>
          <div style={styles.groupbuyList}>
            {mockGroupbuys.map((gb) => (
              <Link key={gb.id} to={`/branch/${branchId}/groupbuy/${gb.id}`} style={styles.groupbuyItem}>
                <div style={styles.groupbuyHeader}>
                  <span style={styles.groupbuyTitle}>{gb.title}</span>
                  <span style={styles.groupbuyEndDate}>~{gb.endDate}</span>
                </div>
                <div style={styles.groupbuyPrice}>{gb.price}</div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${gb.progress}%` }} />
                </div>
                <div style={styles.groupbuyProgress}>{gb.progress}% 달성</div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Branch Info */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>분회 안내</h2>
        <div style={styles.infoGrid}>
          <Link to={`/branch/${branchId}/about`} style={styles.infoCard}>
            <span style={styles.infoIcon}>🏢</span>
            <span style={styles.infoLabel}>분회 소개</span>
          </Link>
          <Link to={`/branch/${branchId}/about/officers`} style={styles.infoCard}>
            <span style={styles.infoIcon}>👥</span>
            <span style={styles.infoLabel}>임원 안내</span>
          </Link>
          <Link to={`/branch/${branchId}/about/contact`} style={styles.infoCard}>
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
    background: `linear-gradient(135deg, #059669 0%, #047857 100%)`,
    borderRadius: 0,
    padding: '60px 40px',
    marginTop: 0,
    marginLeft: 'calc(-50vw + 50%)',
    marginRight: 'calc(-50vw + 50%)',
    width: '100vw',
    marginBottom: '0',
    color: colors.white,
    overflow: 'hidden',
    minHeight: '320px',
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
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `radial-gradient(circle at 20% 80%, rgba(255,255,255,0.08) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 40%)`,
    pointerEvents: 'none',
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: '20px',
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
    fontSize: '2.25rem',
    fontWeight: 700,
    marginBottom: '12px',
    lineHeight: 1.3,
    textShadow: '0 2px 4px rgba(0,0,0,0.15)',
  },
  heroSubtitle: {
    fontSize: '1.125rem',
    opacity: 0.95,
    marginBottom: '8px',
    fontWeight: 500,
  },
  heroDescription: {
    fontSize: '0.9375rem',
    opacity: 0.85,
    marginBottom: '24px',
  },
  heroButtons: {
    display: 'flex',
    gap: '12px',
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
  heroDecoration: {
    position: 'absolute',
    right: '5%',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '300px',
    height: '300px',
    pointerEvents: 'none',
  },
  decorCircle1: {
    position: 'absolute',
    width: '250px',
    height: '250px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.12)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  decorCircle2: {
    position: 'absolute',
    width: '160px',
    height: '160px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: '30%',
    left: '60%',
    transform: 'translate(-50%, -50%)',
  },
  decorCircle3: {
    position: 'absolute',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: '70%',
    left: '40%',
    transform: 'translate(-50%, -50%)',
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
    marginBottom: '16px',
  },

  // Quick Menu
  quickMenuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
    gap: '12px',
  },
  quickMenuItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 8px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    border: `1px solid ${colors.gray200}`,
  },
  quickMenuIcon: {
    width: '40px',
    height: '40px',
    borderRadius: borderRadius.md,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    marginBottom: '8px',
  },
  quickMenuLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral700,
  },

  // Two Column Grid
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '24px',
  },
  cardSection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: '20px',
    boxShadow: shadows.sm,
    border: `1px solid ${colors.gray200}`,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  moreLink: {
    fontSize: '0.8125rem',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },

  // News
  newsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  newsItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
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

  // Groupbuy
  groupbuyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  groupbuyItem: {
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: borderRadius.sm,
    textDecoration: 'none',
  },
  groupbuyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  groupbuyTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.neutral900,
  },
  groupbuyEndDate: {
    fontSize: '0.75rem',
    color: colors.accentRed,
    fontWeight: 500,
  },
  groupbuyPrice: {
    fontSize: '1rem',
    fontWeight: 700,
    color: colors.primary,
    marginBottom: '8px',
  },
  progressBar: {
    height: '6px',
    backgroundColor: colors.gray200,
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentGreen,
    borderRadius: '3px',
  },
  groupbuyProgress: {
    fontSize: '0.75rem',
    color: colors.accentGreen,
    fontWeight: 600,
  },

  // Info Grid
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '12px',
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
