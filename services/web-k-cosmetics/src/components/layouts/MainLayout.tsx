/**
 * MainLayout - K-Cosmetics
 * Based on GlycoPharm MainLayout structure
 */

import { Outlet } from 'react-router-dom';
import { Header, Footer } from '@/components/common';

export default function MainLayout() {
  return (
    <div style={styles.container}>
      <Header />
      <main style={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8fafc',
  },
  main: {
    flex: 1,
  },
};
