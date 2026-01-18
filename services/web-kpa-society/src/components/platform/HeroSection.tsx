/**
 * HeroSection - 플랫폼 홈 히어로 섹션
 *
 * WO-KPA-HOME-FOUNDATION-V1
 * WO-KPA-HOME-REFINE-V1: CTA 단순화 (Login 1개)
 */

export function HeroSection() {
  return (
    <section style={styles.hero}>
      <div style={styles.container}>
        <h1 style={styles.title}>약사 직능 공동 플랫폼</h1>
        <p style={styles.subtitle}>
          약국·병원·산업 약사를 위한 공통 서비스
        </p>
        <a href="/demo/login" style={styles.ctaButton}>
          Login
        </a>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    backgroundColor: '#0f172a',
    color: '#fff',
    padding: '80px 24px',
    textAlign: 'center',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    margin: '0 0 16px 0',
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#94a3b8',
    margin: '0 0 32px 0',
    lineHeight: 1.6,
  },
  ctaButton: {
    display: 'inline-block',
    padding: '14px 32px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default HeroSection;
