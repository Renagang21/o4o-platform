/**
 * LoginPage - KPA Society 로그인 페이지
 *
 * 역할별 로그인 후 이동:
 * - 관리자(admin, district_admin, branch_admin) -> 해당 대시보드
 * - 약사(pharmacist) 및 기타 -> 홈(/)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, TEST_ACCOUNTS, type TestAccountType } from '../contexts/AuthContext';

// 테스트 계정 목록 (클릭 시 즉시 로그인)
const TEST_ACCOUNT_LIST = [
  { type: 'district_admin' as TestAccountType, label: '지부 운영자', email: 'district-admin@kpa-test.kr', password: 'test123!@#' },
  { type: 'branch_admin' as TestAccountType, label: '분회 운영자', email: 'branch-admin@kpa-test.kr', password: 'test123!@#' },
  { type: 'pharmacist' as TestAccountType, label: '약사', email: 'pharmacist@kpa-test.kr', password: 'test123!@#' },
];

// 역할별 대시보드 경로
const ROLE_DASHBOARDS: Record<string, string> = {
  'admin': '/admin',
  'district_admin': '/admin',
  'branch_admin': '/branch/1/admin',
  'pharmacist': '/',
};

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loginAsTestAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      // 로그인 성공 - 역할에 따라 이동
      // 실제 로그인 시 user 정보를 확인하여 대시보드로 이동
      // 여기서는 일단 홈으로 이동 (AuthContext에서 역할 확인 후 리다이렉트)
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 테스트 계정 정보를 입력 필드에 채우기
  const fillTestAccount = (account: { email: string; password: string }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  // 테스트 계정으로 즉시 로그인 (로컬 상태만 변경)
  const handleTestLogin = (accountType: TestAccountType) => {
    loginAsTestAccount(accountType);
    const testUser = TEST_ACCOUNTS[accountType];
    const dashboard = ROLE_DASHBOARDS[testUser.role || ''] || '/';
    navigate(dashboard);
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

        {/* 테스트 계정 */}
        <div style={styles.testSection}>
          <p style={styles.testTitle}>테스트 계정 (클릭 시 즉시 로그인)</p>
          <div style={styles.testAccounts}>
            {TEST_ACCOUNT_LIST.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleTestLogin(account.type)}
                style={styles.testAccountButton}
              >
                <span style={styles.testAccountLabel}>{account.label}</span>
                <span style={styles.testAccountEmail}>{account.email}</span>
                <span style={styles.quickLoginBadge}>즉시 로그인</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <a href="/forgot-password" style={styles.link}>비밀번호를 잊으셨나요?</a>
          <span style={styles.divider}>|</span>
          <a href="/member/apply" style={styles.link}>회원가입</a>
        </div>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 700,
    color: PRIMARY_COLOR,
    textAlign: 'center',
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#1a1a1a',
    textAlign: 'center',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    margin: '0 0 32px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  error: {
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
  },
  input: {
    padding: '14px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitButton: {
    padding: '16px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
  },
  testSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
  },
  testTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
  },
  testAccounts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  testAccountButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  testAccountLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0F172A',
    minWidth: '80px',
  },
  testAccountEmail: {
    fontSize: '13px',
    color: '#64748B',
    flex: 1,
  },
  quickLoginBadge: {
    fontSize: '11px',
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    fontSize: '14px',
  },
  link: {
    color: PRIMARY_COLOR,
    textDecoration: 'none',
  },
  divider: {
    color: '#ddd',
    margin: '0 12px',
  },
};

export default LoginPage;
