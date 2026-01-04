/**
 * RoleSwitcher - K-Cosmetics 복수 역할 전환 컴포넌트
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_DASHBOARDS, UserRole } from '../contexts';

const ROLE_ICONS: Record<UserRole, string> = {
  admin: '🛡️',
  supplier: '📦',
  seller: '🏪',
  partner: '🤝',
};

// 이 서비스에서 사용 가능한 역할
const AVAILABLE_ROLES: UserRole[] = ['admin', 'seller'];

export function RoleSwitcher() {
  const { user, hasMultipleRoles, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (!user || !hasMultipleRoles) {
    return null;
  }

  const handleRoleChange = (role: UserRole) => {
    if (!AVAILABLE_ROLES.includes(role)) {
      // 공급자/파트너는 Neture로 안내
      setIsOpen(false);
      navigate(ROLE_DASHBOARDS[role]);
      return;
    }
    switchRole(role);
    setIsOpen(false);
    navigate(ROLE_DASHBOARDS[role]);
  };

  // 사용 가능한 역할과 Neture 관리 역할 분리
  const availableRoles = user.roles.filter(r => AVAILABLE_ROLES.includes(r));
  const netureRoles = user.roles.filter(r => !AVAILABLE_ROLES.includes(r));

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
            {availableRoles.map(role => (
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
            {netureRoles.length > 0 && (
              <>
                <div style={styles.netureDivider}>Neture에서 관리</div>
                {netureRoles.map(role => (
                  <button
                    key={role}
                    style={styles.netureRoleOption}
                    onClick={() => handleRoleChange(role)}
                  >
                    <span style={styles.roleIcon}>{ROLE_ICONS[role]}</span>
                    <span style={styles.roleLabel}>{ROLE_LABELS[role]}</span>
                    <span style={styles.externalIcon}>↗</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const PRIMARY_COLOR = '#FF6B9D';

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
    backgroundColor: '#FFF0F5',
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
  netureDivider: {
    padding: '8px 16px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #f1f5f9',
    textTransform: 'uppercase',
  },
  netureRoleOption: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '14px',
  },
  externalIcon: {
    fontSize: '12px',
    color: '#94a3b8',
  },
};
