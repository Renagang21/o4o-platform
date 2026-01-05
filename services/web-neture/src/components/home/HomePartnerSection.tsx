/**
 * HomePartnerSection - 파트너를 위한 Neture
 * 파트너를 "보조자"가 아니라 확장 주체로 인식시키기
 */

import { Link } from 'react-router-dom';

const bullets = [
  '공급자 · 서비스 연결',
  '협업 기반 확장',
  '커미션 기반 참여',
];

export function HomePartnerSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.content}>
          <span style={styles.icon}>🤝</span>
          <h2 style={styles.title}>파트너를 위한 Neture</h2>
          <p style={styles.description}>
            파트너는
            <br />
            공급자와 서비스를 연결하고,
            <br />
            협업과 확장을 만들어가는 역할입니다.
          </p>
          <ul style={styles.bullets}>
            {bullets.map((bullet, index) => (
              <li key={index} style={styles.bulletItem}>
                <span style={styles.bulletCheck}>✓</span>
                {bullet}
              </li>
            ))}
          </ul>
          <Link to="/partner" style={styles.cta}>
            파트너 대시보드로 이동
          </Link>
        </div>
      </div>
    </section>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#fff',
    padding: '80px 20px',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  content: {
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 20px 0',
  },
  description: {
    fontSize: '16px',
    color: '#475569',
    lineHeight: 1.8,
    margin: '0 0 28px 0',
  },
  bullets: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 32px 0',
    display: 'inline-block',
    textAlign: 'left',
  },
  bulletItem: {
    fontSize: '15px',
    color: '#334155',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  bulletCheck: {
    color: PRIMARY_COLOR,
    fontWeight: 600,
  },
  cta: {
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
};
