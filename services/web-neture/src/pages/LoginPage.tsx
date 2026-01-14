/**
 * LoginPage - Neture 로그인 페이지
 * 로그인 후 역할에 따라 대시보드로 이동, 복수 역할시 선택 화면
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_DASHBOARDS, UserRole } from '../contexts';

const ROLE_ICONS: Record<UserRole, string> = {
  admin: '🛡️',
  supplier: '📦',
  partner: '🤝',
  user: '👤',
};

// 테스트 계정 (비밀번호 통일: TestPassword)
const TEST_PASSWORD = 'TestPassword';
const testAccounts = [
  { email: 'supplier@neture.test', password: TEST_PASSWORD, label: '공급자' },
  { email: 'partner@neture.test', password: TEST_PASSWORD, label: '파트너' },
  { email: 'admin@neture.test', password: TEST_PASSWORD, label: '운영자' },
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
          <div style={styles.logo}>🌿</div>
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
        <div style={styles.logo}>🌿</div>
        <h1 style={styles.title}>로그인</h1>
        <p style={styles.subtitle}>Neture 판매자 지원 서비스에 오신 것을 환영합니다</p>

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

/**
 * 스타일 정의 - K-Cosmetics와 동일한 패턴
 * CSS 변수 대신 직접 색상값 사용
 */
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
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 12px',
    backgroundColor: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s',
  },
  roleIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  roleLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '4px',
  },
  roleDescription: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
  },
  roleNote: {
    fontSize: '14px',
    color: '#94a3b8',
    textAlign: 'center',
    margin: 0,
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
  divider: {
    color: '#e2e8f0',
    margin: '0 12px',
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
