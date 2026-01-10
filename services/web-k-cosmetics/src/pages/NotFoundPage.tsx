/**
 * NotFoundPage - K-Cosmetics
 * Based on GlycoPharm structure
 */

import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.icon}>🔍</div>
        <h1 style={styles.title}>페이지를 찾을 수 없습니다</h1>
        <p style={styles.description}>
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Link to="/" style={styles.button}>
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '400px',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '12px',
  },
  description: {
    fontSize: '16px',
    color: '#64748b',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  button: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#e91e63',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '12px',
    textDecoration: 'none',
  },
};
