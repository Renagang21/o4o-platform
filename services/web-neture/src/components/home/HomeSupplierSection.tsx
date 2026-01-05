/**
 * HomeSupplierSection - 공급자를 위한 Neture
 * 공급자가 왜 Neture를 써야 하는지 명확히
 */

import { Link } from 'react-router-dom';

const bullets = [
  '상품 + 콘텐츠를 하나의 자산으로 관리',
  '여러 서비스에 동일 자산 활용',
  '사업자 설득 비용 감소',
];

export function HomeSupplierSection() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <div style={styles.content}>
          <span style={styles.icon}>📦</span>
          <h2 style={styles.title}>공급자를 위한 Neture</h2>
          <p style={styles.description}>
            Neture에서는
            <br />
            상품뿐 아니라,
            <br />
            사업자가 바로 활용할 수 있는
            <br />
            콘텐츠까지 함께 제공합니다.
          </p>
          <ul style={styles.bullets}>
            {bullets.map((bullet, index) => (
              <li key={index} style={styles.bulletItem}>
                <span style={styles.bulletCheck}>✓</span>
                {bullet}
              </li>
            ))}
          </ul>
          <Link to="/supplier" style={styles.cta}>
            공급자 대시보드로 이동
          </Link>
        </div>
      </div>
    </section>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#f0f9ff',
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
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '8px',
    textDecoration: 'none',
  },
};
