import { FC, ReactNode } from 'react';
import { Button, Space } from 'antd';
import { Plus } from 'lucide-react';
import OrganizationSelector from '../organization/OrganizationSelector';

interface ResourceHeaderProps {
  /** Page title */
  title: string;
  /** Subtitle or description */
  description?: string;
  /** Show organization selector */
  showOrgSelector?: boolean;
  /** Selected organization ID */
  selectedOrg?: string;
  /** Organization change callback */
  onOrgChange?: (orgId: string) => void;
  /** Show add button */
  showAddButton?: boolean;
  /** Add button label */
  addButtonLabel?: string;
  /** Add button click callback */
  onAdd?: () => void;
  /** Custom action buttons */
  extra?: ReactNode;
  /** Filter by permission for org selector */
  filterByPermission?: boolean;
}

/**
 * ResourceHeader
 *
 * Common page header component for resource management pages.
 * Provides consistent layout with title, organization selector, and actions.
 *
 * Features:
 * - Page title and description
 * - Organization selector integration
 * - Add button with custom label
 * - Extra custom actions
 *
 * Usage:
 * ```tsx
 * <ResourceHeader
 *   title="교육 과정 관리"
 *   showOrgSelector
 *   selectedOrg={orgId}
 *   onOrgChange={setOrgId}
 *   showAddButton
 *   onAdd={() => setModalOpen(true)}
 * />
 * ```
 */
export const ResourceHeader: FC<ResourceHeaderProps> = ({
  title,
  description,
  showOrgSelector = false,
  selectedOrg,
  onOrgChange,
  showAddButton = false,
  addButtonLabel = '추가',
  onAdd,
  extra,
  filterByPermission = false
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {showOrgSelector && (
            <div className="min-w-[200px]">
              <OrganizationSelector
                value={selectedOrg}
                onChange={onOrgChange}
                placeholder="조직 선택"
                filterByPermission={filterByPermission}
              />
            </div>
          )}

          <Space>
            {showAddButton && (
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={onAdd}
              >
                {addButtonLabel}
              </Button>
            )}
            {extra}
          </Space>
        </div>
      </div>
    </div>
  );
};

export default ResourceHeader;
