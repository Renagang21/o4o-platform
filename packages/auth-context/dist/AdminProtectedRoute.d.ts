import { FC, ReactNode } from 'react';
interface AdminProtectedRouteProps {
    children: ReactNode;
    requiredRoles?: string[];
    requiredPermissions?: string[];
    showContactAdmin?: boolean;
}
export declare const AdminProtectedRoute: FC<AdminProtectedRouteProps>;
export {};
//# sourceMappingURL=AdminProtectedRoute.d.ts.map