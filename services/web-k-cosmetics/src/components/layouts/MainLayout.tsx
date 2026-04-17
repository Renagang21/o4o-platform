/**
 * MainLayout - K-Cosmetics
 * WO-O4O-GLOBAL-LAYOUT-UNIFICATION-V1: Header → KCosGlobalHeader 교체
 */

import { Outlet } from 'react-router-dom';
import { KCosGlobalHeader } from '@/components/KCosGlobalHeader';
import { Footer } from '@/components/common';

export default function MainLayout() {
  return (
    <div style={styles.container}>
      <KCosGlobalHeader />
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
