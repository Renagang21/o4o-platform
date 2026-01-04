/**
 * AdminLayout - 분회 관리자 레이아웃
 */

import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { colors } from '../../styles/theme';

export function AdminLayout() {
  return (
    <div style={styles.container}>
      <AdminSidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: colors.neutral100,
  },
  main: {
    flex: 1,
    marginLeft: '260px', // 사이드바 너비
    minHeight: '100vh',
  },
};
