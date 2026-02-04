/**
 * DemoLayout - 약사회 서비스 데모 전용 레이아웃
 *
 * WO-KPA-DEMO-HEADER-SEPARATION-V1
 *
 * /demo/* 경로에서 사용되는 독립된 레이아웃.
 * 커뮤니티 Layout과 시각적으로 명확히 분리됨.
 *
 * 구성:
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
  main: {
    flex: 1,
  },
};

export default DemoLayout;
