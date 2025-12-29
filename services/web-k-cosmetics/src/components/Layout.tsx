import { ReactNode } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { Footer } from './Footer';

interface LayoutProps {
  serviceName: string;
  children: ReactNode;
}

export function Layout({ serviceName, children }: LayoutProps) {
  return (
    <div style={styles.container}>
      <Header serviceName={serviceName} />
      <Navigation />
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
