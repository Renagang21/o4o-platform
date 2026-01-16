/**
 * ManualLayout - 매뉴얼 페이지 레이아웃
 *
 * 왼쪽 네비게이션 + 오른쪽 콘텐츠 형태의 문서 스타일 레이아웃
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';

export interface ManualSection {
  id: string;
  title: string;
  icon?: ReactNode;
}

export interface ManualLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  sections: ManualSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  roleColor?: string;
}

// 테스트 포럼 URL
const FORUM_URL = '/forum/test-feedback';

export default function ManualLayout({
  children,
  title,
  subtitle,
  sections,
  activeSection,
  onSectionChange,
  roleColor = '#2563eb',
}: ManualLayoutProps) {
  const currentIndex = sections.findIndex((s) => s.id === activeSection);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSectionChange(sections[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < sections.length - 1) {
      onSectionChange(sections[currentIndex + 1].id);
    }
  };

  return (
    <div style={styles.container}>
      {/* 상단 테스트 환경 배너 */}
      <div style={styles.testBanner}>
        <span style={styles.testBadge}>TEST</span>
        <span style={styles.testText}>현재 이 서비스는 테스트 환경입니다</span>
      </div>

      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/test-guide" style={styles.backButton}>
            <Home size={16} />
            테스트 가이드
          </Link>
          <div style={styles.titleArea}>
            <h1 style={{ ...styles.title, color: roleColor }}>{title}</h1>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
      </header>

      {/* 메인 레이아웃 */}
      <div style={styles.mainLayout}>
        {/* 왼쪽 사이드바 네비게이션 */}
        <aside style={styles.sidebar}>
          <nav style={styles.nav}>
            <p style={styles.navTitle}>목차</p>
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                style={{
                  ...styles.navItem,
                  ...(activeSection === section.id
                    ? { ...styles.navItemActive, borderLeftColor: roleColor, backgroundColor: `${roleColor}10` }
                    : {}),
                }}
              >
                <span style={styles.navNumber}>{index + 1}</span>
                <span style={styles.navText}>{section.title}</span>
              </button>
            ))}
          </nav>

          {/* 하단 링크 */}
          <div style={styles.sidebarFooter}>
            <Link to={FORUM_URL} style={styles.forumLink}>
              의견 남기기
            </Link>
          </div>
        </aside>

        {/* 오른쪽 콘텐츠 영역 */}
        <main style={styles.content}>
          <div style={styles.contentInner}>
            {children}
          </div>

          {/* 이전/다음 네비게이션 */}
          <div style={styles.navButtons}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{
                ...styles.navButton,
                opacity: currentIndex === 0 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={18} />
              이전
            </button>
            <span style={styles.pageIndicator}>
              {currentIndex + 1} / {sections.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === sections.length - 1}
              style={{
                ...styles.navButton,
                opacity: currentIndex === sections.length - 1 ? 0.4 : 1,
              }}
            >
              다음
              <ChevronRight size={18} />
            </button>
          </div>
        </main>
      </div>
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
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 24px',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '13px',
    padding: '6px 12px',
    borderRadius: '6px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  mainLayout: {
    flex: 1,
    display: 'flex',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '24px',
    gap: '24px',
  },
  sidebar: {
    width: '240px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  nav: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    flex: 1,
  },
  navTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    margin: '0 0 12px 0',
    paddingLeft: '12px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderLeft: '3px solid transparent',
    borderRadius: '0 6px 6px 0',
    cursor: 'pointer',
    textAlign: 'left',
    marginBottom: '4px',
    transition: 'all 0.15s ease',
  },
  navItemActive: {
    borderLeftColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  navNumber: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    flexShrink: 0,
  },
  navText: {
    fontSize: '13px',
    color: '#334155',
    fontWeight: 500,
  },
  sidebarFooter: {
    marginTop: '16px',
    textAlign: 'center',
  },
  forumLink: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: 500,
  },
  content: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  contentInner: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '32px',
    flex: 1,
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    padding: '0 8px',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  pageIndicator: {
    fontSize: '13px',
    color: '#94a3b8',
    fontWeight: 500,
  },
};
