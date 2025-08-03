import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BulkAction } from '@/hooks/useBulkActions';

interface BulkActionBarProps {
  actions: BulkAction[];
  selectedCount: number;
  onActionExecute: (actionValue: string) => void;
  isProcessing?: boolean;
  position?: 'top' | 'bottom';
}

/**
 * WordPress-style bulk action bar component
 */
export const BulkActionBar: FC<BulkActionBarProps> = ({
  actions,
  selectedCount,
  onActionExecute,
  isProcessing = false,
  position = 'top'
}) => {
  const [selectedAction, setSelectedAction] = useState('');

  const handleApply = () => {
    if (!selectedAction) return;
    onActionExecute(selectedAction);
    setSelectedAction('');
  };

  return (
    <div className={`tablenav ${position}`}>
      <div className="alignleft actions bulkactions">
        <label htmlFor={`bulk-action-selector-${position}`} className="screen-reader-text">
          Select bulk action
        </label>
        <select
          id={`bulk-action-selector-${position}`}
          name="action"
          value={selectedAction}
          onChange={(e: any) => setSelectedAction(e.target.value)}
          disabled={isProcessing}
        >
          <option value="">Bulk actions</option>
          {actions.map(action => (
            <option key={action.value} value={action.value}>
              {action.label}
            </option>
          ))}
        </select>
        <Button
          className="button action"
          onClick={handleApply}
          disabled={!selectedAction || selectedCount === 0 || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Apply'}
        </Button>
        {selectedCount > 0 && (
          <span className="selected-count">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>
    </div>
  );
};