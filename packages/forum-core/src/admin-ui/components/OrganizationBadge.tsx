import { FC } from 'react';

/**
 * WO-O4O-FORUM-ADMIN-ORGANIZATION-VISIBILITY-V1
 *
 * Organization badge for admin forum pages.
 * Maps organizationId to a human-readable label with color coding.
 */

// WO-O4O-FORUM-ORGS-INVALID-UUID-HOTFIX-V1: invalid UUID 'forum00000001' → valid hex.
// WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1: GlycoPharm 포럼 조직 배지 제거 (서비스 삭제).

interface OrganizationBadgeProps {
  organizationId?: string | null;
  isOrganizationExclusive?: boolean;
  size?: 'sm' | 'md';
}

const OrganizationBadge: FC<OrganizationBadgeProps> = ({
  organizationId,
  isOrganizationExclusive,
  size = 'sm',
}) => {
  const { label, className } = getOrgDisplay(organizationId);
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${sizeClass} ${className}`}>
      {label}
      {isOrganizationExclusive && (
        <span title="Organization Exclusive" className="opacity-70">*</span>
      )}
    </span>
  );
};

function getOrgDisplay(organizationId?: string | null): { label: string; className: string } {
  if (!organizationId) {
    return { label: 'Global', className: 'bg-gray-100 text-gray-600' };
  }
  // Any other org ID is a KPA branch
  return { label: 'KPA', className: 'bg-purple-100 text-purple-700' };
}

export default OrganizationBadge;
