interface UsageStep {
  title: string;
  description: string;
}

interface UsagePreviewSectionProps {
  steps: UsageStep[];
}

export function UsagePreviewSection({ steps }: UsagePreviewSectionProps) {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.stepList}>
          {steps.map((step, index) => (
            <div key={index} style={styles.stepItem}>
              <div style={styles.stepNumber}>{index + 1}</div>
              <div style={styles.stepContent}>
                <h3 style={styles.stepTitle}>{step.title}</h3>
                <p style={styles.stepDescription}>{step.description}</p>
              </div>
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
    backgroundColor: '#f8f9fa',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  stepList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  stepNumber: {
    flexShrink: 0,
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  stepDescription: {
    fontSize: '14px',
    color: '#4a4a4a',
    margin: 0,
    lineHeight: 1.5,
  },
};
