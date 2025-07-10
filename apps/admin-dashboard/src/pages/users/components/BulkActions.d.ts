import React from 'react';
import { UserBulkAction } from '@/types/user';
interface BulkActionsProps {
    selectedCount: number;
    onBulkAction: (action: UserBulkAction) => void;
    onClearSelection: () => void;
    availableActions?: ('approve' | 'reject' | 'suspend' | 'reactivate' | 'delete' | 'email')[];
}
declare const BulkActions: React.FC<BulkActionsProps>;
export default BulkActions;
//# sourceMappingURL=BulkActions.d.ts.map