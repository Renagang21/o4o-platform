/**
 * PlatformHero - K-Cosmetics 플랫폼 입구 Hero
 * WO-KCOS-HOME-UI-V1
 *
 * 핵심 메시지: "직접 판매하지 않는 플랫폼, 검증된 국내 화장품 매장을 연결"
 */

import { Link } from 'react-router-dom';

export function PlatformHero() {
  return (
    <section style={styles.hero}>
      <div style={styles.container}>
        {/* 플랫폼 정체성 선언 */}
        <h1 style={styles.headline}>K-화장품 유통 네트워크</h1>
        <p style={styles.subHeadline}>
          검증된 국내 화장품 매장을 연결하는 플랫폼
        </p>
        <p style={styles.disclaimer}>
          본 사이트는 직접 판매를 하지 않습니다.
        </p>

        {/* 3갈래 진입 CTA */}
        <div style={styles.ctaGroup}>
          <Link to="/stores" style={styles.ctaPrimary}>
            <span style={styles.ctaIcon}>🛍️</span>
            <span style={styles.ctaLabel}>매장 찾기</span>
            <span style={styles.ctaDesc}>매장에서 직접 구매</span>
          </Link>

          <Link to="/tourists" style={styles.ctaSecondary}>
            <span style={styles.ctaIcon}>✈️</span>
            <span style={styles.ctaLabel}>관광객 안내</span>
            <span style={styles.ctaDesc}>단체/개인 관광객</span>
          </Link>

          <Link to="/partners" style={styles.ctaSecondary}>
            <span style={styles.ctaIcon}>🏪</span>
            <span style={styles.ctaLabel}>파트너 안내</span>
            <span style={styles.ctaDesc}>매장 운영자 전용</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: {
    backgroundColor: '#f8f9fa',
    padding: '80px 24px',
    textAlign: 'center',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  headline: {
    fontSize: '40px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 16px 0',
    lineHeight: 1.2,
  },
  subHeadline: {
    fontSize: '20px',
    color: '#4a4a4a',
    margin: '0 0 12px 0',
    lineHeight: 1.6,
  },
  disclaimer: {
    fontSize: '15px',
    color: '#e53935',
    margin: '0 0 40px 0',
    fontWeight: 500,
  },
  ctaGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    flexWrap: 'wrap',
  },
  ctaPrimary: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 32px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '12px',
    minWidth: '180px',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  ctaSecondary: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 32px',
    backgroundColor: '#fff',
    color: '#1a1a1a',
    textDecoration: 'none',
    borderRadius: '12px',
    minWidth: '180px',
    border: '1px solid #e0e0e0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  ctaIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  ctaLabel: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  ctaDesc: {
    fontSize: '12px',
    opacity: 0.7,
  },
};
