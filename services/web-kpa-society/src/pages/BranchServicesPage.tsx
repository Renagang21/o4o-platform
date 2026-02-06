/**
 * BranchServicesPage - 분회 서비스 홈 (허브)
 *
 * WO-KPA-BRANCH-SERVICE-ROUTE-MIGRATION-V1
 *
 * 역할: 여러 분회가 각각 독립적으로 사용하는 분회 서비스의 진입 허브
 * - 서비스 소개 페이지 ❌
 * - 데모 통합 페이지 ❌
 * - 분회 선택 허브 ⭕
 *
 * 구조:
 * - /branch-services : 이 페이지 (허브)
 * - /branch-services/demo : 분회 서비스 데모
 * - /branch-services/{branchKey} : 실제 분회 서비스
 */

import { Link } from 'react-router-dom';
import { ArrowRight, Home } from 'lucide-react';
import { useAuth } from '../contexts';
import { useAuthModal } from '../contexts/LoginModalContext';

// 분회 카드 데이터 타입
interface BranchCard {
  id: string;
  name: string;
  description: string;
  href: string;
  isDemo?: boolean;
}

// 분회 목록 (데모 + 실제 분회들)
const branches: BranchCard[] = [
  {
    id: 'demo',
    name: '분회 서비스 데모',
    description: '분회 서비스 예시 화면',
    href: '/branch-services/demo',
    isDemo: true,
  },
  // 실제 분회들은 여기에 추가
  // {
  //   id: 'gangnam',
  //   name: '강남분회',
  //   description: '서울특별시 강남구 약사회',
  //   href: '/branch-services/gangnam',
  // },
];

export function BranchServicesPage() {
  const { user, logout } = useAuth();
  const { openLoginModal } = useAuthModal();

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContainer}>
          <Link to="/" style={styles.headerLogo}>
            <Home style={{ width: 20, height: 20 }} />
            <span>KPA Platform</span>
          </Link>
          <nav style={styles.nav}>
            <Link to="/demo" style={styles.navLink}>커뮤니티 홈</Link>
          </nav>
          <div style={styles.headerRight}>
            {user ? (
              <div style={styles.userArea}>
                <span style={styles.userName}>{user.name || '사용자'}</span>
                <button onClick={() => logout()} style={styles.logoutButton}>
                  로그아웃
                </button>
              </div>
            ) : (
              <button onClick={openLoginModal} style={styles.loginButton}>
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={styles.hero}>
        <h1 style={styles.title}>분회 서비스</h1>
        <p style={styles.mainMessage}>
          각 분회가 독립적으로 운영하는 전용 서비스입니다
        </p>
        <p style={styles.subMessage}>
          공지 · 커뮤니티 · 행사 · 자료를 분회 단위로 운영합니다
        </p>
        <Link to="/branch-services/demo" style={styles.ctaButton}>
          분회 서비스 데모 보기
          <ArrowRight style={{ width: 18, height: 18 }} />
        </Link>
      </div>

      {/* 분회 카드 리스트 */}
      <div style={styles.content}>
        <h2 style={styles.sectionTitle}>분회 선택</h2>
        <div style={styles.cardGrid}>
          {branches.map((branch) => (
            <Link
              key={branch.id}
              to={branch.href}
              style={styles.card}
            >
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>🏢</span>
                {branch.isDemo && (
                  <span style={styles.demoBadge}>데모</span>
                )}
              </div>
              <h3 style={styles.cardTitle}>{branch.name}</h3>
              <p style={styles.cardDesc}>{branch.description}</p>
              <div style={styles.cardFooter}>
                <span style={styles.cardLink}>
                  바로가기
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {branches.length === 1 && (
          <p style={styles.emptyNote}>
            현재 데모 분회만 이용 가능합니다. 실제 분회 서비스는 순차적으로 오픈됩니다.
          </p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  // Header
  header: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  navLink: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    textDecoration: 'none',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userName: {
    fontSize: '14px',
    color: '#475569',
  },
  loginButton: {
    padding: '8px 20px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  logoutButton: {
    padding: '6px 12px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  // Hero
  hero: {
    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    padding: '72px 20px',
    textAlign: 'center',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    margin: '0 0 16px',
  },
  mainMessage: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#fff',
    margin: '0 0 12px',
    lineHeight: 1.3,
  },
  subMessage: {
    fontSize: '17px',
    color: 'rgba(255, 255, 255, 0.85)',
    margin: '0 0 36px',
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px 28px',
    backgroundColor: '#fff',
    color: '#1e40af',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '10px',
    textDecoration: 'none',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  // Content
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '48px 20px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '24px',
  },
  // Card Grid
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    display: 'block',
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  cardIcon: {
    fontSize: '32px',
  },
  demoBadge: {
    padding: '4px 10px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  cardDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 16px',
    lineHeight: 1.5,
  },
  cardFooter: {
    paddingTop: '16px',
    borderTop: '1px solid #f1f5f9',
  },
  cardLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#2563eb',
  },
  emptyNote: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
  },
};

export default BranchServicesPage;
