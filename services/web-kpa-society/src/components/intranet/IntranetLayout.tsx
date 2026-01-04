/**
 * IntranetLayout - 인트라넷 메인 레이아웃
 * WO-KPA-COMMITTEE-INTRANET-V1: OrganizationProvider 추가
 * 좌측 고정 사이드바 + 메인 콘텐츠 영역
 */

import { Outlet } from 'react-router-dom';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import { IntranetSidebar } from './IntranetSidebar';
import { colors } from '../../styles/theme';

export function IntranetLayout() {
  return (
    <OrganizationProvider>
      <div style={styles.container}>
        <IntranetSidebar />
        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </OrganizationProvider>
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
    marginLeft: '260px',
    minHeight: '100vh',
  },
};
