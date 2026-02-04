/**
 * LoginPage - KPA Society 로그인 페이지
 *
 * 경로에 따른 동작:
 * - /login (메인): 전체 KPA 테스트 계정 (운영자 포함), 로그인 후 / 이동
 * - /demo/login (데모): 데모용 계정, 로그인 후 /demo 이동
 *
 * WO-KPA-FUNCTION-GATE-V1: 직능 미선택 시 게이트로 이동
 */

import { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 테스트 계정 (비밀번호 통일: TestPassword)
// 계정은 SeedAdditionalTestAccounts migration에서 생성됨
const TEST_PASSWORD = 'TestPassword';

// 메인 로그인: 약사/약국 서비스용 계정만
const mainTestAccounts = [
  { email: 'pharmacist-kpa@o4o.com', password: TEST_PASSWORD, label: '약사' },
];

// 데모 로그인: 기존 데모 계정
const demoTestAccounts = [
  { email: 'pharmacist-kpa@o4o.com', password: TEST_PASSWORD, label: '일반회원 (약사)' },
  { email: 'branch-officer-kpa@o4o.com', password: TEST_PASSWORD, label: '분회 임원' },
  { email: 'district-officer-kpa@o4o.com', password: TEST_PASSWORD, label: '지부 임원' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const returnTo = searchParams.get('returnTo');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 경로 기반 모드 판별: /demo/login → 데모, /login → 메인
  const isDemo = location.pathname.startsWith('/demo');
  // 테스트 계정 정보를 입력 필드에 채우기
  const fillTestAccount = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);

      // WO-KPA-FUNCTION-GATE-V1: 직능 선택 로직
      // 직능/직역 미선택 시 게이트로 이동, 그 외에는 홈으로 이동
      const isAdmin = loggedInUser.role === 'district_admin' ||
                      loggedInUser.role === 'branch_admin' ||
                      loggedInUser.role === 'super_admin';

      // 모든 로그인 후 홈 화면(/)으로 이동
      // 관리자도 대시보드가 아닌 홈으로 이동하도록 변경
      if (!isAdmin && (!loggedInUser.pharmacistFunction || !loggedInUser.pharmacistRole)) {
        // 직능/직역 미선택 시 게이트로 이동 (게이트 완료 후 홈으로 이동)
        navigate('/demo/select-function');
      } else if (returnTo) {
        // WO-KPA-UNIFIED-AUTH-PHARMACY-GATE-V1: returnTo 지원
        navigate(returnTo);
      } else {
        // 기본: 홈 화면으로 이동 (대시보드 아님)
        navigate('/');
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
        <div style={styles.logo}>KPA-Society</div>
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
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                style={styles.passwordInput}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div style={styles.optionsRow}>
            <label style={styles.checkboxLabel}>
              <input type="checkbox" style={styles.checkbox} />
              <span>로그인 상태 유지</span>
            </label>
            <a href="/demo/forgot-password" style={styles.forgotLink}>
              비밀번호 찾기
            </a>
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
          <span style={styles.footerText}>계정이 없으신가요?</span>
          <a href="/demo/member/apply" style={styles.link}>회원가입</a>
        </div>

        {/* 테스트 계정 */}
        <div style={styles.testSection}>
          <p style={styles.testLabel}>테스트 계정 (클릭 시 입력됨)</p>
          <div style={styles.testAccounts}>
            {(isDemo ? demoTestAccounts : mainTestAccounts).map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillTestAccount(account)}
                style={styles.testAccountButton}
              >
                <div style={styles.testAccountInfo}>
                  <span style={styles.testAccountBadge}>{account.label}</span>
                  <p style={styles.testAccountEmail}>{account.email}</p>
                </div>
                <span style={styles.testAccountClick}>클릭하여 입력</span>
              </button>
            ))}
          </div>
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
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    padding: 'var(--space-3)',
    paddingRight: '48px',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-body-lg)',
    outline: 'none',
    transition: 'var(--transition-fast)',
    boxSizing: 'border-box',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    color: 'var(--color-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: 'var(--text-body-md)',
    color: 'var(--color-text-secondary)',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: 'var(--color-primary)',
  },
  forgotLink: {
    fontSize: 'var(--text-body-md)',
    color: 'var(--color-primary)',
    textDecoration: 'none',
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
  footerText: {
    color: 'var(--color-text-secondary)',
    marginRight: 'var(--space-2)',
  },
  link: {
    color: 'var(--color-primary)',  /* Primary 허용: 핵심 링크 */
    textDecoration: 'none',
    fontWeight: 500,
  },
  testSection: {
    marginTop: 'var(--space-5)',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--color-border-default)',
  },
  testLabel: {
    fontSize: 'var(--text-body-sm)',
    color: 'var(--color-text-secondary)',
    textAlign: 'center',
    marginBottom: 'var(--space-3)',
  },
  testAccounts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  testAccountButton: {
    width: '100%',
    padding: 'var(--space-3)',
    textAlign: 'left',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border-default)',
    backgroundColor: 'var(--color-card-bg)',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'var(--transition-fast)',
  },
  testAccountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
  },
  testAccountBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: 'var(--text-body-sm)',
    fontWeight: 500,
    backgroundColor: 'var(--color-bg-secondary)',
    color: 'var(--color-text-secondary)',
  },
  testAccountEmail: {
    fontSize: 'var(--text-body-md)',
    color: 'var(--color-text-secondary)',
    margin: 0,
  },
  testAccountClick: {
    fontSize: 'var(--text-body-sm)',
    color: 'var(--color-text-secondary)',
  },
};

export default LoginPage;
