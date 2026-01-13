/**
 * TestGuideLayout - 테스트 가이드 공통 레이아웃
 * WO-TEST-GUIDE-UI-LAYOUT-V1 기준
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface TestGuideLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

// 테스트 포럼 URL (환경변수 또는 기본값)
const FORUM_URL = import.meta.env.VITE_TEST_FORUM_URL || '/forum';

export default function TestGuideLayout({ children, title, subtitle }: TestGuideLayoutProps) {
  const location = useLocation();
  const isManualPage = location.pathname.includes('/manual/');

  return (
    <div style={styles.container}>
      {/* 상단 테스트 환경 배너 */}
      <div style={styles.testBanner}>
        <span style={styles.testBadge}>TEST</span>
        <span style={styles.testText}>현재 이 서비스는 테스트 환경입니다</span>
      </div>

      {/* 헤더 영역 */}
      <header style={styles.header}>
        <h1 style={styles.title}>{title || '테스트 가이드'}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </header>

      {/* 본문 콘텐츠 */}
      <main style={styles.main}>
        {children}
      </main>

      {/* 하단 고정 영역 */}
      <footer style={styles.footer}>
        <a href={FORUM_URL} target="_blank" rel="noopener noreferrer" style={styles.forumButton}>
          테스트 의견 남기기
        </a>
        {isManualPage && (
          <Link to="/test-guide" style={styles.backLink}>
            테스트 가이드로 돌아가기
          </Link>
        )}
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
  },
  testBanner: {
    backgroundColor: '#fef3c7',
    borderBottom: '1px solid #fcd34d',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  testBadge: {
    backgroundColor: '#f59e0b',
    color: '#fff',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
  },
  testText: {
    fontSize: '13px',
    color: '#92400e',
  },
  header: {
    textAlign: 'center',
    padding: '32px 24px 16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '8px',
  },
  main: {
    flex: 1,
    padding: '0 24px 24px',
    maxWidth: '800px',
    width: '100%',
    margin: '0 auto',
  },
  footer: {
    padding: '24px',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  forumButton: {
    display: 'inline-block',
    padding: '12px 32px',
    backgroundColor: 'var(--color-primary, #2563eb)',
    color: '#fff',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '15px',
  },
  backLink: {
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
  },
};
