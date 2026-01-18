/**
 * IntranetSidebar - 인트라넷 좌측 사이드바
 * WO-KPA-COMMITTEE-INTRANET-V1: 조직 선택 기능 추가
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { colors } from '../../styles/theme';
import { Organization } from '../../types/organization';

interface MenuItem {
  path: string;
  label: string;
  icon: string;
  roles?: string[];
}

/**
 * WO-KPA-GROUPBUY-OPERATOR-UI-V1: 메뉴 정리
 * WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 공동구매 메뉴 권한 체크 추가
 *
 * 유지: 홈, 공지, 일정, 문서, 회의, 공동구매, 조직 설정
 * 테스트 피드백은 개발용으로 유지
 *
 * 공동구매 메뉴는 운영자(officer, chair, admin)에게만 노출
 * 조직 설정은 관리자(officer, chair, admin)에게만 노출
 */
const menuItems: MenuItem[] = [
  { path: '', label: '홈', icon: '🏠' },
  { path: 'notice', label: '공지', icon: '📢' },
  { path: 'schedule', label: '일정', icon: '📅' },
  { path: 'documents', label: '문서', icon: '📁' },
  { path: 'meetings', label: '회의', icon: '📋' },
  { path: 'groupbuy', label: '공동구매', icon: '🛒', roles: ['officer', 'chair', 'admin'] }, // WO-KPA-GROUPBUY-OPERATION-STABILIZATION-V1: 운영자만 접근
  { path: 'feedback', label: '테스트 피드백', icon: '💬' }, // WO-KPA-TEST-FEEDBACK-BOARD-V1 (개발용)
  { path: 'settings', label: '조직 설정', icon: '⚙️', roles: ['officer', 'chair', 'admin'] },
];

