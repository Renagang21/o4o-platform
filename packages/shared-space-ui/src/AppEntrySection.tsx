import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { AppEntrySectionProps } from './types';

const DEFAULT_ACCENT = '#2563EB';

export function AppEntrySection({
  title = '서비스 바로가기',
  subtitle,
  cards,
  accentColor = DEFAULT_ACCENT,
  onCardClick,
}: AppEntrySectionProps) {
  useEffect(() => {
    const id = 'shared-appentry-responsive';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .ss-appentry-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      @media (min-width: 768px) {
        .ss-appentry-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      .ss-appentry-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <section style={styles.section}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {subtitle && <p style={styles.subtitle}>{subtitle}</p>}

      <div className="ss-appentry-grid">
        {cards.map((card) => (
          <Link
            key={card.href}
            to={card.href}
            style={styles.card}
            className="ss-appentry-card"
            onClick={onCardClick ? (e) => onCardClick(card.href, e) : undefined}
          >
            {card.icon && <span style={styles.icon}>{card.icon}</span>}
            <div style={styles.content}>
              <h3 style={styles.cardTitle}>{card.title}</h3>
              <p style={styles.cardDesc}>{card.description}</p>
            </div>
            <span style={{ ...styles.arrow, color: accentColor }}>→</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0 0 16px 0',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    textDecoration: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  icon: {
    fontSize: 24,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    margin: '2px 0 0 0',
  },
  arrow: {
    fontSize: 16,
    fontWeight: 600,
    flexShrink: 0,
  },
};
