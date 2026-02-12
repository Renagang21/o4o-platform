import React from 'react';

interface VendorsPendingBulkActionsProps {
  selectedAction: string;
  setSelectedAction: (action: string) => void;
  onApply: () => void;
  selectedCount: number;
  onClearSelection: () => void;
}

export const VendorsPendingBulkActions: React.FC<VendorsPendingBulkActionsProps> = ({
  selectedAction,
  setSelectedAction,
  onApply,
  selectedCount,
  onClearSelection
}) => {
  return (
    <div className="o4o-bulk-actions">
      <select 
        value={selectedAction}
        onChange={(e) => setSelectedAction(e.target.value)}
        className="o4o-select"
      >
        <option value="">일괄 작업</option>
        <option value="approve">일괄 승인</option>
        <option value="reject">일괄 거부</option>
        <option value="message">메시지 발송</option>
      </select>
      <button 
        className="o4o-button"
        onClick={onApply}
      >
        적용
      </button>
      {selectedCount > 0 && (
        <span className="selected-count">
          {selectedCount}개 선택됨
          <button 
            className="clear-selection"
            onClick={onClearSelection}
          >
            선택 해제
          </button>
        </span>
      )}
    </div>
  );
};