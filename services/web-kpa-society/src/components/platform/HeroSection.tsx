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
        {/* WO-GLOBAL-ALPHA-STATUS-HERO-V080: 운영형 알파 상태 표시 */}
        <div style={styles.alphaBadge}>
          <span style={styles.alphaIndicator}></span>
          <span>운영형 알파 · v0.8.0</span>
        </div>
        <h1 style={styles.title}>약사 직능 공동 플랫폼</h1>
        <p style={styles.subtitle}>
          약국·병원·산업 약사를 위한 공통 서비스
        </p>
        <p style={styles.alphaNote}>
          지역약사회와 함께 운영 구조를 검증하는 단계입니다
        </p>
        <div style={styles.ctaButtons}>
          <a href="/demo" style={styles.ctaButton}>
            약사회 서비스 살펴보기
          </a>
          <a href="/demo/login" style={styles.ctaButtonOutline}>
            Login
          </a>
        </div>
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
  alphaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '20px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: '24px',
  },
  alphaIndicator: {
    width: '6px',
    height: '6px',
    backgroundColor: '#34d399',
    borderRadius: '50%',
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
    margin: '0 0 12px 0',
    lineHeight: 1.6,
  },
  alphaNote: {
    fontSize: '0.875rem',
    color: 'rgba(148, 163, 184, 0.7)',
    margin: '0 0 32px 0',
  },
  ctaButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
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
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  ctaButtonOutline: {
    display: 'inline-block',
    padding: '14px 32px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid #475569',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
};

export default HeroSection;
