/**
 * NotFoundPage — Neture web 의 존재하지 않는 경로 안내 화면
 *
 * WO-O4O-NETURE-ABOUT-LINK-AND-CATCH-ALL-ROUTE-V1
 *
 * 왜 필요한가
 *   App.tsx 에는 catch-all(`path="*"`) route 가 없었다. 그래서 선언되지 않은 경로로 들어오면
 *   `<Routes>` 가 아무것도 매치하지 못해 **빈 화면**이 됐다. 사용자는 "로딩이 안 끝난 것"과
 *   "없는 페이지"를 구분할 수 없다.
 *   실제 사례: 죽은 `/about` 링크(레이아웃 footer) 클릭 → 빈 화면.
 *
 * 왜 redirect 가 아니라 안내 화면인가
 *   홈으로 강제 이동시키면 주소가 왜 사라졌는지 알 수 없고, 오타·구 링크·삭제된 페이지가
 *   전부 같은 결과로 뭉개진다. 이동은 사용자가 선택한다.
 *
 * 이 화면은 API 를 호출하지 않는다. 레이아웃(NetureLayout 등)에도 속하지 않는다 —
 * 레이아웃이 요구하는 컨텍스트(인증·역할)가 없는 경로에서도 항상 렌더돼야 하기 때문이다.
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div style={s.page}>
      <div style={s.card}>
        <p style={s.code}>404</p>
        <h1 style={s.title}>요청하신 페이지를 찾을 수 없습니다.</h1>
        <p style={s.body}>
          주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다.
        </p>
        <p style={s.path}>{location.pathname}</p>

        <div style={s.actions}>
          <Link to="/" style={s.primary}>
            홈으로 이동
          </Link>
          <button type="button" onClick={() => navigate(-1)} style={s.secondary}>
            이전 화면으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    backgroundColor: '#f8fafc',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 32,
    textAlign: 'center',
  },
  code: { fontSize: 40, fontWeight: 800, color: '#cbd5e1', margin: '0 0 8px', letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.5 },
  body: { fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 12px' },
  path: {
    fontSize: 12,
    color: '#94a3b8',
    margin: '0 0 24px',
    wordBreak: 'break-all',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: 8 },
  primary: {
    display: 'block',
    padding: '10px 16px',
    borderRadius: 8,
    backgroundColor: '#059669',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
  },
  secondary: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    borderRadius: 8,
    backgroundColor: '#fff',
    border: '1px solid #cbd5e1',
    color: '#475569',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
