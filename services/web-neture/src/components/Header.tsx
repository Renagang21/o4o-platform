import { useState } from 'react';

interface HeaderProps {
  serviceName: string;
}

interface User {
  name: string;
}

export function Header({ serviceName }: HeaderProps) {
  // Phase 2-B: 로그인 상태는 Mock (추후 API 연동)
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogin = () => {
    // Mock 로그인
    setUser({ name: '홍길동' });
  };

  const handleLogout = () => {
    setUser(null);
    setDropdownOpen(false);
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
          <button style={styles.loginButton} onClick={handleLogin}>
            로그인
          </button>
        )}
      </div>
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
};
