/**
 * RoleSwitcher - 복수 역할 전환 컴포넌트
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_DASHBOARDS, UserRole } from '../contexts';

const ROLE_ICONS: Record<UserRole, string> = {
  admin: '🛡️',
  supplier: '📦',
  partner: '🤝',
  user: '👤',
};

export function RoleSwitcher() {
  const { user, hasMultipleRoles, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || !hasMultipleRoles) {
    return null;
  }

  const handleRoleChange = (role: UserRole) => {
    switchRole(role);
    setIsOpen(false);
    navigate(ROLE_DASHBOARDS[role]);
  };

  return (
    <div style={styles.container}>
      <button style={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
        <span style={styles.currentRole}>
          {ROLE_ICONS[user.currentRole]} {ROLE_LABELS[user.currentRole]}
        </span>
        <span style={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <>
          <div style={styles.overlay} onClick={() => setIsOpen(false)} />
          <div style={styles.dropdown}>
            <div style={styles.dropdownHeader}>역할 전환</div>
            {user.roles.map(role => (
              <button
                key={role}
                style={{
                  ...styles.roleOption,
                  ...(role === user.currentRole ? styles.roleOptionActive : {}),
                }}
                onClick={() => handleRoleChange(role)}
              >
                <span style={styles.roleIcon}>{ROLE_ICONS[role]}</span>
                <span style={styles.roleLabel}>{ROLE_LABELS[role]}</span>
                {role === user.currentRole && <span style={styles.checkmark}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  currentRole: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  arrow: {
    fontSize: '10px',
    color: '#64748B',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '1px solid #e2e8f0',
    minWidth: '200px',
    zIndex: 100,
    overflow: 'hidden',
  },
  dropdownHeader: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748B',
    borderBottom: '1px solid #f1f5f9',
    textTransform: 'uppercase',
  },
  roleOption: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
  },
  roleOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  roleIcon: {
    fontSize: '18px',
    marginRight: '10px',
  },
  roleLabel: {
    flex: 1,
    color: '#0F172A',
  },
  checkmark: {
    color: PRIMARY_COLOR,
    fontWeight: 600,
  },
};
