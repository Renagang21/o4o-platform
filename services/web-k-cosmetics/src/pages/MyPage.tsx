/**
 * MyPage - 마이페이지 (프로필 관리)
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 *
 * 표준 기능:
 * - 프로필 정보 표시 (이름, 이메일, 역할)
 * - 프로필 편집 기능
 * - 대시보드 이동 링크
 * - 보안 설정 (비밀번호 변경)
 * - 로그아웃
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, ROLE_LABELS, ROLE_DASHBOARDS } from '@/contexts/AuthContext';

export default function MyPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user?.name || '',
  });

  if (!isAuthenticated || !user) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>로그인이 필요합니다</h1>
          <Link to="/login" style={styles.primaryButton}>로그인</Link>
        </div>
      </div>
    );
  }

  const dashboardPath = ROLE_DASHBOARDS[user.roles[0]];
  const roleLabel = ROLE_LABELS[user.roles[0]];

  const handleSave = () => {
    // TODO: Implement save API
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({ name: user.name || '' });
    setIsEditing(false);
  };

  return (
    <div style={styles.container}>
      {/* 페이지 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>마이페이지</h1>
        <p style={styles.pageSubtitle}>내 정보를 확인하고 관리할 수 있습니다</p>
      </div>

      {/* 프로필 카드 */}
      <div style={styles.card}>
        <div style={styles.profileHeader}>
          <div style={styles.avatarLarge}>
            {user.name?.charAt(0) || '?'}
          </div>
          <div style={styles.profileInfo}>
            <h2 style={styles.name}>{user.name}</h2>
            <p style={styles.email}>{user.email}</p>
            <span style={styles.roleBadge}>{roleLabel}</span>
          </div>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} style={styles.editButton}>
              편집
            </button>
          )}
        </div>

        {/* 프로필 정보 */}
        <div style={styles.infoSection}>
          <h3 style={styles.sectionTitle}>기본 정보</h3>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>이름</span>
            {isEditing ? (
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                style={styles.input}
              />
            ) : (
              <span style={styles.infoValue}>{user.name}</span>
            )}
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>이메일</span>
            <span style={styles.infoValue}>{user.email}</span>
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>역할</span>
            <span style={styles.infoValue}>{roleLabel}</span>
          </div>

          {isEditing && (
            <div style={styles.editActions}>
              <button onClick={handleCancel} style={styles.cancelButton}>
                취소
              </button>
              <button onClick={handleSave} style={styles.saveButton}>
                저장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 보안 설정 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>보안 설정</h3>
        <div style={styles.settingRow}>
          <div>
            <span style={styles.settingLabel}>비밀번호 변경</span>
            <span style={styles.settingDesc}>정기적인 비밀번호 변경을 권장합니다</span>
          </div>
          <button
            onClick={() => alert('비밀번호 변경 기능은 준비 중입니다.')}
            style={styles.settingButton}
          >
            변경
          </button>
        </div>
      </div>

      {/* 빠른 이동 */}
      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>빠른 이동</h3>
        <div style={styles.quickActions}>
          <Link to={dashboardPath} style={styles.quickActionButton}>
            대시보드로 이동
          </Link>
          <button onClick={logout} style={styles.logoutButton}>
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 16px',
  },
  header: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
    marginBottom: '16px',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f1f5f9',
    marginBottom: '20px',
  },
  avatarLarge: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f48fb1, #e91e63)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '24px',
    fontWeight: 700,
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.25)',
  },
  profileInfo: {
    flex: 1,
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '16px',
  },
  name: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 4px',
  },
  email: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px',
  },
  roleBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#fce4ec',
    color: '#c2185b',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '16px',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
  infoSection: {
    marginTop: '8px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 16px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: 500,
  },
  infoValue: {
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: 500,
  },
  input: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    width: '200px',
    textAlign: 'right' as const,
  },
  editActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#e91e63',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
  },
  settingLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#1e293b',
    fontWeight: 500,
  },
  settingDesc: {
    display: 'block',
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  settingButton: {
    padding: '8px 16px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  },
  quickActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  quickActionButton: {
    display: 'block',
    padding: '14px 20px',
    backgroundColor: '#e91e63',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '10px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(233, 30, 99, 0.2)',
  },
  primaryButton: {
    display: 'block',
    padding: '14px 24px',
    backgroundColor: '#e91e63',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '12px',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.25)',
  },
  logoutButton: {
    padding: '14px 20px',
    backgroundColor: '#fff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },
};
