import type { User, SessionStatus } from '@o4o/types';
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    isAdmin: boolean;
    login: (credentials: {
        email: string;
        password: string;
    }) => Promise<void>;
    logout: () => void;
    clearError: () => void;
    getSessionStatus: () => SessionStatus | null;
}
declare const AuthContext: import("react").Context<AuthContextType | undefined>;
export declare const useAuth: () => AuthContextType;
export { AuthContext };
//# sourceMappingURL=AuthContext.d.ts.map