/**
 * IntranetHeader - 인트라넷 페이지 헤더
 * WO-KPA-COMMITTEE-INTRANET-V1: 현재 조직 브레드크럼 표시 추가
 */

import { useOrganization } from '../../contexts/OrganizationContext';
import { colors } from '../../styles/theme';

interface IntranetHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  showOrgBreadcrumb?: boolean;
}

export function IntranetHeader({ title, subtitle, actions, showOrgBreadcrumb = true }: IntranetHeaderProps) {
  const { organizationChain, currentOrganization } = useOrganization();

  const getOrgTypeLabel = (type: string) => {
    switch (type) {
      case 'branch': return '지부';
      case 'division': return '분회';
      case 'committee': return '위원회';
      default: return '조직';
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.titleSection}>
        {/* 조직 브레드크럼 */}
        {showOrgBreadcrumb && organizationChain.length > 0 && (
          <div style={styles.orgBreadcrumb}>
            {organizationChain.map((org, idx) => (
              <span key={org.id}>
                {idx > 0 && <span style={styles.breadcrumbSeparator}>›</span>}
                <span
                  style={{
                    ...styles.breadcrumbItem,
                    fontWeight: org.id === currentOrganization.id ? 600 : 400,
                    color: org.id === currentOrganization.id ? colors.primary : colors.neutral500,
                  }}
                >
                  {org.name}
                </span>
              </span>
            ))}
            <span style={styles.orgType}>({getOrgTypeLabel(currentOrganization.type)})</span>
          </div>
        )}
        <h1 style={styles.title}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div style={styles.actions}>{actions}</div>}
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    padding: '24px 32px',
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.neutral200}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {},
  orgBreadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    marginBottom: '8px',
  },
  breadcrumbSeparator: {
    color: colors.neutral400,
    margin: '0 6px',
  },
  breadcrumbItem: {},
  orgType: {
    color: colors.neutral400,
    marginLeft: '8px',
    fontSize: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '4px 0 0 0',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
};
