import { useState, FC, ReactElement, ChangeEvent } from 'react';
import { Plus, Search, Filter, MoreVertical } from 'lucide-react';
import { clsx } from 'clsx';

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
  className
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
        return clsx(baseClass, 'bg-white text-wp-text-secondary border-wp-border-primary hover:bg-wp-bg-tertiary hover:border-wp-border-secondary');
    }
  };

  // Primary action (first action with primary variant)
  const primaryAction = actions.find(action => action.variant === 'primary');
  const secondaryActions = actions.filter(action => action.variant !== 'primary');

  return (
    <div className={clsx('wp-card mb-6', className)}>
      <div className="wp-card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title and Subtitle */}
          <div className="flex-1">
            <h1 className="wp-card-title text-2xl font-bold text-wp-text-primary">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-wp-text-secondary">
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
                  {secondaryActions.slice(0, 2).map((action) => (
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-wp-text-tertiary" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="wp-input pl-10 pr-4"
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