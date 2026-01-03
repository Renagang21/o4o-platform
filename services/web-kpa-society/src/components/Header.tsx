import { useState } from 'react';
import { useAuth } from '../contexts';

interface HeaderProps {
  serviceName: string;
}

export function Header({ serviceName }: HeaderProps) {
  const { user, login, logout, isLoading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      await login(loginForm.email, loginForm.password);
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '' });
    } catch (err: any) {
      setLoginError(err.message || '로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setDropdownOpen(false);
  };

  const openLoginModal = () => {
    setShowLoginModal(true);
    setLoginError(null);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginForm({ email: '', password: '' });
    setLoginError(null);
  };

  return (
    <header style={styles.header}>
      <a href="/" style={styles.logo}>
        {serviceName}
      </a>

      <div style={styles.userArea}>
        {user ? (
          <div style={styles.dropdown}>
            <button
              style={styles.userButton}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {user.name} ▾
            </button>
            {dropdownOpen && (
              <div style={styles.dropdownMenu}>
                <a href="/mypage" style={styles.dropdownItem}>
                  마이페이지
                </a>
                <button
                  style={styles.dropdownItem}
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            style={styles.loginButton}
            onClick={openLoginModal}
            disabled={isLoading}
          >
            {isLoading ? '...' : '로그인'}
          </button>
        )}
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div style={styles.modalOverlay} onClick={closeLoginModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>로그인</h2>
              <button style={styles.closeButton} onClick={closeLoginModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleLogin} style={styles.loginForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>이메일</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  style={styles.input}
                  placeholder="email@example.com"
                  required
                  autoFocus
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>비밀번호</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  style={styles.input}
                  placeholder="비밀번호 입력"
                  required
                />
              </div>
              {loginError && (
                <div style={styles.errorMessage}>{loginError}</div>
              )}
              <button
                type="submit"
                style={{
                  ...styles.submitButton,
                  ...(isSubmitting ? styles.submitButtonDisabled : {}),
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? '로그인 중...' : '로그인'}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    textDecoration: 'none',
  },
  userArea: {
    position: 'relative' as const,
  },
  loginButton: {
    padding: '8px 16px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  userButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  dropdown: {
    position: 'relative' as const,
  },
  dropdownMenu: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    minWidth: '120px',
    zIndex: 100,
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    textAlign: 'left' as const,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
    textDecoration: 'none',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    color: '#999',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#333',
  },
  input: {
    padding: '12px 14px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none',
  },
  errorMessage: {
    padding: '10px 14px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
    fontSize: '14px',
  },
  submitButton: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#007bff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    cursor: 'not-allowed',
  },
};
