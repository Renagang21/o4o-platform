/**
 * YaksaOrgNavigation - Organization Navigation Component
 *
 * Displays hierarchical organization navigation (National > Regional > Local).
 */

'use client';

import { useState, useEffect } from 'react';
import { yaksaStyles, getOrgLevelColor } from './theme';
import type { YaksaOrganization, OrganizationLevel } from '@/lib/yaksa/forum-data';
import { fetchOrganizations } from '@/lib/yaksa/forum-data';

interface YaksaOrgNavigationProps {
  currentOrgId?: string;
  onOrgChange?: (org: YaksaOrganization) => void;
  compact?: boolean;
}

const LEVEL_LABELS: Record<OrganizationLevel, string> = {
  national: '중앙회',
  regional: '시도회',
  local: '분회',
};

export function YaksaOrgNavigation({
  currentOrgId,
  onOrgChange,
  compact = false,
}: YaksaOrgNavigationProps) {
  const [breadcrumb, setBreadcrumb] = useState<YaksaOrganization[]>([]);
  const [siblings, setSiblings] = useState<YaksaOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrgData() {
      setLoading(true);
      try {
        // Build breadcrumb from current org
        if (currentOrgId) {
          // For now, use mock breadcrumb - in production, fetch from API
          const mockBreadcrumb = buildMockBreadcrumb(currentOrgId);
          setBreadcrumb(mockBreadcrumb);

          // Fetch siblings (other orgs at same level)
          const parentId = mockBreadcrumb[mockBreadcrumb.length - 2]?.id;
          const orgs = await fetchOrganizations(parentId);
          setSiblings(orgs);
        } else {
          // Show national level
          const orgs = await fetchOrganizations();
          setSiblings(orgs);
        }
      } catch (error) {
        console.error('Error loading org data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOrgData();
  }, [currentOrgId]);

  if (loading) {
    return (
      <div
        className="yaksa-org-navigation animate-pulse p-3 rounded-lg"
        style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
      >
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div
      className={`yaksa-org-navigation rounded-lg border ${compact ? 'p-2' : 'p-4'}`}
      style={{
        backgroundColor: 'var(--yaksa-surface)',
        borderColor: 'var(--yaksa-border)',
      }}
    >
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {breadcrumb.map((org, index) => (
            <span key={org.id} className="flex items-center gap-2">
              <a
                href={`/yaksa/forum?orgId=${org.id}`}
                onClick={(e) => {
                  if (onOrgChange) {
                    e.preventDefault();
                    onOrgChange(org);
                  }
                }}
                className="flex items-center gap-1 hover:underline"
                style={{ color: getOrgLevelColor(org.level) }}
              >
                <OrgLevelIcon level={org.level} size={compact ? 14 : 16} />
                <span className={compact ? 'text-xs' : 'text-sm'}>{org.name}</span>
              </a>
              {index < breadcrumb.length - 1 && (
                <span style={yaksaStyles.textMuted}>›</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Current Organization Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium" style={yaksaStyles.textMuted}>
          {LEVEL_LABELS[siblings[0]?.level || 'regional']}:
        </span>
        <div className="flex flex-wrap gap-1">
          {siblings.map((org) => (
            <button
              key={org.id}
              onClick={() => onOrgChange?.(org)}
              className={`px-2 py-1 rounded text-xs transition-all ${
                org.id === currentOrgId
                  ? 'font-semibold'
                  : 'hover:bg-opacity-80'
              }`}
              style={{
                backgroundColor:
                  org.id === currentOrgId
                    ? getOrgLevelColor(org.level)
                    : 'var(--yaksa-surface-tertiary)',
                color:
                  org.id === currentOrgId
                    ? '#ffffff'
                    : 'var(--yaksa-text-primary)',
              }}
            >
              {org.name}
            </button>
          ))}
        </div>
      </div>

      {/* Member Count */}
      {!compact && breadcrumb.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--yaksa-border)' }}>
          <div className="flex items-center justify-between text-xs">
            <span style={yaksaStyles.textMuted}>소속 회원</span>
            <span className="font-semibold" style={yaksaStyles.textPrimary}>
              {breadcrumb[breadcrumb.length - 1]?.memberCount?.toLocaleString() || '-'}명
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

interface OrgLevelIconProps {
  level: OrganizationLevel;
  size?: number;
}

function OrgLevelIcon({ level, size = 16 }: OrgLevelIconProps) {
  const iconStyle = {
    width: size,
    height: size,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.7,
  };

  switch (level) {
    case 'national':
      return <span style={iconStyle}>🏛️</span>;
    case 'regional':
      return <span style={iconStyle}>🏢</span>;
    case 'local':
      return <span style={iconStyle}>🏪</span>;
    default:
      return <span style={iconStyle}>📍</span>;
  }
}

function buildMockBreadcrumb(orgId: string): YaksaOrganization[] {
  // Mock implementation - in production, fetch from API
  const orgs: Record<string, YaksaOrganization[]> = {
    gangnam: [
      { id: 'national', name: '대한약사회', level: 'national', memberCount: 50000 },
      { id: 'seoul', name: '서울특별시약사회', level: 'regional', parentId: 'national', memberCount: 8000 },
      { id: 'gangnam', name: '강남구분회', level: 'local', parentId: 'seoul', memberCount: 450 },
    ],
    seoul: [
      { id: 'national', name: '대한약사회', level: 'national', memberCount: 50000 },
      { id: 'seoul', name: '서울특별시약사회', level: 'regional', parentId: 'national', memberCount: 8000 },
    ],
    national: [
      { id: 'national', name: '대한약사회', level: 'national', memberCount: 50000 },
    ],
  };

  return orgs[orgId] || orgs.national;
}

export default YaksaOrgNavigation;
