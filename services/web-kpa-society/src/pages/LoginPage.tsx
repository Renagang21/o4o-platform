/**
 * LoginPage - KPA Society 로그인 페이지
 *
 * WO-KPA-DEMO-ROUTE-ISOLATION-V1: /demo 하위로 이동
 * WO-KPA-FUNCTION-GATE-V1: 직능 미선택 시 게이트로 이동
 *
 * 로그인 후 이동:
 * - 직능 미선택 -> /demo/select-function (게이트)
 * - 직능 선택됨 -> /demo 홈
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      // WO-KPA-FUNCTION-GATE-V1: 직능 미선택 시 게이트로 이동
      if (!loggedInUser.pharmacistFunction) {
        navigate('/demo/select-function');
      } else {
        navigate('/demo');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>청명광역약사회</div>
        <h1 style={styles.title}>로그인</h1>
        <p style={styles.subtitle}>약사회 SaaS에 오신 것을 환영합니다</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>비밀번호</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              style={styles.input}
              required
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
            }}
            disabled={loading}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={styles.footer}>
          <a href="/demo/forgot-password" style={styles.link}>비밀번호를 잊으셨나요?</a>
          <span style={styles.divider}>|</span>
          <a href="/demo/member/apply" style={styles.link}>회원가입</a>
        </div>
      </div>
    </div>
  );
}

/**
 * 스타일 정의 - Design Token CSS 변수 사용
 * Primary 색상은 CTA 버튼과 로고에만 사용
 * 나머지는 Neutral 계열 사용
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-bg-secondary)',
    padding: 'var(--space-4)',
  },
  card: {
    backgroundColor: 'var(--color-card-bg)',
    borderRadius: 'var(--radius-xl)',
    padding: 'var(--space-6)',
    width: '100%',
    maxWidth: '480px',
    boxShadow: 'var(--shadow-lg)',
  },
  logo: {
    fontSize: 'var(--text-title-lg)',
    fontWeight: 700,
    color: 'var(--color-primary)',  /* Primary 허용: 로고 */
    textAlign: 'center',
    marginBottom: 'var(--space-2)',
  },
  title: {
    fontSize: 'var(--text-title-lg)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    textAlign: 'center',
    margin: '0 0 var(--space-2) 0',
  },
  subtitle: {
    fontSize: 'var(--text-body-md)',
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    margin: '0 0 var(--space-5) 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-4)',
  },
  error: {
    backgroundColor: '#FEE2E2',
    color: 'var(--color-error)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-body-md)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  label: {
    fontSize: 'var(--text-body-md)',
    fontWeight: 500,
    color: 'var(--color-text-primary)',
  },
  input: {
    padding: 'var(--space-3)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-body-lg)',
    outline: 'none',
    transition: 'var(--transition-fast)',
  },
  submitButton: {
    padding: 'var(--space-3)',
    backgroundColor: 'var(--color-btn-primary-bg)',  /* Primary 허용: CTA 버튼 */
    color: 'var(--color-btn-primary-text)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-body-lg)',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 'var(--space-2)',
  },
  footer: {
    textAlign: 'center',
    marginTop: 'var(--space-4)',
    fontSize: 'var(--text-body-md)',
  },
  link: {
    color: 'var(--color-primary)',  /* Primary 허용: 핵심 링크 */
    textDecoration: 'none',
  },
  divider: {
    color: 'var(--color-border-default)',
    margin: '0 var(--space-3)',
  },
};

export default LoginPage;
