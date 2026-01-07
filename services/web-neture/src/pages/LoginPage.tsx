/**
 * LoginPage - Neture 로그인 페이지
 * 로그인 후 역할에 따라 대시보드로 이동, 복수 역할시 선택 화면
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_DASHBOARDS, UserRole } from '../contexts';

const ROLE_ICONS: Record<UserRole, string> = {
  admin: '🛡️',
  supplier: '📦',
  partner: '🤝',
};

// 테스트 계정 목록
const TEST_ACCOUNTS = [
  { email: 'test-supplier@neture.co.kr', password: 'test123!@#', label: '공급자', role: 'supplier' as UserRole },
  { email: 'test-partner@neture.co.kr', password: 'test123!@#', label: '파트너', role: 'partner' as UserRole },
  { email: 'admin@neture.co.kr', password: 'Admin2024!', label: '관리자', role: 'admin' as UserRole },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [pendingRoles, setPendingRoles] = useState<UserRole[]>([]);

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
      const result = await login(email, password);

      if (!result.success) {
        throw new Error(result.error || '로그인에 실패했습니다.');
      }

      // 로그인 성공 - 역할 확인
      const savedUser = localStorage.getItem('neture_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        if (userData.roles.length > 1) {
          // 복수 역할 - 선택 화면 표시
          setPendingRoles(userData.roles);
          setShowRoleSelector(true);
        } else {
          // 단일 역할 - 바로 대시보드로 이동
          navigate(ROLE_DASHBOARDS[userData.roles[0] as UserRole]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    navigate(ROLE_DASHBOARDS[role]);
  };

  // 역할 선택 화면
  if (showRoleSelector && pendingRoles.length > 1) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.logo}>Neture</div>
          <h1 style={styles.title}>역할 선택</h1>
          <p style={styles.subtitle}>사용할 역할을 선택하세요</p>

          <div style={styles.roleGrid}>
            {pendingRoles.map(role => (
              <button
                key={role}
                style={styles.roleCard}
                onClick={() => handleRoleSelect(role)}
              >
                <span style={styles.roleIcon}>{ROLE_ICONS[role]}</span>
                <span style={styles.roleLabel}>{ROLE_LABELS[role]}</span>
                <span style={styles.roleDescription}>
                  {role === 'admin' && '플랫폼 전체 관리'}
                  {role === 'supplier' && '상품 공급 및 배송'}
                  {role === 'partner' && '협력사 연계 관리'}
                </span>
              </button>
            ))}
          </div>

          <p style={styles.roleNote}>
            로그인 후에도 상단 메뉴에서 역할을 전환할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  // 로그인 폼
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>Neture</div>
        <h1 style={styles.title}>로그인</h1>
        <p style={styles.subtitle}>판매자 지원 서비스에 오신 것을 환영합니다</p>

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

        <div style={styles.testAccounts}>
          <p style={styles.testTitle}>테스트 계정 (클릭 시 입력됨)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillTestAccount(account)}
                style={{
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
                }}
              >
                <span style={{ fontSize: 'var(--text-body-md)', fontWeight: 600, color: 'var(--color-text-primary)', minWidth: '50px' }}>
                  {account.label}
                </span>
                <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-text-tertiary)', flex: 1 }}>
                  {account.email}
                </span>
                <span style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-text-disabled)' }}>클릭하여 입력</span>
              </button>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <a href="/forgot-password" style={styles.link}>비밀번호를 잊으셨나요?</a>
          <span style={styles.divider}>|</span>
          <a href="/register" style={styles.link}>회원가입</a>
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
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-4)',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 'var(--space-4) var(--space-3)',
    backgroundColor: 'var(--color-card-bg)',
    border: '2px solid var(--color-border-default)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  roleIcon: {
    fontSize: 'var(--text-title-xl)',
    marginBottom: 'var(--space-3)',
  },
  roleLabel: {
    fontSize: 'var(--text-body-lg)',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-1)',
  },
  roleDescription: {
    fontSize: 'var(--text-body-sm)',
    color: 'var(--color-text-tertiary)',
    textAlign: 'center',
  },
  roleNote: {
    fontSize: 'var(--text-body-md)',
    color: 'var(--color-text-tertiary)',
    textAlign: 'center',
    margin: 0,
  },
  testAccounts: {
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
  testList: {
    fontSize: 'var(--text-body-sm)',
    color: 'var(--color-text-tertiary)',
    margin: 0,
    paddingLeft: 'var(--space-3)',
    lineHeight: 1.8,
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
