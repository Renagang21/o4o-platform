import React from 'react';
import { UserFilters as IUserFilters } from '@/types/user';
interface UserFiltersProps {
    filters: IUserFilters;
    onFiltersChange: (filters: IUserFilters) => void;
    onExport?: () => void;
    onRefresh?: () => void;
    loading?: boolean;
}
declare const UserFilters: React.FC<UserFiltersProps>;
export default UserFilters;
//# sourceMappingURL=UserFilters.d.ts.map