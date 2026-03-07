/**
 * HomeHeroSection_v2 - o4o 개념 소개 섹션
 *
 * Work Order: WO-NETURE-HOME-HUB-FORUM-V0.1
 * 섹션 ①: o4o 개념 소개 (Hero)
 *
 * 목적: 5초 안에 o4o가 무엇인지 이해시키기
 * - "판매가 아니다" → "연결이다"
 * - 온라인이 오프라인을 대신하는 게 아니라, 오프라인을 돕는 구조
 */

import { Link } from 'react-router-dom';

export function HomeHeroSection_v2() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h1 style={styles.headline}>
          온라인은 지배가 아니라,
          <br />
          연결이어야 합니다
        </h1>
        <p style={styles.subheadline}>
          o4o(Online for Offline)는
          <br />
          온라인이 오프라인의 주체를 대신하는 구조가 아니라,
          <br />
          현장의 공급자와 서비스가 스스로 작동하도록
          <br />
          연결과 정보를 제공하는 방식입니다.
        </p>
        <div style={styles.ctaGroup}>
          <Link to="/about" style={styles.ctaPrimary}>
            o4o 더 알아보기
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
    padding: '100px 20px',
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
    margin: '0 0 28px 0',
  },
  subheadline: {
    fontSize: '17px',
    color: '#64748b',
    lineHeight: 1.8,
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
  ctaText: {
    display: 'inline-block',
    padding: '14px 20px',
    color: '#64748b',
    fontSize: '14px',
    textDecoration: 'none',
  },
};
