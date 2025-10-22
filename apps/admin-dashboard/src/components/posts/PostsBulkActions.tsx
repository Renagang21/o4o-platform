import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface PostsBulkActionsProps {
  selectedAction: string;
  setSelectedAction: (action: string) => void;
  onApply: () => void;
  disabled: boolean;
  isTrashView?: boolean;
}

export const PostsBulkActions: React.FC<PostsBulkActionsProps> = ({
  selectedAction,
  setSelectedAction,
  onApply,
  disabled,
  isTrashView = false
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const getActionLabel = () => {
    switch (selectedAction) {
      case 'trash':
        return isTrashView ? 'Delete Permanently' : 'Move to Trash';
      case 'delete':
        return 'Delete Permanently';
      case 'edit':
        return 'Edit';
      default:
        return 'Bulk Actions';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          {getActionLabel()}
          <ChevronDown className="w-3 h-3" />
        </button>

        {showDropdown && (
          <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20">
            {!isTrashView && (
              <button
                onClick={() => {
                  setSelectedAction('edit');
                  setShowDropdown(false);
                }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              >
                Edit
              </button>
            )}
            <button
              onClick={() => {
                setSelectedAction(isTrashView ? 'delete' : 'trash');
                setShowDropdown(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {isTrashView ? 'Delete Permanently' : 'Move to Trash'}
            </button>
          </div>
        )}
      </div>
      <button
        onClick={onApply}
        className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
          !disabled
            ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        disabled={disabled}
      >
        Apply
      </button>
    </div>
  );
};