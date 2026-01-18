/**
 * ServiceCard - 개별 서비스 카드 컴포넌트
 *
 * WO-KPA-HOME-FOUNDATION-V1
 */

export interface ServiceCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
}

export function ServiceCard({ icon, title, description, href, badge }: ServiceCardProps) {
  return (
    <a href={href} style={styles.card}>
      <div style={styles.iconWrapper}>{icon}</div>
      <h3 style={styles.title}>
        {title}
        {badge && <span style={styles.badge}>{badge}</span>}
      </h3>
      <p style={styles.description}>{description}</p>
    </a>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'block',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    textDecoration: 'none',
    color: 'inherit',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.2s, transform 0.2s',
    border: '1px solid #e2e8f0',
  },
  iconWrapper: {
    fontSize: '2rem',
    marginBottom: '12px',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: {
    fontSize: '0.75rem',
    fontWeight: 500,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  description: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
};

export default ServiceCard;
