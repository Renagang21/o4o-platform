import { AxiosInstance } from 'axios';
import type { LoginCredentials, RegisterData, AuthResponse, User } from './types';
export declare class CookieAuthClient {
    private baseURL;
    api: AxiosInstance;
    private refreshPromise;
    private currentToken;
    constructor(baseURL: string);
    login(credentials: LoginCredentials): Promise<AuthResponse>;
    register(data: RegisterData): Promise<AuthResponse>;
    logout(): Promise<void>;
    logoutAll(): Promise<void>;
    refreshToken(): Promise<boolean>;
    getCurrentUser(): Promise<User | null>;
    getApiUrl(): string;
    getAccessToken(): string | null;
    setupSessionSync(): void;
    private broadcastAuthChange;
    loginWithSync(credentials: LoginCredentials): Promise<AuthResponse>;
    logoutWithSync(): Promise<void>;
}
export declare const cookieAuthClient: CookieAuthClient;
//# sourceMappingURL=cookie-client.d.ts.map