interface ValueItem {
  title: string;
  description: string;
}

interface CoreValueSectionProps {
  items: ValueItem[];
}

export function CoreValueSection({ items }: CoreValueSectionProps) {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.grid}>
          {items.map((item, index) => (
            <div key={index} style={styles.card}>
              <h3 style={styles.title}>{item.title}</h3>
              <p style={styles.description}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: '64px 24px',
    backgroundColor: '#ffffff',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '32px',
  },
  card: {
    padding: '24px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 12px 0',
  },
  description: {
    fontSize: '15px',
    color: '#4a4a4a',
    margin: 0,
    lineHeight: 1.6,
    whiteSpace: 'pre-line',
  },
};
