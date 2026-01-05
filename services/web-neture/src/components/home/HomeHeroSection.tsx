/**
 * HomeHeroSection - 메인 히어로 섹션
 * 5초 안에 Neture가 무엇인지 이해시키기
 */

import { Link } from 'react-router-dom';

export function HomeHeroSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h1 style={styles.headline}>
          공급자의 상품과 콘텐츠를
          <br />
          사업자가 활용하는 B2B 허브
        </h1>
        <p style={styles.subheadline}>
          제품, 교육, 마케팅 콘텐츠를
          <br />
          서비스와 매장에서 바로 활용하세요.
        </p>
        <div style={styles.ctaGroup}>
          <Link to="/supplier" style={styles.ctaPrimary}>
            공급자로 시작하기
          </Link>
          <Link to="/partner" style={styles.ctaSecondary}>
            파트너로 참여하기
          </Link>
          <Link to="/login" style={styles.ctaText}>
            로그인
          </Link>
        </div>
      </div>
    </section>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#f8fafc',
    padding: '80px 20px',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    textAlign: 'center',
  },
  headline: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.4,
    margin: '0 0 20px 0',
  },
  subheadline: {
    fontSize: '18px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 40px 0',
  },
  ctaGroup: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
  },
  ctaSecondary: {
    display: 'inline-block',
    padding: '14px 28px',
    backgroundColor: '#fff',
    color: PRIMARY_COLOR,
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
    border: `1px solid ${PRIMARY_COLOR}`,
  },
  ctaText: {
    display: 'inline-block',
    padding: '14px 20px',
    color: '#64748b',
    fontSize: '14px',
    textDecoration: 'none',
  },
};
