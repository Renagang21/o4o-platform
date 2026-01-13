/**
 * Layout - 경기도약사회 스타일
 * Header (nav 포함) + Content + Footer
 */

import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  serviceName: string;
  children: ReactNode;
}

export function Layout({ serviceName, children }: LayoutProps) {
  return (
    <div style={styles.container}>
      <Header serviceName={serviceName} />
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
