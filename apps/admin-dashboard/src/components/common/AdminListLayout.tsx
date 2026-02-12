import { FC, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { clsx } from 'clsx';

interface FilterOption {
  value: string;
  label: string;
}

interface BulkAction {
  value: string;
  label: string;
  variant?: 'default' | 'destructive';
}

interface AdminListLayoutProps {
  title: string;
  subtitle?: string;
  addNewLabel?: string;
  addNewHref?: string;
  onAddNew?: () => void;
  
  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onSearch?: () => void;
  
  // Filters
  filters?: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    placeholder?: string;
  }[];
  
  // Bulk actions
  bulkActions?: BulkAction[];
  onBulkAction?: (action: string) => void;
  selectedCount?: number;
  
  // Pagination
  totalItems?: number;
  currentPage?: number;
  itemsPerPage?: number;
  
  // Content
  children: ReactNode;
  
  // Loading state
  loading?: boolean;
  
  // Screen options
  screenOptions?: ReactNode;
  
  className?: string;
}

/**
 * Standardized WordPress-style list layout component
 * Eliminates duplicate filters and improves text readability
 */
export const AdminListLayout: FC<AdminListLayoutProps> = ({
  title,
  subtitle,
  addNewLabel = 'Add New',
  addNewHref,
  onAddNew,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  onSearch,
  filters = [],
  bulkActions = [],
  onBulkAction,
  selectedCount = 0,
  totalItems = 0,
  children,
  loading = false,
  screenOptions,
  className
}) => {
  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew();
    } else if (addNewHref) {
      window.location.href = addNewHref;
    }
  };

  const showBulkActions = bulkActions.length > 0 && selectedCount > 0;

  return (
    <div className={clsx('wrap', className)}>
      {/* Screen Options */}
      {screenOptions && (
        <div className="relative mb-4">
          {screenOptions}
        </div>
      )}
      
      {/* Header */}
      <div className="wp-header mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="o4o-heading-inline text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {(addNewHref || onAddNew) && (
              <Button 
                onClick={handleAddNew}
                className="page-title-action"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                {addNewLabel}
              </Button>
            )}
          </div>
          
          {/* Search Box - Moved to header for better visibility */}
          {onSearchChange && (
            <div className="search-box flex items-center gap-2">
              <label className="screen-reader-text" htmlFor="list-search-input">
                Search:
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="search"
                  id="list-search-input"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-10 w-64"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && onSearch) {
                      onSearch();
                    }
                  }}
                />
              </div>
              {onSearch && (
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={onSearch}
                >
                  Search
                </Button>
              )}
            </div>
          )}
        </div>
        
        {subtitle && (
          <p className="text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
        )}
      </div>
      
      <hr className="o4o-header-end" />
      
      {/* Single Filter Bar - No duplication */}
      <div className="tablenav top mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Bulk Actions */}
            {bulkActions.length > 0 && (
              <div className="alignleft actions bulkactions">
                <label htmlFor="bulk-action-selector" className="screen-reader-text">
                  Select bulk action
                </label>
                <Select 
                  value="" 
                  onValueChange={onBulkAction}
                >
                  <SelectTrigger id="bulk-action-selector" className="w-[180px]" disabled={selectedCount === 0}>
                    <SelectValue placeholder="Bulk actions" />
                  </SelectTrigger>
                  <SelectContent>
                    {bulkActions.map(action => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {showBulkActions && (
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedCount} selected
                  </span>
                )}
              </div>
            )}
            
            {/* Additional Filters */}
            {filters.map((filter, index) => (
              <div key={index} className="alignleft actions">
                <Select value={filter.value} onValueChange={filter.onChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={filter.placeholder || 'Select...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          
          {/* Items count */}
          {totalItems > 0 && (
            <div className="tablenav-pages">
              <span className="displaying-num text-sm text-gray-600 dark:text-gray-400">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="o4o-list-table-container">
        {loading ? (
          <div className="o4o-list-table-loading-overlay">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default AdminListLayout;