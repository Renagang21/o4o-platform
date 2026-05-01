/**
 * ContentSurveysPage — /content/surveys
 *
 * 설문 기능은 현재 서비스 준비 중.
 * participation backend가 없으므로 정적 안내만 표시.
 */

import { Link } from 'react-router-dom';

export function ContentSurveysPage() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <Link to="/content" style={styles.backLink}>← 콘텐츠 허브</Link>
          <h1 style={styles.title}>설문조사</h1>
          <p style={styles.desc}>구성원 의견을 수집하는 설문 기능입니다.</p>
        </div>
      </header>

      <div style={styles.placeholder}>
        <p style={{ margin: 0 }}>설문 기능은 준비 중입니다.</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 16px 60px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
    flexWrap: 'wrap',
  },
  backLink: {
    fontSize: '0.8125rem',
    color: '#64748b',
    textDecoration: 'none',
    marginBottom: 8,
    display: 'inline-block',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '4px 0 4px',
  },
  desc: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
  },
  placeholder: {
    padding: '40px 16px',
    fontSize: '0.875rem',
    color: '#94a3b8',
    textAlign: 'center',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
  },
};

export default ContentSurveysPage;
