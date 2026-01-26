/**
 * LoginPage - K-Cosmetics
 * Based on GlycoPharm LoginPage structure
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// 테스트 계정 (비밀번호 통일: TestPassword)
// 계정은 SeedProductionTestAccounts migration에서 생성됨
// consumer 계정 제거 (역할 불일치 문제)
const TEST_PASSWORD = 'TestPassword';
const testAccounts = [
  { email: 'seller-k-cosmetics@o4o.com', password: TEST_PASSWORD, label: '판매자' },
  { email: 'supplier-k-cosmetics@o4o.com', password: TEST_PASSWORD, label: '공급자' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 테스트 계정 정보를 입력 필드에 채우기 (자동 로그인 아님)
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
      const result = await login(email, password);
      if (!result.success) {
        throw new Error(result.error || '로그인에 실패했습니다.');
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>💄</div>
        <h1 style={styles.title}>로그인</h1>
        <p style={styles.subtitle}>K-Cosmetics에 오신 것을 환영합니다</p>

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
            <Link to="/forgot-password" style={styles.forgotLink}>
              비밀번호 찾기
            </Link>
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
          <Link to="/" style={styles.link}>홈으로 돌아가기</Link>
        </div>

        {/* 테스트 계정 */}
        <div style={styles.testSection}>
          <p style={styles.testLabel}>테스트 계정 (클릭 시 입력됨)</p>
          <div style={styles.testAccounts}>
            {testAccounts.map((account) => (
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
  },
  logo: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 32px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left',
  },
  error: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#334155',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    width: '100%',
    padding: '12px 48px 12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
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
    color: '#94a3b8',
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
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#e91e63',
  },
  forgotLink: {
    fontSize: '14px',
    color: '#e91e63',
    textDecoration: 'none',
  },
  submitButton: {
    padding: '14px',
    backgroundColor: '#e91e63',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
    textAlign: 'center',
  },
  link: {
    color: '#e91e63',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  testSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  testLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: '12px',
  },
  testAccounts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  testAccountButton: {
    width: '100%',
    padding: '12px 16px',
    textAlign: 'left',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.2s',
  },
  testAccountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  testAccountBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  testAccountEmail: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  testAccountClick: {
    fontSize: '12px',
    color: '#94a3b8',
  },
};