export function IntranetSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const {
    currentOrganization,
    organizationChain,
    currentRole,
    setCurrentOrganization,
    getOrganizationsByType,
  } = useOrganization();

  const [showOrgSelector, setShowOrgSelector] = useState(false);

  const isActive = (path: string) => {
    const currentPath = location.pathname;
    if (path === '') {
      return currentPath === '/intranet' || currentPath === '/intranet/';
    }
    return currentPath.includes(`/intranet/${path}`);
  };

  const canViewMenuItem = (item: MenuItem) => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole) || currentRole === 'chair';
  };

  const getOrgIcon = (type: Organization['type']) => {
    switch (type) {
      case 'branch': return '🏛️';
      case 'division': return '🏘️';
      case 'committee': return '👥';
      default: return '📂';
    }
  };

  const getOrgTypeLabel = (type: Organization['type']) => {
    switch (type) {
      case 'branch': return '지부';
      case 'division': return '분회';
      case 'committee': return '위원회';
      default: return '조직';
    }
  };

  const handleSelectOrg = (orgId: string) => {
    setCurrentOrganization(orgId);
    setShowOrgSelector(false);
  };

  // 조직 목록을 계층 구조로 그룹화
  const branches = getOrganizationsByType('branch');
  const divisions = getOrganizationsByType('division');
  const committees = getOrganizationsByType('committee');

  return (
    <aside style={styles.sidebar}>
      {/* 조직 선택 헤더 */}
      <div
        style={styles.orgHeader}
        onClick={() => setShowOrgSelector(!showOrgSelector)}
      >
        <div style={styles.orgIcon}>
          {getOrgIcon(currentOrganization.type)}
        </div>
        <div style={styles.orgInfo}>
          <div style={styles.orgName}>{currentOrganization.name}</div>
          <div style={styles.orgType}>
            {getOrgTypeLabel(currentOrganization.type)} 인트라넷
          </div>
        </div>
        <span style={styles.dropdownIcon}>{showOrgSelector ? '▲' : '▼'}</span>
      </div>

      {/* 조직 선택 드롭다운 */}
      {showOrgSelector && (
        <div style={styles.orgSelector}>
          {/* Breadcrumb */}
          {organizationChain.length > 1 && (
            <div style={styles.breadcrumb}>
              {organizationChain.map((org, idx) => (
                <span key={org.id} style={styles.breadcrumbItem}>
                  {idx > 0 && ' › '}
                  <span
                    style={{
                      ...styles.breadcrumbText,
                      color: org.id === currentOrganization.id ? colors.primary : colors.neutral500,
                    }}
                  >
                    {org.name}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* 지부 */}
          <div style={styles.orgGroup}>
            <div style={styles.orgGroupTitle}>지부</div>
            {branches.map((org) => (
              <button
                key={org.id}
                style={{
                  ...styles.orgOption,
                  ...(currentOrganization.id === org.id ? styles.orgOptionActive : {}),
                }}
                onClick={() => handleSelectOrg(org.id)}
              >
                <span>{getOrgIcon(org.type)}</span>
                <span>{org.name}</span>
              </button>
            ))}
          </div>

          {/* 분회 */}
          <div style={styles.orgGroup}>
            <div style={styles.orgGroupTitle}>분회</div>
            {divisions.map((org) => (
              <button
                key={org.id}
                style={{
                  ...styles.orgOption,
                  ...(currentOrganization.id === org.id ? styles.orgOptionActive : {}),
                }}
                onClick={() => handleSelectOrg(org.id)}
              >
                <span>{getOrgIcon(org.type)}</span>
                <span>{org.name}</span>
              </button>
            ))}
          </div>

          {/* 위원회 */}
          <div style={styles.orgGroup}>
            <div style={styles.orgGroupTitle}>위원회</div>
            <div style={styles.committeeList}>
              {committees.slice(0, 6).map((org) => (
                <button
                  key={org.id}
                  style={{
                    ...styles.orgOption,
                    ...(currentOrganization.id === org.id ? styles.orgOptionActive : {}),
                  }}
                  onClick={() => handleSelectOrg(org.id)}
                >
                  <span>{getOrgIcon(org.type)}</span>
                  <span style={styles.committeeText}>{org.name}</span>
                </button>
              ))}
              {committees.length > 6 && (
                <div style={styles.moreCount}>외 {committees.length - 6}개</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 */}
      <nav style={styles.nav}>
        {menuItems.filter(canViewMenuItem).map((item) => (
          <Link
            key={item.path}
            to={`/intranet/${item.path}`}
            style={{
              ...styles.menuItem,
              ...(isActive(item.path) ? styles.menuItemActive : {}),
            }}
          >
            <span style={styles.menuIcon}>{item.icon}</span>
            <span style={styles.menuLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 사용자 정보 */}
      <div style={styles.userSection}>
        <div style={styles.userAvatar}>
          {user?.name?.charAt(0) || '?'}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{user?.name || '테스트 사용자'}</div>
          <div style={styles.userRole}>
            {currentRole === 'chair' ? '위원장' : currentRole === 'officer' ? '위원' : '회원'}
          </div>
        </div>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '260px',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    backgroundColor: colors.white,
    borderRight: `1px solid ${colors.neutral200}`,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  orgHeader: {
    padding: '20px',
    borderBottom: `1px solid ${colors.neutral200}`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  orgIcon: {
    width: '44px',
    height: '44px',
    backgroundColor: colors.primary,
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    flexShrink: 0,
  },
  orgInfo: {
    flex: 1,
    minWidth: 0,
  },
  orgName: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  orgType: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  dropdownIcon: {
    fontSize: '10px',
    color: colors.neutral400,
  },
  orgSelector: {
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral200}`,
    maxHeight: '400px',
    overflowY: 'auto',
  },
  breadcrumb: {
    padding: '12px 16px',
    fontSize: '12px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  breadcrumbItem: {},
  breadcrumbText: {
    cursor: 'pointer',
  },
  orgGroup: {
    padding: '12px',
  },
  orgGroupTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase',
    marginBottom: '8px',
    paddingLeft: '8px',
  },
  orgOption: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
    textAlign: 'left',
  },
  orgOptionActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  committeeList: {},
  committeeText: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  moreCount: {
    fontSize: '12px',
    color: colors.neutral500,
    padding: '8px 12px',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral700,
    fontSize: '14px',
    transition: 'background-color 0.15s',
  },
  menuItemActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },
  menuIcon: {
    fontSize: '18px',
  },
  menuLabel: {
    fontWeight: 500,
  },
  userSection: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.neutral200}`,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    backgroundColor: colors.neutral200,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral600,
  },
  userInfo: {},
  userName: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral900,
  },
  userRole: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '2px',
  },
};
