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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => fillTestAccount(account)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: PRIMARY_COLOR, minWidth: '50px' }}>
                  {account.label}
                </span>
                <span style={{ fontSize: '12px', color: '#64748B', flex: 1 }}>
                  {account.email}
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>클릭하여 입력</span>
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
    fontSize: '28px',
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
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  roleCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    backgroundColor: '#fff',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  roleIcon: {
    fontSize: '36px',
    marginBottom: '12px',
  },
  roleLabel: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0F172A',
    marginBottom: '4px',
  },
  roleDescription: {
    fontSize: '12px',
    color: '#64748B',
    textAlign: 'center',
  },
  roleNote: {
    fontSize: '13px',
    color: '#64748B',
    textAlign: 'center',
    margin: 0,
  },
  testAccounts: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  testTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
  },
  testList: {
    fontSize: '12px',
    color: '#64748B',
    margin: 0,
    paddingLeft: '16px',
    lineHeight: 1.8,
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
