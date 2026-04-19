import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { CtaGuidanceSectionProps } from './types';

const DEFAULT_ACCENT = '#059669';
const DEFAULT_ACCENT_BG = '#dcfce7';

export function CtaGuidanceSection({
  title,
  description,
  href,
  linkLabel,
  icon,
  accentColor = DEFAULT_ACCENT,
  accentBg = DEFAULT_ACCENT_BG,
  external = false,
}: CtaGuidanceSectionProps) {
  useEffect(() => {
    const id = 'shared-cta-hover';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .ss-cta-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const inner = (
    <>
      {icon && (
        <div style={{ ...styles.iconWrap, backgroundColor: accentBg }}>
          <span style={styles.icon}>{icon}</span>
        </div>
      )}
      <div style={styles.content}>
        <p style={styles.headline}>{title}</p>
        <p style={styles.subline}>{description}</p>
      </div>
      <span style={{ ...styles.cta, color: accentColor }}>{linkLabel}</span>
    </>
  );

  const cardStyle: CSSProperties = {
    ...styles.card,
    borderLeft: `3px solid ${accentColor}`,
  };

  if (external) {
    return (
      <section style={styles.section}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={cardStyle}
          className="ss-cta-card"
        >
          {inner}
        </a>
      </section>
    );
  }

  return (
    <section style={styles.section}>
      <Link to={href} style={cardStyle} className="ss-cta-card">
        {inner}
      </Link>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: {
    marginBottom: 32,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '20px 24px',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    fontSize: '1.25rem',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 2px 0',
  },
  subline: {
    fontSize: '0.8125rem',
    color: '#64748b',
    lineHeight: 1.5,
    margin: 0,
  },
  cta: {
    flexShrink: 0,
    fontSize: '0.8125rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
};
