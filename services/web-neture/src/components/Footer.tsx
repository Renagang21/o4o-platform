// WO-O4O-CROSSSERVICE-DYNAMIC-LEGAL-FOOTER-V1: 하드코딩 법정정보 제거 → API(footer-legal) 값이 있을 때만 표시.
import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { loadFooterLegal } from '../lib/footerLegal';

export function Footer() {
  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.topRow}>
          <div style={{ color: '#666' }}>
            <p style={styles.company}>© 2026 Neture. 공급자 · 파트너 협업 플랫폼</p>
            <PublicLegalFooterInfo serviceKey="neture" loadProfile={loadFooterLegal} />
          </div>
        </div>
      </div>
    </footer>
  );
}

const styles: Record<string, React.CSSProperties> = {
  footer: {
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderTop: '1px solid #e9ecef',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
  },
  company: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 4px 0',
  },
  contact: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
};
