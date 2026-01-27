/**
 * ContextIndicator - Header 내 컨텍스트 표시 및 전환 드롭다운
 * WO-CONTEXT-SWITCH-FOUNDATION-V1
 *
 * - 미로그인 / 컨텍스트 없음 → null (비표시)
 * - 로그인 + 컨텍스트 → 조직 체인 브레드크럼 표시
 * - 다중 컨텍스트 → 드롭다운으로 전환 가능
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { useOrganization } from '../../contexts';
import { colors } from '../../styles/theme';
import { CONTEXT_TYPE_LABELS } from '../../types/organization';
import type { Organization } from '../../types/organization';

export function ContextIndicator() {
  const { user } = useAuth();
  const {
    organizationChain,
    accessibleOrganizations,
    hasMultipleContexts,
    isContextSet,
    currentOrganization,
    setCurrentOrganization,
  } = useOrganization();

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  // 미로그인 또는 컨텍스트 미설정
  if (!user || !isContextSet) return null;

  // 조직 유형별 그룹핑
  const groupedOrgs: Record<string, Organization[]> = {};
  accessibleOrganizations.forEach((org) => {
    const label = CONTEXT_TYPE_LABELS[org.type] || org.type;
    if (!groupedOrgs[label]) groupedOrgs[label] = [];
    groupedOrgs[label].push(org);
  });

  const handleSelect = (orgId: string) => {
    setCurrentOrganization(orgId);
    setShowDropdown(false);
  };

  return (
    <div ref={dropdownRef} style={styles.wrapper}>
      {/* 브레드크럼 체인 */}
      <button
        style={styles.indicator}
        onClick={() => hasMultipleContexts && setShowDropdown(!showDropdown)}
        disabled={!hasMultipleContexts}
      >
        <span style={styles.breadcrumb}>
          {organizationChain.map((org, idx) => (
            <span key={org.id}>
              {idx > 0 && <span style={styles.separator}>&gt;</span>}
              <span style={idx === organizationChain.length - 1 ? styles.currentOrg : styles.parentOrg}>
                {org.name}
              </span>
            </span>
          ))}
        </span>
        {hasMultipleContexts && (
          <span style={styles.chevron}>{showDropdown ? '▲' : '▼'}</span>
        )}
      </button>

      {/* 드롭다운 */}
      {showDropdown && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownInner}>
            <div style={styles.dropdownHeader}>조직 전환</div>
            {Object.entries(groupedOrgs).map(([groupLabel, orgs]) => (
              <div key={groupLabel}>
                <div style={styles.groupLabel}>{groupLabel}</div>
                {orgs.map((org) => (
                  <button
                    key={org.id}
                    style={{
                      ...styles.dropdownItem,
                      ...(org.id === currentOrganization.id ? styles.dropdownItemActive : {}),
                    }}
                    onClick={() => handleSelect(org.id)}
                  >
                    <span>{org.name}</span>
                    {org.id === currentOrganization.id && (
                      <span style={styles.checkmark}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: `${colors.primary}10`,
    border: `1px solid ${colors.primary}20`,
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '13px',
    color: colors.primary,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: 'background-color 0.2s',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  separator: {
    margin: '0 4px',
    color: `${colors.primary}80`,
    fontSize: '11px',
  },
  parentOrg: {
    color: `${colors.primary}90`,
  },
  currentOrg: {
    fontWeight: 600,
  },
  chevron: {
    fontSize: '9px',
    marginLeft: '2px',
    opacity: 0.7,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    paddingTop: '6px',
    zIndex: 200,
  },
  dropdownInner: {
    backgroundColor: colors.white,
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: '240px',
    maxHeight: '360px',
    overflowY: 'auto',
    padding: '8px 0',
  },
  dropdownHeader: {
    padding: '8px 16px 6px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.gray500 || '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  groupLabel: {
    padding: '8px 16px 4px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.gray500 || '#64748b',
    borderTop: `1px solid ${colors.gray200 || '#e2e8f0'}`,
    marginTop: '4px',
  },
  dropdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: colors.gray700 || '#334155',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s',
  },
  dropdownItemActive: {
    backgroundColor: `${colors.primary}08`,
    color: colors.primary,
    fontWeight: 600,
  },
  checkmark: {
    fontSize: '14px',
    color: colors.primary,
    fontWeight: 700,
  },
};
