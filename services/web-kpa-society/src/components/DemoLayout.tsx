/**
 * DemoLayout - SVC-B: 지부/분회 데모 서비스 전용 레이아웃
 *
 * SVC-B: 지부/분회 데모 서비스
 * WO-KPA-DEMO-HEADER-SEPARATION-V1
 * WO-KPA-SOCIETY-PHASE6-SVC-B-DEMO-UX-REFINE-V1
 *
 * - 실제 운영 서비스 아님
 * - 지부/분회 서비스가 독립 도메인으로 제공되면 전체 삭제 대상
 *
 * /demo/* 경로에서 사용되는 독립된 레이아웃.
 * 커뮤니티 Layout과 시각적으로 명확히 분리됨.
 *
 * 구성:
 * - 데모 안내 배너 (상시 노출)
 * - DemoHeader (어두운 배경, 데모 전용 메뉴)
 * - Content
 * - Footer
 */

import type { ReactNode } from 'react';
import { DemoHeader } from './DemoHeader';
import { Footer } from './Footer';

interface DemoLayoutProps {
  serviceName: string;
  children: ReactNode;
}

export function DemoLayout({ serviceName, children }: DemoLayoutProps) {
  return (
    <div style={styles.container}>
      {/* 데모 안내 배너 — 모든 /demo/* 페이지에 상시 노출 */}
      <div style={styles.demoBanner}>
        <span style={styles.demoBannerIcon}>ℹ️</span>
        <span style={styles.demoBannerText}>
          이 서비스는 지부/분회 홈페이지의 예시 화면입니다. 실제 지부/분회 서비스는 별도 도메인에서 운영됩니다.
        </span>
      </div>
      <DemoHeader serviceName={serviceName} />
      <main style={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  demoBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 20px',
    backgroundColor: '#fef3c7',
    borderBottom: '1px solid #fbbf24',
    fontSize: '13px',
    color: '#92400e',
  },
  demoBannerIcon: {
    fontSize: '14px',
    flexShrink: 0,
  },
  demoBannerText: {
    fontWeight: 500,
  },
  main: {
    flex: 1,
  },
};

export default DemoLayout;
