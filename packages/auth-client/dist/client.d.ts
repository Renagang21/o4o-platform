import { AxiosInstance } from 'axios';
import type { LoginCredentials, AuthResponse } from './types';
export declare class AuthClient {
    private baseURL;
    api: AxiosInstance;
    private isRefreshing;
    private refreshSubscribers;
    constructor(baseURL: string);
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    logout(): Promise<void>;
    checkSession(): Promise<{
        isAuthenticated: boolean;
        user?: any;
    }>;
}
export declare const authClient: AuthClient;
//# sourceMappingURL=client.d.ts.map