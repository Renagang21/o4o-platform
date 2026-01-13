/**
 * LoginPage - K-Cosmetics
 * Based on GlycoPharm LoginPage structure
 *
 * Phase: WO-TEST-ENV-FOUNDATION-V1
 * - 테스트 계정 자동 입력 UI 추가
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// 테스트 계정 목록 (비밀번호 통일: TestPassword)
const TEST_ACCOUNTS = [
  { role: 'consumer', label: '소비자', email: 'consumer@k-cosmetics.test', color: '#10b981' },
  { role: 'seller', label: '판매자', email: 'seller@k-cosmetics.test', color: '#3b82f6' },
  { role: 'supplier', label: '공급자', email: 'supplier@k-cosmetics.test', color: '#8b5cf6' },
  { role: 'admin', label: '운영자', email: 'admin@k-cosmetics.test', color: '#ef4444' },
];

const TEST_PASSWORD = 'TestPassword';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 테스트 계정 자동 입력
  const fillTestAccount = (account: typeof TEST_ACCOUNTS[0]) => {
    setEmail(account.email);
    setPassword(TEST_PASSWORD);
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

        {/* 테스트 계정 섹션 */}
        <div style={styles.testSection}>
          <div style={styles.testHeader}>
            <span style={styles.testBadge}>TEST</span>
            <span style={styles.testTitle}>테스트 계정</span>
          </div>
          <p style={styles.testDesc}>클릭하면 자동으로 입력됩니다</p>
          <div style={styles.testButtons}>
            {TEST_ACCOUNTS.map((account) => (
              <button
                key={account.role}
                type="button"
                onClick={() => fillTestAccount(account)}
                style={{
                  ...styles.testButton,
                  backgroundColor: account.color + '15',
                  color: account.color,
                  borderColor: account.color + '40',
                }}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <Link to="/test-guide" style={styles.testGuideLink}>테스트 가이드 보기</Link>
          <span style={styles.footerDivider}>|</span>
          <Link to="/" style={styles.link}>홈으로 돌아가기</Link>
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
  testGuideLink: {
    color: '#f59e0b',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
  },
  footerDivider: {
    color: '#cbd5e1',
    margin: '0 12px',
  },
  link: {
    color: '#e91e63',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  // 테스트 계정 섹션 스타일
  testSection: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #cbd5e1',
  },
  testHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  testBadge: {
    backgroundColor: '#fef3c7',
    color: '#d97706',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
  },
  testTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
  },
  testDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '0 0 12px 0',
    textAlign: 'center',
  },
  testButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  },
  testButton: {
    padding: '8px 16px',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
