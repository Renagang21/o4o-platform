import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CPTBulkActionsProps {
  selectedAction: string;
  setSelectedAction: (action: string) => void;
  onApply: () => void;
  disabled: boolean;
}

export const CPTBulkActions: React.FC<CPTBulkActionsProps> = ({
  selectedAction,
  setSelectedAction,
  onApply,
  disabled
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const getActionLabel = () => {
    switch (selectedAction) {
      case 'trash':
        return '휴지통으로 이동';
      case 'delete':
        return '영구 삭제';
      case 'edit':
        return '편집';
      default:
        return '일괄 작업';
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
            <button
              onClick={() => {
                setSelectedAction('edit');
                setShowDropdown(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              편집
            </button>
            <button
              onClick={() => {
                setSelectedAction('trash');
                setShowDropdown(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              휴지통으로 이동
            </button>
            <button
              onClick={() => {
                setSelectedAction('delete');
                setShowDropdown(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
            >
              영구 삭제
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
        적용
      </button>
    </div>
  );
};
