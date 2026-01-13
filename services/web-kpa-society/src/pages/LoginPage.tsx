/**
 * LoginPage - KPA Society 로그인 페이지
 *
 * 역할별 로그인 후 이동:
 * - 관리자(admin, district_admin, branch_admin) -> 해당 대시보드
 * - 약사(pharmacist) 및 기타 -> 홈(/)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type TestAccountType } from '../contexts/AuthContext';

/**
 * 테스트 계정 목록 (클릭 시 입력됨)
 *
 * 권한(Role)과 직책(Position) 구분:
 * - 운영자: 관리 권한 보유 (district_admin, branch_admin)
 * - 임원: 직책만 표시, 권한은 일반 회원과 동일 (district_officer, branch_officer)
 * - 약사: 일반 회원
 *
 * 비밀번호 통일: TestPassword
 * @see docs/app-guidelines/kpa-auth-role-position-principles.md
 */
const TEST_PASSWORD = 'TestPassword';
const TEST_ACCOUNT_LIST = [
  // 권한 보유 계정 (Role)
  { type: 'district_admin' as TestAccountType, label: '지부 운영자', email: 'district-admin@kpa-test.kr', password: TEST_PASSWORD, category: 'admin' },
  { type: 'branch_admin' as TestAccountType, label: '분회 운영자', email: 'branch-admin@kpa-test.kr', password: TEST_PASSWORD, category: 'admin' },
  // 직책만 보유 계정 (Position) - 권한 없음
  { type: 'district_officer' as TestAccountType, label: '지부 임원', email: 'district-officer@kpa-test.kr', password: TEST_PASSWORD, category: 'officer' },
  { type: 'branch_officer' as TestAccountType, label: '분회 임원', email: 'branch-officer@kpa-test.kr', password: TEST_PASSWORD, category: 'officer' },
  // 일반 회원
  { type: 'pharmacist' as TestAccountType, label: '약사', email: 'pharmacist@kpa-test.kr', password: TEST_PASSWORD, category: 'member' },
];

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
  const fillTestAccount = (account: { email: string; password: string; type: TestAccountType }) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
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

        {/* 테스트 계정 */}
        <div style={styles.testSection}>
          <p style={styles.testTitle}>테스트 계정 (클릭 시 입력됨)</p>

          {/* 운영자 계정 */}
          <p style={styles.categoryLabel}>운영자 (관리 권한)</p>
          <div style={styles.testAccounts}>
            {TEST_ACCOUNT_LIST.filter(a => a.category === 'admin').map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillTestAccount(account)}
                style={styles.testAccountButton}
              >
                <span style={styles.testAccountLabel}>{account.label}</span>
                <span style={styles.testAccountEmail}>{account.email}</span>
                <span style={styles.adminBadge}>권한</span>
              </button>
            ))}
          </div>

          {/* 임원 계정 */}
          <p style={styles.categoryLabel}>임원 (직책만, 권한 없음)</p>
          <div style={styles.testAccounts}>
            {TEST_ACCOUNT_LIST.filter(a => a.category === 'officer').map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillTestAccount(account)}
                style={styles.testAccountButton}
              >
                <span style={styles.testAccountLabel}>{account.label}</span>
                <span style={styles.testAccountEmail}>{account.email}</span>
                <span style={styles.officerBadge}>직책</span>
              </button>
            ))}
          </div>

          {/* 일반 회원 */}
          <p style={styles.categoryLabel}>일반 회원</p>
          <div style={styles.testAccounts}>
            {TEST_ACCOUNT_LIST.filter(a => a.category === 'member').map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillTestAccount(account)}
                style={styles.testAccountButton}
              >
                <span style={styles.testAccountLabel}>{account.label}</span>
                <span style={styles.testAccountEmail}>{account.email}</span>
                <span style={styles.quickLoginBadge}>클릭</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <a href="/test-guide" style={styles.testGuideLink}>테스트 가이드 보기</a>
          <span style={styles.divider}>|</span>
          <a href="/forgot-password" style={styles.link}>비밀번호를 잊으셨나요?</a>
          <span style={styles.divider}>|</span>
          <a href="/member/apply" style={styles.link}>회원가입</a>
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
  testSection: {
    marginTop: 'var(--space-4)',
    paddingTop: 'var(--space-4)',
    borderTop: '1px solid var(--color-border-default)',
  },
  testTitle: {
    fontSize: 'var(--text-body-sm)',
    fontWeight: 600,
    color: 'var(--color-text-tertiary)',
    margin: '0 0 var(--space-3) 0',
    textTransform: 'uppercase',
  },
  categoryLabel: {
    fontSize: 'var(--text-body-sm)',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    margin: 'var(--space-3) 0 var(--space-2) 0',
  },
  testAccounts: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
  },
  testAccountButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border-default)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'var(--transition-fast)',
  },
  testAccountLabel: {
    fontSize: 'var(--text-body-md)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    minWidth: '80px',
  },
  testAccountEmail: {
    fontSize: 'var(--text-body-sm)',
    color: 'var(--color-text-tertiary)',
    flex: 1,
  },
  quickLoginBadge: {
    fontSize: 'var(--text-body-sm)',
    backgroundColor: 'var(--color-bg-tertiary)',  /* Neutral로 변경: 덜 눈에 띄게 */
    color: 'var(--color-text-secondary)',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 500,
  },
  adminBadge: {
    fontSize: 'var(--text-body-sm)',
    backgroundColor: '#DBEAFE',  /* Blue-100 */
    color: '#1E40AF',  /* Blue-800 */
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
  },
  officerBadge: {
    fontSize: 'var(--text-body-sm)',
    backgroundColor: '#FEF3C7',  /* Amber-100 */
    color: '#92400E',  /* Amber-800 */
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 500,
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
