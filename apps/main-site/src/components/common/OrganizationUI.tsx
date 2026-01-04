/**
 * Organization UI Components
 *
 * 조직 관련 UI 컴포넌트들
 */

import { useState, useRef, useEffect } from 'react';
import { useOrganization, type Organization, type OrganizationMembership } from '@/context';

// 조직 타입별 배지 색상
const badgeColors: Record<string, string> = {
  division: 'bg-blue-100 text-blue-800 border-blue-200',
  branch: 'bg-green-100 text-green-800 border-green-200',
};

// 조직 타입별 한글명
const typeLabels: Record<string, string> = {
  division: '지부',
  branch: '분회',
};

interface OrganizationBadgeProps {
  organization?: Organization | null;
  size?: 'sm' | 'md' | 'lg';
  showType?: boolean;
}

/**
 * OrganizationBadge
 *
 * 조직 타입을 표시하는 배지 컴포넌트
 */
export function OrganizationBadge({
  organization: propOrganization,
  size = 'md',
  showType = true,
}: OrganizationBadgeProps) {
  const { organization: contextOrganization } = useOrganization();
  const organization = propOrganization ?? contextOrganization;

  if (!organization) return null;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium rounded-full border
        ${badgeColors[organization.type]}
        ${sizeClasses[size]}
      `}
    >
      {showType && (
        <span className="opacity-75">{typeLabels[organization.type]}</span>
      )}
      <span>{organization.name}</span>
    </span>
  );
}

interface OrganizationSelectorProps {
  onSelect?: (org: Organization) => void;
  className?: string;
}

/**
 * OrganizationSelector
 *
 * 조직 선택 드롭다운 컴포넌트
 */
export function OrganizationSelector({
  onSelect,
  className = '',
}: OrganizationSelectorProps) {
  const {
    organization,
    memberships,
    setOrganization,
    isLoading,
  } = useOrganization();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (membership: OrganizationMembership) => {
    setOrganization(membership.organization);
    onSelect?.(membership.organization);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse h-10 w-48 bg-gray-200 rounded-lg ${className}`} />
    );
  }

  if (memberships.length === 0) {
    return null;
  }

  // 멤버십이 1개면 선택 기능 없이 배지만 표시
  if (memberships.length === 1) {
    return (
      <div className={className}>
        <OrganizationBadge organization={organization} />
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* 선택 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {organization ? (
          <>
            <span
              className={`w-2 h-2 rounded-full ${
                organization.type === 'division'
                  ? 'bg-blue-500'
                  : 'bg-green-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {organization.name}
            </span>
            <span className="text-xs text-gray-500">
              ({typeLabels[organization.type] || organization.type})
            </span>
          </>
        ) : (
          <span className="text-sm text-gray-500">조직 선택</span>
        )}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="py-1 max-h-64 overflow-y-auto">
            {memberships.map((membership) => (
              <button
                key={membership.organizationId}
                type="button"
                onClick={() => handleSelect(membership)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors
                  ${membership.organizationId === organization?.id ? 'bg-blue-50' : ''}
                `}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    membership.organization.type === 'division'
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {membership.organization.name}
                    </span>
                    {membership.isPrimary && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        기본
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{typeLabels[membership.organization.type]}</span>
                    <span>|</span>
                    <span className="capitalize">{membership.role}</span>
                  </div>
                </div>
                {membership.organizationId === organization?.id && (
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
