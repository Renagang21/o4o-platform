import React from 'react';
import { Trash2, Edit, Archive, MoreHorizontal } from 'lucide-react';

interface BulkAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface BulkActionsProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedCount,
  actions,
  onClearSelection,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
          {selectedCount} item{selectedCount > 1 ? 's' : ''} selected
        </span>
        
        <div className="flex items-center space-x-2">
          {actions.slice(0, 3).map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                action.variant === 'danger'
                  ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40'
                  : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              } border border-gray-300 dark:border-gray-600`}
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {action.label}
            </button>
          ))}
          
          {actions.length > 3 && (
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center px-2 py-1.5 text-xs font-medium rounded-md bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              
              {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div className="py-1">
                    {actions.slice(3).map((action) => (
                      <button
                        key={action.id}
                        onClick={() => {
                          action.onClick();
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center ${
                          action.variant === 'danger'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {action.icon && <span className="mr-2">{action.icon}</span>}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={onClearSelection}
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        Clear selection
      </button>
    </div>
  );
};