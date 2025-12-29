interface HeroSectionProps {
  headline: string;
  subHeadline: string;
  supportText?: string;
}

export function HeroSection({ headline, subHeadline, supportText }: HeroSectionProps) {
  return (
    <section style={styles.hero}>
      <div style={styles.container}>
        <h1 style={styles.headline}>{headline}</h1>
        <p style={styles.subHeadline}>{subHeadline}</p>
        {supportText && <p style={styles.supportText}>{supportText}</p>}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    backgroundColor: '#f8f9fa',
    padding: '64px 24px',
    textAlign: 'center',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  headline: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 16px 0',
    lineHeight: 1.3,
  },
  subHeadline: {
    fontSize: '18px',
    color: '#4a4a4a',
    margin: '0 0 12px 0',
    lineHeight: 1.6,
  },
  supportText: {
    fontSize: '15px',
    color: '#6a6a6a',
    margin: 0,
    lineHeight: 1.5,
  },
};
