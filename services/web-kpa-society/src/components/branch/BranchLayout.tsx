/**
 * BranchLayout - 분회 전용 레이아웃
 * 지부 사이트의 서브디렉토리(/branch/:branchId)로 운영
 */

import { ReactNode } from 'react';
import { BranchHeader } from './BranchHeader';
import { BranchFooter } from './BranchFooter';

interface BranchLayoutProps {
  branchId: string;
  branchName: string;
  children: ReactNode;
}

export function BranchLayout({ branchId, branchName, children }: BranchLayoutProps) {
  return (
    <div style={styles.container}>
      <BranchHeader branchId={branchId} branchName={branchName} />
      <main style={styles.main}>{children}</main>
      <BranchFooter branchName={branchName} />
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
