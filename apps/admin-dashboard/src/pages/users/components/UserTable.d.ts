import React from 'react';
import { User } from '@/types/user';
interface UserTableProps {
    users: User[];
    selectedUsers: string[];
    onSelectUser: (userId: string) => void;
    onSelectAll: (selected: boolean) => void;
    onApprove?: (userId: string) => void;
    onReject?: (userId: string) => void;
    onSuspend?: (userId: string) => void;
    onReactivate?: (userId: string) => void;
    onDelete?: (userId: string) => void;
    showActions?: boolean;
    showBulkSelect?: boolean;
}
declare const UserTable: React.FC<UserTableProps>;
export default UserTable;
//# sourceMappingURL=UserTable.d.ts.map