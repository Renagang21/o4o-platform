import { AuthUser } from '@/types';
interface AuthState {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    getCurrentUser: () => Promise<void>;
    clearError: () => void;
    isAdmin: () => boolean;
    hasPermission: (permission: string) => boolean;
}
export declare const useAuthStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AuthState>>;
export {};
//# sourceMappingURL=authStore.d.ts.map