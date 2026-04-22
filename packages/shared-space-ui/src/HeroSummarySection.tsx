import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { HeroSummarySectionProps } from './types';

const DEFAULT_ACCENT = '#2563EB';

export function HeroSummarySection({
  greeting,
  subtitle,
  ctas,
  accentColor = DEFAULT_ACCENT,
}: HeroSummarySectionProps) {
  useEffect(() => {
    const id = 'shared-hero-cta-hover';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .ss-hero-cta:hover {
        border-color: ${accentColor} !important;
        color: ${accentColor} !important;
        box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, [accentColor]);

  return (
    <section style={styles.container}>
      <p style={styles.greeting}>{greeting}</p>
      {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      <div style={styles.ctaRow}>
        {ctas.map((cta) => (
          <Link
            key={cta.href}
            to={cta.href}
            style={styles.ctaButton}
            className="ss-hero-cta"
          >
            {cta.icon && <span style={styles.ctaIcon}>{cta.icon}</span>}
            <span style={styles.ctaLabel}>{cta.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    border: '1px solid #e2e8f0',
    marginBottom: 32,
  },
  greeting: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  ctaRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    textDecoration: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s, color 0.15s',
  },
  ctaIcon: {
    display: 'flex',
    alignItems: 'center',
    color: '#64748b',
  },
  ctaLabel: {
    whiteSpace: 'nowrap',
  },
};
