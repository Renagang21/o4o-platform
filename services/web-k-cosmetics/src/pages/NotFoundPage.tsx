/**
 * NotFoundPage — K-Cosmetics 의 존재하지 않는 경로 안내 화면
 *
 * WO-O4O-WEB-UX-STANDARDIZATION-BATCH-V1
 *   5개 web 서비스의 404 문구·버튼이 서로 달랐다. 여기서는 요청 주소도, 직전 화면으로
 *   돌아갈 수단도 없어서 오타·구 링크·삭제된 페이지가 모두 같은 화면으로 뭉개졌다.
 *   canonical(Neture / Pharmacy-Hub) 형태로 맞춘다 — 404 코드 · 표준 문구 · 요청 경로 표시 ·
 *   [홈으로 이동] + [이전 화면으로 돌아가기]. 서비스 고유 보조 링크(커뮤니티 · 문의하기)는 유지한다.
 *
 * 선행: WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1 (404 = minimal nav)
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <p style={styles.code}>404</p>
        <h1 style={styles.title}>요청하신 페이지를 찾을 수 없습니다.</h1>
        <p style={styles.description}>
          주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다.
        </p>
        <p style={styles.path}>{location.pathname}</p>

        <div style={styles.navRow}>
          <Link to="/" style={styles.button}>
            홈으로 이동
          </Link>
          <button type="button" onClick={() => navigate(-1)} style={styles.buttonOutline}>
            이전 화면으로 돌아가기
          </button>
        </div>

        {/* 서비스 고유 보조 링크 (기존 유지) */}
        <div style={styles.subRow}>
          <Link to="/forum" style={styles.subLink}>
            커뮤니티
          </Link>
          <Link to="/contact" style={styles.subLink}>
            문의하기
          </Link>
        </div>
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
    maxWidth: '420px',
  },
  code: {
    fontSize: '64px',
    fontWeight: 700,
    color: '#e2e8f0',
    margin: 0,
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1e293b',
    marginTop: '12px',
    marginBottom: '8px',
  },
  description: {
    fontSize: '15px',
    color: '#64748b',
    marginBottom: '16px',
    lineHeight: 1.6,
  },
  path: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#94a3b8',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 12px',
    marginBottom: '24px',
    wordBreak: 'break-all',
  },
  navRow: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
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
  buttonOutline: {
    display: 'inline-block',
    padding: '12px 24px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#334155',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '12px',
    cursor: 'pointer',
  },
  subRow: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  subLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
};
