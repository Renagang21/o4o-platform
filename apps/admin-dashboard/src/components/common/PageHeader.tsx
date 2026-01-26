import { useState, FC, ReactElement, ChangeEvent } from 'react';
import { Plus, Search, Filter, MoreVertical, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';

interface PageHeaderAction {
  id: string;
  label: string;
  icon?: ReactElement;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: PageHeaderAction[];
  showSearch?: boolean;
  showFilter?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  className?: string;
  backUrl?: string;
  backLabel?: string;
}

/**
 * WordPress-style page header component
 * 모든 관리자 페이지에 공통적으로 사용되는 페이지 헤더
 */
const PageHeader: FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions = [],
  showSearch = false,
  showFilter = false,
  searchPlaceholder = "검색...",
  onSearch,
  onFilter,
  className,
  backUrl,
  backLabel = "뒤로 가기"
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  const getActionButtonClass = (variant: PageHeaderAction['variant'] = 'secondary') => {
    const baseClass = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md border transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    switch (variant) {
      case 'primary':
        return clsx(baseClass, 'bg-admin-blue text-white border-admin-blue hover:bg-admin-blue-dark hover:border-admin-blue-dark');
      case 'danger':
        return clsx(baseClass, 'bg-admin-red text-white border-admin-red hover:bg-red-700 hover:border-red-700');
      case 'secondary':
      default:
        return clsx(baseClass, 'bg-white text-o4o-text-secondary border border-gray-200 hover:bg-o4o-bg-tertiary hover:border-gray-300');
    }
  };

  // Primary action (first action with primary variant)
  const primaryAction = actions.find((action: any) => action.variant === 'primary');
  const secondaryActions = actions.filter((action: any) => action.variant !== 'primary');

  return (
    <div className={clsx('o4o-card mb-6', className)}>
      <div className="o4o-card-header">
        {/* Back Link */}
        {backUrl && (
          <Link
            to={backUrl}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {backLabel}
          </Link>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title and Subtitle */}
          <div className="flex-1">
            <h1 className="o4o-card-title text-2xl font-bold text-o4o-text-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-o4o-text-secondary">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2">
              {/* Primary Action */}
              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className={getActionButtonClass(primaryAction.variant)}
                >
                  {primaryAction.icon || <Plus className="w-4 h-4" />}
                  <span>{primaryAction.label}</span>
                </button>
              )}

              {/* Secondary Actions */}
              {secondaryActions.length > 0 && (
                <div className="flex items-center gap-2">
                  {secondaryActions.slice(0, 2).map((action: any) => (
                    <button
                      key={action.id}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={getActionButtonClass(action.variant)}
                    >
                      {action.icon}
                      <span className="hidden sm:inline">{action.label}</span>
                    </button>
                  ))}

                  {/* More Actions Dropdown */}
                  {secondaryActions.length > 2 && (
                    <div className="relative">
                      <button
                        className={getActionButtonClass('secondary')}
                        title="더 많은 작업"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {/* TODO: Implement dropdown menu for additional actions */}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search and Filter Bar */}
        {(showSearch || showFilter) && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            {showSearch && (
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-o4o-text-tertiary" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="o4o-input pl-10 pr-4"
                />
              </div>
            )}

            {/* Filter */}
            {showFilter && (
              <button
                onClick={onFilter}
                className={getActionButtonClass('secondary')}
              >
                <Filter className="w-4 h-4" />
                <span>필터</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;