/**
 * PageHeader - 페이지 상단 헤더 컴포넌트
 */

import { colors, typography } from '../../styles/theme';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: { label: string; href?: string }[];
}

export function PageHeader({ title, description, breadcrumb }: PageHeaderProps) {
  return (
    <div style={styles.container}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav style={styles.breadcrumb}>
          {breadcrumb.map((item, index) => (
            <span key={index} style={styles.breadcrumbItem}>
              {item.href ? (
                <a href={item.href} style={styles.breadcrumbLink}>
                  {item.label}
                </a>
              ) : (
                <span style={styles.breadcrumbCurrent}>{item.label}</span>
              )}
              {index < breadcrumb.length - 1 && (
                <span style={styles.breadcrumbSeparator}>/</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <h1 style={styles.title}>{title}</h1>
      {description && <p style={styles.description}>{description}</p>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '32px 0',
    borderBottom: `1px solid ${colors.neutral300}`,
    marginBottom: '24px',
  },
  breadcrumb: {
    marginBottom: '12px',
    ...typography.bodyS,
    color: colors.neutral500,
  },
  breadcrumbItem: {
    display: 'inline',
  },
  breadcrumbLink: {
    color: colors.neutral500,
    textDecoration: 'none',
  },
  breadcrumbCurrent: {
    color: colors.neutral700,
  },
  breadcrumbSeparator: {
    margin: '0 8px',
    color: colors.neutral300,
  },
  title: {
    ...typography.headingXL,
    color: colors.neutral900,
    margin: 0,
  },
  description: {
    ...typography.bodyL,
    color: colors.neutral500,
    marginTop: '8px',
    marginBottom: 0,
  },
};
