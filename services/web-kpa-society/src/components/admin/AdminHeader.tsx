/**
 * AdminHeader - 지부 관리자 페이지 헤더
 */

import { colors } from '../../styles/theme';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminHeader({ title, subtitle, actions }: AdminHeaderProps) {
  return (
    <header style={styles.header}>
      <div style={styles.titleSection}>
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div style={styles.actions}>{actions}</div>}
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 32px',
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  titleSection: {},
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: colors.neutral500,
    marginTop: '4px',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
};
