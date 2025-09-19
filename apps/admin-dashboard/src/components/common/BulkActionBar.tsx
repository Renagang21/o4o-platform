import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BulkAction as HookBulkAction } from '@/hooks/useBulkActions';

type SimpleAction = { label: string; onClick: () => void; variant?: 'danger' | 'primary' | 'default' };

interface BulkActionBarProps {
  actions: Array<HookBulkAction | SimpleAction>;
  selectedCount: number;
  onActionExecute?: (actionValue: string) => void;
  isProcessing?: boolean;
  position?: 'top' | 'bottom';
  onCancel?: () => void;
}

/**
 * WordPress-style bulk action bar component
 */
export const BulkActionBar: FC<BulkActionBarProps> = ({
  actions,
  selectedCount,
  onActionExecute,
  isProcessing = false,
  position = 'top',
  onCancel
}) => {
  const [selectedAction, setSelectedAction] = useState('');

  const isSimpleMode = actions.every((a: any) => 'onClick' in a);

  const handleApply = () => {
    if (!selectedAction || !onActionExecute) return;
    onActionExecute(selectedAction);
    setSelectedAction('');
  };

  return (
    <div className={`tablenav ${position}`}>
      <div className="alignleft actions bulkactions flex items-center gap-2">
        {isSimpleMode ? (
          <>
            {(actions as SimpleAction[]).map((a, idx) => (
              <Button
                key={idx}
                className={a.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                variant={a.variant === 'danger' ? 'default' : 'outline'}
                onClick={a.onClick}
                disabled={isProcessing || selectedCount === 0}
              >
                {a.label}
              </Button>
            ))}
            {onCancel && (
              <Button variant="ghost" onClick={onCancel} disabled={isProcessing}>
                Cancel
              </Button>
            )}
          </>
        ) : (
          <>
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
              {(actions as HookBulkAction[]).map((action: HookBulkAction) => (
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
          </>
        )}
        {selectedCount > 0 && (
          <span className="selected-count">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        )}
      </div>
    </div>
  );
};
