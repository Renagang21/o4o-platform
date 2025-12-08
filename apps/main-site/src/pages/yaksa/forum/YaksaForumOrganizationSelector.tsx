/**
 * YaksaForumOrganizationSelector - Organization Selection Page
 *
 * Allows users to select their organization (Regional > Local).
 */

'use client';

import { useState, useEffect } from 'react';
import {
  yaksaStyles,
  applyYaksaTheme,
  getOrgLevelColor,
} from '@/components/yaksa/forum';
import {
  fetchOrganizations,
  type YaksaOrganization,
  type OrganizationLevel,
} from '@/lib/yaksa/forum-data';

interface YaksaForumOrganizationSelectorProps {
  onSelect?: (org: YaksaOrganization) => void;
}

const LEVEL_CONFIG: Record<OrganizationLevel, { title: string; subtitle: string }> = {
  national: { title: '중앙회', subtitle: '대한약사회를 선택하세요' },
  regional: { title: '시도회', subtitle: '소속 시도약사회를 선택하세요' },
  local: { title: '분회', subtitle: '소속 분회를 선택하세요' },
};

export function YaksaForumOrganizationSelector({
  onSelect,
}: YaksaForumOrganizationSelectorProps) {
  const [step, setStep] = useState<'regional' | 'local'>('regional');
  const [regionalOrgs, setRegionalOrgs] = useState<YaksaOrganization[]>([]);
  const [localOrgs, setLocalOrgs] = useState<YaksaOrganization[]>([]);
  const [selectedRegional, setSelectedRegional] = useState<YaksaOrganization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyYaksaTheme();
  }, []);

  // Load regional organizations
  useEffect(() => {
    async function loadRegional() {
      setLoading(true);
      try {
        const orgs = await fetchOrganizations('national');
        setRegionalOrgs(orgs);
      } catch (error) {
        console.error('Error loading regional orgs:', error);
      } finally {
        setLoading(false);
      }
    }
    loadRegional();
  }, []);

  // Load local organizations when regional is selected
  useEffect(() => {
    async function loadLocal() {
      if (!selectedRegional) return;
      setLoading(true);
      try {
        const orgs = await fetchOrganizations(selectedRegional.id);
        setLocalOrgs(orgs);
        if (orgs.length === 0) {
          // No local orgs - use regional
          handleFinalSelect(selectedRegional);
        } else {
          setStep('local');
        }
      } catch (error) {
        console.error('Error loading local orgs:', error);
      } finally {
        setLoading(false);
      }
    }
    loadLocal();
  }, [selectedRegional]);

  const handleRegionalSelect = (org: YaksaOrganization) => {
    setSelectedRegional(org);
  };

  const handleLocalSelect = (org: YaksaOrganization) => {
    handleFinalSelect(org);
  };

  const handleFinalSelect = (org: YaksaOrganization) => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('yaksa_selected_org', JSON.stringify(org));
    }

    if (onSelect) {
      onSelect(org);
    } else {
      // Navigate to forum home with org
      window.location.href = `/yaksa/forum?orgId=${org.id}`;
    }
  };

  const handleBack = () => {
    setStep('regional');
    setSelectedRegional(null);
    setLocalOrgs([]);
  };

  const config = LEVEL_CONFIG[step];

  return (
    <div
      className="yaksa-forum-org-selector min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: 'var(--yaksa-surface-secondary)' }}
    >
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🏢</span>
          <h1 className="text-2xl font-bold mb-2" style={yaksaStyles.textPrimary}>
            {config.title} 선택
          </h1>
          <p style={yaksaStyles.textMuted}>{config.subtitle}</p>
        </div>

        {/* Breadcrumb */}
        {selectedRegional && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <button
              onClick={handleBack}
              className="hover:underline"
              style={{ color: 'var(--yaksa-accent)' }}
            >
              ← 시도회 다시 선택
            </button>
            <span style={yaksaStyles.textMuted}>|</span>
            <span style={yaksaStyles.textPrimary}>{selectedRegional.name}</span>
          </div>
        )}

        {/* Organization Grid */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: 'var(--yaksa-surface)',
            borderColor: 'var(--yaksa-border)',
          }}
        >
          {loading ? (
            <OrgGridLoading />
          ) : step === 'regional' ? (
            <OrgGrid
              organizations={regionalOrgs}
              onSelect={handleRegionalSelect}
            />
          ) : (
            <OrgGrid
              organizations={localOrgs}
              onSelect={handleLocalSelect}
            />
          )}
        </div>

        {/* Skip Option for Regional */}
        {step === 'local' && selectedRegional && (
          <div className="mt-4 text-center">
            <button
              onClick={() => handleFinalSelect(selectedRegional)}
              className="text-sm hover:underline"
              style={{ color: 'var(--yaksa-accent)' }}
            >
              분회 선택 없이 {selectedRegional.name}으로 진행 →
            </button>
          </div>
        )}

        {/* Info */}
        <p className="mt-6 text-center text-sm" style={yaksaStyles.textMuted}>
          소속 조직을 선택하면 해당 조직의 게시판에 접근할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

// Organization Grid
function OrgGrid({
  organizations,
  onSelect,
}: {
  organizations: YaksaOrganization[];
  onSelect: (org: YaksaOrganization) => void;
}) {
  if (organizations.length === 0) {
    return (
      <div className="text-center py-8">
        <p style={yaksaStyles.textMuted}>등록된 조직이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {organizations.map((org) => (
        <button
          key={org.id}
          onClick={() => onSelect(org)}
          className="p-4 rounded-lg border text-center transition-all hover:shadow-md hover:border-blue-300"
          style={{
            backgroundColor: 'var(--yaksa-surface)',
            borderColor: 'var(--yaksa-border)',
          }}
        >
          <OrgLevelIcon level={org.level} />
          <h3
            className="font-medium text-sm mt-2 line-clamp-2"
            style={yaksaStyles.textPrimary}
          >
            {org.name}
          </h3>
          {org.memberCount && (
            <p className="text-xs mt-1" style={yaksaStyles.textMuted}>
              {org.memberCount.toLocaleString()}명
            </p>
          )}
        </button>
      ))}
    </div>
  );
}

function OrgLevelIcon({ level }: { level: OrganizationLevel }) {
  const icons: Record<OrganizationLevel, string> = {
    national: '🏛️',
    regional: '🏢',
    local: '🏪',
  };

  return (
    <div
      className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl"
      style={{ backgroundColor: `${getOrgLevelColor(level)}20` }}
    >
      {icons[level]}
    </div>
  );
}

function OrgGridLoading() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="p-4 rounded-lg border"
          style={{ borderColor: 'var(--yaksa-border)' }}
        >
          <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded mt-3 mx-auto w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded mt-2 mx-auto w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export default YaksaForumOrganizationSelector;
