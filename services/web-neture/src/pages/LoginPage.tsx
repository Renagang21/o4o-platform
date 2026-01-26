/**
 * LoginPage - Neture 로그인 페이지
 * 로그인 후 역할에 따라 대시보드로 이동, 복수 역할시 선택 화면
 */

import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth, ROLE_DASHBOARDS } from '../contexts';

// 테스트 계정 (비밀번호 통일: TestPassword)
// 계정은 SeedAdditionalTestAccounts migration에서 생성됨
const TEST_PASSWORD = 'TestPassword';
const testAccounts = [
  { email: 'supplier-neture@o4o.com', password: TEST_PASSWORD, label: '공급자' },
  { email: 'partner-neture@o4o.com', password: TEST_PASSWORD, label: '파트너' },
  { email: 'admin-neture@o4o.com', password: TEST_PASSWORD, label: '운영자' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // returnUrl이 있으면 로그인 후 해당 URL로 이동
  const returnUrl = searchParams.get('returnUrl');

  // dev=true 파라미터가 있을 때만 테스트 계정 표시 (내부 개발/테스트용)
  const showTestAccounts = searchParams.get('dev') === 'true';

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

      // 로그인 성공 - returnUrl이 있으면 해당 URL로, 없으면 역할별 대시보드로 이동
      if (returnUrl) {
        navigate(returnUrl);
      } else {
        const dashboardPath = result.role ? ROLE_DASHBOARDS[result.role] : '/';
        navigate(dashboardPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 로그인 폼
  return (
    <div style={styles.page}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/supplier-ops" style={styles.headerLogo}>
            <span style={styles.headerLogoText}>Neture</span>
            <span style={styles.headerLogoSub}>공급자 연결</span>
          </Link>
          <Link to="/" style={styles.headerHomeLink}>
            <Home size={14} />
            <span>메인</span>
          </Link>
        </div>
      </header>

      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logo}>🌿</div>
          <h1 style={styles.title}>로그인</h1>
          <p style={styles.subtitle}>Neture 공급자 연결 서비스에 오신 것을 환영합니다</p>

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
          <Link to="/" style={styles.link}>홈으로 돌아가기</Link>
        </div>

        {/* 테스트 계정 - dev=true 파라미터가 있을 때만 표시 */}
        {showTestAccounts && (
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
        )}
        </div>
      </div>
    </div>
  );
}

/**
 * 스타일 정의 - K-Cosmetics와 동일한 패턴
 * CSS 변수 대신 직접 색상값 사용
 */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 24px',
  },
  headerContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
  },
  headerLogoText: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#16a34a',
  },
  headerLogoSub: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#64748b',
    borderLeft: '1px solid #cbd5e1',
    paddingLeft: '8px',
  },
  headerHomeLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#94a3b8',
    textDecoration: 'none',
  },
  container: {
    minHeight: 'calc(100vh - 64px)',
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
  submitButton: {
    padding: '14px',
    backgroundColor: '#16a34a',
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
    color: '#16a34a',
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
