/**
 * Layout - KPA Society 메인 레이아웃
 * GlobalHeader + Content + Footer
 *
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → KpaGlobalHeader 교체
 */

import type { ReactNode } from 'react';
import { KpaGlobalHeader } from './KpaGlobalHeader';
import { Footer } from './Footer';

interface LayoutProps {
  serviceName: string;
  children: ReactNode;
}

export function Layout({ serviceName: _serviceName, children }: LayoutProps) {
  return (
    <div style={styles.container}>
      <KpaGlobalHeader />
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
